import {mkdir,readFile,writeFile} from "node:fs/promises";
import {join} from "node:path";
import {products,store} from "../src/data/catalog.ts";
const base=await readFile("dist/index.html","utf8");
const escape=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let origin="";
if(process.env.VITE_SITE_URL){const url=new URL(process.env.VITE_SITE_URL);if(!["https:","http:"].includes(url.protocol))throw new Error("Invalid public origin");origin=url.origin;}
const pages=[["/","White House — женская одежда в Каспийске"],["/catalog","Каталог — White House"],["/catalog/new","Новинки — White House"],["/catalog/collection","WH Collection — White House"],["/catalog/promo","Акции — White House"],["/favorites","Избранное — White House"],...products.map(p=>["/product/"+p.id,p.name+" — White House"])];
for(const [route,title] of pages){
 const product=products.find(p=>route==="/product/"+p.id);
 const description=product?.description??"Женская одежда White House. Платья, костюмы и WH Collection. Каспийск, ул. Ленина, 39А.";
 const schema={"@context":"https://schema.org","@type":"ClothingStore",name:store.name,address:{"@type":"PostalAddress",streetAddress:"ул. Ленина, 39А",addressLocality:"Каспийск",addressCountry:"RU"},telephone:store.phone,openingHours:["Mo-Su 09:00-22:00"],...(origin?{url:origin}:{})};
 const head='<meta property="og:title" content="'+escape(title)+'"/><meta property="og:description" content="'+escape(description)+'"/><meta property="og:type" content="website"/><meta property="og:locale" content="ru_RU"/>'+(origin?'<link rel="canonical" href="'+escape(origin+route)+'"/>':"")+'<script type="application/ld+json">'+JSON.stringify(schema).replace(/</g,"\\u003c")+'</script>';
 const fallback='<div id="root"><main><h1>'+escape(title)+'</h1><p>'+escape(description)+'</p><p>'+escape(store.address)+'</p><nav><a href="/catalog">Каталог одежды</a></nav><ul>'+products.map(p=>'<li><a href="/product/'+p.id+'">'+escape(p.name)+'</a></li>').join("")+'</ul></main></div>';
 const html=base.replace(/<title>.*?<\/title>/,()=>"<title>"+escape(title)+"</title>").replace(/<meta name="description" content="[^"]*"\s*\/?\s*>/,()=>'<meta name="description" content="'+escape(description)+'"/>').replace("</head>",()=>head+"</head>").replace('<div id="root"></div>',()=>fallback);
 const directory=join("dist",route.slice(1));await mkdir(directory,{recursive:true});await writeFile(join(directory,"index.html"),html);
}
await writeFile("dist/404.html",base);
await writeFile("dist/robots.txt","User-agent: *\nAllow: /\n"+(origin?"Sitemap: "+origin+"/sitemap.xml\n":""));
if(origin)await writeFile("dist/sitemap.xml",'<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+pages.filter(p=>p[0]!=="/favorites").map(p=>"<url><loc>"+escape(origin+p[0])+"</loc></url>").join("")+"</urlset>");
console.log("Prepared "+pages.length+" HTML entrypoints.");
