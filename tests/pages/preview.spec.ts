import {test,expect} from "@playwright/test";
const prefix="/white-house-kaspiysk/";
test("published directory supports photos, navigation, cart and refresh",async({page},testInfo)=>{
 const failures:string[]=[];
 page.on("pageerror",error=>failures.push(error.message));
 page.on("response",response=>{if(response.url().startsWith("http://127.0.0.1:4174")&&response.status()>=400)failures.push(response.status()+" "+response.url());});
 const response=await page.goto("catalog/");
 expect(response?.status()).toBe(200);
 await expect(page.locator(".product-card")).toHaveCount(8);
 for(const img of await page.locator("main img").all()){
  await img.scrollIntoViewIfNeeded();
  await expect.poll(()=>img.evaluate((el:HTMLImageElement)=>el.naturalWidth)).toBeGreaterThan(100);
  expect(await img.getAttribute("src")).toMatch(/^\/white-house-kaspiysk\/images\//);
 }
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 await page.evaluate(()=>window.scrollTo(0,0));
 await page.screenshot({path:testInfo.outputPath("catalog.png"),fullPage:true});
 await page.getByRole("button",{name:"Костюмы",exact:true}).click();
 await expect(page.locator(".product-card")).toHaveCount(3);
 await page.getByRole("link",{name:"Классический костюм",exact:true}).click();
 await expect(page).toHaveURL(/\/white-house-kaspiysk\/product\/classic-suit$/);
 await expect(page.getByRole("heading",{name:"Классический костюм",exact:true})).toBeVisible();
 expect((await page.reload())?.status()).toBe(200);
 await page.getByRole("button",{name:"M",exact:true}).click();
 await page.getByRole("button",{name:"Добавить в корзину",exact:true}).click();
 await page.getByRole("button",{name:/^Корзина,/}).click();
 await expect(page.getByTestId("cart-total")).toHaveText(/4\s500\s₽/);
 await page.keyboard.press("Escape");
 await page.goto("catalog/");
 await page.getByRole("button",{name:"В избранное: Платье с цветочным принтом",exact:true}).click();
 expect((await page.goto("favorites/"))?.status()).toBe(200);
 await expect(page.locator(".product-card")).toHaveCount(1);
 expect(failures).toEqual([]);
});
test("direct pages and 404 remain under the repository path",async({page,request})=>{
 for(const route of ["","catalog/new/","catalog/collection/","catalog/promo/","product/wh-collection-dress/"]){
  expect((await page.goto(route))?.status()).toBe(200);
  await expect(page.locator("main")).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content","noindex, nofollow");
 }
 const html=await (await request.get("product/classic-suit/")).text();
 expect(html).toContain('href="'+prefix+'catalog"');
 expect(html).not.toContain('href="/catalog"');
 expect((await page.goto("product/missing/"))?.status()).toBe(404);
 await expect(page.getByRole("heading",{name:"Страница не найдена"})).toBeVisible();
 await page.getByRole("link",{name:"Открыть каталог",exact:true}).click();
 await expect(page.locator(".product-card")).toHaveCount(8);
});
