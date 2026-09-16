import {readFile} from "node:fs/promises";
import {validateCatalog} from "../shared/catalog.ts";
const text=await readFile("public/content/catalog.json","utf8");
if(Buffer.byteLength(text)>900000)throw new Error("Catalog exceeds the GitHub content size limit");
const data=validateCatalog(JSON.parse(text));
console.log("Validated catalog: "+data.products.length+" products, "+data.promotions.length+" offers.");
