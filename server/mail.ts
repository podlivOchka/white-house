import nodemailer from "nodemailer";
export type OrderMailer={send:(message:{to:string;subject:string;text:string;id:string})=>Promise<void>;close?:()=>void};
export function smtpMailer(env:NodeJS.ProcessEnv=process.env):OrderMailer|null{
  if(!env.SMTP_HOST||!env.SMTP_USER||!env.SMTP_PASSWORD)return null;
  const address=env.SMTP_FROM||env.SMTP_USER;
  if(!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(address))throw new Error("Укажите SMTP_FROM как адрес почты");
  const secure=env.SMTP_SECURE!=="false";
  const port=Number(env.SMTP_PORT||(secure?465:587));if(!Number.isInteger(port)||port<1||port>65535)throw new Error("Проверьте SMTP_PORT");
  const transport=nodemailer.createTransport({host:env.SMTP_HOST,port,secure,requireTLS:!secure,auth:{user:env.SMTP_USER,pass:env.SMTP_PASSWORD},connectionTimeout:10000,greetingTimeout:10000,socketTimeout:20000,disableFileAccess:true,disableUrlAccess:true});
  return {async send(message){await transport.sendMail({from:{name:"White House",address},to:message.to,subject:message.subject,text:message.text,messageId:"<white-house-order-"+message.id+"@"+address.split("@")[1]+">"});},close:()=>transport.close()};
}
