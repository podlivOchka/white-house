import {createHash,randomBytes,scrypt,timingSafeEqual} from "node:crypto";
import type {DatabaseSync} from "node:sqlite";
import {HttpError,bodyJson,checkOrigin,json} from "./catalog-api.ts";

const sessionSeconds=8*60*60;
const derive=(password:string,salt:string)=>new Promise<Buffer>((resolve,reject)=>scrypt(password,salt,64,{N:32768,r:8,p:1,maxmem:64*1024*1024},(error,key)=>error?reject(error):resolve(key)));
export async function hashPassword(password:string){
  if(password.length<12||password.length>256)throw new Error("Пароль должен содержать от 12 до 256 символов");
  const salt=randomBytes(16).toString("hex");return "scrypt:"+salt+":"+(await derive(password,salt)).toString("hex");
}
async function verifyPassword(password:string,stored:string){
  const [method,salt,hash]=stored.split(":");if(method!=="scrypt"||!salt||!hash)return false;
  const actual=await derive(password,salt),expected=Buffer.from(hash,"hex");return actual.length===expected.length&&timingSafeEqual(actual,expected);
}
const tokenHash=(token:string)=>createHash("sha256").update(token).digest("hex");
export function setAdministrator(db:DatabaseSync,email:string,hash:string){
  email=email.trim().toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254)throw new Error("Некорректный e-mail");
  db.exec("BEGIN IMMEDIATE");try{db.prepare("INSERT INTO administrator VALUES(1,?,?) ON CONFLICT(id) DO UPDATE SET email=excluded.email,password_hash=excluded.password_hash").run(email,hash);db.exec("DELETE FROM sessions; DELETE FROM login_limits; COMMIT");}catch(error){db.exec("ROLLBACK");throw error;}
}
export function createAuth(db:DatabaseSync,origin:string){
  const cookieName=new URL(origin).protocol==="https:"?"__Host-wh_session":"wh_session";
  const cookie=(value:string,maxAge=sessionSeconds)=>`${cookieName}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${new URL(origin).protocol==="https:"?"; Secure":""}`;
  const token=(req:Request)=>req.headers.get("cookie")?.split(";").map(p=>p.trim()).find(p=>p.startsWith(cookieName+"="))?.slice(cookieName.length+1)??"";
  const user=(req:Request)=>{
    const raw=token(req);if(!/^[a-f0-9]{64}$/.test(raw))return null;
    const valid=db.prepare("SELECT token_hash FROM sessions WHERE token_hash=? AND expires_at>?").get(tokenHash(raw),Date.now());
    if(!valid)return null;const admin=db.prepare("SELECT email FROM administrator WHERE id=1").get();return admin?{email:String(admin.email)}:null;
  };
  const limit=(key:string,max:number)=>{
    const now=Date.now();db.prepare("DELETE FROM login_limits WHERE expires_at<?").run(now);
    const entry=db.prepare("SELECT count FROM login_limits WHERE key=?").get(key);
    if(entry&&Number(entry.count)>=max)throw new HttpError(429,"Слишком много попыток входа. Попробуйте через 15 минут.");
    db.prepare("INSERT INTO login_limits VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1").run(key,now+15*60*1000);
  };
  return {user,async handle(req:Request,ip:string){
    const path=new URL(req.url).pathname;
    if(path==="/api/auth/session"&&req.method==="GET")return json({user:user(req),provider:"server"});
    if(req.method!=="POST")throw new HttpError(405,"Метод не поддерживается");
    checkOrigin(req,origin);
    if(path==="/api/auth/logout"){
      db.prepare("DELETE FROM sessions WHERE token_hash=?").run(tokenHash(token(req)));const response=json({ok:true});response.headers.set("Set-Cookie",cookie("",0));return response;
    }
    if(path!=="/api/auth/login")throw new HttpError(404,"Адрес не найден");
    limit("all",100);limit("ip:"+tokenHash(ip),10);
    const raw=await bodyJson(req) as Record<string,unknown>|null;
    if(!raw||typeof raw.email!=="string"||typeof raw.password!=="string"||raw.email.length>254||raw.password.length>256)throw new HttpError(400,"Укажите e-mail и пароль");
    const admin=db.prepare("SELECT email,password_hash FROM administrator WHERE id=1").get();
    // Hash even for an unknown account to avoid a quick account-existence check.
    const hash=String(admin?.password_hash??"scrypt:00000000000000000000000000000000:"+"00".repeat(64));
    const valid=await verifyPassword(raw.password,hash);
    if(!valid||!admin||raw.email.trim().toLowerCase()!==admin.email)throw new HttpError(401,"Неверный e-mail или пароль");
    const session=randomBytes(32).toString("hex");db.prepare("DELETE FROM sessions WHERE expires_at<=?").run(Date.now());
    db.prepare("INSERT INTO sessions VALUES(?,?)").run(tokenHash(session),Date.now()+sessionSeconds*1000);
    db.prepare("DELETE FROM login_limits WHERE key=?").run("ip:"+tokenHash(ip));
    const response=json({user:{email:String(admin.email)},provider:"server"});response.headers.set("Set-Cookie",cookie(session));return response;
  }};
}
