// Service worker: network-first (so updates arrive), cache fallback (so it works offline).
const C='my-day-v2',F=['./','index.html','styles.css','app.js','manifest.webmanifest','icons/icon-192.png','icons/icon-512.png','icons/icon-180.png'];
self.oninstall=e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(F)));self.skipWaiting()};
self.onactivate=e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!=C).map(x=>caches.delete(x)))));clients.claim()};
self.onfetch=e=>{if(new URL(e.request.url).origin!=location.origin)return;
e.respondWith(fetch(e.request).then(r=>{const cp=r.clone();caches.open(C).then(c=>c.put(e.request,cp));return r}).catch(()=>caches.match(e.request).then(r=>r||caches.match('index.html'))))};
