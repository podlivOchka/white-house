import {getProduct,money,sizes} from "../data/catalog.ts";
export type CartLine={id:string;size:string;color:string;quantity:number};
export const lineKey=(line:Pick<CartLine,"id"|"size"|"color">)=>JSON.stringify([line.id,line.size,line.color]);
export function parseCart(value:unknown):CartLine[]{
if(!Array.isArray(value))return [];
const lines:CartLine[]=[];
for(const item of value.slice(0,100)){
 if(!item||typeof item!=="object")continue;
 const p=getProduct(item.id);
 if(!p||p.availability==="out-of-stock"||!sizes.includes(item.size)||typeof item.color!=="string"||(!p.colors.includes(item.color)&&item.color!=="Уточнить цвет")||!Number.isInteger(item.quantity)||item.quantity<1||item.quantity>99)continue;
 const line={id:p.id,size:item.size,color:item.color,quantity:item.quantity};
 const same=lines.find(x=>lineKey(x)===lineKey(line));
 if(same)same.quantity=Math.min(99,same.quantity+line.quantity);else lines.push(line);
}
return lines;
}
export function parseFavorites(value:unknown):string[]{return Array.isArray(value)?[...new Set(value.filter((id):id is string=>typeof id==="string"&&!!getProduct(id)))]:[];}
export function addLine(cart:CartLine[],line:CartLine):CartLine[]{return parseCart([...cart,line]);}
export function total(input:CartLine[]){const cart=parseCart(input);return {amount:cart.reduce((n,l)=>n+(getProduct(l.id)?.price??0)*l.quantity,0),unknown:cart.some(l=>getProduct(l.id)?.price===null),count:cart.reduce((n,l)=>n+l.quantity,0)};}
export function orderMessage(cart:CartLine[]){
return "Добрый день. Хочу уточнить наличие и заказать в White House:\n\n"+parseCart(cart).map((l,i)=>{
const p=getProduct(l.id)!;
return (i+1)+". "+p.name+"\nРазмер: "+l.size+". Цвет: "+l.color+". Количество: "+l.quantity+"."+(p.price===null?"\nУточните, пожалуйста, стоимость.":"\nЦена в каталоге: "+money(p.price));
}).join("\n\n")+"\n\nПодтвердите, пожалуйста, актуальные цены, размеры и условия получения.";
}
