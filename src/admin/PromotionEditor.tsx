import {useState,type FormEvent} from "react";
import type {Promotion} from "../../shared/catalog";
export default function PromotionEditor({promotion,busy,onSave,onCancel}:{promotion?:Promotion;busy:boolean;onSave:(p:Promotion)=>Promise<boolean>;onCancel:()=>void}){
  const [draft,setDraft]=useState<Promotion>(()=>promotion?{...promotion}:{id:crypto.randomUUID(),title:"",description:"",kind:"promo",value:"",active:true});
  const patch=(p:Partial<Promotion>)=>setDraft(d=>({...d,...p}));
  const submit=async(event:FormEvent)=>{event.preventDefault();await onSave(draft);};
  return <form onSubmit={submit} className="admin-card"><div className="admin-card-heading"><h2>{promotion?"Редактировать предложение":"Новое предложение"}</h2><button type="button" className="text-button" disabled={busy} onClick={onCancel}>Отменить</button></div><fieldset disabled={busy} className="admin-fields">
    <label>Название предложения<input required maxLength={120} value={draft.title} onChange={e=>patch({title:e.target.value})}/></label>
    <div className="admin-form-row"><label>Тип предложения<select value={draft.kind} onChange={e=>patch({kind:e.target.value as Promotion["kind"]})}><option value="promo">Акция</option><option value="discount">Скидка</option><option value="bonus">Бонус</option></select></label><label>Размер или условие<input maxLength={120} placeholder="Например, −10%" value={draft.value} onChange={e=>patch({value:e.target.value})}/></label></div>
    <label>Условия предложения<textarea required maxLength={1500} rows={4} value={draft.description} onChange={e=>patch({description:e.target.value})}/></label>
    <label className="admin-check"><input type="checkbox" checked={draft.active} onChange={e=>patch({active:e.target.checked})}/>Показывать на сайте</label><button className="dark-button" type="submit">{busy?"Сохраняем…":promotion?"Сохранить предложение":"Добавить предложение"}</button>
  </fieldset></form>;
}
