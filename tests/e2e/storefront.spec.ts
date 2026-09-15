import {test,expect} from "@playwright/test";
test("catalog loads its images with no page errors or horizontal overflow",async({page},testInfo)=>{
const errors:string[]=[];page.on("pageerror",e=>errors.push(e.message));
await page.goto("/catalog");await expect(page.locator(".product-card")).toHaveCount(8);
for(const image of await page.locator("main img").all()){await image.scrollIntoViewIfNeeded();await expect.poll(()=>image.evaluate((el:HTMLImageElement)=>el.naturalWidth)).toBeGreaterThan(100);}
await page.evaluate(()=>window.scrollTo(0,0));expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBe(true);expect(errors).toEqual([]);
await expect(page.locator("body")).not.toContainText(/chatgpt|openai|codex|нейросет|искусственный интеллект/i);
await page.screenshot({path:testInfo.outputPath("catalog.png"),fullPage:true});
});
test("category, price and sort controls change actual results",async({page})=>{
await page.goto("/catalog");await page.getByRole("button",{name:"Костюмы",exact:true}).click();await expect(page.locator(".product-card")).toHaveCount(3);
await page.getByRole("button",{name:"Фильтры",exact:true}).click();const dialog=page.getByRole("dialog",{name:"Фильтры",exact:true});await dialog.getByLabel("Максимальная цена",{exact:true}).fill("5000");await dialog.getByRole("button",{name:/Показать модели/}).click();await expect(page.locator(".product-card")).toHaveCount(2);
await page.getByLabel("Сортировка каталога").selectOption("price-asc");await expect(page.locator(".product-card").first()).toHaveAttribute("data-product-id","classic-suit");
await page.getByLabel("Сортировка каталога").selectOption("price-desc");await expect(page.locator(".product-card").first()).toHaveAttribute("data-product-id","satin-belt-suit");
});
test("search is case insensitive and exposes an empty state",async({page})=>{
await page.goto("/");await page.getByRole("button",{name:"Поиск по каталогу",exact:true}).click();await page.getByRole("searchbox",{name:"Найти в каталоге"}).fill("ГоРоШеК");await expect(page.locator(".product-card")).toHaveCount(1);await expect(page.locator(".product-card")).toHaveAttribute("data-product-id","polka-dot-dress");
await page.getByRole("searchbox",{name:"Найти в каталоге"}).fill("несуществующая модель");await expect(page.getByRole("heading",{name:"Таких моделей пока нет"})).toBeVisible();
await page.getByRole("button",{name:"Посмотреть всю коллекцию"}).click();await expect(page.locator(".product-card")).toHaveCount(8);
});
test("favorites survive a reload and can be removed",async({page})=>{
await page.goto("/catalog");await page.getByRole("button",{name:"В избранное: Платье с цветочным принтом",exact:true}).click();await expect(page.getByRole("button",{name:"Убрать из избранного: Платье с цветочным принтом",exact:true})).toHaveAttribute("aria-pressed","true");
await page.goto("/favorites");await expect(page.locator(".product-card")).toHaveCount(1);await page.reload();await expect(page.locator(".product-card")).toHaveCount(1);await page.getByRole("button",{name:"Убрать из избранного: Платье с цветочным принтом",exact:true}).click();await expect(page.getByRole("heading",{name:"Сохраните то, что нравится"})).toBeVisible();
});
test("size is required; cart quantities, totals and message match the selected goods",async({page})=>{
await page.goto("/product/satin-belt-suit");await expect(page.getByRole("heading",{name:"Костюм с атласным поясом",exact:true})).toBeVisible();await page.getByRole("button",{name:"Добавить в корзину",exact:true}).click();await expect(page.getByRole("alert")).toContainText("Выберите размер");
await page.getByRole("button",{name:"M",exact:true}).click();await page.getByLabel("Желаемый цвет",{exact:true}).selectOption("Голубой");await page.getByRole("button",{name:"Добавить в корзину",exact:true}).click();await page.getByRole("button",{name:/^Корзина,/}).click();
const cart=page.getByRole("dialog",{name:"Корзина",exact:true});await expect(cart.getByTestId("cart-total")).toHaveText(/4\s700\s₽/);await cart.getByRole("button",{name:"Увеличить количество: Костюм с атласным поясом"}).click();await expect(cart.getByTestId("cart-total")).toHaveText(/9\s400\s₽/);
const href=await cart.getByRole("link",{name:"Перейти в WhatsApp"}).getAttribute("href");const url=new URL(href!);expect(url.origin+url.pathname).toBe("https://wa.me/79674060006");expect(url.searchParams.get("text")).toContain("Количество: 2");expect(url.searchParams.get("text")).toContain("Голубой");expect(url.searchParams.get("text")).toContain("Размер: M");
await page.reload();await page.getByRole("button",{name:/^Корзина,/}).click();await expect(page.getByTestId("cart-total")).toHaveText(/9\s400\s₽/);await page.getByRole("button",{name:"Удалить из корзины: Костюм с атласным поясом"}).click();await expect(page.getByRole("heading",{name:"Здесь будет ваш образ"})).toBeVisible();
});
test("unknown prices remain explicitly unconfirmed",async({page})=>{
await page.goto("/product/wh-collection-dress");await page.getByRole("button",{name:"Подобрать размер",exact:true}).click();await page.getByRole("button",{name:"Добавить в корзину"}).click();await page.getByRole("button",{name:/^Корзина,/}).click();const cart=page.getByRole("dialog",{name:"Корзина",exact:true});await expect(cart).toContainText("Известная стоимость");await expect(cart).toContainText("Стоимость моделей без цены уточнит консультант");
});
test("direct routes, not-found handling and menu work",async({page,isMobile})=>{
for(const [url,count] of [["/catalog/new",4],["/catalog/collection",1],["/catalog/promo",0]] as const){await page.goto(url);await expect(page.locator(".product-card")).toHaveCount(count);}
await expect(page.getByRole("link",{name:"Узнать об акциях"})).toBeVisible();
if(isMobile){await page.getByRole("button",{name:"Открыть меню"}).click();const menu=page.getByRole("navigation",{name:"Мобильное меню"});await menu.getByRole("link",{name:"Новинки",exact:true}).click();await expect(page).toHaveURL(/catalog\/new$/);await expect(page.getByRole("dialog")).toHaveCount(0);}
await page.goto("/product/not-a-product");await expect(page.getByRole("heading",{name:"Страница не найдена"})).toBeVisible();
});
test("quick view supports keyboard dismissal and corrupt storage cannot break catalog",async({page})=>{
await page.addInitScript(()=>{localStorage.setItem("whitehouse-cart-v1","broken-json");localStorage.setItem("whitehouse-favorites-v1",'[null,42,"missing"]');});
await page.goto("/catalog");await expect(page.locator(".product-card")).toHaveCount(8);await page.getByRole("button",{name:"Выбрать размер: Классический костюм"}).click();await expect(page.getByRole("dialog",{name:"Классический костюм",exact:true})).toBeVisible();await page.keyboard.press("Escape");await expect(page.getByRole("dialog")).toHaveCount(0);
});
test("structured catalog filters update the same UI and reject invalid data",async({page})=>{
await page.addInitScript(()=>{const tools=new Map<string,any>();Object.defineProperty(window,"catalogTestTools",{value:tools});Object.defineProperty(document,"modelContext",{configurable:true,value:{registerTool(tool:any,options:any){tools.set(tool.name,tool);options.signal.addEventListener("abort",()=>{if(tools.get(tool.name)===tool)tools.delete(tool.name);});}}});});
await page.goto("/catalog");await expect.poll(()=>page.evaluate(()=>(window as any).catalogTestTools.size)).toBe(2);
const result=await page.evaluate(()=>(window as any).catalogTestTools.get("filter_catalog").execute({category:"Костюмы",maxPrice:5000}));expect(result.products).toHaveLength(2);await expect(page.locator(".product-card")).toHaveCount(2);
const invalid=await page.evaluate(()=>{try{(window as any).catalogTestTools.get("filter_catalog").execute({maxPrice:-1});return false;}catch{return true;}});expect(invalid).toBe(true);await expect(page.locator(".product-card")).toHaveCount(2);
});
