import type {CatalogData} from "./catalog.ts";
import {productSizes,money} from "../src/data/catalog.ts";

export type Customer={name:string;phone:string;delivery:"delivery"|"pickup";address:string;comment:string};
export type OrderLine={id:string;name:string;size:string;color:string;quantity:number;unitPrice:number|null};
export type OrderDraft={requestId:string;customer:Customer;items:OrderLine[];amount:number;unknown:boolean};
export type OrderStatus="new"|"confirmed"|"completed"|"cancelled";
export type MailStatus="queued"|"sending"|"sent"|"failed"|"unconfigured";
export type OrderRecord=OrderDraft&{id:number;number:string;createdAt:string;status:OrderStatus;version:number;mailStatus:MailStatus;mailAttempts:number};
export const orderStatuses:Record<OrderStatus,string>={new:"Новый",confirmed:"Подтверждён",completed:"Выполнен",cancelled:"Отменён"};
export class OrderError extends Error{status:number;constructor(message:string,status=400){super(message);this.status=status;}}
const record=(value:unknown):Record<string,unknown>=>{if(!value||typeof value!=="object"||Array.isArray(value))throw new OrderError("Проверьте данные заказа");return value as Record<string,unknown>;};
const field=(value:unknown,max:number,required=false)=>{if(typeof value!=="string"||value.length>max||(required&&!value.trim()))throw new OrderError("Заполните обязательные поля и проверьте длину текста");return value.trim();};
export function prepareOrder(value:unknown,catalog:CatalogData):OrderDraft{
  const raw=record(value),c=record(raw.customer);
  if(raw.website)throw new OrderError("Не удалось принять заявку");
  if(raw.consent!==true)throw new OrderError("Подтвердите согласие на связь по заказу");
  const requestId=field(raw.requestId,36,true);if(!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(requestId))throw new OrderError("Обновите страницу оформления заказа");
  const phone=field(c.phone,30,true),digits=phone.replace(/\D/g,"");if(!/^\+?[\d\s()\-]+$/.test(phone)||digits.length<10||digits.length>15)throw new OrderError("Укажите телефон с кодом страны");
  if(c.delivery!=="delivery"&&c.delivery!=="pickup")throw new OrderError("Выберите способ получения");
  const customer:Customer={name:field(c.name,100,true),phone,delivery:c.delivery,address:c.delivery==="delivery"?field(c.address,400,true):"",comment:field(c.comment??"",1000)};
  if(customer.name.length<2)throw new OrderError("Укажите имя покупателя");
  if(!Array.isArray(raw.items)||!raw.items.length||raw.items.length>50)throw new OrderError("Добавьте от 1 до 50 позиций в заказ");
  const quantities=new Map<string,number>();
  const items:OrderLine[]=raw.items.map(value=>{
    const item=record(value),p=catalog.products.find(p=>p.id===item.id&&!p.hidden);
    if(!p||p.availability==="out-of-stock")throw new OrderError("Состав каталога изменился. Вернитесь в корзину и обновите заказ.",409);
    const size=field(item.size,30,true),color=field(item.color,40,true);
    if(!productSizes(p).includes(size)||p.unavailableSizes?.includes(size)||(color!=="Уточнить цвет"&&!p.colors.includes(color)))throw new OrderError("Выбранный размер или цвет изменился. Обновите заказ.",409);
    if(!Number.isInteger(item.quantity)||Number(item.quantity)<1||Number(item.quantity)>99)throw new OrderError("Проверьте количество товаров");
    const key=JSON.stringify([p.id,size,color]),quantity=Number(item.quantity);quantities.set(key,(quantities.get(key)??0)+quantity);if(quantities.get(key)!>99)throw new OrderError("Не больше 99 штук одной модели и размера");
    if(item.price!==p.price)throw new OrderError("Цена товара изменилась. Обновите корзину перед оформлением.",409);
    return {id:p.id,name:p.name,size,color,quantity,unitPrice:p.price};
  });
  return {requestId,customer,items,amount:items.reduce((sum,i)=>sum+Math.round((i.unitPrice??0)*100)*i.quantity,0)/100,unknown:items.some(i=>i.unitPrice===null)};
}
export function orderText(order:OrderDraft,number?:string){
  const c=order.customer;
  return (number?"Новый заказ "+number:"Заявка с сайта White House")+"\n\n"+order.items.map((i,n)=>(n+1)+". "+i.name+"\nРазмер: "+i.size+" · Цвет: "+i.color+" · Количество: "+i.quantity+"\n"+(i.unitPrice===null?"Цена по запросу":"Цена: "+money(i.unitPrice)+" · Сумма: "+money(i.unitPrice*i.quantity))).join("\n\n")+"\n\n"+(order.unknown?"Известная стоимость: ":"Стоимость товаров: ")+money(order.amount)+(order.unknown?"\nСтоимость некоторых товаров нужно уточнить.":"")+"\nДоставка и окончательная сумма согласовываются с магазином.\n\nПокупатель: "+c.name+"\nТелефон: "+c.phone+"\nПолучение: "+(c.delivery==="pickup"?"Самовывоз, Каспийск, ул. Ленина, 39А":"Доставка\nАдрес: "+c.address)+(c.comment?"\nКомментарий: "+c.comment:"")+"\n\nОплата не проводилась. Просьба подтвердить наличие и условия заказа.";
}
