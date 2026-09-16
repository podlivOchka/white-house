import {useState,type FormEvent} from "react";
import {Link} from "react-router-dom";
import {ArrowLeft,LockKeyhole,ExternalLink} from "lucide-react";
import {connectGitHub,forgetGitHub,readVault,unlockGitHub,changeDevicePassword} from "./github";
import type {Session} from "./auth";

export default function GitHubLogin({onLogin}:{onLogin:(session:Session)=>Promise<void>}){
  const [connected,setConnected]=useState(()=>!!readVault());
  const [token,setToken]=useState(""),[password,setPassword]=useState(""),[again,setAgain]=useState("");
  const [busy,setBusy]=useState(false),[error,setError]=useState("");
  const submit=async(event:FormEvent)=>{
    event.preventDefault();if(busy)return;setError("");setBusy(true);
    try{if(!connected&&password!==again)throw new Error("Пароли не совпадают");const session=connected?await unlockGitHub(password):await connectGitHub(token,password);setToken("");setPassword("");setAgain("");await onLogin(session);}
    catch(reason){setError(reason instanceof Error?reason.message:"Не удалось войти");}finally{setBusy(false);}
  };
  return <main className="admin-shell"><div className="admin-auth"><Link to="/" className="admin-back"><ArrowLeft size={16}/>Вернуться в магазин</Link><span className="eyebrow">WHITE HOUSE · УПРАВЛЕНИЕ</span><h1>{connected?"Вход администратора":"Подключить магазин"}</h1><p>{connected?"Введите пароль, который вы задали для этого устройства.":"Один раз подключите свой GitHub и задайте пароль для этого браузера. После этого можно редактировать магазин без своего сервера."}</p>{error&&<p role="alert" className="admin-error">{error}</p>}
    {!connected&&<details className="admin-connect-help"><summary>Как получить ключ GitHub</summary><ol><li>Войдите в аккаунт <strong>podlivOchka</strong> и откройте <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener noreferrer">создание fine-grained token <ExternalLink size={12}/></a>.</li><li>Задайте имя White House и срок действия.</li><li>Выберите <strong>Only select repositories → white-house</strong>.</li><li>В Repository permissions включите только <strong>Contents → Read and write</strong>. Metadata добавится автоматически.</li><li>Нажмите Generate token и вставьте ключ в поле ниже.</li></ol><p>Ключ передаётся только GitHub. В этом браузере он хранится зашифрованным вашим паролем. Не отправляйте его в переписку.</p></details>}
    <form onSubmit={submit}><fieldset disabled={busy} className="admin-fields">{!connected&&<label>Ключ доступа GitHub<input type="password" autoComplete="off" spellCheck={false} required value={token} onChange={e=>setToken(e.target.value)} placeholder="github_pat_…"/></label>}<label>{connected?"Пароль":"Пароль для этого устройства"}<input type="password" required autoComplete={connected?"current-password":"new-password"} minLength={connected?undefined:12} maxLength={256} value={password} onChange={e=>setPassword(e.target.value)}/></label>{!connected&&<label>Повторите пароль<input type="password" autoComplete="new-password" required minLength={12} maxLength={256} value={again} onChange={e=>setAgain(e.target.value)}/></label>}<button className="dark-button"><LockKeyhole size={17}/>{busy?"Проверяем доступ…":connected?"Войти":"Подключить и войти"}</button></fieldset></form>
    <p className="admin-help">Пароль действует только в этом браузере. На другом устройстве потребуется подключить GitHub заново. Право изменять магазин проверяет GitHub.</p>
    {connected&&<button disabled={busy} className="text-button" onClick={()=>{if(window.confirm("Удалить подключение только из этого браузера? Для нового входа потребуется ключ GitHub. Товары сохранятся.")){forgetGitHub();setConnected(false);setError("");setPassword("");}}}>Забыли пароль или истёк ключ?</button>}</div></main>;
}
export function DevicePassword(){
  const [password,setPassword]=useState(""),[again,setAgain]=useState(""),[message,setMessage]=useState(""),[busy,setBusy]=useState(false);
  return <details className="admin-device-settings"><summary>Пароль этого устройства</summary><form className="admin-fields" onSubmit={async e=>{e.preventDefault();if(busy)return;setBusy(true);setMessage("");try{if(password!==again)throw new Error("Пароли не совпадают");await changeDevicePassword(password);setPassword("");setAgain("");setMessage("Пароль изменён на этом устройстве");}catch(error){setMessage(error instanceof Error?error.message:"Не удалось изменить пароль");}finally{setBusy(false);}}}><label>Новый пароль<input type="password" autoComplete="new-password" minLength={12} maxLength={256} required value={password} onChange={e=>setPassword(e.target.value)}/></label><label>Повторите пароль<input type="password" autoComplete="new-password" required value={again} onChange={e=>setAgain(e.target.value)}/></label><button disabled={busy} className="dark-button">Изменить пароль</button>{message&&<p role="status">{message}</p>}</form></details>;
}
