import {useEffect,useRef,useState} from "react";
import {ArrowLeft,ImagePlus,Trash2} from "lucide-react";
import {adminImageUrl,uploadPhoto} from "./api";
import {safeImage} from "../../shared/catalog";

export default function PhotoEditor({images,onChange,onBusy,onError}:{images:string[];onChange:(next:string[])=>void;onBusy:(busy:boolean)=>void;onError:(message:string)=>void}){
  const [url,setUrl]=useState(""),[uploading,setUploading]=useState(false),[previews,setPreviews]=useState<Record<string,string>>({});
  const urls=useRef<string[]>([]);useEffect(()=>()=>urls.current.forEach(URL.revokeObjectURL),[]);
  const upload=async(files:FileList|null)=>{if(!files?.length)return;if(files.length+images.length>6){onError("В карточке может быть до шести фотографий");return;}setUploading(true);onBusy(true);const next=[...images];
    try{for(const file of Array.from(files)){const result=await uploadPhoto(file);next.push(result.url);const preview=URL.createObjectURL(file);urls.current.push(preview);setPreviews(p=>({...p,[result.url]:preview}));onChange([...next]);}}
    catch(error){onError(error instanceof Error?error.message:"Не удалось загрузить фотографию");}finally{setUploading(false);onBusy(false);}
  };
  return <div className="photo-editor"><span className="admin-field-label">Фотографии · {images.length}/6</span><div className="admin-photo-grid">{images.map((src,i)=><div key={src} className="admin-photo-tile"><img src={previews[src]??adminImageUrl(src)} alt={"Фото "+(i+1)}/><span>{i===0?"Обложка":i+1}</span><div>{i>0&&<button type="button" aria-label={"Сделать фото "+(i+1)+" обложкой"} onClick={()=>onChange([src,...images.filter((_,n)=>n!==i)])}><ArrowLeft size={14}/></button>}<button type="button" aria-label={"Убрать фото "+(i+1)} onClick={()=>onChange(images.filter((_,n)=>n!==i))}><Trash2 size={14}/></button></div></div>)}</div>
  {images.length<6&&<><label className="admin-upload"><ImagePlus size={21}/>{uploading?"Загружаем фотографии…":"Загрузить фото"}<input type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={e=>{void upload(e.target.files);e.target.value="";}}/><small>До 6 фотографий · JPG, PNG, WebP · до 4 МБ каждая</small></label><div className="photo-url"><label>Добавить фото по ссылке<input value={url} onChange={e=>setUrl(e.target.value)} maxLength={1000} placeholder="https://…"/></label><button type="button" className="text-button" disabled={!url.trim()} onClick={()=>{try{const image=safeImage(url.trim());if(!images.includes(image))onChange([...images,image]);setUrl("");}catch(error){onError(error instanceof Error?error.message:"Проверьте ссылку");}}}>Добавить</button></div></>}
  <p className="admin-help">Первое фото используется на обложке. Удаление из карточки сохраняет исходный файл.</p></div>;
}
