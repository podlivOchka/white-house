import {mkdir,readFile,writeFile} from "node:fs/promises";
import {join} from "node:path";
const names=["01","06","07","08","09","10","11","12","13"].map(n=>"photo-"+n+".jpg");
const destination=join(process.cwd(),"public","images");
await mkdir(destination,{recursive:true});
const valid=b=>b.length>2000&&b.length<8000000&&b[0]===255&&b[1]===216;
await Promise.all(names.map(async name=>{
 const target=join(destination,name);
 try{if(valid(await readFile(target)))return;}catch{}
 const url="https://whitehouse-kaspiysk.netlify.app/img/"+name;
 let last;
 for(let attempt=0;attempt<2;attempt++){
  try{const response=await fetch(url,{signal:AbortSignal.timeout(30000)});if(!response.ok)throw new Error(name+": HTTP "+response.status);const bytes=Buffer.from(await response.arrayBuffer());if(!valid(bytes))throw new Error(name+": invalid JPEG");await writeFile(target,bytes);return;}catch(error){last=error;}
 }
 throw last;
}));
console.log("Verified "+names.length+" catalog images.");
