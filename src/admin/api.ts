import type {CatalogData} from "../../shared/catalog.ts";
export class ApiError extends Error{status:number;constructor(message:string,status:number){super(message);this.status=status;}}
export async function request<T>(path:string,init:RequestInit={}):Promise<T>{
  const response=await fetch(import.meta.env.BASE_URL+path.replace(/^\//,""),{...init,signal:init.signal??AbortSignal.timeout(20000),credentials:"same-origin",cache:"no-store",headers:{Accept:"application/json",...init.headers}});
  if(!response.headers.get("content-type")?.includes("application/json"))throw new ApiError("Сервер управления недоступен. Попробуйте позже.",503);
  const data=await response.json();if(!response.ok)throw new ApiError(data.error||"Не удалось выполнить запрос",response.status);return data as T;
}
export const loadCatalog=()=>request<CatalogData>("/api/admin/catalog");
export const saveCatalog=(data:CatalogData)=>request<CatalogData>("/api/admin/catalog",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)});
export const uploadPhoto=(file:File)=>request<{url:string}>("/api/admin/upload",{method:"POST",headers:{"Content-Type":file.type},body:file});
export const catalogChanged=()=>window.dispatchEvent(new Event("whitehouse:catalog-changed"));
