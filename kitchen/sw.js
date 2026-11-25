const CACHE='schawa-kitchen-151018';
const files=['../assets/kitchen-load.js?v=151017','./','./index.html','./kitchen.css?v=151018','./kitchen.js?v=151018','../assets/logo.jpg','../assets/pin.js?v=15105','../assets/pin.css?v=15105','./inbox.js?v=15107'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(files)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('schawa-kitchen-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET'||new URL(e.request.url).origin!==self.location.origin)return;if(e.request.mode==='navigate'){e.respondWith(fetch(e.request).catch(()=>caches.match('./index.html')));return;}e.respondWith(caches.open(CACHE).then(c=>c.match(e.request)).then(r=>r||fetch(e.request)));});
