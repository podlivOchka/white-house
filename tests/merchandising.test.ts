import test from "node:test";
import assert from "node:assert/strict";
import fixture from "./fixtures/catalog.json" with {type:"json"};
import {validateCatalog,publicCatalog} from "../shared/catalog.ts";
import {discountPercent,replaceProducts,productImages} from "../src/data/catalog.ts";
import {defaults,selectProducts} from "../src/lib/catalog.ts";
import {parseCart} from "../src/lib/cart.ts";

test("gallery, actual discounts, custom sizes and expensive products survive catalog validation",()=>{
  const data=validateCatalog(fixture),p=data.products[0];
  p.price=18000;p.oldPrice=24000;p.images=[p.image,"/images/photo-09.jpg"];
  p.sizes=["42","44","46"];p.unavailableSizes=["44"];p.relatedIds=[data.products[1].id];
  const saved=validateCatalog(data);replaceProducts(saved.products);
  assert.equal(discountPercent(saved.products[0]),25);
  assert.equal(productImages(saved.products[0]).length,2);
  assert.ok(selectProducts(defaults).some(item=>item.id===p.id));
  assert.deepEqual(selectProducts(defaults,"promo").map(item=>item.id),[p.id]);
  assert.equal(parseCart([{id:p.id,size:"42",color:p.colors[0],quantity:1}]).length,1);
  assert.equal(parseCart([{id:p.id,size:"44",color:p.colors[0],quantity:1}]).length,0);
  p.oldPrice=17000;assert.throws(()=>validateCatalog(data),/Прежняя цена/);p.oldPrice=24000;
  p.unavailableSizes=["99"];assert.throws(()=>validateCatalog(data),/списке размеров/);
});

test("hidden cards and inactive offers disappear while empty catalogs remain valid",()=>{
  const data=validateCatalog(fixture);data.products.forEach(p=>{p.hidden=true;});
  assert.equal(publicCatalog(data).products.length,0);
  assert.equal(validateCatalog({...data,products:[]}).products.length,0);
  data.content.orderEmail="bad@example.test\nBcc: another@example.test";
  assert.throws(()=>validateCatalog(data),/почту/);
});
