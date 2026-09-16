import {test,expect,type Page} from "@playwright/test";
import fixture from "../fixtures/catalog.json" with {type:"json"};
import {validateCatalog} from "../../shared/catalog";
const token="github_pat_"+"test_only_".repeat(5),password="Device-test-password";
async function mockGitHub(page:Page){
 let data=validateCatalog(fixture),sha="test-catalog-sha",owner="podlivOchka",conflict=false;
 const writes:{path:string;body:Record<string,unknown>}[]=[];
 await page.route("https://api.github.com/**",async route=>{
  const req=route.request(),url=new URL(req.url());expect(req.headers().authorization).toBe("Bearer "+token);
  if(req.method()==="GET"&&url.pathname==="/user")return route.fulfill({json:{login:owner}});
  if(req.method()==="GET"&&url.pathname==="/repos/podlivOchka/white-house")return route.fulfill({json:{full_name:"podlivOchka/white-house"}});
  if(req.method()==="GET"&&url.pathname.endsWith("/contents/public/content/catalog.json"))return route.fulfill({json:{sha,type:"file",encoding:"base64",content:Buffer.from(JSON.stringify(data)).toString("base64")}});
  if(req.method()==="PUT"&&url.pathname.endsWith("/contents/public/content/catalog.json")){
   const body=req.postDataJSON();expect(body.branch).toBe("main");expect(body.sha).toBe(sha);
   if(conflict)return route.fulfill({status:409,json:{message:"conflict"}});
   data=validateCatalog(JSON.parse(Buffer.from(body.content,"base64").toString("utf8")));sha="test-catalog-sha-"+data.revision;writes.push({path:url.pathname,body});
   return route.fulfill({json:{content:{sha}}});
  }
  if(req.method()==="PUT"&&url.pathname.includes("/contents/public/images/uploads/")){const body=req.postDataJSON();expect(body.branch).toBe("main");expect(Buffer.from(body.content,"base64").subarray(0,3)).toEqual(Buffer.from([255,216,255]));writes.push({path:url.pathname,body});return route.fulfill({json:{content:{sha:"test-photo-sha"}}});}
  throw new Error("Unexpected GitHub request: "+req.method()+" "+url.pathname);
 });
 return {writes,get data(){return data;},setOwner(value:string){owner=value;},conflict(){conflict=true;}};
}
async function connect(page:Page){
 await page.getByLabel("Ключ доступа GitHub",{exact:true}).fill(token);await page.getByLabel("Пароль для этого устройства",{exact:true}).fill(password);await page.getByLabel("Повторите пароль",{exact:true}).fill(password);await page.getByRole("button",{name:"Подключить и войти",exact:true}).click();
}

test("owner connects, edits inventory and unlocks the encrypted connection after reload",async({page},testInfo)=>{
 const mock=await mockGitHub(page);await page.goto("admin/");await expect(page.getByRole("heading",{name:"Подключить магазин"})).toBeVisible();
 mock.setOwner("different-owner");await connect(page);await expect(page.getByRole("alert")).toContainText("аккаунт владельца");
 mock.setOwner("podlivOchka");await connect(page);await expect(page.getByRole("heading",{name:"Ваш магазин"})).toBeVisible();
 const storage=await page.evaluate(()=>JSON.stringify(localStorage));expect(storage).toContain("ciphertext");expect(storage).not.toContain(token);expect(storage).not.toContain(password);
 await page.getByLabel("Название",{exact:true}).fill("Тестовая карточка GitHub");await page.getByLabel("Цена, ₽",{exact:true}).fill("19000");await page.getByLabel("Ссылка на фото",{exact:true}).fill("/images/photo-06.jpg");await page.getByLabel("Описание",{exact:true}).fill("Карточка для проверки сохранения.");
 await page.locator('.photo-editor input[type="file"]').setInputFiles("public/images/photo-09.jpg");await expect(page.locator(".admin-photo-tile")).toHaveCount(2);
 await page.getByRole("button",{name:"Добавить товар",exact:true}).click();await expect(page.getByRole("status")).toContainText("Сохранено в GitHub");
 expect(mock.data.products.some(p=>p.name==="Тестовая карточка GitHub")).toBe(true);
 expect(mock.data.products.at(-1)?.images?.[0]).toMatch(/^\/images\/uploads\/[a-f0-9-]+\.jpg$/);
 const item=page.locator(".admin-item").filter({hasText:"Тестовая карточка GitHub"});await item.getByRole("button",{name:"Нет в наличии",exact:true}).click();await expect(page.getByRole("status")).toContainText("Сохранено в GitHub");
 expect(mock.data.products.find(p=>p.name==="Тестовая карточка GitHub")?.availability).toBe("out-of-stock");
 await page.reload();await expect(page.getByRole("heading",{name:"Вход администратора"})).toBeVisible();
 await page.getByLabel("Пароль",{exact:true}).fill("Wrong-test-password");await page.getByRole("button",{name:"Войти",exact:true}).click();await expect(page.getByRole("alert")).toContainText("Неверный пароль");
 await page.getByLabel("Пароль",{exact:true}).fill(password);await page.getByRole("button",{name:"Войти",exact:true}).click();await expect(item).toBeVisible();
 await page.getByRole("tab",{name:"Оформление",exact:true}).click();await expect(page.getByRole("tab",{name:"Заказы",exact:true})).toHaveCount(0);
 await page.getByText("Пароль этого устройства",{exact:true}).click();await page.getByLabel("Новый пароль",{exact:true}).fill("New-device-test-password");await page.getByLabel("Повторите пароль",{exact:true}).fill("New-device-test-password");await page.getByRole("button",{name:"Изменить пароль",exact:true}).click();await expect(page.locator(".admin-device-settings").getByRole("status")).toContainText("Пароль изменён");
 await page.getByRole("button",{name:"Выйти",exact:true}).click();await page.getByLabel("Пароль",{exact:true}).fill("New-device-test-password");await page.getByRole("button",{name:"Войти",exact:true}).click();await expect(page.getByRole("heading",{name:"Ваш магазин"})).toBeVisible();
 await page.screenshot({path:testInfo.outputPath("github-admin.png"),fullPage:true});expect(mock.writes).toHaveLength(3);
});

test("conflicting edits leave the form intact and do not overwrite GitHub",async({page})=>{
 const mock=await mockGitHub(page);await page.goto("admin/");await connect(page);await expect(page.getByRole("heading",{name:"Ваш магазин"})).toBeVisible();
 const item=page.locator(".admin-item").first();await item.getByRole("button",{name:"Изменить",exact:true}).click();
 await page.getByLabel("Название",{exact:true}).fill("Несохранённое изменение");mock.conflict();
 await page.getByRole("button",{name:"Сохранить товар",exact:true}).click();await expect(page.getByRole("alert")).toContainText("изменились");
 await expect(page.getByLabel("Название",{exact:true})).toHaveValue("Несохранённое изменение");expect(mock.writes).toHaveLength(0);
});
