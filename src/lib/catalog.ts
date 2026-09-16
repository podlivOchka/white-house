import {products,discountPercent,type Category,type View} from "../data/catalog.ts";
export type Sort="default"|"price-asc"|"price-desc"|"name";
export type Filters={category:Category;query:string;color:string;maxPrice:number|null;sort:Sort};
export const defaults:Filters={category:"Все",query:"",color:"",maxPrice:null,sort:"default"};
export function selectProducts(filters:Filters,view:View="all",favorites:string[]=[]){
const q=filters.query.toLocaleLowerCase("ru-RU").trim().replace(/ё/g,"е");
return products.filter(p=>{
if(p.hidden)return false;
if(view==="promo"&&!discountPercent(p))return false;
if(view==="new"&&!p.isNew)return false;
if(view==="collection"&&!p.collection)return false;
if(view==="favorites"&&!favorites.includes(p.id))return false;
if(filters.category!=="Все"&&p.category!==filters.category)return false;
if(filters.color&&!p.colors.includes(filters.color))return false;
if(filters.maxPrice!==null&&(p.price===null||p.price>filters.maxPrice))return false;
return !q||[p.name,p.category,...p.colors].join(" ").toLocaleLowerCase("ru-RU").replace(/ё/g,"е").includes(q);
}).sort((a,b)=>{
if(a.price===null&&b.price===null)return 0;
if(filters.sort==="price-asc")return (a.price??Infinity)-(b.price??Infinity);
if(filters.sort==="price-desc")return (b.price??-Infinity)-(a.price??-Infinity);
if(filters.sort==="name")return a.name.localeCompare(b.name,"ru");
return 0;
});
}
