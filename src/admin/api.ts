import type {CatalogData} from "../../shared/catalog.ts";
import {ApiError} from "./errors";
import {githubAdmin,githubRepository,githubBranch} from "./github-config";
import {assetUrl} from "../lib/assetUrl";
export {ApiError} from "./errors";
export async function request<T>(path:string,init:RequestInit={}):Promise<T>{
  const response=await fetch(import.meta.env.BASE_URL+path.replace(/^\//,""),{...init,signal:init.signal??AbortSignal.timeout(20000),credentials:"same-origin",cache:"no-store",headers:{Accept:"application/json",...init.headers}});
  if(!response.headers.get("content-type")?.includes("application/json"))throw new ApiError("Сервер управления недоступен. Попробуйте позже.",503);
  const data=await response.json();if(!response.ok)throw new ApiError(data.error||"Не удалось выполнить запрос",response.status);return data as T;
}
export const loadCatalog=async()=>githubAdmin?(await import("./github")).loadGitHubCatalog():request<CatalogData>("/api/admin/catalog");
export const saveCatalog=async(data:CatalogData)=>githubAdmin?(await import("./github")).saveGitHubCatalog(data):request<CatalogData>("/api/admin/catalog",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)});
export const uploadPhoto=async(file:File)=>githubAdmin?(await import("./github")).uploadGitHubPhoto(file):request<{url:string}>("/api/admin/upload",{method:"POST",headers:{"Content-Type":file.type},body:file});
export const adminImageUrl=(path:string)=>githubAdmin&&path.startsWith("/images/uploads/")?"https://raw.githubusercontent.com/"+githubRepository+"/"+githubBranch+"/public"+path:assetUrl(path);
export const catalogChanged=()=>window.dispatchEvent(new Event("whitehouse:catalog-changed"));
