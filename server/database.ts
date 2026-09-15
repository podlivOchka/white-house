import {DatabaseSync} from "node:sqlite";
import {mkdir,readFile,writeFile} from "node:fs/promises";
import {join,resolve} from "node:path";
import {defaultCatalog,type CatalogData} from "../shared/catalog.ts";
import type {CatalogStore} from "./catalog-api.ts";

export async function openDatabase(directory:string){
  const dataDir=resolve(directory);await mkdir(join(dataDir,"images"),{recursive:true,mode:0o700});
  const db=new DatabaseSync(join(dataDir,"store.sqlite"));
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS catalog (id INTEGER PRIMARY KEY CHECK(id=1), value TEXT NOT NULL, revision INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS administrator (id INTEGER PRIMARY KEY CHECK(id=1), email TEXT NOT NULL, password_hash TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, expires_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS login_limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires_at INTEGER NOT NULL);`);
  db.prepare("INSERT OR IGNORE INTO catalog(id,value,revision) VALUES(1,?,0)").run(JSON.stringify(defaultCatalog()));
  const store:CatalogStore={
    async read(){const row=db.prepare("SELECT value,revision FROM catalog WHERE id=1").get()!;return {...JSON.parse(String(row.value)),revision:Number(row.revision)} as CatalogData;},
    async save(data){const next={...data,revision:data.revision+1};return db.prepare("UPDATE catalog SET value=?,revision=revision+1 WHERE id=1 AND revision=?").run(JSON.stringify(next),data.revision).changes===1;},
    async upload(key,bytes){await writeFile(join(dataDir,key),bytes,{flag:"wx",mode:0o600});},
    async image(key){try{return await readFile(join(dataDir,key));}catch(error){if((error as NodeJS.ErrnoException).code==="ENOENT")return null;throw error;}},
  };
  return {db,store,dataDir};
}
