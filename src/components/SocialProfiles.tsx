import {ArrowUpRight,Camera} from "lucide-react";
import {instagramProfiles} from "../data/socials";
export default function SocialProfiles({compact=false}:{compact?:boolean}){
  return <section className={compact?"social-profiles compact":"social-profiles"} aria-label="Профили магазина в Instagram">
    {!compact&&<div className="social-heading"><span className="eyebrow">МИР WHITE HOUSE</span><h2>Три стороны вашего стиля</h2><p>Коллекции, новые образы и детали — в наших профилях.</p></div>}
    <div className="social-grid">{instagramProfiles.map((profile,index)=><a key={profile.handle} href={profile.url} target="_blank" rel="noopener noreferrer" className="social-card"><span className="social-number">0{index+1}<Camera size={17}/></span><strong>{profile.name}</strong><span>{profile.description}</span><span className="social-handle">@{profile.handle}<ArrowUpRight size={18}/></span></a>)}</div>
  </section>;
}
