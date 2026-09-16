// Only encrypted credentials are persisted. GitHub enforces repository write access.
export type Vault={version:1;salt:string;iv:string;ciphertext:string;login:string};
const context=new TextEncoder().encode("White House GitHub connection v1");
export function toBase64(bytes:Uint8Array){let result="";for(let i=0;i<bytes.length;i+=8192)result+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(result);}
export function fromBase64(value:string){return Uint8Array.from(atob(value),c=>c.charCodeAt(0));}
async function key(password:string,salt:Uint8Array<ArrayBuffer>){
  const material=await crypto.subtle.importKey("raw",new TextEncoder().encode(password),"PBKDF2",false,["deriveKey"]);
  return crypto.subtle.deriveKey({name:"PBKDF2",salt,iterations:600000,hash:"SHA-256"},material,{name:"AES-GCM",length:256},false,["encrypt","decrypt"]);
}
export async function seal(token:string,password:string,login:string):Promise<Vault>{
  if(password.length<12||password.length>256)throw new Error("Пароль должен содержать от 12 до 256 символов");
  const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12));
  const ciphertext=await crypto.subtle.encrypt({name:"AES-GCM",iv,additionalData:context},await key(password,salt),new TextEncoder().encode(JSON.stringify({token,login})));
  return {version:1,salt:toBase64(salt),iv:toBase64(iv),ciphertext:toBase64(new Uint8Array(ciphertext)),login};
}
export async function unseal(vault:Vault,password:string):Promise<{token:string;login:string}>{
  if(vault.version!==1||password.length>256||vault.ciphertext.length>4000)throw new Error("Не удалось открыть подключение");
  try{
    const salt=fromBase64(vault.salt),iv=fromBase64(vault.iv);if(salt.length!==16||iv.length!==12)throw new Error();
    const bytes=await crypto.subtle.decrypt({name:"AES-GCM",iv,additionalData:context},await key(password,salt),fromBase64(vault.ciphertext));
    const value=JSON.parse(new TextDecoder().decode(bytes));
    if(typeof value.token!=="string"||value.token.length>500||typeof value.login!=="string"||value.login!==vault.login)throw new Error();
    return value;
  }catch{throw new Error("Неверный пароль или повреждены данные подключения");}
}
