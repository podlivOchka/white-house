import {ArrowUpRight} from "lucide-react";
import {Link} from "react-router-dom";
import type {CatalogData} from "../../shared/catalog";
import {discountPercent} from "../data/catalog";
import {assetUrl} from "../lib/assetUrl";

export default function CollectionEdits({catalog}:{catalog:CatalogData}) {
  const listed=catalog.products.filter(product=>!product.hidden);
  if(!listed.length)return null;

  const available=listed.filter(product=>product.availability!=="out-of-stock");
  const first=available[0]??listed[0];
  const fresh=available.find(product=>product.isNew)??listed.find(product=>product.isNew);
  const own=available.find(product=>product.collection)??listed.find(product=>product.collection);
  const offer=available.find(product=>discountPercent(product))??listed.find(product=>discountPercent(product));
  const hasOffers=!!offer||catalog.promotions.some(promotion=>promotion.active);
  const edits=[
    ...(fresh?[{label:"НОВОЕ ПОСТУПЛЕНИЕ",title:"Новые истории",caption:"Познакомьтесь с последними моделями",to:"/catalog/new",image:fresh.image}]:[]),
    ...(own?[{label:"СОБСТВЕННЫЕ ИЗДЕЛИЯ",title:"WH Collection",caption:"Особая сторона White House",to:"/catalog/collection",image:own.image}]:[]),
    {label:hasOffers?"ОСОБЫЕ ПРЕДЛОЖЕНИЯ":"ВАШ ГАРДЕРОБ",title:hasOffers?"Приятные находки":"Найти своё",caption:hasOffers?"Модели и предложения, к которым стоит присмотреться":"Вся коллекция — в одном месте",to:hasOffers?"/catalog/promo":"/catalog",image:offer?.image??first.image}
  ];

  return <section className="collection-edits" aria-labelledby="collection-edits-title">
    <div className="edit-heading" data-entrance="0">
      <div><span className="eyebrow">ВЫБИРАЙТЕ ПО НАСТРОЕНИЮ</span><h2 id="collection-edits-title">Ваш стиль. Ваша история.</h2></div>
      <Link className="text-link" to="/catalog">Смотреть всё<ArrowUpRight size={17}/></Link>
    </div>
    <div className="edit-grid" style={{gridTemplateColumns:`repeat(${edits.length}, minmax(0, 1fr))`}}>
      {edits.map((edit,index)=><Link key={edit.to} to={edit.to} className="collection-edit" data-entrance={index}>
        <img src={assetUrl(edit.image)} alt="" loading="lazy" decoding="async" width="600" height="800"/>
        <span className="edit-index">0{index+1}</span>
        <span className="edit-copy"><span className="eyebrow">{edit.label}</span><strong>{edit.title}</strong><span>{edit.caption}</span></span>
        <span className="edit-arrow" aria-hidden="true"><ArrowUpRight size={21}/></span>
      </Link>)}
    </div>
  </section>;
}
