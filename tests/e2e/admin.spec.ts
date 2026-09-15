import {test,expect} from "@playwright/test";
import {testAccount} from "../test-account";

test("admin adds a product, marks it unavailable, hides it and removes it",async({page},testInfo)=>{
  await page.goto("/admin");await page.getByLabel("E-mail",{exact:true}).fill(testAccount.email);await page.getByLabel("Пароль",{exact:true}).fill(testAccount.password);await page.getByRole("button",{name:"Войти",exact:true}).click();
  await expect(page.getByRole("heading",{name:"Ваш магазин"})).toBeVisible();
  await page.getByLabel("Название",{exact:true}).fill("Проверка новой модели");await page.getByLabel("Цена, ₽",{exact:true}).fill("7800");await page.getByLabel("Ссылка на фото",{exact:true}).fill("/images/photo-06.jpg");await page.getByLabel("Описание",{exact:true}).fill("Модель для проверки управления каталогом.");await page.getByRole("button",{name:"Добавить товар",exact:true}).click();
  const item=page.locator(".admin-item").filter({hasText:"Проверка новой модели"});await expect(item).toBeVisible();await page.screenshot({path:testInfo.outputPath("admin.png"),fullPage:true});
  try{
    await page.getByRole("link",{name:"Открыть каталог",exact:true}).click();const card=page.locator(".product-card").filter({hasText:"Проверка новой модели"});await expect(card).toBeVisible();
    await card.getByRole("button",{name:"В избранное: Проверка новой модели",exact:true}).click();await page.reload();await expect(card.getByRole("button",{name:"Убрать из избранного: Проверка новой модели",exact:true})).toHaveAttribute("aria-pressed","true");
    await page.goto("/admin");await item.getByRole("button",{name:"Нет в наличии",exact:true}).click();await expect(page.getByRole("status")).toContainText("сохранены");
    await page.goto("/catalog");await expect(card.locator(".availability-ribbon")).toHaveText("НЕТ В НАЛИЧИИ");await expect(card.getByRole("button",{name:"Выбрать размер: Проверка новой модели"})).toBeDisabled();await card.locator(".product-meta>a").click();await expect(page.getByRole("button",{name:"Нет в наличии",exact:true})).toBeDisabled();await page.screenshot({path:testInfo.outputPath("unavailable-product.png"),fullPage:true});
    await page.goto("/admin");await item.getByRole("button",{name:"Скрыть",exact:true}).click();await expect(page.getByRole("status")).toContainText("сохранены");await page.goto("/favorites");await expect(page.locator(".product-card").filter({hasText:"Проверка новой модели"})).toHaveCount(0);
    await page.goto("/admin");await page.getByRole("tab",{name:"Акции и бонусы"}).click();await page.getByLabel("Название предложения").fill("Тест предложения");await page.getByLabel("Условия предложения").fill("Условия для проверки");await page.getByLabel("Тип предложения").selectOption("discount");await page.getByLabel("Размер или условие").fill("−10%");await page.getByRole("button",{name:"Добавить предложение",exact:true}).click();await expect(page.getByRole("status")).toContainText("сохранены");await page.goto("/catalog/promo");await expect(page.getByRole("heading",{name:"Тест предложения"})).toBeVisible();
  }finally{
    const current=await (await page.request.get("/api/admin/catalog")).json();current.products=current.products.filter((p:{name:string})=>p.name!=="Проверка новой модели");current.promotions=current.promotions.filter((p:{title:string})=>p.title!=="Тест предложения");const saved=await page.request.put("/api/admin/catalog",{data:current,headers:{Origin:"http://127.0.0.1:4173"}});expect(saved.ok()).toBe(true);
  }
  await page.goto("/admin");await expect(item).toHaveCount(0);await page.getByRole("button",{name:"Выйти",exact:true}).click();await expect(page.getByRole("heading",{name:"Вход администратора"})).toBeVisible();
});

test("all three Instagram profiles have exact destinations",async({page})=>{
  await page.goto("/catalog");const profiles=page.getByRole("region",{name:"Профили магазина в Instagram"}).first();
  for(const handle of ["white_house_____","wh_collection__","wh_of_love"]){const link=profiles.locator(`a[href="https://www.instagram.com/${handle}/"]`);await expect(link).toHaveCount(1);await expect(link).toHaveAttribute("target","_blank");}
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});
