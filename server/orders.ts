import {createHash} from "node:crypto";
import type {DatabaseSync} from "node:sqlite";
import {OrderError,prepareOrder,orderText,orderStatuses,type OrderDraft,type OrderRecord,type OrderStatus,type MailStatus} from "../shared/orders.ts";
import {bodyJson,checkOrigin,HttpError,json,type CatalogStore} from "./catalog-api.ts";
import type {OrderMailer} from "./mail.ts";

export function createOrders(db:DatabaseSync,store:CatalogStore,mailer:OrderMailer|null){
  db.exec(`CREATE TABLE IF NOT EXISTS orders (id INTEGER PRIMARY KEY AUTOINCREMENT, request_key TEXT UNIQUE NOT NULL, payload_hash TEXT NOT NULL, data TEXT NOT NULL, recipient TEXT NOT NULL, created_at TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'new', version INTEGER NOT NULL DEFAULT 0, mail_status TEXT NOT NULL DEFAULT 'queued', mail_attempts INTEGER NOT NULL DEFAULT 0, mail_next_attempt INTEGER NOT NULL DEFAULT 0);
  CREATE TABLE IF NOT EXISTS order_limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires_at INTEGER NOT NULL);`);
  let running=false,closed=false,timer:ReturnType<typeof setInterval>|undefined;
  const number=(id:number)=>"WH-"+String(id).padStart(6,"0");
  type Row=Record<string,unknown>;
  const read=(row:Row):OrderRecord=>({...JSON.parse(String(row.data)) as OrderDraft,id:Number(row.id),number:number(Number(row.id)),createdAt:String(row.created_at),status:row.status as OrderStatus,version:Number(row.version),mailStatus:row.mail_status as MailStatus,mailAttempts:Number(row.mail_attempts)});
  const digest=(value:string)=>createHash("sha256").update(value).digest("hex");
  const limited=(ip:string)=>{
    const now=Date.now();db.prepare("DELETE FROM order_limits WHERE expires_at<?").run(now);
    for(const [key,max] of [["all",200],["ip:"+digest(ip),20]] as const){const row=db.prepare("SELECT count FROM order_limits WHERE key=?").get(key);if(row&&Number(row.count)>=max)throw new HttpError(429,"Слишком много заявок. Попробуйте позже или свяжитесь с магазином.");}
    for(const key of ["all","ip:"+digest(ip)])db.prepare("INSERT INTO order_limits VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1").run(key,now+60*60*1000);
  };
  async function deliver(){
    if(!mailer||running||closed)return;running=true;
    try{
      db.prepare("UPDATE orders SET mail_status='queued' WHERE mail_status='sending' AND mail_next_attempt<?").run(Date.now());
      db.exec("UPDATE orders SET mail_status='queued' WHERE mail_status='unconfigured'");
      const rows=db.prepare("SELECT * FROM orders WHERE mail_status='queued' AND mail_next_attempt<=? ORDER BY id LIMIT 10").all(Date.now());
      for(const row of rows){
        if(closed)break;
        const claimed=db.prepare("UPDATE orders SET mail_status='sending',mail_attempts=mail_attempts+1,mail_next_attempt=? WHERE id=? AND mail_status='queued'").run(Date.now()+120000,row.id as number);if(!claimed.changes)continue;
        const order=read(row);let success=false;try{await mailer.send({to:String(row.recipient),subject:"Новый заказ "+order.number+" · White House",text:orderText(order,order.number),id:order.requestId});success=true;}catch{/* Keep order data and retry; do not log customer details or SMTP responses. */}
        if(closed)break;
        const attempts=Number(row.mail_attempts)+1;
        db.prepare("UPDATE orders SET mail_status=?,mail_next_attempt=? WHERE id=?").run(success?"sent":attempts>=5?"failed":"queued",Date.now()+Math.min(3600000,30000*2**attempts),order.id);
      }
    }finally{running=false;}
  }
  const dispatch=()=>{void deliver().catch(()=>{console.error("Не удалось обработать очередь уведомлений");});};
  return {
    deliver,
    start(){if(!timer&&mailer)timer=setInterval(dispatch,30000);timer?.unref();},
    stop(){closed=true;if(timer)clearInterval(timer);mailer?.close?.();},
    async handle(req:Request,ip:string,isAdmin:()=>boolean){
      const url=new URL(req.url),path=url.pathname;
      if(path==="/api/orders"&&req.method==="POST"){
        checkOrigin(req);const raw=await bodyJson(req) as Record<string,unknown>;
        if(!raw||typeof raw!=="object"||Array.isArray(raw))throw new HttpError(400,"Проверьте заказ");
        const requestId=raw.requestId;if(typeof requestId!=="string"||requestId.length!==36)throw new HttpError(400,"Обновите страницу оформления");
        const hash=digest(JSON.stringify(raw));
        const existing=db.prepare("SELECT * FROM orders WHERE request_key=?").get(requestId);
        if(existing){if(existing.payload_hash!==hash)throw new HttpError(409,"Этот запрос уже принят. Обновите форму для нового заказа.");const order=read(existing);return json({number:order.number,id:order.id});}
        limited(ip);const catalog=await store.read();let draft:OrderDraft;
        try{draft=prepareOrder(raw,catalog);}catch(error){if(error instanceof OrderError)throw new HttpError(error.status,error.message);throw error;}
        const recipient=catalog.content.orderEmail??"";if(!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(recipient))throw new HttpError(503,"Приём заявок временно недоступен. Свяжитесь с магазином.");
        const result=db.prepare("INSERT OR IGNORE INTO orders(request_key,payload_hash,data,recipient,created_at,mail_status) VALUES(?,?,?,?,?,?)").run(requestId,hash,JSON.stringify(draft),recipient,new Date().toISOString(),mailer?"queued":"unconfigured");
        if(!result.changes){const same=db.prepare("SELECT * FROM orders WHERE request_key=?").get(requestId)!;if(same.payload_hash!==hash)throw new HttpError(409,"Запрос уже принят с другими данными");return json({number:number(Number(same.id)),id:Number(same.id)});}
        const id=Number(result.lastInsertRowid);dispatch();return json({number:number(id),id},201);
      }
      if(!isAdmin())throw new HttpError(401,"Войдите в учётную запись администратора");
      if(path==="/api/admin/orders"&&req.method==="GET")return json({orders:db.prepare("SELECT * FROM orders ORDER BY id DESC LIMIT 100").all().map(read),mailConfigured:!!mailer});
      checkOrigin(req);
      const match=path.match(/^\/api\/admin\/orders\/(\d+)(\/retry-mail)?$/);if(!match)throw new HttpError(404,"Заказ не найден");
      const id=Number(match[1]),row=db.prepare("SELECT * FROM orders WHERE id=?").get(id);if(!row)throw new HttpError(404,"Заказ не найден");
      if(match[2]&&req.method==="POST"){
        if(!mailer)throw new HttpError(400,"Сначала настройте отправку SMTP на сервере");
        if(row.mail_status==="sent"||row.mail_status==="sending")throw new HttpError(409,"Письмо уже отправлено или отправляется");
        db.prepare("UPDATE orders SET mail_status='queued',mail_attempts=0,mail_next_attempt=0 WHERE id=?").run(id);dispatch();return json({ok:true});
      }
      if(!match[2]&&req.method==="PUT"){
        const data=await bodyJson(req) as Record<string,unknown>;
        if(!data||!Object.hasOwn(orderStatuses,String(data.status))||!Number.isSafeInteger(data.version))throw new HttpError(400,"Проверьте статус заказа");
        if(!db.prepare("UPDATE orders SET status=?,version=version+1 WHERE id=? AND version=?").run(String(data.status),id,Number(data.version)).changes)throw new HttpError(409,"Заказ изменён. Обновите список.");
        return json(read(db.prepare("SELECT * FROM orders WHERE id=?").get(id)!));
      }
      throw new HttpError(405,"Метод не поддерживается");
    }
  };
}
