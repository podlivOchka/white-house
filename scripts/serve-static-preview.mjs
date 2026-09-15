import {createServer} from "node:http";
import {readFile,stat} from "node:fs/promises";
import {resolve,extname,sep} from "node:path";
const root=resolve("dist");
const prefix=process.env.VITE_BASE_PATH||"/";
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript",".css":"text/css",".jpg":"image/jpeg",".png":"image/png",".svg":"image/svg+xml",".json":"application/json",".txt":"text/plain",".woff2":"font/woff2"};
createServer(async(req,res)=>{
 try{
  const pathname=decodeURIComponent(new URL(req.url,"http://localhost").pathname);
  if(prefix!=="/"&&pathname===prefix.slice(0,-1)){res.writeHead(301,{Location:prefix});res.end();return;}
  if(!pathname.startsWith(prefix)){res.writeHead(404);res.end("Not found");return;}
  let file=resolve(root,pathname.slice(prefix.length));
  if(file!==root&&!file.startsWith(root+sep)){res.writeHead(404);res.end();return;}
  try{if((await stat(file)).isDirectory())file=resolve(file,"index.html");}
  catch{res.writeHead(404,{"Content-Type":"text/html; charset=utf-8"});res.end(await readFile(resolve(root,"404.html")));return;}
  res.writeHead(200,{"Content-Type":mime[extname(file)]||"application/octet-stream"});
  res.end(await readFile(file));
 }catch{res.writeHead(404);res.end("Not found");}
}).listen(4174,"127.0.0.1",()=>console.log("Static preview listening on http://127.0.0.1:4174"+prefix));
