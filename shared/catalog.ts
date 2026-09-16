import {categories,colors,seedProducts,type Product} from "../src/data/catalog.ts";
import initial from "../public/content/catalog.json" with {type:"json"};

export type Promotion={id:string;title:string;description:string;kind:"promo"|"discount"|"bonus";value:string;active:boolean};
export type BannerKey="home"|"catalog"|"new"|"collection"|"promo";
export type Banner={title:string;caption:string;image:string};
export type StoreContent={promoTitle:string;promoDescription:string;bonusText:string;orderEmail?:string;banners?:Record<BannerKey,Banner>};
export type CatalogData={products:Product[];promotions:Promotion[];content:StoreContent;revision:number};
export const defaultContent:StoreContent=structuredClone(initial.content);
export const defaultCatalog=():CatalogData=>({products:structuredClone(seedProducts),promotions:structuredClone(initial.promotions) as Promotion[],content:structuredClone(defaultContent),revision:initial.revision});

function object(value:unknown):Record<string,unknown>{
  if(!value||typeof value!=="object"||Array.isArray(value))throw new Error("Некорректные данные");
  return value as Record<string,unknown>;
}
function text(value:unknown,max:number,required=false){
  if(typeof value!=="string"||value.trim().length>max||(required&&!value.trim()))throw new Error("Проверьте обязательные поля и длину текста");
  return value.trim();
}
function id(value:unknown){const result=text(value,80,true);if(!/^[a-z0-9][a-z0-9-]*$/.test(result))throw new Error("Некорректный идентификатор");return result;}
function flag(value:unknown,optional=false){if(value===undefined&&optional)return false;if(typeof value!=="boolean")throw new Error("Некорректный статус");return value;}
export function safeImage(value:unknown){
  const result=text(value,1000,true);
  if(/^\/images\/(?:uploads\/)?[\w-]+\.(?:jpe?g|png|webp)$/i.test(result)||/^\/api\/catalog-image\?key=images(?:%2F|\/)[a-f0-9-]+\.(?:jpg|png|webp)$/i.test(result))return result;
  try{const url=new URL(result);if(url.protocol==="https:"&&!url.username&&!url.password)return url.href;}catch{}
  throw new Error("Укажите HTTPS-ссылку на фото или загрузите его с устройства");
}
export function validateCatalog(value:unknown):CatalogData{
  const raw=object(value);
  if(!Number.isSafeInteger(raw.revision)||Number(raw.revision)<0)throw new Error("Некорректная версия каталога");
  if(!Array.isArray(raw.products)||raw.products.length>500||!Array.isArray(raw.promotions)||raw.promotions.length>100)throw new Error("Превышено число карточек или предложений");
  const products:Product[]=raw.products.map(item=>{
    const p=object(item);const category=text(p.category,40,true);
    if(category==="Все"||!categories.includes(category as Product["category"]))throw new Error("Выберите категорию товара");
    if(p.price!==null&&(typeof p.price!=="number"||!Number.isFinite(p.price)||p.price<0||p.price>10000000))throw new Error("Некорректная цена");
    if(!Array.isArray(p.colors)||!p.colors.length||p.colors.length>12||p.colors.some(c=>typeof c!=="string"||!Object.hasOwn(colors,c)))throw new Error("Выберите цвет товара");
    if(p.availability!==undefined&&p.availability!=="in-stock"&&p.availability!=="out-of-stock")throw new Error("Некорректное наличие");
    const list=(v:unknown,max:number,itemMax:number):string[]=>{if(v===undefined)return [];if(!Array.isArray(v)||v.length>max)throw new Error("Слишком много значений в карточке");return [...new Set(v.map(x=>text(x,itemMax,true)))];};
    const sizes=list(p.sizes,20,20),unavailableSizes=list(p.unavailableSizes,20,20);
    if(unavailableSizes.some(s=>!sizes.includes(s)))throw new Error("Отсутствующий размер должен быть в списке размеров");
    if(p.oldPrice!==undefined&&p.oldPrice!==null&&(typeof p.oldPrice!=="number"||!Number.isFinite(p.oldPrice)||p.price===null||p.oldPrice<=Number(p.price)||p.oldPrice>10000000))throw new Error("Прежняя цена должна быть больше действующей");
    return {id:id(p.id),name:text(p.name,120,true),category:category as Product["category"],price:p.price===null?null:Math.round(Number(p.price)*100)/100,image:safeImage(p.image),images:list(p.images,6,1000).map(safeImage),colors:[...new Set(p.colors as string[])],description:text(p.description,2000,true),label:p.label===undefined?undefined:text(p.label,40),isNew:flag(p.isNew,true),collection:flag(p.collection,true),hidden:flag(p.hidden,true),availability:p.availability??"in-stock",oldPrice:p.oldPrice==null?null:Math.round(Number(p.oldPrice)*100)/100,sizes,unavailableSizes,material:text(p.material??"",300),measurements:text(p.measurements??"",1500),modelInfo:text(p.modelInfo??"",300),relatedIds:list(p.relatedIds,4,80).map(id)};
  });
  const promotions:Promotion[]=raw.promotions.map(item=>{const p=object(item);if(!["promo","discount","bonus"].includes(String(p.kind)))throw new Error("Некорректный тип предложения");return {id:id(p.id),title:text(p.title,120,true),description:text(p.description,1500,true),kind:p.kind as Promotion["kind"],value:text(p.value??"",120),active:flag(p.active)};});
  if(new Set(products.map(p=>p.id)).size!==products.length||new Set(promotions.map(p=>p.id)).size!==promotions.length)throw new Error("Идентификаторы не должны повторяться");
  const c=object(raw.content);
  const orderEmail=text(c.orderEmail??defaultContent.orderEmail??"",254,true);
  if(!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(orderEmail))throw new Error("Проверьте почту для заказов");
  const banners=structuredClone(defaultContent.banners)!;
  if(c.banners!==undefined){const source=object(c.banners);for(const key of Object.keys(banners) as BannerKey[]){if(source[key]!==undefined){const b=object(source[key]);banners[key]={title:text(b.title,100,true),caption:text(b.caption,160),image:safeImage(b.image)};}}}
  return {products,promotions,content:{promoTitle:text(c.promoTitle,160),promoDescription:text(c.promoDescription,1500),bonusText:text(c.bonusText,1500),orderEmail,banners},revision:Number(raw.revision)};
}
export function publicCatalog(data:CatalogData):CatalogData{return {...data,products:data.products.filter(p=>!p.hidden),promotions:data.promotions.filter(p=>p.active)};}
