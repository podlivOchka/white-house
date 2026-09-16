import {validateCatalog,type CatalogData} from "../../shared/catalog.ts";
import {ApiError} from "./errors.ts";
import {catalogPath,githubBranch,githubRepository,vaultStorageKey} from "./github-config.ts";
import {fromBase64,toBase64,seal,unseal,type Vault} from "./vault.ts";

let accessToken="",login="",expires=0,catalogSha="",catalogRevision=-1;
const endpoint="https://api.github.com";
const repoPath="/repos/"+githubRepository;
export function readVault():Vault|null{try{const value=localStorage.getItem(vaultStorageKey);return value?JSON.parse(value):null;}catch{return null;}}
export function lockGitHub(){accessToken="";login="";expires=0;catalogSha="";catalogRevision=-1;}
export function forgetGitHub(){lockGitHub();localStorage.removeItem(vaultStorageKey);}
export function githubSession(){if(Date.now()>expires)lockGitHub();return {provider:"github" as const,user:accessToken?{email:"@"+login}:null};}
async function api<T>(path:string,init:RequestInit={},providedToken?:string):Promise<T>{
  const token=providedToken??(githubSession().user?accessToken:"");
  if(!token)throw new ApiError("Войдите в управление магазином",401);
  let response:Response;
  try{response=await fetch(endpoint+path,{...init,credentials:"omit",cache:"no-store",referrerPolicy:"no-referrer",signal:AbortSignal.timeout(25000),headers:{Accept:"application/vnd.github+json","X-GitHub-Api-Version":"2022-11-28","Content-Type":"application/json",...init.headers,Authorization:"Bearer "+token}});}catch{throw new ApiError("Не удалось связаться с GitHub. Проверьте интернет и повторите действие.",503);}
  if(!response.ok){
    if(response.status===401){lockGitHub();throw new ApiError("Ключ доступа истёк или отозван. Подключите GitHub заново.",401);}
    if(response.status===403||response.status===404)throw new ApiError("GitHub не разрешил действие. Проверьте доступ ключа к white-house и право Contents: Read and write.",response.status);
    if(response.status===409||response.status===422)throw new ApiError("Данные в GitHub изменились. Обновите каталог перед повторным сохранением.",409);
    throw new ApiError("GitHub временно недоступен. Изменения остаются в форме.",503);
  }
  expires=Date.now()+60*60*1000;
  return response.json() as Promise<T>;
}
async function verify(token:string){
  if(!/^github_pat_[A-Za-z0-9_]{20,480}$/.test(token))throw new Error("Нужен fine-grained personal access token GitHub");
  const user=await api<{login:string}>("/user",{headers:{}},token);
  if(user.login.toLowerCase()!==githubRepository.split("/")[0].toLowerCase())throw new Error("Подключите аккаунт владельца магазина: "+githubRepository.split("/")[0]);
  await api(repoPath,{headers:{}},token);
  return user.login;
}
export async function connectGitHub(token:string,password:string){
  const name=await verify(token.trim());const vault=await seal(token.trim(),password,name);
  try{localStorage.setItem(vaultStorageKey,JSON.stringify(vault));}catch{throw new Error("Браузер не разрешил сохранить защищённое подключение");}
  accessToken=token.trim();login=name;expires=Date.now()+60*60*1000;
  return githubSession();
}
export async function unlockGitHub(password:string){
  const vault=readVault();if(!vault)throw new Error("Сначала подключите GitHub на этом устройстве");
  const saved=await unseal(vault,password);const name=await verify(saved.token);
  accessToken=saved.token;login=name;expires=Date.now()+60*60*1000;
  return githubSession();
}
export async function changeDevicePassword(password:string){if(!githubSession().user)throw new Error("Войдите заново");localStorage.setItem(vaultStorageKey,JSON.stringify(await seal(accessToken,password,login)));}
type FileContent={sha:string;content:string;encoding:string;type:string};
export async function loadGitHubCatalog(){
  const result=await api<FileContent>(repoPath+"/contents/"+catalogPath+"?ref="+githubBranch);
  if(result.encoding!=="base64"||result.type!=="file")throw new Error("Файл каталога недоступен или слишком большой");
  const data=validateCatalog(JSON.parse(new TextDecoder().decode(fromBase64(result.content.replace(/\s/g,"")))));
  catalogSha=result.sha;catalogRevision=data.revision;return data;
}
export async function saveGitHubCatalog(value:CatalogData){
  if(!catalogSha||value.revision!==catalogRevision)throw new ApiError("Сначала обновите каталог",409);
  const data=validateCatalog(value);data.revision++;
  const bytes=new TextEncoder().encode(JSON.stringify(data,null,2)+"\n");if(bytes.length>900000)throw new Error("Каталог слишком большой для текущего хранилища");
  const result=await api<{content:{sha:string}}>(repoPath+"/contents/"+catalogPath,{method:"PUT",body:JSON.stringify({message:"Update White House catalog",branch:githubBranch,sha:catalogSha,content:toBase64(bytes)})});
  catalogSha=result.content.sha;catalogRevision=data.revision;return data;
}
export async function uploadGitHubPhoto(file:File){
  if(file.size>4_000_000)throw new Error("Фотография должна быть не больше 4 МБ");
  const bytes=new Uint8Array(await file.arrayBuffer());
  const jpg=file.type==="image/jpeg"&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
  const png=file.type==="image/png"&&[137,80,78,71,13,10,26,10].every((b,i)=>bytes[i]===b);
  const webp=file.type==="image/webp"&&new TextDecoder().decode(bytes.slice(0,4))==="RIFF"&&new TextDecoder().decode(bytes.slice(8,12))==="WEBP";
  if(!jpg&&!png&&!webp)throw new Error("Выберите фотографию JPG, PNG или WebP");
  const path="images/uploads/"+crypto.randomUUID()+"."+(jpg?"jpg":png?"png":"webp");
  await api(repoPath+"/contents/public/"+path,{method:"PUT",body:JSON.stringify({message:"Add White House product photograph",branch:githubBranch,content:toBase64(bytes)})});
  return {url:"/"+path};
}
