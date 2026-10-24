import {lazy,Suspense,useEffect,useMemo,useState} from "react";
import {Link,useLocation,useNavigate} from "react-router-dom";
import {ArrowUpRight,ChevronRight,Heart,X} from "lucide-react";
import Header,{links,type Info} from "./components/Header";
import Footer from "./components/Footer";
import CollectionBanner from "./components/CollectionBanner";
import CollectionEdits from "./components/CollectionEdits";
import Information,{infoTitles} from "./components/Information";
import CatalogFilters from "./components/CatalogFilters";
import CatalogToolbar from "./components/CatalogToolbar";
import CatalogListing from "./components/CatalogListing";
import PromotionOffers from "./components/PromotionOffers";
import ProductCard from "./components/ProductCard";
import ProductDetails from "./components/ProductDetails";
import Cart from "./components/Cart";
import {Modal} from "./components/Modal";
import {getProduct,store,type Product,type View} from "./data/catalog";
import {defaults,selectProducts,type Filters} from "./lib/catalog";
import {total,type CartLine} from "./lib/cart";
import {useSelection} from "./hooks/useSelection";
import {useCatalogTools} from "./hooks/useCatalogTools";
import {useCatalogData} from "./hooks/useCatalogData";
import {useEntranceMotion} from "./hooks/useEntranceMotion";
import {instagramProfiles} from "./data/socials";

