import {createServer,type IncomingMessage} from "node:http";
import {Readable} from "node:stream";
import {readFile,stat} from "node:fs/promises";
import {resolve,sep,extname} from "node:path";
import {fileURLToPath} from "node:url";
import {openDatabase} from "./database.ts";
import {createAuth} from "./auth.ts";
import {apiError,catalogApi,HttpError,json} from "./catalog-api.ts";
import {createOrders} from "./orders.ts";
import {smtpMailer,type OrderMailer} from "./mail.ts";

export async function createApp(options:{dataDir:string;origin:string;distDir:string;trustProxy?:boolean;mailer?:OrderMailer|null}){
  const origin=new URL(options.origin).origin;
  if(process.env.NODE_ENV==="production"&&!origin.startsWith("https://"))throw new Error("Для production укажите SITE_URL с HTTPS");
  const {db,store}=await openDatabase(options.dataDir);const auth=createAuth(db,origin);const dist=resolve(options.distDir);
  const orders=createOrders(db,store,options.mailer??null);
  const server=createServer(async(req,res)=>{
    try{
      const url=new URL(req.url??"/",origin);
      const headers=new Headers();for(const [key,value] of Object.entries(req.headers)){if(value!==undefined)headers.set(key,Array.isArray(value)?value.join(","):value);}
      const init:RequestInit&{duplex?:"half"}={method:req.method,headers};
      if(req.method!=="GET"&&req.method!=="HEAD"){init.body=Readable.toWeb(req) as ReadableStream<Uint8Array>;init.duplex="half";}
      const request=new Request(url,init);
      let response:Response;
      if(url.pathname==="/api/health"&&req.method==="GET")response=json({ok:true});
      else if(url.pathname.startsWith("/api/auth/"))response=await auth.handle(request,clientIp(req,options.trustProxy));
      else if(url.pathname==="/api/orders"||url.pathname.startsWith("/api/admin/orders"))response=await orders.handle(request,clientIp(req,options.trustProxy),()=>!!auth.user(request));
      else if(url.pathname.startsWith("/api/"))response=await catalogApi(request,store,async()=>!!auth.user(request));
      else{
        if(req.method!=="GET"&&req.method!=="HEAD")throw new HttpError(405,"Метод не поддерживается");
        let pathname:string;try{pathname=decodeURIComponent(url.pathname);}catch{throw new HttpError(400,"Некорректный адрес");}
        const file=resolve(dist,"."+pathname);if(file!==dist&&!file.startsWith(dist+sep))throw new HttpError(404,"Страница не найдена");
        const routes=["/","/catalog","/catalog/new","/catalog/collection","/catalog/promo","/favorites","/admin"];
        const route=pathname.replace(/\/$/,"")||"/";const product=route.startsWith("/product/")?(await store.read()).products.find(p=>p.id===route.slice(9)&&!p.hidden):null;
        const isPage=routes.includes(route)||!!product;
        let target=file;let status=200;
        // Serve the app shell for dynamic pages; old build-time product descriptions must not leak hidden items.
        if(isPage)target=resolve(dist,"app.html");
        else if(!extname(pathname)||pathname.startsWith("/product/")){target=resolve(dist,"app.html");status=404;}
        else{try{if(!(await stat(target)).isFile())throw new Error();}catch{throw new HttpError(404,"Файл не найден");}}
        const bytes=await readFile(target);const types:Record<string,string>={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".svg":"image/svg+xml",".jpg":"image/jpeg",".png":"image/png",".webp":"image/webp",".txt":"text/plain; charset=utf-8",".xml":"application/xml"};
        response=new Response(req.method==="HEAD"?null:bytes,{status,headers:{"Content-Type":types[extname(target)]??"application/octet-stream","Cache-Control":pathname.startsWith("/assets/")?"public, max-age=31536000, immutable":"no-cache"}});
      }
      response.headers.set("X-Content-Type-Options","nosniff");response.headers.set("X-Frame-Options","DENY");response.headers.set("Referrer-Policy","strict-origin-when-cross-origin");
      if(url.pathname.startsWith("/admin"))response.headers.set("X-Robots-Tag","noindex, nofollow");
      res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
    }catch(error){const response=apiError(error);res.writeHead(response.status,Object.fromEntries(response.headers));res.end(await response.text());}
  });
  server.requestTimeout=30000;server.headersTimeout=15000;
  server.on("listening",()=>orders.start());server.on("close",()=>orders.stop());
  return {server,db,store,orders};
}
function clientIp(req:IncomingMessage,trustProxy=false){const forwarded=req.headers["x-forwarded-for"];return trustProxy&&typeof forwarded==="string"?forwarded.split(",").at(-1)!.trim():req.socket.remoteAddress??"unknown";}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const port=Number(process.env.PORT||3000);const origin=process.env.SITE_URL||"http://localhost:"+port;
  const {server,db}=await createApp({dataDir:process.env.DATA_DIR||"./data",origin,distDir:"./dist",trustProxy:process.env.TRUST_PROXY==="1",mailer:smtpMailer()});
  server.listen(port,process.env.BIND_HOST||"127.0.0.1",()=>console.log("White House: "+origin));
  const close=()=>server.close(()=>{db.close();process.exit(0);});process.on("SIGTERM",close);process.on("SIGINT",close);
}
