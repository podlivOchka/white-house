import {request} from "./api";
import {githubAdmin} from "./github-config";
export type Session={provider:"server"|"netlify"|"github";user:{email:string}|null};
export type PasswordFlow={type:"invite"|"recovery";token?:string}|null;
const identity=()=>import("@netlify/identity");
// Shared promise prevents a StrictMode remount from consuming the invitation twice.
let callback:Promise<PasswordFlow>|undefined;
export function processCallback(provider:Session["provider"]){
  if(provider!=="netlify")return Promise.resolve(null);
  return callback??=(async()=>{const result=await (await identity()).handleAuthCallback();return result?.type==="invite"||result?.type==="recovery"?{type:result.type,token:result.token}:null;})();
}
export function clearCallback(){callback=Promise.resolve(null);}
export const getSession=async():Promise<Session>=>githubAdmin?(await import("./github")).githubSession():request<Session>("/api/auth/session");
export async function signIn(provider:Session["provider"],email:string,password:string){
  if(provider==="github")return (await import("./github")).unlockGitHub(password);
  if(provider==="netlify")await (await identity()).login(email,password);
  else await request("/api/auth/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email,password})});
  return getSession();
}
export async function signOut(provider:Session["provider"]){
  if(provider==="github")(await import("./github")).lockGitHub();else if(provider==="netlify")await (await identity()).logout();else await request("/api/auth/logout",{method:"POST"});
}
export async function recoverPassword(email:string){await (await identity()).requestPasswordRecovery(email);}
export async function finishPassword(flow:NonNullable<PasswordFlow>,password:string){
  const api=await identity();if(flow.type==="invite"&&flow.token)await api.acceptInvite(flow.token,password);else await api.updateUser({password});clearCallback();return getSession();
}
