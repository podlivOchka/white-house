import {SlidersHorizontal,X} from "lucide-react";
import {categories} from "../data/catalog";
import type {Filters,Sort} from "../lib/catalog";

export default function CatalogToolbar({filters,onChange,onFilters}:{filters:Filters;onChange:(patch:Partial<Filters>)=>void;onFilters:()=>void}){
  const count=Number(filters.category!=="Все")+Number(!!filters.color)+Number(filters.maxPrice!==null)+Number(filters.inStockOnly);
  return <>
    <div className="catalog-toolbar">
      <div className="category-tabs" aria-label="Категории одежды">{categories.map(category=><button key={category} onClick={()=>onChange({category})} aria-pressed={filters.category===category}>{category==="Все"?"Вся одежда":category}</button>)}</div>
      <div className="toolbar-right">
        <button className="filter-toggle" aria-label="Фильтры" aria-description={"Выбрано фильтров: "+count} onClick={onFilters}><SlidersHorizontal size={16}/><span>Фильтры</span>{count>0&&<b>{count}</b>}</button>
        <label className="sort-label"><span className="sr-only">Сортировка каталога</span><select aria-label="Сортировка каталога" value={filters.sort} onChange={event=>onChange({sort:event.target.value as Sort})}><option value="default">По умолчанию</option><option value="price-asc">Сначала дешевле</option><option value="price-desc">Сначала дороже</option><option value="name">По названию</option></select></label>
      </div>
    </div>
    {(filters.query||count>0)&&<div className="active-filters">
      {filters.query&&<button onClick={()=>onChange({query:""})}>Поиск: {filters.query}<X size={13}/></button>}
      {filters.category!=="Все"&&<button onClick={()=>onChange({category:"Все"})}>{filters.category}<X size={13}/></button>}
      {filters.color&&<button onClick={()=>onChange({color:""})}>{filters.color}<X size={13}/></button>}
      {filters.maxPrice!==null&&<button onClick={()=>onChange({maxPrice:null})}>До {filters.maxPrice} ₽<X size={13}/></button>}
      {filters.inStockOnly&&<button onClick={()=>onChange({inStockOnly:false})}>Только в наличии<X size={13}/></button>}
    </div>}
  </>;
}
