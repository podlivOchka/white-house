import {useEffect} from "react";

// Content stays visible without animation support or when reduced motion is requested.
export function useEntranceMotion(path:string,ready:boolean,results:unknown) {
  useEffect(()=>{
    if(!ready||typeof IntersectionObserver==="undefined")return;
    const preference=window.matchMedia("(prefers-reduced-motion: reduce)");
    if(preference.matches)return;
    const animations:Animation[]=[];
    const observer=new IntersectionObserver(entries=>{
      for(const entry of entries){
        if(!entry.isIntersecting)continue;
        const element=entry.target as HTMLElement;
        observer.unobserve(element);
        if(element.dataset.entered||preference.matches)continue;
        element.dataset.entered="true";
        if(typeof element.animate!=="function")continue;
        animations.push(element.animate([
          {opacity:0,transform:"translateY(16px)"},
          {opacity:1,transform:"translateY(0)"}
        ],{duration:500,delay:(Number(element.dataset.entrance)||0)%3*60,easing:"cubic-bezier(.22,1,.36,1)",fill:"backwards"}));
      }
    },{threshold:.08});
    document.querySelectorAll<HTMLElement>("[data-entrance]:not([data-entered])").forEach(element=>observer.observe(element));
    const stop=()=>{observer.disconnect();animations.forEach(animation=>animation.cancel());};
    preference.addEventListener("change",stop);
    return()=>{stop();preference.removeEventListener("change",stop);};
  },[path,ready,results]);
}
