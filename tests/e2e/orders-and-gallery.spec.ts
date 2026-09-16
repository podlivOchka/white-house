import {test,expect,type Page} from "@playwright/test";
import {testAccount} from "../test-account";
async function login(page:Page){
 await page.goto("/admin");await page.getByLabel("E-mail",{exact:true}).fill(testAccount.email);await page.getByLabel("Пароль",{exact:true}).fill(testAccount.password);await page.getByRole("button",{name:"Войти",exact:true}).click();await expect(page.getByRole("heading",{name:"Ваш магазин"})).toBeVisible();
}

test("gallery zoom, custom sizes, discounts and related products use catalog values",async({page},testInfo)=>{
 await login(page);const original=await (await page.request.get("/api/admin/catalog")).json();
 const changed=structuredClone(original),p=changed.products.find((p:{id:string})=>p.id==="classic-suit");
 p.images=["/images/photo-09.jpg"];p.sizes=["42","44","46"];p.unavailableSizes=["44"];p.price=18000;p.oldPrice=24000;p.material="Тест состава из каталога";p.relatedIds=["floral-dress"];
 expect((await page.request.put("/api/admin/catalog",{data:changed,headers:{Origin:"http://127.0.0.1:4173"}})).ok()).toBe(true);
 try{
  await page.goto("/product/classic-suit");await expect(page.getByRole("button",{name:"44",exact:true})).toBeDisabled();
  await expect(page.locator(".detail-price del")).toHaveText(/24\s000\s₽/);await expect(page.locator(".detail-price .discount-tag")).toHaveText("−25%");
  await page.getByRole("button",{name:"Фото 2",exact:true}).click();await expect(page.locator(".gallery-open img")).toHaveAttribute("src","/images/photo-09.jpg");
  await page.getByRole("button",{name:"Увеличить фото товара",exact:true}).click();const zoom=page.getByRole("dialog",{name:"Классический костюм",exact:true});await expect(zoom).toBeVisible();await zoom.getByRole("button",{name:"Предыдущее фото"}).click();await expect(zoom.locator(".gallery-count")).toHaveText("1 / 2");await page.keyboard.press("Escape");
  await expect(page.getByText("Тест состава из каталога",{exact:true})).toBeVisible();await page.getByText("Состав и уход",{exact:true}).click();await expect(page.getByText("Тест состава из каталога",{exact:true})).toBeHidden();await page.getByText("Состав и уход",{exact:true}).click();await expect(page.getByText("Тест состава из каталога",{exact:true})).toBeVisible();
  await expect(page.locator(".related-products .product-card")).toHaveCount(1);
  await page.getByRole("button",{name:"42",exact:true}).click();await page.getByRole("button",{name:"Добавить в корзину",exact:true}).click();await page.getByRole("button",{name:/^Корзина,/}).click();await expect(page.getByTestId("cart-total")).toHaveText(/18\s000\s₽/);await page.keyboard.press("Escape");
  await page.screenshot({path:testInfo.outputPath("product-gallery.png"),fullPage:true});
 }finally{const current=await (await page.request.get("/api/admin/catalog")).json();expect((await page.request.put("/api/admin/catalog",{data:{...original,revision:current.revision},headers:{Origin:"http://127.0.0.1:4173"}})).ok()).toBe(true);}
});

test("checkout creates a private order and the administrator can change its status",async({page},testInfo)=>{
 await page.goto("/product/classic-suit");await page.getByRole("button",{name:"M",exact:true}).click();await page.getByRole("button",{name:"Добавить в корзину",exact:true}).click();await page.getByRole("button",{name:/^Корзина,/}).click();await page.getByRole("button",{name:"Оформить заказ",exact:true}).click();
 await page.getByLabel("Ваше имя",{exact:true}).fill("Тестовый покупатель");await page.getByLabel("Телефон",{exact:true}).fill("+7 000 000 00 00");
 await page.getByRole("radio",{name:"Самовывоз",exact:true}).check();await expect(page.getByLabel("Адрес доставки",{exact:true})).toHaveCount(0);await page.getByRole("radio",{name:"Доставка",exact:true}).check();
 await page.getByLabel("Адрес доставки",{exact:true}).fill("Тестовый город, улица Пример, 1");await page.getByRole("checkbox",{name:/Разрешаю магазину/}).check();
 await page.screenshot({path:testInfo.outputPath("checkout.png"),fullPage:true});
 await page.getByRole("button",{name:"Оформить заказ",exact:true}).click();await expect(page.getByRole("heading",{name:"Заказ принят",exact:true})).toBeVisible();
 const number=await page.locator(".order-success > strong").innerText();expect(number).toMatch(/^WH-\d+$/);expect(await page.evaluate(()=>localStorage.getItem("whitehouse-cart-v1"))).toBe("[]");expect(await page.evaluate(()=>JSON.stringify(localStorage))).not.toContain("Тестовый город");
 await page.keyboard.press("Escape");await login(page);await page.getByRole("tab",{name:"Заказы",exact:true}).click();
 const order=page.locator(".order-card").filter({has:page.getByRole("heading",{name:number,exact:true})});await expect(order).toContainText("Тестовый город, улица Пример, 1");await expect(order).toContainText("Почта не подключена");
 await order.getByLabel("Статус "+number,{exact:true}).selectOption("confirmed");await expect(order.getByLabel("Статус "+number,{exact:true})).toHaveValue("confirmed");await page.reload();await page.getByRole("tab",{name:"Заказы",exact:true}).click();await expect(order.getByLabel("Статус "+number,{exact:true})).toHaveValue("confirmed");
});
