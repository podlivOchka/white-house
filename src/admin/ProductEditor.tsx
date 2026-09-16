import {useState,type FormEvent} from "react";
import {Save} from "lucide-react";
import {categories,colors,productImages,type Product} from "../data/catalog";
import PhotoEditor from "./PhotoEditor";

export default function ProductEditor({product,allProducts=[],busy,onSave,onCancel,onError}:{product?:Product;allProducts?:Product[];busy:boolean;onSave:(p:Product)=>Promise<boolean>;onCancel:()=>void;onError:(text:string)=>void}){
  const [draft,setDraft]=useState<Product>(()=>product?structuredClone(product):{id:crypto.randomUUID(),name:"",category:"Платья",price:null,image:"",colors:["Белый"],description:"",availability:"in-stock",hidden:false});
  const [price,setPrice]=useState(product?.price==null?"":String(product.price)),[oldPrice,setOldPrice]=useState(product?.oldPrice?String(product.oldPrice):"");
  const [sizeText,setSizeText]=useState(product?.sizes?.join(", ")??""),[uploading,setUploading]=useState(false);
  const patch=(value:Partial<Product>)=>setDraft(d=>({...d,...value}));
  const parseSizes=()=>[...new Set(sizeText.split(/[,;\n]/).map(s=>s.trim()).filter(Boolean))];
  const submit=async(event:FormEvent)=>{event.preventDefault();const amount=price.trim()?Number(price.replace(",",".")):null;const before=oldPrice.trim()?Number(oldPrice.replace(",",".")):null;
    if(amount!==null&&(!Number.isFinite(amount)||amount<0)){onError("Проверьте цену");return;}
    if(before!==null&&(!Number.isFinite(before)||amount===null||before<=amount)){onError("Прежняя цена должна быть больше действующей");return;}
    if(!draft.colors.length){onError("Выберите хотя бы один цвет");return;}if(!draft.image){onError("Добавьте фотографию товара");return;}
    const sizes=parseSizes();await onSave({...draft,price:amount,oldPrice:before,sizes,unavailableSizes:(draft.unavailableSizes??[]).filter(s=>sizes.includes(s)),name:draft.name.trim(),description:draft.description.trim()});
  };
  return <form onSubmit={submit} className="admin-card"><div className="admin-card-heading"><h2>{product?"Редактировать товар":"Новый товар"}</h2><button type="button" className="text-button" onClick={onCancel} disabled={busy||uploading}>{product?"Отменить":"Очистить"}</button></div><fieldset disabled={busy||uploading} className="admin-fields">
    <label>Название<input required maxLength={120} value={draft.name} onChange={e=>patch({name:e.target.value})}/></label>
    <label>Категория<select value={draft.category} onChange={e=>patch({category:e.target.value as Product["category"]})}>{categories.filter(c=>c!=="Все").map(c=><option key={c}>{c}</option>)}</select></label>
    <div className="admin-form-row"><label>Цена, ₽<input inputMode="decimal" value={price} onChange={e=>setPrice(e.target.value)} placeholder="Пусто — цена по запросу"/></label><label>Прежняя цена, ₽<input inputMode="decimal" value={oldPrice} onChange={e=>setOldPrice(e.target.value)} placeholder="Только при настоящей скидке"/></label></div>
    <PhotoEditor images={productImages(draft)} onChange={images=>patch({image:images[0]??"",images:images.slice(1)})} onBusy={setUploading} onError={onError}/>
    <label>Ссылка на фото<input required maxLength={1000} value={draft.image} onChange={e=>patch({image:e.target.value})} placeholder="Обложка товара"/></label>
    <div className="admin-color-options"><span>Цвета</span>{Object.keys(colors).map(color=><label key={color}><input type="checkbox" checked={draft.colors.includes(color)} onChange={e=>patch({colors:e.target.checked?[...draft.colors,color]:draft.colors.filter(c=>c!==color)})}/><i style={{background:colors[color]}}/>{color}</label>)}</div>
    <label>Размеры через запятую<input maxLength={300} value={sizeText} onChange={e=>setSizeText(e.target.value)} placeholder="Например: S, M, L или 42, 44, 46"/></label>
    {parseSizes().length>0&&<div className="admin-color-options"><span>Каких размеров нет в наличии</span>{parseSizes().map(size=><label key={size}><input type="checkbox" checked={draft.unavailableSizes?.includes(size)??false} onChange={e=>patch({unavailableSizes:e.target.checked?[...(draft.unavailableSizes??[]),size]:(draft.unavailableSizes??[]).filter(s=>s!==size)})}/>{size}</label>)}</div>}
    <label>Описание<textarea required maxLength={2000} rows={4} value={draft.description} onChange={e=>patch({description:e.target.value})}/></label>
    <label>Состав и уход<textarea maxLength={300} rows={2} value={draft.material??""} onChange={e=>patch({material:e.target.value})} placeholder="Укажите данные с этикетки"/></label>
    <label>Замеры и посадка<textarea maxLength={1500} rows={3} value={draft.measurements??""} onChange={e=>patch({measurements:e.target.value})} placeholder="Длина, обхват груди, талии и бёдер для каждого размера"/></label>
    <label>На модели<input maxLength={300} value={draft.modelInfo??""} onChange={e=>patch({modelInfo:e.target.value})} placeholder="Рост модели и размер на фотографии"/></label>
    <label>Метка<input maxLength={40} placeholder="Например, NEW или ХИТ" value={draft.label??""} onChange={e=>patch({label:e.target.value})}/></label>
    <label>Наличие<select value={draft.availability??"in-stock"} onChange={e=>patch({availability:e.target.value as Product["availability"]})}><option value="in-stock">В наличии</option><option value="out-of-stock">Нет в наличии</option></select></label>
    <div className="admin-checks"><label><input type="checkbox" checked={!!draft.isNew} onChange={e=>patch({isNew:e.target.checked})}/>Новинка</label><label><input type="checkbox" checked={!!draft.collection} onChange={e=>patch({collection:e.target.checked})}/>WH Collection</label><label><input type="checkbox" checked={!!draft.hidden} onChange={e=>patch({hidden:e.target.checked})}/>Скрыть с сайта</label></div>
    {allProducts.length>1&&<details className="admin-related"><summary>Сочетать с другими вещами</summary><p className="admin-help">Выберите до четырёх товаров для готового образа.</p>{allProducts.filter(p=>p.id!==draft.id&&!p.hidden).map(p=><label className="admin-check" key={p.id}><input type="checkbox" checked={draft.relatedIds?.includes(p.id)??false} disabled={!draft.relatedIds?.includes(p.id)&&(draft.relatedIds?.length??0)>=4} onChange={e=>patch({relatedIds:e.target.checked?[...(draft.relatedIds??[]),p.id]:(draft.relatedIds??[]).filter(id=>id!==p.id)})}/>{p.name}</label>)}</details>}
    <button className="dark-button" type="submit"><Save size={17}/>{busy?"Сохраняем…":product?"Сохранить товар":"Добавить товар"}</button>
  </fieldset></form>;
}