const AdminPanel=lazy(()=>import("./admin/AdminPanel"));
const viewNames:Record<View,string>={all:"Коллекция",new:"Новинки",collection:"WH Collection",promo:"Акции",favorites:"Избранное"};
export default function App(){
const location=useLocation();const navigate=useNavigate();
const path=location.pathname.replace(/\/$/,"")||"/";
const catalog=useCatalogData(path);
const selection=useSelection(catalog.ready,catalog.data.revision);
const view:View=path==="/favorites"?"favorites":path==="/catalog/new"?"new":path==="/catalog/collection"?"collection":path==="/catalog/promo"?"promo":"all";
const match=path.match(/^\/product\/([^/]+)$/);const detail=match?getProduct(match[1]):undefined;
const known=["/","/catalog","/favorites","/catalog/new","/catalog/collection","/catalog/promo"].includes(path)||!!detail;
const [filters,setFilters]=useState<Filters>({...defaults});
const [searchOpen,setSearchOpen]=useState(false);
const [panel,setPanel]=useState<"cart"|"filters"|"menu"|null>(null);
const [quick,setQuick]=useState<Product|null>(null);
const [info,setInfo]=useState<Info|null>(null);
const [notice,setNotice]=useState("");
const visible=useMemo(()=>selectProducts(filters,view,selection.favorites),[filters,view,selection.favorites,catalog.data]);
const summary=total(selection.cart);
useCatalogTools(filters,setFilters,view,selection.favorites);
useEntranceMotion(path,catalog.ready,visible);
useEffect(()=>{setFilters({...defaults});setPanel(null);setQuick(null);setInfo(null);window.scrollTo({top:0,behavior:"instant"});},[path]);
useEffect(()=>{document.title=(path==="/admin"?"Управление магазином":detail?detail.name:known?viewNames[view]:"Страница не найдена")+" — White House";},[path,detail?.name,known,view]);
useEffect(()=>{if(quick)setQuick(getProduct(quick.id)??null);},[catalog.data]);
useEffect(()=>{if(!notice)return;const timer=window.setTimeout(()=>setNotice(""),4500);return()=>window.clearTimeout(timer);},[notice]);
const change=(patch:Partial<Filters>)=>setFilters(prev=>({...prev,...patch}));
function showCatalog(){setPanel(null);setFilters({...defaults});if(path!=="/catalog")navigate("/catalog");else document.getElementById("catalog")?.scrollIntoView({behavior:"smooth"});}
function add(line:CartLine){const p=getProduct(line.id);if(!p||p.availability==="out-of-stock")return;selection.add(line);setQuick(null);setNotice("Добавлено в корзину: "+p.name);}
function openSearch(){if(!searchOpen&&path!=="/catalog"&&path!=="/")navigate("/catalog");setSearchOpen(!searchOpen);}

if(path==="/admin")return <Suspense fallback={<main className="empty-state">Загружаем управление…</main>}><AdminPanel/></Suspense>;
if(!catalog.ready)return <main className="empty-state"><h1>{catalog.error?"Каталог временно недоступен":"Загружаем коллекцию…"}</h1>{catalog.error&&<><p role="alert">{catalog.error}</p><button className="dark-button" onClick={()=>void catalog.refresh()}>Повторить</button></>}</main>;
return <>
<a className="skip-link" href="#main-content">Перейти к содержимому</a>
<Header count={summary.count} favorites={selection.favorites.length} searchOpen={searchOpen} onSearch={openSearch} onCart={()=>setPanel("cart")} onMenu={()=>setPanel("menu")} onInfo={setInfo} query={filters.query} onQuery={q=>change({query:q})} resultCount={visible.length}/>
<main id="main-content">
{catalog.error&&<p className="catalog-refresh-error" role="alert">{catalog.error}<button onClick={()=>void catalog.refresh()}>Повторить</button></p>}
{!known?<section className="empty-state not-found"><span className="eyebrow">WHITE HOUSE</span><h1>Страница не найдена</h1><p>Вернитесь в каталог, чтобы выбрать свой образ.</p><Link className="dark-button" to="/catalog">Открыть каталог<ArrowUpRight size={18}/></Link></section>:detail?<section className="detail-page"><div className="breadcrumbs"><Link to="/catalog">Каталог</Link><ChevronRight size={12}/><span>{detail.name}</span></div><h1>{detail.name}</h1><ProductDetails key={detail.id} product={detail} saved={selection.favorites.includes(detail.id)} onFavorite={selection.favorite} onAdd={add}/>{detail.relatedIds?.some(id=>getProduct(id))&&<section className="related-products"><span className="eyebrow">ВАШ ОБРАЗ</span><h2>Сочетать с</h2><div className="product-grid">{detail.relatedIds.map(id=>getProduct(id)).filter((p):p is Product=>!!p).slice(0,4).map((p,i)=><ProductCard key={p.id} product={p} index={i} saved={selection.favorites.includes(p.id)} onFavorite={selection.favorite} onOpen={setQuick}/>)}</div></section>}</section>:<>
{view!=="favorites"&&<CollectionBanner section={path==="/"?"home":view==="all"?"catalog":view} content={catalog.data.content}/>}
<section className="catalog-section" id="catalog"><div className="catalog-intro"><div><div className="breadcrumbs"><Link to="/">Главная</Link><ChevronRight size={12}/><span>{viewNames[view]}</span></div>{view==="favorites"?<h1>Избранное<span>{visible.length}</span></h1>:<h2>{viewNames[view]}<span>{visible.length}</span></h2>}</div><p>Наличие, размеры и актуальные цены<br/>уточняйте у консультанта.</p></div>
<CatalogToolbar filters={filters} onChange={change} onFilters={()=>setPanel("filters")}/>
{view==="promo"&&<PromotionOffers catalog={catalog.data}/>}
<CatalogListing products={visible} view={view} filters={filters} favorites={selection.favorites} onChange={setFilters} onFavorite={selection.favorite} onOpen={setQuick} onCatalog={showCatalog}/>
</section>{path==="/"&&!filters.query&&<CollectionEdits catalog={catalog.data}/>}</>}
</main>
<Footer onInfo={setInfo}/>
<Modal open={panel!==null} onClose={()=>setPanel(null)} variant="drawer" title={panel==="cart"?"Корзина":panel==="filters"?"Фильтры":"WHITE HOUSE"} description={panel==="cart"?"Выбранные вещи и оформление заказа":panel==="filters"?"Категория, цена и цвет на фото":"Женская одежда в Каспийске"}>
{panel==="cart"&&<Cart cart={selection.cart} catalog={catalog.data} onCreated={selection.clear} onRemove={selection.remove} onQuantity={selection.quantity} onCatalog={showCatalog}/>}
{panel==="filters"&&<div className="panel-body"><CatalogFilters filters={filters} onChange={setFilters}/><button className="dark-button full-width" onClick={()=>setPanel(null)}>Показать модели ({visible.length})<ChevronRight size={18}/></button></div>}
{panel==="menu"&&<nav className="panel-body mobile-nav" aria-label="Мобильное меню">{links.map(l=><Link key={l.to} to={l.to}>{l.name}<ChevronRight size={18}/></Link>)}<Link to="/favorites">Избранное<Heart size={18}/></Link><button onClick={()=>{setPanel(null);setInfo("delivery");}}>Доставка и примерка<ChevronRight size={18}/></button><button onClick={()=>{setPanel(null);setInfo("store");}}>Контакты<ChevronRight size={18}/></button><p>{store.address}<br/>{store.hours}</p><a href={store.telephone}>{store.phone}</a><span className="eyebrow">INSTAGRAM</span>{instagramProfiles.map(p=><a key={p.handle} href={p.url} target="_blank" rel="noopener noreferrer">{p.name} · {p.description}<ChevronRight size={18}/></a>)}</nav>}
</Modal>
<Modal open={!!quick} onClose={()=>setQuick(null)} variant="product" title={quick?.name??"Карточка товара"} description="Выберите желаемый размер и уточните наличие у консультанта">{quick&&<ProductDetails key={quick.id} product={quick} saved={selection.favorites.includes(quick.id)} onFavorite={selection.favorite} onAdd={add}/>}</Modal>
<Modal open={!!info} onClose={()=>setInfo(null)} title={info?infoTitles[info]:"Информация"} description="White House, Каспийск">{info&&<Information info={info}/>}</Modal>
{notice&&<div className="notice" role="status"><span>{notice}</span><button onClick={()=>{setPanel("cart");setNotice("");}}>Открыть</button><button aria-label="Закрыть уведомление" onClick={()=>setNotice("")}><X size={15}/></button></div>}
</>;
}
