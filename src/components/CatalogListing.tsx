import {ArrowUpRight,Heart,Search} from "lucide-react";
import {whatsappUrl,type Product,type View} from "../data/catalog";
import type {Filters} from "../lib/catalog";
import CatalogFilters from "./CatalogFilters";
import ProductCard from "./ProductCard";

type Props={products:Product[];view:View;filters:Filters;favorites:string[];onChange:(filters:Filters)=>void;onFavorite:(id:string)=>void;onOpen:(product:Product)=>void;onCatalog:()=>void};
export default function CatalogListing({products,view,filters,favorites,onChange,onFavorite,onOpen,onCatalog}:Props){
  const emptyFavorites=view==="favorites"&&!favorites.length;
  return <div className="catalog-layout">
    <aside className="desktop-filters" aria-label="Фильтры каталога">
      <CatalogFilters filters={filters} onChange={onChange}/>
      <div className="consultant-note"><span>Нужна помощь<br/>с выбором?</span><a href={whatsappUrl("Добрый день. Помогите, пожалуйста, подобрать образ в White House.")} target="_blank" rel="noreferrer">Написать консультанту<ArrowUpRight size={15}/></a></div>
    </aside>
    <div className="catalog-results">
      <p className="catalog-result-count" role="status">Найдено моделей: {products.length}</p>
      {products.length?<>
        <div className="product-grid">{products.map((product,index)=><ProductCard key={product.id} product={product} index={index} saved={favorites.includes(product.id)} onFavorite={onFavorite} onOpen={onOpen}/>)}</div>
        <div className="catalog-end"><span>Показано моделей: {products.length}</span><a href={whatsappUrl("Добрый день. Подскажите, пожалуйста, какие ещё модели есть в White House.")} target="_blank" rel="noreferrer">Больше образов у консультанта<ArrowUpRight size={15}/></a></div>
      </>:<div className="empty-state">
        {view==="favorites"?<Heart size={34} strokeWidth={1}/>:<Search size={34} strokeWidth={1}/>}
        <h3>{emptyFavorites?"Сохраните то, что нравится":"Таких моделей пока нет"}</h3>
        <p>{emptyFavorites?"Нажмите на сердечко в карточке — выбранные вещи появятся здесь.":view==="promo"?"Здесь будут модели со скидкой. Попробуйте изменить фильтры или посмотрите всю коллекцию.":"Попробуйте другую категорию, цвет или цену."}</p>
        <button className="dark-button" onClick={onCatalog}>Посмотреть всю коллекцию<ArrowUpRight size={17}/></button>
      </div>}
    </div>
  </div>;
}
