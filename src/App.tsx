import {assetUrl} from "./lib/assetUrl";
import {useEffect,useMemo,useState} from "react";
import {Link,useLocation,useNavigate} from "react-router-dom";
import {ArrowDown,ArrowUpRight,ChevronRight,Heart,MessageCircle,Search,SlidersHorizontal,X} from "lucide-react";
import Header,{links,type Info} from "./components/Header";
import Footer from "./components/Footer";
import Information,{infoTitles} from "./components/Information";
import CatalogFilters from "./components/CatalogFilters";
import ProductCard from "./components/ProductCard";
import ProductDetails from "./components/ProductDetails";
import Cart from "./components/Cart";
import {Modal} from "./components/Modal";
import {categories,getProduct,store,whatsappUrl,type Product,type View} from "./data/catalog";
import {defaults,selectProducts,type Filters,type Sort} from "./lib/catalog";
import {total,type CartLine} from "./lib/cart";
import {useSelection} from "./hooks/useSelection";
import {useCatalogTools} from "./hooks/useCatalogTools";

const viewNames:Record<View,string>={all:"Коллекция",new:"Новинки",collection:"WH Collection",promo:"Акции",favorites:"Избранное"};
export default function App(){
const location=useLocation();const navigate=useNavigate();const selection=useSelection();
const path=location.pathname.replace(/\/$/,"")||"/";
const view:View=path==="/favorites"?"favorites":path==="/catalog/new"?"new":path==="/catalog/collection"?"collection":path==="/catalog/promo"?"promo":"all";
const match=path.match(/^\/product\/([^/]+)$/);const detail=match?getProduct(match[1]):undefined;
const known=["/","/catalog","/favorites","/catalog/new","/catalog/collection","/catalog/promo"].includes(path)||!!detail;
const [filters,setFilters]=useState<Filters>({...defaults});
const [searchOpen,setSearchOpen]=useState(false);
const [panel,setPanel]=useState<"cart"|"filters"|"menu"|null>(null);
const [quick,setQuick]=useState<Product|null>(null);
const [info,setInfo]=useState<Info|null>(null);
const [notice,setNotice]=useState("");
const visible=useMemo(()=>selectProducts(filters,view,selection.favorites),[filters,view,selection.favorites]);
const summary=total(selection.cart);
const filterCount=Number(filters.category!=="Все")+Number(!!filters.color)+Number(filters.maxPrice<14000);
useCatalogTools(filters,setFilters,view,selection.favorites);
useEffect(()=>{setFilters({...defaults});setPanel(null);setQuick(null);setInfo(null);window.scrollTo({top:0,behavior:"instant"});document.title=(detail?detail.name:known?viewNames[view]:"Страница не найдена")+" — White House";},[path]);
useEffect(()=>{if(!notice)return;const timer=window.setTimeout(()=>setNotice(""),4500);return()=>window.clearTimeout(timer);},[notice]);
const change=(patch:Partial<Filters>)=>setFilters(prev=>({...prev,...patch}));
function showCatalog(){setPanel(null);setFilters({...defaults});if(path!=="/catalog")navigate("/catalog");else document.getElementById("catalog")?.scrollIntoView({behavior:"smooth"});}
function add(line:CartLine){selection.add(line);setQuick(null);setNotice("Добавлено в корзину: "+getProduct(line.id)!.name);}
function openSearch(){if(!searchOpen&&path!=="/catalog"&&path!=="/")navigate("/catalog");setSearchOpen(!searchOpen);}

return <>
<a className="skip-link" href="#main-content">Перейти к содержимому</a>
<Header count={summary.count} favorites={selection.favorites.length} searchOpen={searchOpen} onSearch={openSearch} onCart={()=>setPanel("cart")} onMenu={()=>setPanel("menu")} onInfo={setInfo} query={filters.query} onQuery={q=>change({query:q})} resultCount={visible.length}/>
<main id="main-content">
{!known?<section className="empty-state not-found"><span className="eyebrow">WHITE HOUSE</span><h1>Страница не найдена</h1><p>Вернитесь в каталог, чтобы выбрать свой образ.</p><Link className="dark-button" to="/catalog">Открыть каталог<ArrowUpRight size={18}/></Link></section>:detail?<section className="detail-page"><div className="breadcrumbs"><Link to="/catalog">Каталог</Link><ChevronRight size={12}/><span>{detail.name}</span></div><h1>{detail.name}</h1><ProductDetails key={detail.id} product={detail} saved={selection.favorites.includes(detail.id)} onFavorite={selection.favorite} onAdd={add}/></section>:<>
{view!=="favorites"&&<section className={"collection-banner "+(view==="promo"?"promo-banner":"")} aria-label="Коллекция White House"><div className="banner-copy"><span className="eyebrow">WHITE HOUSE · КАСПИЙСК</span><h1>{view==="promo"?<>ОСОБЫЕ<br/>ПРЕДЛОЖЕНИЯ</>:<>СТИЛЬ —<br/>ЭТО ЭМОЦИИ.</>}</h1><a href="#catalog">{view==="promo"?"Подробнее об акциях":"Открыть коллекцию"}<ArrowDown size={16}/></a></div><div className="banner-photo"><img src={assetUrl("/images/photo-01.jpg")} alt="Белое платье с накидкой из WH Collection" fetchPriority="high" width="900" height="1271"/><span>WH COLLECTION</span></div><div className="banner-side"><span>WHITE HOUSE</span><span>СТИЛЬ В КАЖДОЙ ДЕТАЛИ</span></div></section>}
<section className="catalog-section" id="catalog"><div className="catalog-intro"><div><div className="breadcrumbs"><Link to="/">Главная</Link><ChevronRight size={12}/><span>{viewNames[view]}</span></div>{view==="favorites"?<h1>Избранное<span>{visible.length}</span></h1>:<h2>{viewNames[view]}<span>{visible.length}</span></h2>}</div><p>Наличие, размеры и актуальные цены<br/>уточняйте у консультанта.</p></div>
{view!=="promo"&&<><div className="catalog-toolbar"><div className="category-tabs" aria-label="Категории одежды">{categories.map(c=><button key={c} onClick={()=>change({category:c})} aria-pressed={filters.category===c}>{c==="Все"?"Вся одежда":c}</button>)}</div><div className="toolbar-right"><button className="filter-toggle" aria-label="Фильтры" aria-description={"Выбрано фильтров: "+filterCount} onClick={()=>setPanel("filters")}><SlidersHorizontal size={17}/><span>Фильтры</span>{filterCount>0&&<b>{filterCount}</b>}</button><label className="sort-label"><span className="sr-only">Сортировка каталога</span><select aria-label="Сортировка каталога" value={filters.sort} onChange={e=>change({sort:e.target.value as Sort})}><option value="default">По умолчанию</option><option value="price-asc">Сначала дешевле</option><option value="price-desc">Сначала дороже</option><option value="name">По названию</option></select></label></div></div>{(filters.query||filterCount>0)&&<div className="active-filters">{filters.query&&<button onClick={()=>change({query:""})}>Поиск: {filters.query}<X size={13}/></button>}{filters.category!=="Все"&&<button onClick={()=>change({category:"Все"})}>{filters.category}<X size={13}/></button>}{filters.color&&<button onClick={()=>change({color:""})}>{filters.color}<X size={13}/></button>}{filters.maxPrice<14000&&<button onClick={()=>change({maxPrice:14000})}>До {filters.maxPrice} ₽<X size={13}/></button>}</div>}</>}
{view==="promo"?<div className="promo-state"><span className="eyebrow">WHITE HOUSE</span><h3>Ваш следующий<br/>любимый образ</h3><p>Об актуальных акциях и специальных предложениях расскажет консультант магазина.</p><a className="dark-button" href={whatsappUrl("Добрый день. Подскажите, пожалуйста, какие акции и специальные предложения сейчас действуют в White House.")} target="_blank" rel="noreferrer">Узнать об акциях<MessageCircle size={18}/></a><Link to="/catalog" className="text-link">Перейти в каталог<ArrowUpRight size={16}/></Link></div>:<div className="catalog-layout"><aside className="desktop-filters" aria-label="Фильтры каталога"><CatalogFilters filters={filters} onChange={setFilters}/><div className="consultant-note"><span>Нужна помощь<br/>с выбором?</span><a href={whatsappUrl("Добрый день. Помогите, пожалуйста, подобрать образ в White House.")} target="_blank" rel="noreferrer">Написать консультанту<ArrowUpRight size={15}/></a></div></aside><div className="catalog-results"><p className="sr-only" role="status">Найдено моделей: {visible.length}</p>{visible.length?<><div className="product-grid">{visible.map((p,i)=><ProductCard key={p.id} product={p} index={i} saved={selection.favorites.includes(p.id)} onFavorite={selection.favorite} onOpen={setQuick}/>)}</div><div className="catalog-end"><span>Показано моделей: {visible.length}</span><a href={whatsappUrl("Добрый день. Подскажите, пожалуйста, какие ещё модели есть в White House.")} target="_blank" rel="noreferrer">Больше образов у консультанта<ArrowUpRight size={15}/></a></div></>:<div className="empty-state">{view==="favorites"?<Heart size={34} strokeWidth={1}/>:<Search size={34} strokeWidth={1}/>}<h3>{view==="favorites"&&!selection.favorites.length?"Сохраните то, что нравится":"Таких моделей пока нет"}</h3><p>{view==="favorites"&&!selection.favorites.length?"Нажмите на сердечко в карточке — выбранные вещи появятся здесь.":"Попробуйте другую категорию, цвет или цену."}</p><button className="dark-button" onClick={showCatalog}>Посмотреть всю коллекцию<ArrowUpRight size={17}/></button></div>}</div></div>}
</section></>}
</main>
<Footer onInfo={setInfo}/>
<Modal open={panel!==null} onClose={()=>setPanel(null)} variant="drawer" title={panel==="cart"?"Корзина":panel==="filters"?"Фильтры":"WHITE HOUSE"} description={panel==="cart"?"Выбранные вещи для заказа в WhatsApp":panel==="filters"?"Категория, цена и цвет на фото":"Женская одежда в Каспийске"}>
{panel==="cart"&&<Cart cart={selection.cart} onRemove={selection.remove} onQuantity={selection.quantity} onCatalog={showCatalog}/>}
{panel==="filters"&&<div className="panel-body"><CatalogFilters filters={filters} onChange={setFilters}/><button className="dark-button full-width" onClick={()=>setPanel(null)}>Показать модели ({visible.length})<ChevronRight size={18}/></button></div>}
{panel==="menu"&&<nav className="panel-body mobile-nav" aria-label="Мобильное меню">{links.map(l=><Link key={l.to} to={l.to}>{l.name}<ChevronRight size={18}/></Link>)}<Link to="/favorites">Избранное<Heart size={18}/></Link><button onClick={()=>{setPanel(null);setInfo("delivery");}}>Доставка и примерка<ChevronRight size={18}/></button><button onClick={()=>{setPanel(null);setInfo("store");}}>Контакты<ChevronRight size={18}/></button><p>{store.address}<br/>{store.hours}</p><a href={store.telephone}>{store.phone}</a></nav>}
</Modal>
<Modal open={!!quick} onClose={()=>setQuick(null)} variant="product" title={quick?.name??"Карточка товара"} description="Выберите желаемый размер и уточните наличие у консультанта">{quick&&<ProductDetails key={quick.id} product={quick} saved={selection.favorites.includes(quick.id)} onFavorite={selection.favorite} onAdd={add}/>}</Modal>
<Modal open={!!info} onClose={()=>setInfo(null)} title={info?infoTitles[info]:"Информация"} description="White House, Каспийск">{info&&<Information info={info}/>}</Modal>
{notice&&<div className="notice" role="status"><span>{notice}</span><button onClick={()=>{setPanel("cart");setNotice("");}}>Открыть</button><button aria-label="Закрыть уведомление" onClick={()=>setNotice("")}><X size={15}/></button></div>}
</>;
}
