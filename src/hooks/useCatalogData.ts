import {useCallback,useEffect,useState} from "react";
import {defaultCatalog,type CatalogData} from "../../shared/catalog";
import {replaceProducts} from "../data/catalog";
import {request} from "../admin/api";

export function useCatalogData(path:string){
  const [data,setData]=useState<CatalogData>(defaultCatalog);
  const [ready,setReady]=useState(false);const [error,setError]=useState("");
  const refresh=useCallback(async()=>{
    if(import.meta.env.VITE_STATIC_PREVIEW==="true"){setReady(true);return;}
    try{const next=await request<CatalogData>("/api/catalog");if(!Array.isArray(next.products)||!Array.isArray(next.promotions)||!next.content)throw new Error("Invalid catalog");replaceProducts(next.products);setData(next);setError("");setReady(true);}
    catch{if(import.meta.env.VITE_STATIC_PREVIEW==="true"){setReady(true);}else setError("Не удалось загрузить каталог. Попробуйте обновить страницу.");}
  },[]);
  useEffect(()=>{void refresh();},[refresh,path]);
  useEffect(()=>{const visible=()=>{if(document.visibilityState==="visible")void refresh();};window.addEventListener("whitehouse:catalog-changed",visible);window.addEventListener("focus",visible);return()=>{window.removeEventListener("whitehouse:catalog-changed",visible);window.removeEventListener("focus",visible);};},[refresh]);
  return {data,ready,error,refresh};
}
