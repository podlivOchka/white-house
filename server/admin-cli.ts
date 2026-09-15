import {emitKeypressEvents} from "node:readline";
import {openDatabase} from "./database.ts";
import {hashPassword,setAdministrator} from "./auth.ts";

async function secret(prompt:string):Promise<string>{
  if(!process.stdin.isTTY)throw new Error("Запустите команду в интерактивном терминале");
  process.stdout.write(prompt);process.stdin.setRawMode(true);process.stdin.resume();emitKeypressEvents(process.stdin);
  return new Promise((resolve,reject)=>{
    let value="";const cleanup=()=>{process.stdin.removeListener("keypress",handler);process.stdin.setRawMode(false);process.stdin.pause();process.stdout.write("\n");};
    const handler=(str:string,key:{name?:string;ctrl?:boolean})=>{if(key?.ctrl&&key.name==="c"){cleanup();reject(new Error("Отменено"));}else if(key?.name==="return"){cleanup();resolve(value);}else if(key?.name==="backspace")value=value.slice(0,-1);else if(str&&!key?.ctrl)value+=str;};
    process.stdin.on("keypress",handler);
  });
}
try{
  const index=process.argv.indexOf("--email");const email=index>=0?process.argv[index+1]:process.env.ADMIN_EMAIL;
  if(!email)throw new Error("Укажите --email адрес@почта.ru");
  const password=await secret("Новый пароль (минимум 12 символов, ввод скрыт): ");
  if(password!==await secret("Повторите пароль: "))throw new Error("Пароли не совпадают");
  const hash=await hashPassword(password);const {db}=await openDatabase(process.env.DATA_DIR||"./data");
  try{setAdministrator(db,email,hash);}finally{db.close();}
  console.log("Администратор сохранён. Старые сеансы завершены.");
}catch(error){console.error(error instanceof Error?error.message:"Ошибка настройки");process.exitCode=1;}
