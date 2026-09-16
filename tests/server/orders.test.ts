import test from "node:test";
import assert from "node:assert/strict";
import {mkdtemp,mkdir,writeFile,rm} from "node:fs/promises";
import {join} from "node:path";
import {tmpdir} from "node:os";
import {once} from "node:events";
import {randomUUID} from "node:crypto";
import fixture from "../fixtures/catalog.json" with {type:"json"};
import {validateCatalog} from "../../shared/catalog.ts";
import {createApp} from "../../server/index.ts";
import {createOrders} from "../../server/orders.ts";
import {hashPassword,setAdministrator} from "../../server/auth.ts";
import {testAccount} from "../test-account.ts";
import {smtpMailer,type OrderMailer} from "../../server/mail.ts";

test("orders are private, validated, idempotent and durable without a configured mail service",async t=>{
  const dir=await mkdtemp(join(tmpdir(),"wh-orders-")),dist=join(dir,"dist"),dataDir=join(dir,"data");
  await mkdir(dist);await writeFile(join(dist,"app.html"),"<!doctype html><title>White House</title>");
  const origin="http://127.0.0.1:31992",app=await createApp({dataDir,origin,distDir:dist});
  const catalog=validateCatalog(fixture);catalog.products[0].sizes=["42","44"];catalog.products[0].unavailableSizes=["44"];
  await app.store.save({...catalog,revision:(await app.store.read()).revision});
  app.server.listen(0,"127.0.0.1");await once(app.server,"listening");
  const base="http://127.0.0.1:"+(app.server.address() as {port:number}).port;let cookie="";
  const request=(path:string,init:RequestInit={})=>fetch(base+path,{...init,headers:{Origin:origin,Cookie:cookie,...init.headers}});
  const post=(value:unknown,originOverride=origin)=>request("/api/orders",{method:"POST",headers:{"Content-Type":"application/json",Origin:originOverride},body:JSON.stringify(value)});
  const p=catalog.products[0];
  const payload=()=>({requestId:randomUUID(),consent:true,website:"",customer:{name:"Тестовый покупатель",phone:"+7 (000) 000-00-00",delivery:"delivery",address:"Тестовый город, улица Пример, 1",comment:"Только проверка"},items:[{id:p.id,size:"42",color:p.colors[0],quantity:2,price:p.price}]});
  let accepted:{id:number;number:string}|undefined;
  try{
    await t.test("forged origins, prices and unavailable variants are rejected",async()=>{
      assert.equal((await post(payload(),"https://other.example.test")).status,403);
      const wrong=payload();wrong.items[0].price=1;assert.equal((await post(wrong)).status,409);
      wrong.items[0].price=p.price;wrong.items[0].size="44";assert.equal((await post(wrong)).status,409);
      const empty=payload();empty.customer.address="";assert.equal((await post(empty)).status,400);
      assert.equal((await post({...payload(),consent:false})).status,400);
      assert.equal((await post({...payload(),website:"spam"})).status,400);
      assert.equal((await request("/api/admin/orders")).status,401);
    });
    const valid=payload();
    await t.test("concurrent retries create one order and never expose customer data",async()=>{
      const replies=await Promise.all([post(valid),post(valid)]);
      assert.ok(replies.every(r=>r.status===200||r.status===201));
      accepted=await replies[0].json();assert.deepEqual(await replies[1].json(),accepted);
      assert.deepEqual(Object.keys(accepted!).sort(),["id","number"]);
      assert.equal((await post({...valid,customer:{...valid.customer,name:"Другое имя"}})).status,409);
      const publicData=await (await request("/api/catalog")).text();assert.ok(!publicData.includes(valid.customer.phone));
      assert.equal((await request("/data/store.sqlite")).status,404);
    });
    setAdministrator(app.db,testAccount.email,await hashPassword(testAccount.password));
    const login=await request("/api/auth/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(testAccount)});assert.equal(login.status,200);cookie=login.headers.get("set-cookie")!.split(";")[0];
    await t.test("admin sees order details and status changes use conflict protection",async()=>{
      const result=await (await request("/api/admin/orders")).json();assert.equal(result.mailConfigured,false);assert.equal(result.orders.length,1);
      const order=result.orders[0];assert.equal(order.mailStatus,"unconfigured");assert.equal(order.customer.address,valid.customer.address);assert.equal(order.amount,Number(p.price)*2);assert.equal(order.items[0].unitPrice,p.price);
      const change=()=>request("/api/admin/orders/"+order.id,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({status:"confirmed",version:order.version})});
      assert.equal((await change()).status,200);assert.equal((await change()).status,409);
      assert.equal((await request("/api/admin/orders/"+order.id+"/retry-mail",{method:"POST"})).status,400);
      const saved=await app.store.read();saved.products=[];await app.store.save(saved);
      assert.deepEqual(await (await post(valid)).json(),accepted);
    });
    app.server.close();await once(app.server,"close");app.db.close();
    const reopened=await createApp({dataDir,origin,distDir:dist});
    try{
      await t.test("saved orders survive restart and failed delivery is retried without real email",async()=>{
        const messages:Parameters<OrderMailer["send"]>[0][]=[];let fail=true;
        const service=createOrders(reopened.db,reopened.store,{async send(message){if(fail)throw new Error("Test SMTP failure");messages.push(message);}});
        try{
          const read=()=>reopened.db.prepare("SELECT * FROM orders").get()!;
          assert.equal(read().status,"confirmed");await service.deliver();assert.equal(read().mail_attempts,1);assert.equal(read().mail_status,"queued");
          await service.deliver();assert.equal(read().mail_attempts,1);
          fail=false;reopened.db.exec("UPDATE orders SET mail_next_attempt=0");await Promise.all([service.deliver(),service.deliver()]);
          assert.equal(read().mail_status,"sent");assert.equal(messages.length,1);assert.equal(messages[0].to,"orders@example.test");assert.ok(messages[0].text.includes(valid.customer.address));assert.ok(messages[0].text.includes("Количество: 2"));
          await service.deliver();assert.equal(messages.length,1);
        }finally{service.stop();}
      });
    }finally{reopened.db.close();}
  }finally{if(app.server.listening){app.server.close();await once(app.server,"close");app.db.close();}await rm(dir,{recursive:true,force:true});}
});

test("SMTP is opt-in and validates configuration before sending",()=>{
  assert.equal(smtpMailer({}),null);
  assert.throws(()=>smtpMailer({SMTP_HOST:"smtp.example.test",SMTP_USER:"invalid",SMTP_PASSWORD:"test"}),/SMTP_FROM/);
  assert.throws(()=>smtpMailer({SMTP_HOST:"smtp.example.test",SMTP_USER:"shop@example.test",SMTP_PASSWORD:"test",SMTP_PORT:"0"}),/SMTP_PORT/);
});
