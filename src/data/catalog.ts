import initial from "../../public/content/catalog.json" with {type:"json"};

export type Category = "Все" | "Платья" | "Костюмы" | "Накидки" | "Бельё" | "Юбки" | "Брюки" | "Блузы" | "Аксессуары";
export type View = "all" | "new" | "collection" | "promo" | "favorites";
export type Product = {
  id:string; name:string; category:Exclude<Category,"Все">; price:number|null;
  image:string; images?:string[]; colors:string[]; label?:string; isNew?:boolean;
  collection?:boolean; description:string; availability?:"in-stock"|"out-of-stock";
  hidden?:boolean; oldPrice?:number|null; sizes?:string[]; unavailableSizes?:string[];
  material?:string; measurements?:string; modelInfo?:string; relatedIds?:string[];
};
export const seedProducts:Product[]=structuredClone(initial.products) as Product[];
export const products:Product[]=structuredClone(seedProducts);
export const categories:Category[]=["Все","Платья","Костюмы","Накидки","Бельё","Юбки","Брюки","Блузы","Аксессуары"];
export const colors:Record<string,string>={"Чёрный":"#222222","Белый":"#f4f3ed","Бежевый":"#c5b492","Оливковый":"#6c7051","Синий":"#283a6c","Голубой":"#b8c9df","Коричневый":"#604139","Розовый":"#d4a6b1","Красный":"#a63536","Серый":"#949493","Зелёный":"#416951"};
export const sizes=["XS","S","M","L","XL","Подобрать размер"];
export const store={name:"White House",address:"Каспийск, ул. Ленина, 39А",hours:"Ежедневно, 09:00–22:00",phone:"+7 (909) 483-32-42",telephone:"tel:+79094833242",whatsapp:"https://wa.me/79674060006",maps:"https://yandex.ru/maps/org/white_house/76646352867",instagram:"https://www.instagram.com/white_house_____/",source:"https://whitehouse-kaspiysk.netlify.app/"};
export const money=(price:number)=>new Intl.NumberFormat("ru-RU").format(price)+" ₽";
export const whatsappUrl=(text:string)=>store.whatsapp+"?text="+encodeURIComponent(text);
export const getProduct=(id:string)=>products.find(p=>p.id===id&&!p.hidden);
export function replaceProducts(next:Product[]){products.splice(0,products.length,...next);}
export const productImages=(p:Product)=>[...new Set([p.image,...(p.images??[])])].filter(Boolean).slice(0,6);
export const discountPercent=(p:Product)=>p.price!==null&&p.oldPrice&&p.oldPrice>p.price?Math.round((1-p.price/p.oldPrice)*100):0;
export const productSizes=(p:Product)=>p.sizes?.length?[...p.sizes,"Подобрать размер"]:sizes;
