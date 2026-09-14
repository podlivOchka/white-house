import {useEffect,useState} from "react";
import {addLine,parseCart,parseFavorites,type CartLine,lineKey} from "../lib/cart";
function read(key:string){try{return JSON.parse(localStorage.getItem(key)??"[]");}catch{return [];}}
export function useSelection(){
 const [cart,setCart]=useState<CartLine[]>(()=>parseCart(read("whitehouse-cart-v1")));
 const [favorites,setFavorites]=useState<string[]>(()=>parseFavorites(read("whitehouse-favorites-v1")));
 useEffect(()=>{try{localStorage.setItem("whitehouse-cart-v1",JSON.stringify(cart));}catch{}},[cart]);
 useEffect(()=>{try{localStorage.setItem("whitehouse-favorites-v1",JSON.stringify(favorites));}catch{}},[favorites]);
 useEffect(()=>{const sync=(e:StorageEvent)=>{if(e.key==="whitehouse-cart-v1")setCart(parseCart(read(e.key)));if(e.key==="whitehouse-favorites-v1")setFavorites(parseFavorites(read(e.key)));};window.addEventListener("storage",sync);return()=>window.removeEventListener("storage",sync);},[]);
 return {cart,favorites,add:(line:CartLine)=>setCart(prev=>addLine(prev,line)),remove:(key:string)=>setCart(prev=>prev.filter(l=>lineKey(l)!==key)),quantity:(key:string,delta:number)=>setCart(prev=>prev.map(l=>lineKey(l)===key?{...l,quantity:Math.max(1,Math.min(99,l.quantity+delta))}:l)),favorite:(id:string)=>setFavorites(prev=>prev.includes(id)?prev.filter(x=>x!==id):[...prev,id])};
}
