/* Flip 7 v1. Never activate an update without explicit user action. */
const VERSION='v1';const CACHE=`flip7-shell-${VERSION}`;
const CORE=['./','./index.html','./app.css','./app.js','./core.js','./providers.js','./manifest.webmanifest','./icons.svg'];
const OPTIONAL=['./offline.html','./icons/icon-192.png','./icons/icon-512.png','./icons/icon-maskable-512.png','./favicon.svg'];
const abs=path=>new URL(path,self.registration.scope).href;
self.addEventListener('install',e=>e.waitUntil((async()=>{
 const cache=await caches.open(CACHE);
 try {for(const f of CORE){const res=await fetch(new Request(abs(f),{cache:'reload'}));if(!res.ok)throw Error(`App shell unavailable: ${f}`);await cache.put(abs(f),res);} }
 catch(err){await caches.delete(CACHE);throw err;}
 for(const f of OPTIONAL){try{const res=await fetch(new Request(abs(f),{cache:'reload'}));if(res.ok)await cache.put(abs(f),res);}catch{ /* optional */ }}
})()));
self.addEventListener('activate',e=>e.waitUntil((async()=>{
 const keys=(await caches.keys()).filter(k=>k.startsWith('flip7-shell-'));
 const previous=keys.filter(k=>k!==CACHE).at(-1);
 await Promise.all(keys.filter(k=>k!==CACHE&&k!==previous).map(k=>caches.delete(k)));
 // Deliberately no clients.claim().
})()));
self.addEventListener('message',e=>{if(e.data?.type==='ACTIVATE_UPDATE')self.skipWaiting();if(e.data?.type==='VERSION')e.ports?.[0]?.postMessage({version:VERSION});});
const staticUrls=new Set(CORE.concat(OPTIONAL).map(abs));
self.addEventListener('fetch',e=>{
 const req=e.request;if(req.method!=='GET')return;
 const url=new URL(req.url);
 if(url.origin!==self.location.origin||!url.href.startsWith(self.registration.scope))return;
 if(url.pathname.match(/(?:^|\/)api\/|(?:^|\/)health$|\/uploads\/|\/download|\/export/))return;
 if(req.mode==='navigate') {e.respondWith((async()=>{const c=await caches.open(CACHE);return await c.match(abs('./index.html'))||fetch(req).catch(()=>c.match(abs('./offline.html')));})());return;}
 if(staticUrls.has(req.url))e.respondWith((async()=>{const c=await caches.open(CACHE);return await c.match(req)||fetch(req);})());
});
