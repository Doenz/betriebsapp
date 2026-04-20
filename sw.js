// Service Worker für Betriebsapp Mobile
// Strategie: App-Shell cachen, Supabase-Anfragen immer live
const CACHE_NAME = 'betriebsapp-mobile-v1';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(c => c.addAll(APP_SHELL)).then(()=>self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    )).then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  // Supabase-Anfragen: NIE cachen — immer live
  if (url.hostname.includes('supabase.co')) {
    return; // lässt Browser normal fetchen
  }
  // Navigations- und App-Shell-Anfragen: Cache-first mit Netzwerk-Fallback
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(resp => {
        // Erfolgreiche Antworten für Shell-Resourcen cachen
        if (resp && resp.status === 200 && e.request.method === 'GET') {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        }
        return resp;
      }).catch(()=>{
        // Offline-Fallback: Startseite
        if (e.request.mode === 'navigate') return caches.match('./index.html');
      });
    })
  );
});
