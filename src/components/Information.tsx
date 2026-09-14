import {ArrowUpRight,MapPin,MessageCircle} from "lucide-react";
import {store,whatsappUrl} from "../data/catalog";
import type {Info} from "./Header";
export const infoTitles:Record<Info,string>={store:"Ждём вас в магазине",delivery:"Доставка и примерка",size:"Подберём ваш размер"};
export default function Information({info}:{info:Info}){
if(info==="store")return <div className="info-content"><p><MapPin size={19}/>{store.address}</p><p>{store.hours}</p><a className="info-phone" href={store.telephone}>{store.phone}</a><a className="dark-button full-width" href={store.maps} target="_blank" rel="noreferrer">Открыть Яндекс Карты<ArrowUpRight size={17}/></a></div>;
if(info==="delivery")return <div className="info-content"><h3>Примерка в магазине</h3><p>Каспийск, ул. Ленина, 39А. Напишите заранее, чтобы уточнить наличие нужной модели и размера.</p><h3>Доставка</h3><p>Условия, стоимость и сроки доставки, оплаты и возврата согласовываются с консультантом до покупки.</p><a className="dark-button" href={whatsappUrl("Добрый день. Подскажите, пожалуйста, условия доставки, оплаты и возврата заказа в White House.")} target="_blank" rel="noreferrer">Уточнить условия<MessageCircle size={17}/></a></div>;
return <div className="info-content"><p>В карточке можно указать желаемый размер или выбрать «Подобрать размер». Консультант уточнит посадку и подскажет доступные варианты.</p><p>Размеры в карточке нужны для запроса. Наличие конкретного размера подтверждается при согласовании заказа.</p><a className="dark-button" href={whatsappUrl("Добрый день. Помогите, пожалуйста, подобрать размер одежды в White House.")} target="_blank" rel="noreferrer">Помочь с размером<MessageCircle size={17}/></a></div>;
}
