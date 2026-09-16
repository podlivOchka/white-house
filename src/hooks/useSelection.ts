import {useEffect,useState} from "react";
import {addLine,parseCart,parseFavorites,type CartLine,lineKey} from "../lib/cart";
function read(key:string){try{return JSON.parse(localStorage.getItem(key)??"[]");}catch{return [];}}
export function useSelection(catalogReady:boolean,revision:number){
 const [cart,setCart]=useState<CartLine[]>([]);
 const [favorites,setFavorites]=useState<string[]>([]);
 const [hydrated,setHydrated]=useState(false);
 useEffect(()=>{if(!catalogReady)return;setCart(parseCart(read("whitehouse-cart-v1")));setFavorites(parseFavorites(read("whitehouse-favorites-v1")));setHydrated(true);},[catalogReady,revision]);
 useEffect(()=>{if(!hydrated)return;try{localStorage.setItem("whitehouse-cart-v1",JSON.stringify(cart));}catch{}},[cart,hydrated]);
 useEffect(()=>{if(!hydrated)return;try{localStorage.setItem("whitehouse-favorites-v1",JSON.stringify(favorites));}catch{}},[favorites,hydrated]);
 useEffect(()=>{if(!catalogReady)return;const sync=(e:StorageEvent)=>{if(e.key==="whitehouse-cart-v1")setCart(parseCart(read(e.key)));if(e.key==="whitehouse-favorites-v1")setFavorites(parseFavorites(read(e.key)));};window.addEventListener("storage",sync);return()=>window.removeEventListener("storage",sync);},[catalogReady]);
 return {cart,favorites,clear:()=>setCart([]),add:(line:CartLine)=>setCart(prev=>addLine(prev,line)),remove:(key:string)=>setCart(prev=>prev.filter(l=>lineKey(l)!==key)),quantity:(key:string,delta:number)=>setCart(prev=>prev.map(l=>lineKey(l)===key?{...l,quantity:Math.max(1,Math.min(99,l.quantity+delta))}:l)),favorite:(id:string)=>setFavorites(prev=>prev.includes(id)?prev.filter(x=>x!==id):[...prev,id])};
}
