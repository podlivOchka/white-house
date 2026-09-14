import {Check,X} from "lucide-react";
import {categories,colors,type Category} from "../data/catalog";
import {defaults,type Filters} from "../lib/catalog";
export default function CatalogFilters({filters,onChange}:{filters:Filters;onChange:(filters:Filters)=>void}){
const set=(patch:Partial<Filters>)=>onChange({...filters,...patch});
return <div className="filter-fields">
<fieldset><legend>Категория</legend>{categories.map(c=><label className="category-option" key={c}><input type="radio" name="category-filter" value={c} checked={filters.category===c} onChange={()=>set({category:c as Category})}/><span>{c==="Все"?"Вся одежда":c}</span></label>)}</fieldset>
<fieldset><legend>Цена, ₽</legend><div className="price-inputs"><span>от 0</span><label><span className="sr-only">Максимальная цена</span><input type="number" min="0" max="14000" inputMode="numeric" value={filters.maxPrice} onChange={e=>set({maxPrice:Math.max(0,Math.min(14000,Number(e.target.value)||0))})}/></label></div><input className="price-range" aria-label="Ограничить цену" type="range" min="0" max="14000" step="100" value={filters.maxPrice} onChange={e=>set({maxPrice:Number(e.target.value)})}/></fieldset>
<fieldset><legend>Цвет на фото</legend><div className="color-filters">{Object.entries(colors).map(([name,hex])=><button key={name} onClick={()=>set({color:filters.color===name?"":name})} className="color-choice" aria-pressed={filters.color===name}><i style={{background:hex}}>{filters.color===name&&<Check size={12} color={["Белый","Бежевый","Голубой"].includes(name)?"#111":"#fff"}/>}</i>{name}</button>)}</div></fieldset>
{(filters.category!=="Все"||filters.color||filters.maxPrice<14000||filters.query)&&<button className="text-link" onClick={()=>onChange({...defaults})}>Сбросить фильтры<X size={14}/></button>}
</div>;
}
