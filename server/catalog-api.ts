import {publicCatalog,validateCatalog,type CatalogData} from "../shared/catalog.ts";

export interface CatalogStore{
  read():Promise<CatalogData>;
  save(data:CatalogData):Promise<boolean>;
  upload(key:string,data:Uint8Array):Promise<void>;
  image(key:string):Promise<Uint8Array|null>;
}
export class HttpError extends Error{status:number;constructor(status:number,message:string){super(message);this.status=status;}}
export const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});
export function checkOrigin(req:Request,origin=new URL(req.url).origin){
  if(req.headers.get("origin")!==origin)throw new HttpError(403,"Запрос должен быть отправлен с сайта магазина");
}
export async function bodyBytes(req:Request,max:number){
  if(Number(req.headers.get("content-length"))>max)throw new HttpError(413,"Файл или запрос слишком большой");
  const reader=req.body?.getReader();if(!reader)return new Uint8Array();
  const chunks:Uint8Array[]=[];let size=0;
  for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>max){void reader.cancel();throw new HttpError(413,"Файл или запрос слишком большой");}chunks.push(value);}
  const result=new Uint8Array(size);let offset=0;for(const chunk of chunks){result.set(chunk,offset);offset+=chunk.length;}return result;
}
export async function bodyJson(req:Request){
  if(req.headers.get("content-type")?.split(";")[0]!=="application/json")throw new HttpError(415,"Ожидается JSON");
  try{return JSON.parse(new TextDecoder().decode(await bodyBytes(req,1_000_000))) as unknown;}catch(error){if(error instanceof HttpError)throw error;throw new HttpError(400,"Не удалось прочитать данные");}
}
export function imageExtension(bytes:Uint8Array,type:string){
  const b=Buffer.from(bytes);
  if(type==="image/jpeg"&&b.length>3&&b[0]===255&&b[1]===216&&b[2]===255)return "jpg";
  if(type==="image/png"&&b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return "png";
  if(type==="image/webp"&&b.length>12&&b.toString("ascii",0,4)==="RIFF"&&b.toString("ascii",8,12)==="WEBP")return "webp";
  throw new HttpError(400,"Нужна фотография JPG, PNG или WebP до 4 МБ");
}
export async function catalogApi(req:Request,store:CatalogStore,isAdmin:()=>Promise<boolean>){
  const url=new URL(req.url);const path=url.pathname;
  if(path==="/api/catalog"&&req.method==="GET")return json(publicCatalog(await store.read()));
  if(path==="/api/catalog-image"&&(req.method==="GET"||req.method==="HEAD")){
    const key=url.searchParams.get("key")??"";
    if(!/^images\/[a-f0-9-]{36}\.(?:jpg|png|webp)$/.test(key))throw new HttpError(404,"Фото не найдено");
    const image=await store.image(key);if(!image)throw new HttpError(404,"Фото не найдено");
    return new Response(req.method==="HEAD"?null:new Uint8Array(image),{headers:{"Content-Type":key.endsWith(".png")?"image/png":key.endsWith(".webp")?"image/webp":"image/jpeg","Cache-Control":"public, max-age=31536000, immutable","X-Content-Type-Options":"nosniff"}});
  }
  if(!["/api/admin/catalog","/api/admin/upload"].includes(path))throw new HttpError(404,"Адрес не найден");
  if(!await isAdmin())throw new HttpError(401,"Войдите в учётную запись администратора");
  if(path==="/api/admin/catalog"&&req.method==="GET")return json(await store.read());
  checkOrigin(req);
  if(path==="/api/admin/catalog"&&req.method==="PUT"){
    let data:CatalogData;try{data=validateCatalog(await bodyJson(req));}catch(error){if(error instanceof HttpError)throw error;throw new HttpError(400,error instanceof Error?error.message:"Проверьте данные");}
    if(!await store.save(data))throw new HttpError(409,"Каталог изменён в другой вкладке. Обновите данные и повторите изменение.");
    return json({...data,revision:data.revision+1});
  }
  if(path==="/api/admin/upload"&&req.method==="POST"){
    const bytes=await bodyBytes(req,4_000_000);const ext=imageExtension(bytes,req.headers.get("content-type")??"");
    const key="images/"+crypto.randomUUID()+"."+ext;await store.upload(key,bytes);
    return json({url:"/api/catalog-image?key="+encodeURIComponent(key)});
  }
  throw new HttpError(405,"Метод не поддерживается");
}
export function apiError(error:unknown){if(error instanceof HttpError)return json({error:error.message},error.status);console.error("Server request failed",error instanceof Error?error.name:"UnknownError");return json({error:"Сервис временно недоступен. Попробуйте ещё раз."},503);}
