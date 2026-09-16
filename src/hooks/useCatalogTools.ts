import {useEffect,useRef} from "react";
import {flushSync} from "react-dom";
import {categories,colors,type View} from "../data/catalog";
import {selectProducts,type Filters} from "../lib/catalog";
type Tool={name:string;description:string;inputSchema:object;annotations:object;execute:(input:unknown)=>unknown};
export function useCatalogTools(filters:Filters,onChange:(f:Filters)=>void,view:View,favorites:string[]){
const current=useRef({filters,onChange,view,favorites});current.current={filters,onChange,view,favorites};
useEffect(()=>{
 const context=(document as Document&{modelContext?:{registerTool:(t:Tool,o:{signal:AbortSignal})=>void|Promise<void>}}).modelContext;
 if(!context?.registerTool)return;
 const life=new AbortController();
 const read=()=>({filters:current.current.filters,products:selectProducts(current.current.filters,current.current.view,current.current.favorites).map(({id,name,price,category})=>({id,name,price,category})),availability:"Наличие и размеры подтверждает консультант"});
 const definitions:Tool[]=[{name:"read_catalog",description:"Read the visible catalog and current filters.",inputSchema:{type:"object",properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:()=>read()},{name:"filter_catalog",description:"Set visible category, query, color, price and sort filters. No orders or messages are sent.",inputSchema:{type:"object",properties:{category:{type:"string",enum:categories},query:{type:"string",maxLength:150},color:{type:"string",enum:["",...Object.keys(colors)]},maxPrice:{type:["number","null"],minimum:0,maximum:10000000},sort:{type:"string",enum:["default","price-asc","price-desc","name"]}},additionalProperties:false},annotations:{readOnlyHint:false},execute:(input)=>{
 if(!input||typeof input!=="object"||Array.isArray(input))throw new Error("Expected a filter object");
 const data=input as Record<string,unknown>;
 if(Object.keys(data).some(k=>!["category","query","color","maxPrice","sort"].includes(k)))throw new Error("Unknown filter");
 if(data.category!==undefined&&!categories.includes(data.category as Filters["category"]))throw new Error("Invalid category");
 if(data.query!==undefined&&(typeof data.query!=="string"||data.query.length>150))throw new Error("Invalid query");
 if(data.color!==undefined&&data.color!==""&&!(typeof data.color==="string"&&Object.hasOwn(colors,data.color)))throw new Error("Invalid color");
 if(data.maxPrice!==undefined&&data.maxPrice!==null&&(typeof data.maxPrice!=="number"||!Number.isFinite(data.maxPrice)||data.maxPrice<0||data.maxPrice>10000000))throw new Error("Invalid price");
 if(data.sort!==undefined&&!["default","price-asc","price-desc","name"].includes(data.sort as string))throw new Error("Invalid sort");
 flushSync(()=>current.current.onChange({...current.current.filters,...data} as Filters));
 return read();
 }}];
 for(const tool of definitions){try{Promise.resolve(context.registerTool(tool,{signal:life.signal})).catch(()=>{});}catch{}}
 return()=>life.abort();
},[]);
}
