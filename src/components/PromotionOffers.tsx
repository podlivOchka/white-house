import {ArrowUpRight} from "lucide-react";
import type {CatalogData} from "../../shared/catalog";
import {whatsappUrl} from "../data/catalog";

export default function PromotionOffers({catalog}:{catalog:CatalogData}){
  const active=catalog.promotions.filter(promotion=>promotion.active);
  return <section className="promotion-offers" aria-label="Предложения магазина">
    <div className="promotion-note"><p>{catalog.content.promoDescription}</p><a className="text-link" href={whatsappUrl("Добрый день. Подскажите, пожалуйста, какие акции и специальные предложения сейчас действуют в White House.")} target="_blank" rel="noreferrer">Узнать об акциях<ArrowUpRight size={15}/></a></div>
    {(active.length>0||catalog.content.bonusText)&&<>
      <h3>{catalog.content.promoTitle}</h3>
      {active.length>0&&<div className="offer-grid">{active.map(promotion=><article key={promotion.id}>
        <span className="eyebrow">{promotion.kind==="discount"?"СКИДКА":promotion.kind==="bonus"?"БОНУС":"АКЦИЯ"}</span><h4>{promotion.title}</h4>{promotion.value&&<strong>{promotion.value}</strong>}<p>{promotion.description}</p>
      </article>)}</div>}
      {catalog.content.bonusText&&<p className="promo-bonus">{catalog.content.bonusText}</p>}
    </>}
  </section>;
}
