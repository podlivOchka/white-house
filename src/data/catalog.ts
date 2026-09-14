export type Category = "Все" | "Платья" | "Костюмы" | "Накидки";
export type View = "all" | "new" | "collection" | "promo" | "favorites";
export type Product = { id:string; name:string; category:Exclude<Category,"Все">; price:number|null; image:string; colors:string[]; label?:string; isNew?:boolean; collection?:boolean; description:string };
export const products:Product[] = [
{id:"floral-dress",name:"Платье с цветочным принтом",category:"Платья",price:13000,image:"/images/photo-06.jpg",colors:["Синий"],label:"ХИТ",description:"Длинное платье с мелким цветочным принтом, длинными рукавами и воланами по низу."},
{id:"satin-belt-suit",name:"Костюм с атласным поясом",category:"Костюмы",price:4700,image:"/images/photo-07.jpg",colors:["Голубой","Белый"],label:"NEW",isNew:true,description:"Светлый костюм с цветочным рисунком: жакет с короткими рукавами, длинная юбка и атласная лента на талии."},
{id:"polka-dot-dress",name:"Платье в горошек",category:"Платья",price:10000,image:"/images/photo-08.jpg",colors:["Чёрный"],label:"NEW",isNew:true,description:"Чёрное платье макси в мелкий белый горошек. V-образный вырез, рукава три четверти и разрез спереди."},
{id:"satin-dresses",name:"Атласное платье",category:"Платья",price:9000,image:"/images/photo-09.jpg",colors:["Синий","Белый","Коричневый"],label:"ХИТ",description:"Атласное платье макси с мягкой драпировкой. На фотографии представлены три оттенка. Доступные цвета уточнит консультант."},
{id:"linen-suit",name:"Костюм изо льна",category:"Костюмы",price:14000,image:"/images/photo-10.jpg",colors:["Бежевый"],description:"Костюм песочного оттенка: рубашка-жакет с акцентом на талии и широкие брюки. Состав ткани уточняйте у консультанта."},
{id:"classic-suit",name:"Классический костюм",category:"Костюмы",price:4500,image:"/images/photo-11.jpg",colors:["Оливковый"],label:"NEW",isNew:true,description:"Костюм оливкового оттенка с жакетом и широкими брюками для повседневных и деловых образов."},
{id:"organza-cape",name:"Накидка из органзы",category:"Накидки",price:6500,image:"/images/photo-12.jpg",colors:["Чёрный"],label:"NEW",isNew:true,description:"Чёрная полупрозрачная накидка с поясом. Лёгкий верхний слой для многослойного образа. Состав и размеры уточнит консультант."},
{id:"wh-collection-dress",name:"Платье WH Collection",category:"Платья",price:null,image:"/images/photo-13.jpg",colors:["Белый"],label:"WH COLLECTION",collection:true,description:"Светлое длинное платье с кружевной фактурой и открытыми плечами из WH Collection. Стоимость и детали заказа — у консультанта."}
];
export const categories:Category[]=["Все","Платья","Костюмы","Накидки"];
export const colors:Record<string,string>={"Чёрный":"#222222","Белый":"#f4f3ed","Бежевый":"#c5b492","Оливковый":"#6c7051","Синий":"#283a6c","Голубой":"#b8c9df","Коричневый":"#604139"};
export const sizes=["XS","S","M","L","XL","Подобрать размер"];
export const store={name:"White House",address:"Каспийск, ул. Ленина, 39А",hours:"Ежедневно, 09:00–22:00",phone:"+7 (909) 483-32-42",telephone:"tel:+79094833242",whatsapp:"https://wa.me/79674060006",maps:"https://yandex.ru/maps/org/white_house/76646352867",instagram:"https://instagram.com/white_house______",source:"https://whitehouse-kaspiysk.netlify.app/"};
export const money=(price:number)=>new Intl.NumberFormat("ru-RU").format(price)+" ₽";
export const whatsappUrl=(text:string)=>store.whatsapp+"?text="+encodeURIComponent(text);
export const getProduct=(id:string)=>products.find(p=>p.id===id);
