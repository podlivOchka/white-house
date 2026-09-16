import {useState,useRef} from "react";
import {ChevronLeft,ChevronRight,Expand} from "lucide-react";
import {assetUrl} from "../lib/assetUrl";
import {productImages,type Product} from "../data/catalog";
import {Modal} from "./Modal";

export default function ProductGallery({product}:{product:Product}){
  const images=productImages(product),[index,setIndex]=useState(0),[zoom,setZoom]=useState(false);
  const start=useRef<number|null>(null);const active=Math.min(index,images.length-1);
  const move=(delta:number)=>setIndex((active+delta+images.length)%images.length);
  const controls=<>{images.length>1&&<><button className="gallery-arrow previous" aria-label="Предыдущее фото" onClick={()=>move(-1)}><ChevronLeft/></button><button className="gallery-arrow next" aria-label="Следующее фото" onClick={()=>move(1)}><ChevronRight/></button><span className="gallery-count">{active+1} / {images.length}</span></>}</>;
  return <div className="product-gallery"><div className="detail-photo gallery-frame" onTouchStart={e=>{start.current=e.touches[0].clientX;}} onTouchEnd={e=>{if(start.current!==null){const delta=e.changedTouches[0].clientX-start.current;if(Math.abs(delta)>50)move(delta>0?-1:1);start.current=null;}}}>
    <button className="gallery-open" aria-label="Увеличить фото товара" onClick={()=>setZoom(true)}><img src={assetUrl(images[active])} alt={product.name+(images.length>1?" — фото "+(active+1):"")} width="900" height="1350" draggable={false}/><span className="gallery-zoom"><Expand size={18}/></span></button>{controls}{product.availability==="out-of-stock"&&<span className="availability-ribbon">НЕТ В НАЛИЧИИ</span>}
  </div>{images.length>1&&<div className="gallery-thumbnails" aria-label="Фотографии товара">{images.map((src,i)=><button key={src} aria-label={"Фото "+(i+1)} aria-pressed={i===active} onClick={()=>setIndex(i)}><img src={assetUrl(src)} alt="" loading="lazy" width="90" height="120"/></button>)}</div>}
  <Modal open={zoom} onClose={()=>setZoom(false)} title={product.name} description="Фотографии товара" variant="product"><div className="gallery-lightbox"><img src={assetUrl(images[active])} alt={product.name+" — фото "+(active+1)}/>{controls}</div></Modal></div>;
}
