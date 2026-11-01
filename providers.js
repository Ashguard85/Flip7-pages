import {emptyData,validateData} from './core.js';
const DB='flip7-local';const DB_VERSION=1;
export function openDb(){return new Promise((resolve,reject)=>{const req=indexedDB.open(DB,DB_VERSION);req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains('data'))db.createObjectStore('data');if(!db.objectStoreNames.contains('secrets'))db.createObjectStore('secrets');};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
async function dbAction(store,mode,operation){const db=await openDb();return new Promise((resolve,reject)=>{const tx=db.transaction(store,mode),r=operation(tx.objectStore(store));let value;r.onsuccess=()=>{value=r.result;};r.onerror=()=>reject(r.error);tx.oncomplete=()=>{db.close();resolve(value);};tx.onabort=()=>{db.close();reject(tx.error||Error('IndexedDB transaction aborted'));};tx.onerror=()=>reject(tx.error);});}
const get=(store,k)=>dbAction(store,'readonly',s=>s.get(k));const put=(store,k,v)=>dbAction(store,'readwrite',s=>s.put(v,k));const del=(store,k)=>dbAction(store,'readwrite',s=>s.delete(k));
export const localProvider={async load(){return {revision:0,data:await get('data','snapshot')||emptyData()};},async save(data){validateData(data);await put('data','snapshot',data);return {revision:0};}};
export const loadSecrets=async()=>await get('secrets','connection')||{};
export const saveSecrets=async v=>put('secrets','connection',v);
export const deleteSecrets=async()=>del('secrets','connection');
export async function serverRequest(path,opts={},config){
 const base=config.docker?'':String(config.url||'').replace(/\/+$/,'');if(!config.docker&&!/^https:\/\/[^\s/]+/i.test(base))throw Error('Bitte eine gültige HTTPS-Serveradresse eingeben');
 const headers={Accept:'application/json',...(opts.body?{'Content-Type':'application/json'}:{}),...(opts.headers||{})};
 if(config.apiToken)headers.Authorization=`Bearer ${config.apiToken}`;
 if(!config.docker&&config.cfId&&config.cfSecret){headers['CF-Access-Client-Id']=config.cfId;headers['CF-Access-Client-Secret']=config.cfSecret;}
 let response;try{response=await fetch(base+path,{...opts,headers,cache:'no-store',signal:AbortSignal.timeout(12000),credentials:'omit'});}catch(e){if(!navigator.onLine)throw Error('Gerät ist offline');if(e.name==='TimeoutError')throw Error('Zeitüberschreitung beim Server');throw Error('Server nicht erreichbar (Netzwerk, CORS oder Cloudflare Access).');}
 if(response.status===401)throw Error('401 – API-Token fehlt oder ist ungültig');if(response.status===403)throw Error('403 – Zugriff verweigert (ggf. Cloudflare Access)');if(response.status===404)throw Error('404 – API nicht gefunden');if(response.status===409)throw Error('Konflikt: Serverdaten wurden geändert. Bitte neu laden, bevor du speicherst.');
 if(!response.ok)throw Error(`Serverfehler HTTP ${response.status}`);
 const ct=response.headers.get('Content-Type')||'';if(!ct.includes('application/json'))throw Error('HTML statt JSON erhalten – möglicherweise eine Login-Seite von Cloudflare Access');
 return response.json();
}
export function serverProvider(config){return {async load(){return serverRequest('/api/data',{},config);},async save(data,revision){validateData(data);return serverRequest('/api/data',{method:'PUT',body:JSON.stringify({data,revision})},config);},async check(){return serverRequest('/api/health',{},config);}};}
