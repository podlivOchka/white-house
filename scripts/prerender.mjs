import {mkdir,readFile,writeFile} from "node:fs/promises";
import {join} from "node:path";
import {products,store} from "../src/data/catalog.ts";

const template=await readFile("dist/index.html","utf8");
await writeFile("dist/app.html",template);
const staticPreview=process.env.VITE_STATIC_PREVIEW==="true";
const basePath=process.env.VITE_BASE_PATH||"/";
if(!/^\/(?:[a-zA-Z0-9_-]+\/)*$/.test(basePath))throw new Error("VITE_BASE_PATH must be an absolute directory path ending in /");
const preview=process.env.VITE_PREVIEW==="true";
const localUrl=route=>basePath+route.replace(/^\//,"");
const escape=value=>String(value).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let siteUrl="";
if(process.env.VITE_SITE_URL){
 const url=new URL(process.env.VITE_SITE_URL);
 if(!["https:","http:"].includes(url.protocol))throw new Error("Invalid public origin");
 siteUrl=url.origin+url.pathname.replace(/\/$/,"");
}
const absoluteUrl=route=>siteUrl+(route==="/"?"/":route);
const pages=[
 ["/","White House — женская одежда в Каспийске"],
 ["/catalog","Каталог — White House"],
 ["/catalog/new","Новинки — White House"],
 ["/catalog/collection","WH Collection — White House"],
 ["/catalog/promo","Акции — White House"],
 ["/favorites","Избранное — White House"],
 ["/admin","Управление магазином — White House"],
 ...products.map(p=>["/product/"+p.id,p.name+" — White House"])
];
for(const [route,title] of pages){
 const product=staticPreview&&products.find(p=>route==="/product/"+p.id);
 const description=product?.description??"Женская одежда White House. Платья, костюмы и WH Collection. Каспийск, ул. Ленина, 39А.";
 const schema={"@context":"https://schema.org","@type":"ClothingStore",name:store.name,address:{"@type":"PostalAddress",streetAddress:"ул. Ленина, 39А",addressLocality:"Каспийск",addressCountry:"RU"},telephone:store.phone,openingHours:["Mo-Su 09:00-22:00"],...(siteUrl?{url:siteUrl+"/"}:{})};
 const head='<meta property="og:title" content="'+escape(title)+'"/><meta property="og:description" content="'+escape(description)+'"/><meta property="og:type" content="website"/><meta property="og:locale" content="ru_RU"/>'+
   (preview||route==="/favorites"||route==="/admin"?'<meta name="robots" content="noindex, nofollow"/>':"")+
   (siteUrl&&!preview?'<link rel="canonical" href="'+escape(absoluteUrl(route))+'"/>':"")+
   '<script type="application/ld+json">'+JSON.stringify(schema).replace(/</g,"\\u003c")+'</script>';
 const fallback=staticPreview?'<div id="root"><main><h1>'+escape(title)+'</h1><p>'+escape(description)+'</p><p>'+escape(store.address)+'</p><nav><a href="'+escape(localUrl("/catalog"))+'">Каталог одежды</a></nav><ul>'+products.map(p=>'<li><a href="'+escape(localUrl("/product/"+p.id))+'">'+escape(p.name)+'</a></li>').join("")+'</ul></main></div>':'<div id="root"><main><h1>White House</h1><p>Загружаем коллекцию…</p></main></div>';
 const html=template.replace(/<title>.*?<\/title>/,()=>"<title>"+escape(title)+"</title>")
   .replace(/<meta name="description" content="[^"]*"\s*\/?\s*>/,()=>'<meta name="description" content="'+escape(description)+'"/>')
   .replace("</head>",()=>head+"</head>")
   .replace('<div id="root"></div>',()=>fallback);
 const directory=join("dist",route.slice(1));
 await mkdir(directory,{recursive:true});
 await writeFile(join(directory,"index.html"),html);
}
await writeFile("dist/404.html",template.replace("</head>",'<meta name="robots" content="noindex, nofollow"/></head>'));
await writeFile("dist/.nojekyll","");
await writeFile("dist/robots.txt",preview?"User-agent: *\nDisallow: /\n":"User-agent: *\nAllow: /\n"+(siteUrl?"Sitemap: "+siteUrl+"/sitemap.xml\n":""));
if(siteUrl&&!preview)await writeFile("dist/sitemap.xml",'<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+pages.filter(p=>p[0]!=="/favorites"&&p[0]!=="/admin").map(p=>"<url><loc>"+escape(absoluteUrl(p[0]))+"</loc></url>").join("")+"</urlset>");
console.log("Prepared "+pages.length+" HTML entrypoints at "+basePath+".");
