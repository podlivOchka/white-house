import type {Config} from "@netlify/functions";
import {getUser} from "@netlify/identity";
import {getStore} from "@netlify/blobs";
import {defaultCatalog,type CatalogData} from "../../shared/catalog.ts";
import {apiError,catalogApi,json,type CatalogStore} from "../../server/catalog-api.ts";

export default async(req:Request)=>{
  try{
    const authorized=async()=>{const user=await getUser();const email=Netlify.env.get("ADMIN_EMAIL")?.trim().toLowerCase();return !!email&&!!user?.confirmedAt&&user.email?.toLowerCase()===email;};
    if(new URL(req.url).pathname==="/api/auth/session"){
      if(req.method!=="GET")return json({error:"Метод не поддерживается"},405);
      const user=await getUser();return json({provider:"netlify",user:await authorized()?{email:user!.email}:null});
    }
    // Preview stores remain separate from the final production store, and survive rebuilds.
    const blobs=getStore({name:Netlify.env.get("CATALOG_STORE")||"white-house-demo-catalog",consistency:"strong"});
    const store:CatalogStore={
      async read(){return await blobs.get("catalog.json",{type:"json"}) as CatalogData|null??defaultCatalog();},
      async save(data){
        const current=await blobs.getWithMetadata("catalog.json",{type:"json"});
        if(((current?.data as CatalogData|null)?.revision??0)!==data.revision)return false;
        const result=await blobs.setJSON("catalog.json",{...data,revision:data.revision+1},current?{onlyIfMatch:current.etag}:{onlyIfNew:true});
        return result.modified;
      },
      async upload(key,data){await blobs.set(key,new Uint8Array(data).buffer);},
      async image(key){const image=await blobs.get(key,{type:"arrayBuffer"});return image?new Uint8Array(image):null;},
    };
    return await catalogApi(req,store,authorized);
  }catch(error){return apiError(error);}
};
export const config:Config={path:"/api/*"};
