import test,{beforeEach} from "node:test";
import fixture from "./fixtures/catalog.json" with {type:"json"};
import assert from "node:assert/strict";
import {products,replaceProducts,type Product} from "../src/data/catalog.ts";
import {defaults,selectProducts} from "../src/lib/catalog.ts";
import {addLine,parseCart,parseFavorites,total,orderMessage,type CartLine} from "../src/lib/cart.ts";
beforeEach(()=>replaceProducts(structuredClone(fixture.products) as Product[]));
test("catalog contains the eight supplied models and correct collections",()=>{assert.equal(products.length,8);assert.equal(selectProducts(defaults,"new").length,4);assert.equal(selectProducts(defaults,"collection").length,1);assert.equal(selectProducts(defaults,"promo").length,0);});
test("category, price, color and case-insensitive search compose correctly",()=>{assert.deepEqual(selectProducts({...defaults,category:"Костюмы",maxPrice:5000}).map(p=>p.id),["satin-belt-suit","classic-suit"]);assert.deepEqual(selectProducts({...defaults,query:"ГОРОШЕК"}).map(p=>p.id),["polka-dot-dress"]);assert.equal(selectProducts({...defaults,query:"черный"}).length,2);assert.equal(selectProducts({...defaults,color:"Синий"}).length,2);assert.equal(selectProducts({...defaults,maxPrice:0}).length,0);});
test("unknown prices are kept last in both price sorts",()=>{const ascending=selectProducts({...defaults,sort:"price-asc"});const descending=selectProducts({...defaults,sort:"price-desc"});assert.equal(ascending[0].price,4500);assert.equal(descending[0].price,14000);assert.equal(ascending.at(-1)?.price,null);assert.equal(descending.at(-1)?.price,null);assert.ok(selectProducts({...defaults,maxPrice:13900}).every(p=>p.price!==null&&p.price<=13900));});
test("favorites are deduplicated and obsolete identifiers are discarded",()=>{assert.deepEqual(parseFavorites(["floral-dress","floral-dress","missing",42,null]),["floral-dress"]);assert.deepEqual(parseFavorites({}),[]);assert.equal(selectProducts(defaults,"favorites",["classic-suit"]).length,1);});
test("cart validates device data and merges only identical variants",()=>{const line:CartLine={id:"satin-belt-suit",size:"M",color:"Голубой",quantity:1};let cart=addLine([],line);cart=addLine(cart,line);cart=addLine(cart,{...line,size:"L"});assert.equal(cart.length,2);assert.equal(cart[0].quantity,2);assert.equal(total(cart).amount,14100);assert.equal(total(cart).count,3);assert.deepEqual(parseCart([null,{}, {...line,quantity:-1},{...line,size:"not-a-size"},{...line,color:"not-a-color"}]),[]);assert.equal(parseCart([{...line,quantity:98},{...line,quantity:5}])[0].quantity,99);});
test("unpriced products never pretend the whole order costs zero",()=>{const cart=parseCart([{id:"wh-collection-dress",size:"Подобрать размер",color:"Белый",quantity:1}]);assert.deepEqual(total(cart),{amount:0,unknown:true,count:1});assert.match(orderMessage(cart),/Уточните, пожалуйста, стоимость/);assert.ok(!orderMessage(cart).includes("Цена в каталоге: 0"));});
test("order text describes a request and retains quantities and chosen variants",()=>{const line:CartLine={id:"classic-suit",size:"XL",color:"Оливковый",quantity:2};const text=orderMessage([line]);assert.match(text,/Количество: 2/);assert.match(text,/Размер: XL/);assert.match(text,/Подтвердите/);assert.ok(!text.includes("!"));});
test("default merchandising keeps available models first without changing either group's manual order",()=>{
 products[0].availability="out-of-stock";
 products[3].availability="out-of-stock";
 const visible=selectProducts(defaults);
 assert.deepEqual(visible.map(product=>product.id),[
  ...products.filter(product=>product.availability!=="out-of-stock"),
  ...products.filter(product=>product.availability==="out-of-stock")
 ].map(product=>product.id));
 assert.equal(products[0].id,"floral-dress");
});
test("availability composes with category, search, price and favorites and resets with the other filters",()=>{
 products[1].availability="out-of-stock";
 assert.deepEqual(selectProducts({...defaults,inStockOnly:true,category:"Костюмы",maxPrice:5000,query:"КОСТЮМ"}).map(product=>product.id),["classic-suit"]);
 assert.deepEqual(selectProducts({...defaults,inStockOnly:true},"favorites",[products[1].id]),[]);
 assert.equal(selectProducts(defaults).length,products.length);
 assert.equal(selectProducts({...defaults,inStockOnly:true}).length,products.length-1);
 assert.equal(selectProducts({...defaults,sort:"price-asc"})[1].id,"satin-belt-suit");
});
test("name sorting also compares models whose prices are unknown",()=>{
 products[0].name="Ясное платье";products[0].price=null;
 products[1].name="Атласный костюм";products[1].price=null;
 const ids=selectProducts({...defaults,sort:"name"}).map(product=>product.id);
 assert.ok(ids.indexOf(products[1].id)<ids.indexOf(products[0].id));
});
