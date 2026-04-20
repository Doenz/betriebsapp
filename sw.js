var VERSION = '2026-04-20-6';
var CACHE_NAME = 'betriebsapp-mobile-' + VERSION;

var APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', function(e){
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(c){ return c.addAll(APP_SHELL); })
      .then(function(){ return self.skipWaiting(); })
      .catch(function(err){ console.warn('SW install:', err); })
  );
});

self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys()
      .then(function(keys){
        var kills = keys.filter(function(k){ return k !== CACHE_NAME; }).map(function(k){ return caches.delete(k); });
        return Promise.all(kills);
      })
      .then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(e){
  var req = e.request;
  if(req.method !== 'GET') return;
  var url;
  try { url = new URL(req.url); } catch(_){ return; }

  if(url.hostname.indexOf('supabase.co') !== -1) return;
  if(url.origin !== self.location.origin) return;

  var p = url.pathname;
  var isHTML = req.mode === 'navigate' || req.destination === 'document' || p.endsWith('.html') || p === '/' || p.endsWith('/');
  var isCode = p.endsWith('.js') || p.endsWith('.json');

  if(isHTML || isCode){
    e.respondWith(networkFirst(req));
  } else {
    e.respondWith(cacheFirst(req));
  }
});

function networkFirst(req){
  return fetch(req).then(function(resp){
    if(resp && resp.status === 200){
      var clone = resp.clone();
      caches.open(CACHE_NAME).then(function(c){ c.put(req, clone); }).catch(function(){});
    }
    return resp;
  }).catch(function(){
    return caches.match(req).then(function(cached){
      return cached || caches.match('./index.html');
    });
  });
}

function cacheFirst(req){
  return caches.match(req).then(function(cached){
    if(cached) return cached;
    return fetch(req).then(function(resp){
      if(resp && resp.status === 200){
        var clone = resp.clone();
        caches.open(CACHE_NAME).then(function(c){ c.put(req, clone); }).catch(function(){});
      }
      return resp;
    });
  });
}

self.addEventListener('message', function(e){
  if(e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});
