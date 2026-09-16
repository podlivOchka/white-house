import {useEffect,useRef,useState,type FormEvent} from "react";
import {ArrowLeft,Check,Copy,Mail,MapPin,ShoppingBag} from "lucide-react";
import {defaultContent,type CatalogData} from "../../shared/catalog";
import {prepareOrder,orderText,type Customer} from "../../shared/orders";
import {getProduct,money} from "../data/catalog";
import {total,type CartLine} from "../lib/cart";
import {request} from "../admin/api";

export default function Checkout({cart,catalog,onBack,onSuccess}:{cart:CartLine[];catalog:CatalogData;onBack:()=>void;onSuccess:(number:string)=>void}){
  const [customer,setCustomer]=useState<Customer>({name:"",phone:"",delivery:"delivery",address:"",comment:""});
  const [consent,setConsent]=useState(false),[website,setWebsite]=useState(""),[error,setError]=useState(""),[busy,setBusy]=useState(false),[prepared,setPrepared]=useState(""),[copied,setCopied]=useState(false);
  const locked=useRef(false),attempt=useRef({signature:"",id:""});
  const preparedPanel=useRef<HTMLDivElement>(null);
  useEffect(()=>{if(prepared)preparedPanel.current?.scrollIntoView({block:"nearest",behavior:"smooth"});},[prepared]);
  const preview=import.meta.env.VITE_STATIC_PREVIEW==="true";
  const summary=total(cart),email=catalog.content.orderEmail??defaultContent.orderEmail!;
  const update=(patch:Partial<Customer>)=>{setCustomer(c=>({...c,...patch}));setPrepared("");setCopied(false);};
  const submit=async(event:FormEvent)=>{
    event.preventDefault();if(locked.current)return;locked.current=true;setBusy(true);setError("");
    try{
      const fields={customer,consent,website,items:cart.map(item=>({...item,price:getProduct(item.id)?.price}))};
      const signature=JSON.stringify(fields);if(attempt.current.signature!==signature)attempt.current={signature,id:crypto.randomUUID()};
      const payload={...fields,requestId:attempt.current.id};const draft=prepareOrder(payload,catalog);
      if(preview)setPrepared(orderText(draft));
      else{const result=await request<{number:string}>("/api/orders",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});onSuccess(result.number);}
    }catch(reason){setError(reason instanceof Error?reason.message:"Не удалось оформить заказ. Попробуйте ещё раз.");}
    finally{locked.current=false;setBusy(false);}
  };
  const mailto="mailto:"+encodeURIComponent(email)+"?subject="+encodeURIComponent("Заявка с сайта White House")+"&body="+encodeURIComponent(prepared);
  return <div className="checkout"><button className="text-link checkout-back" disabled={busy} onClick={onBack}><ArrowLeft size={15}/>Вернуться в корзину</button><span className="eyebrow">ВАШ WHITE HOUSE</span><h3>Оформление заказа</h3><p className="checkout-lead">Оставьте контакты — согласуем наличие, получение и оплату.</p>
  <div className="checkout-summary"><ShoppingBag size={18}/><span>{summary.count} шт. · {summary.unknown?"Известная стоимость":"Стоимость товаров"}</span><strong>{money(summary.amount)}</strong></div><p className="checkout-small">{summary.unknown?"Стоимость некоторых моделей уточнит консультант. ":""}Доставка рассчитывается отдельно. Онлайн-оплата не проводится.</p>
  {error&&<p role="alert" className="checkout-error">{error}</p>}
  <form onSubmit={submit}><fieldset disabled={busy} className="checkout-fields">
    <label>Ваше имя<input autoComplete="name" required minLength={2} maxLength={100} value={customer.name} onChange={e=>update({name:e.target.value})}/></label>
    <label>Телефон<input type="tel" autoComplete="tel" required maxLength={30} placeholder="+7 …" value={customer.phone} onChange={e=>update({phone:e.target.value})}/></label>
    <div className="checkout-delivery"><span>Способ получения</span><label><input type="radio" name="delivery" checked={customer.delivery==="delivery"} onChange={()=>update({delivery:"delivery"})}/>Доставка</label><label><input type="radio" name="delivery" checked={customer.delivery==="pickup"} onChange={()=>update({delivery:"pickup",address:""})}/>Самовывоз</label></div>
    {customer.delivery==="delivery"?<label>Адрес доставки<textarea autoComplete="street-address" required maxLength={400} rows={3} placeholder="Город, улица, дом, квартира" value={customer.address} onChange={e=>update({address:e.target.value})}/></label>:<p className="pickup-address"><MapPin size={17}/>Каспийск, ул. Ленина, 39А</p>}
    <label>Комментарий к заказу<textarea rows={2} maxLength={1000} placeholder="Необязательно" value={customer.comment} onChange={e=>update({comment:e.target.value})}/></label>
    <label className="checkout-honeypot" aria-hidden="true">Сайт<input tabIndex={-1} autoComplete="off" value={website} onChange={e=>setWebsite(e.target.value)}/></label>
    <label className="checkout-consent"><input type="checkbox" required checked={consent} onChange={e=>{setConsent(e.target.checked);setPrepared("");}}/><span>Разрешаю магазину связаться со мной для согласования этого заказа.</span></label>
    <button className="dark-button full-width checkout-submit" type="submit">{busy?"Оформляем…":preview?"Подготовить письмо":"Оформить заказ"}<Mail size={18}/></button>
    {preview&&<p className="checkout-small">Подготовим письмо со всеми деталями. Его нужно отправить из вашего почтового приложения.</p>}
  </fieldset></form>
  {prepared&&<div className="checkout-prepared" ref={preparedPanel} role="status"><Check size={20}/><h4>Письмо подготовлено</h4><p>Получатель: <strong>{email}</strong>. Откройте почту и нажмите «Отправить» в приложении.</p>{mailto.length<=14000&&<a className="dark-button full-width" href={mailto}>Открыть почту<Mail size={17}/></a>}<button className="text-link" onClick={async()=>{try{await navigator.clipboard.writeText(prepared);setCopied(true);}catch{setError("Не удалось скопировать автоматически. Выделите текст ниже и скопируйте его.");}}}><Copy size={15}/>{copied?"Скопировано":"Скопировать текст заказа"}</button><details><summary>Текст письма</summary><pre>{prepared}</pre></details><p className="checkout-small">Магазин получит заявку после отправки письма. Дождитесь подтверждения консультанта.</p></div>}
  </div>;
}
