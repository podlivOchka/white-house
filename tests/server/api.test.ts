import fixture from "../fixtures/catalog.json" with {type:"json"};
import {validateCatalog} from "../../shared/catalog.ts";
import test from "node:test";
import assert from "node:assert/strict";
import {mkdtemp,rm,writeFile,mkdir,readFile} from "node:fs/promises";
import {join} from "node:path";
import {tmpdir} from "node:os";
import {once} from "node:events";
import {createApp} from "../../server/index.ts";
import {hashPassword,setAdministrator} from "../../server/auth.ts";
import {testAccount} from "../test-account.ts";
import type {CatalogData} from "../../shared/catalog.ts";

test("admin authentication, inventory edits and persistent storage work together",async t=>{
  const dir=await mkdtemp(join(tmpdir(),"wh-api-"));const dist=join(dir,"dist");await mkdir(dist);await writeFile(join(dist,"app.html"),"<!doctype html><title>White House</title>");
  const origin="http://127.0.0.1:31991";const app=await createApp({dataDir:join(dir,"data"),origin,distDir:dist});
  await app.store.save({...validateCatalog(fixture),revision:(await app.store.read()).revision});
  app.server.listen(0,"127.0.0.1");await once(app.server,"listening");const port=(app.server.address() as {port:number}).port;
  const base="http://127.0.0.1:"+port;let cookie="";
  const request=(path:string,init:RequestInit={})=>fetch(base+path,{...init,headers:{Origin:origin,Cookie:cookie,...init.headers}});
  const put=(data:CatalogData)=>request("/api/admin/catalog",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)});
  try{
    await t.test("anonymous and forged cookies cannot read or change administration",async()=>{
      assert.equal((await request("/api/admin/catalog")).status,401);
      assert.equal((await request("/api/admin/upload",{method:"POST",body:"x"})).status,401);
      cookie="wh_session="+"a".repeat(64);assert.equal((await request("/api/admin/catalog")).status,401);cookie="";
    });
    setAdministrator(app.db,testAccount.email,await hashPassword(testAccount.password));
    await t.test("login validates origin and credentials and issues an HttpOnly session",async()=>{
      const body=JSON.stringify(testAccount);const headers={"Content-Type":"application/json"};
      assert.equal((await request("/api/auth/login",{method:"POST",headers:{...headers,Origin:"https://untrusted.example"},body})).status,403);
      assert.equal((await request("/api/auth/login",{method:"POST",headers,body:JSON.stringify({...testAccount,email:"other@example.test"})})).status,401);
      const response=await request("/api/auth/login",{method:"POST",headers,body});assert.equal(response.status,200);
      const setCookie=response.headers.get("set-cookie")!;assert.match(setCookie,/HttpOnly/);assert.match(setCookie,/SameSite=Strict/);cookie=setCookie.split(";")[0];
      assert.equal((await (await request("/api/auth/session")).json()).user.email,testAccount.email);
    });
    let catalog:CatalogData=await (await request("/api/admin/catalog")).json();
    await t.test("catalog mutations validate fields, detect conflicts and hide private cards",async()=>{
      const initial=structuredClone(catalog);catalog.products[0].availability="out-of-stock";catalog.products[1].hidden=true;
      catalog.promotions=[{id:"bonus-one",kind:"bonus",title:"Бонус",description:"Тестовые условия",value:"Подарок",active:true},{id:"secret-promo",kind:"promo",title:"Черновик",description:"Ещё не опубликовано",value:"",active:false}];
      let response=await put(catalog);assert.equal(response.status,200);catalog=await response.json();
      assert.equal((await put(initial)).status,409);
      const visible:CatalogData=await (await request("/api/catalog")).json();assert.equal(visible.products.length,7);assert.equal(visible.products[0].availability,"out-of-stock");assert.equal(visible.promotions.length,1);
      const invalid=structuredClone(catalog);invalid.products[0].price=-1;assert.equal((await put(invalid)).status,400);
      invalid.products[0].price=100;invalid.products[0].image="javascript:alert(1)";assert.equal((await put(invalid)).status,400);
      assert.equal((await request("/api/admin/catalog",{method:"PUT",headers:{"Content-Type":"application/json",Origin:"https://untrusted.example"},body:JSON.stringify(catalog)})).status,403);
    });
    await t.test("uploads verify size and type, then serve the same image bytes",async()=>{
      const image=await readFile("public/images/photo-06.jpg");
      const response=await request("/api/admin/upload",{method:"POST",headers:{"Content-Type":"image/jpeg"},body:image});assert.equal(response.status,200);
      const uploaded=await response.json();const actual=await request(uploaded.url);assert.equal(actual.headers.get("content-type"),"image/jpeg");assert.deepEqual(Buffer.from(await actual.arrayBuffer()),image);
      assert.equal((await request("/api/admin/upload",{method:"POST",headers:{"Content-Type":"image/png"},body:"<script>bad</script>"})).status,400);
      assert.equal((await request("/api/admin/upload",{method:"POST",headers:{"Content-Type":"image/png"},body:new Uint8Array(4_000_001)})).status,413);
      assert.equal((await request("/api/catalog-image?key=../store.sqlite")).status,404);
      catalog.products.push({...catalog.products[0],id:"new-server-product",name:"Новый товар",image:uploaded.url,availability:"in-stock"});
      const response2=await put(catalog);assert.equal(response2.status,200);catalog=await response2.json();
      assert.equal((await request("/product/new-server-product")).status,200);
      assert.equal((await request("/product/"+catalog.products[1].id)).status,404);
      assert.equal((await request("/.env")).status,404);
    });
    await t.test("deleting a product persists and changing the administrator revokes sessions",async()=>{
      const removed=catalog.products[2].id;catalog.products=catalog.products.filter(p=>p.id!==removed);
      const response=await put(catalog);assert.equal(response.status,200);catalog=await response.json();
      assert.equal((await request("/product/"+removed)).status,404);
      setAdministrator(app.db,"new-admin@example.test",await hashPassword("Replacement-test-password"));
      assert.equal((await request("/api/admin/catalog")).status,401);
    });
    app.server.close();await once(app.server,"close");app.db.close();
    const reopened=await createApp({dataDir:join(dir,"data"),origin,distDir:dist});
    try{assert.deepEqual(await reopened.store.read(),catalog);}finally{reopened.db.close();}
  }finally{if(app.server.listening){app.server.close();await once(app.server,"close");app.db.close();}await rm(dir,{recursive:true,force:true});}
});
