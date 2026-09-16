import {ArrowDown} from "lucide-react";
import {assetUrl} from "../lib/assetUrl";
import {defaultContent,type BannerKey,type StoreContent} from "../../shared/catalog";
export default function CollectionBanner({section,content}:{section:BannerKey;content:StoreContent}){
  const banner=content.banners?.[section]??defaultContent.banners![section];
  return <section className={"collection-banner banner-"+section} aria-label="Коллекция White House"><div className="banner-copy"><span className="eyebrow">WHITE HOUSE · КАСПИЙСК</span><h1>{banner.title}</h1><p className="banner-caption">{banner.caption}</p><a href="#catalog">{section==="promo"?"Посмотреть предложения":"Открыть коллекцию"}<ArrowDown size={16}/></a></div><div className="banner-photo"><img src={assetUrl(banner.image)} alt={banner.caption||"Коллекция White House"} fetchPriority="high" width="900" height="1271"/><span>{section==="collection"?"WH COLLECTION":"WHITE HOUSE"}</span></div><div className="banner-side"><span>WHITE HOUSE</span><span>СТИЛЬ В КАЖДОЙ ДЕТАЛИ</span></div></section>;
}
