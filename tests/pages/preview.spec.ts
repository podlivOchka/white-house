import {test,expect} from "@playwright/test";
import source from "../../public/content/catalog.json" with {type:"json"};
import {validateCatalog,publicCatalog} from "../../shared/catalog";
import {productSizes,money} from "../../src/data/catalog";
const prefix="/white-house/",catalog=publicCatalog(validateCatalog(source)),products=catalog.products;
const available=products.find(p=>p.availability!=="out-of-stock");

test("published catalog renders the current editable inventory and supports navigation",async({page},testInfo)=>{
 const failures:string[]=[];page.on("pageerror",error=>failures.push(error.message));
 page.on("response",response=>{if(response.url().startsWith("http://127.0.0.1:4174")&&response.status()>=400)failures.push(response.status()+" "+response.url());});
 expect((await page.goto("catalog/"))?.status()).toBe(200);
 await expect(page.locator(".product-card")).toHaveCount(products.length);
 for(const img of await page.locator("main img").all()){
  const src=await img.getAttribute("src");
  // External image services are outside this build's control; local assets must work.
  if(src?.startsWith("https://"))continue;
  await img.scrollIntoViewIfNeeded();await expect.poll(()=>img.evaluate((el:HTMLImageElement)=>el.naturalWidth)).toBeGreaterThan(0);
  expect(src).toMatch(/^\/white-house\/images\//);
 }
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1)).toBe(true);
 await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:testInfo.outputPath("catalog.png"),fullPage:true});
 if(products.length){
  const product=products[0];await page.getByRole("button",{name:product.category,exact:true}).click();
  await expect(page.locator(".product-card")).toHaveCount(products.filter(p=>p.category===product.category).length);
  const card=page.locator('[data-product-id="'+product.id+'"]');
  await card.getByRole("button",{name:"В избранное: "+product.name,exact:true}).click();
  expect((await page.goto("favorites/"))?.status()).toBe(200);await expect(page.locator(".product-card")).toHaveCount(1);
 }
 if(available){
  expect((await page.goto("product/"+available.id+"/"))?.status()).toBe(200);
  await expect(page.getByRole("heading",{name:available.name,exact:true}).first()).toBeVisible();
  expect((await page.reload())?.status()).toBe(200);
  const size=productSizes(available).find(s=>!available.unavailableSizes?.includes(s))!;
  await page.getByRole("button",{name:size,exact:true}).click();await page.getByRole("button",{name:"Добавить в корзину",exact:true}).click();
  await page.getByRole("button",{name:/^Корзина,/}).click();
  await expect(page.getByTestId("cart-total")).toHaveText(money(available.price??0));
 }
 expect(failures).toEqual([]);
});

test("direct pages and 404 stay under the repository path after inventory edits",async({page,request})=>{
 const routes=["","catalog/new/","catalog/collection/","catalog/promo/"];
 if(products.length)routes.push("product/"+products[0].id+"/");
 for(const route of routes){
  expect((await page.goto(route))?.status()).toBe(200);await expect(page.locator("main")).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content","noindex, nofollow");
 }
 const html=await (await request.get("catalog/")).text();expect(html).toContain('href="'+prefix+'catalog"');expect(html).not.toContain('href="/catalog"');
 expect((await page.goto("product/missing-preview-test-route/"))?.status()).toBe(404);
 await expect(page.getByRole("heading",{name:"Страница не найдена"})).toBeVisible();
 await page.getByRole("link",{name:"Открыть каталог",exact:true}).click();await expect(page.locator(".product-card")).toHaveCount(products.length);
});

test("static checkout prepares an email and never claims the order was sent",async({page})=>{
 test.skip(!available,"No orderable products in the current catalog");const product=available!;
 const calls:string[]=[];page.on("request",req=>{if(req.method()==="POST")calls.push(req.url());});
 await page.goto("product/"+product.id+"/");
 await page.getByRole("button",{name:"Подобрать размер",exact:true}).click();await page.getByRole("button",{name:"Добавить в корзину",exact:true}).click();
 await page.getByRole("button",{name:/^Корзина,/}).click();await page.getByRole("button",{name:"Оформить заказ",exact:true}).click();
 await page.getByLabel("Ваше имя",{exact:true}).fill("Тестовый покупатель");await page.getByLabel("Телефон",{exact:true}).fill("+7 000 000 00 00");
 await page.getByLabel("Адрес доставки",{exact:true}).fill("Тестовый город, улица Пример, 1");
 await page.getByRole("checkbox",{name:/Разрешаю магазину/}).check();await page.getByRole("button",{name:"Подготовить письмо",exact:true}).click();
 const panel=page.locator(".checkout-prepared");await expect(panel).toBeVisible();
 const href=await panel.getByRole("link",{name:"Открыть почту"}).getAttribute("href");const mail=new URL(href!);
 expect(mail.protocol).toBe("mailto:");expect(decodeURIComponent(mail.pathname)).toBe(catalog.content.orderEmail);
 expect(mail.searchParams.get("body")).toContain(product.name);expect(mail.searchParams.get("body")).toContain("Тестовый город, улица Пример, 1");
 await expect(panel).toContainText("после отправки письма");expect(calls).toEqual([]);
 expect(await page.evaluate(()=>JSON.stringify(localStorage))).not.toContain("Тестовый город");
});
