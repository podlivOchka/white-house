import {useState,type FormEvent} from "react";
import {ImagePlus,Save} from "lucide-react";
import {categories,colors,type Product} from "../data/catalog";
import {assetUrl} from "../lib/assetUrl";
import {uploadPhoto} from "./api";

export default function ProductEditor({product,busy,onSave,onCancel,onError}:{product?:Product;busy:boolean;onSave:(p:Product)=>Promise<boolean>;onCancel:()=>void;onError:(text:string)=>void}){
  const [draft,setDraft]=useState<Product>(()=>product?structuredClone(product):{id:crypto.randomUUID(),name:"",category:"Платья",price:null,image:"",colors:["Белый"],description:"",availability:"in-stock",hidden:false});
  const [price,setPrice]=useState(product?.price===null||!product?"":String(product.price));
  const [uploading,setUploading]=useState(false);
  const patch=(value:Partial<Product>)=>setDraft(d=>({...d,...value}));
  const upload=async(file?:File)=>{if(!file)return;if(!["image/jpeg","image/png","image/webp"].includes(file.type)||file.size>4_000_000){onError("Выберите JPG, PNG или WebP до 4 МБ");return;}setUploading(true);try{const result=await uploadPhoto(file);patch({image:result.url});}catch(error){onError(error instanceof Error?error.message:"Не удалось загрузить фото");}finally{setUploading(false);}};
  const submit=async(event:FormEvent)=>{event.preventDefault();const amount=price.trim()?Number(price.replace(",",".")):null;if(amount!==null&&(!Number.isFinite(amount)||amount<0)){onError("Проверьте цену");return;}if(!draft.colors.length){onError("Выберите хотя бы один цвет");return;}await onSave({...draft,price:amount,name:draft.name.trim(),description:draft.description.trim()});};
  return <form onSubmit={submit} className="admin-card"><div className="admin-card-heading"><h2>{product?"Редактировать товар":"Новый товар"}</h2><button type="button" className="text-button" onClick={onCancel} disabled={busy||uploading}>{product?"Отменить":"Очистить"}</button></div><fieldset disabled={busy||uploading} className="admin-fields">
    <label>Название<input required maxLength={120} value={draft.name} onChange={e=>patch({name:e.target.value})}/></label>
    <div className="admin-form-row"><label>Категория<select value={draft.category} onChange={e=>patch({category:e.target.value as Product["category"]})}>{categories.filter(c=>c!=="Все").map(c=><option key={c}>{c}</option>)}</select></label><label>Цена, ₽<input inputMode="decimal" value={price} onChange={e=>setPrice(e.target.value)} placeholder="Пусто — цена по запросу"/></label></div>
    <div className="admin-photo-edit">{draft.image&&<img src={assetUrl(draft.image)} alt="Предпросмотр фото товара"/>}<label className="admin-upload"><ImagePlus size={22}/>{uploading?"Загрузка…":"Загрузить фото"}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>{void upload(e.target.files?.[0]);e.target.value="";}}/><small>JPG, PNG, WebP · до 4 МБ</small></label></div>
    <label>Ссылка на фото<input required maxLength={1000} value={draft.image} onChange={e=>patch({image:e.target.value})} placeholder="Или вставьте HTTPS-ссылку"/></label>
    <div className="admin-color-options"><span>Цвета</span>{Object.keys(colors).map(color=><label key={color}><input type="checkbox" checked={draft.colors.includes(color)} onChange={e=>patch({colors:e.target.checked?[...draft.colors,color]:draft.colors.filter(c=>c!==color)})}/><i style={{background:colors[color]}}/>{color}</label>)}</div>
    <label>Описание<textarea required maxLength={2000} rows={4} value={draft.description} onChange={e=>patch({description:e.target.value})}/></label>
    <label>Метка<input maxLength={40} placeholder="Например, NEW или ХИТ" value={draft.label??""} onChange={e=>patch({label:e.target.value})}/></label>
    <label>Наличие<select value={draft.availability??"in-stock"} onChange={e=>patch({availability:e.target.value as Product["availability"]})}><option value="in-stock">В наличии</option><option value="out-of-stock">Нет в наличии</option></select></label>
    <div className="admin-checks"><label><input type="checkbox" checked={!!draft.isNew} onChange={e=>patch({isNew:e.target.checked})}/>Новинка</label><label><input type="checkbox" checked={!!draft.collection} onChange={e=>patch({collection:e.target.checked})}/>WH Collection</label><label><input type="checkbox" checked={!!draft.hidden} onChange={e=>patch({hidden:e.target.checked})}/>Скрыть с сайта</label></div>
    <button className="dark-button" type="submit"><Save size={17}/>{busy?"Сохраняем…":product?"Сохранить товар":"Добавить товар"}</button>
  </fieldset></form>;
}
