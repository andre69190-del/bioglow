/**
 * BIOGLOW Service Worker – macht die App installierbar & offline-relaunchfähig.
 * Same-origin: network-first (online frisch, offline aus Cache).
 * Fremde APIs (iNaturalist/GBIF/Wikipedia): nur Netz, nichts cachen.
 */

/* --- KI-Modelle dauerhaft speichern (Massnahme 8) -------------------------
   Die On-Device-Erkennung laedt TensorFlow.js und das MobileNet-Modell aus einem
   CDN. Ohne diesen Block liegen sie nur im fluechtigen Browser-Cache – nach dem
   Loeschen der Browserdaten oder auf einem frischen Geraet faellt die "offline KI"
   dann ausgerechnet im Funkloch aus. Deshalb: fuer genau diese Hosts cache-first
   in einen EIGENEN, versionsunabhaengigen Cache.
   Arten-APIs (iNaturalist, GBIF, Wetter, Wikipedia) bleiben bewusst ungecacht. */
const AI_CACHE = 'bioglow-ai-v1';
const AI_HOSTS = /(^|\.)(jsdelivr\.net|unpkg\.com|storage\.googleapis\.com|tfhub\.dev|kaggle\.com|gstatic\.com)$/i;
const CACHE = 'bioglow-20260911174431';
const SHELL = ['./', './index.html', './manifest.json', './icon.svg'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {}));
  self.skipWaiting();
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE && k !== AI_CACHE).map((k) => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  // KI-Modelldateien: cache-first, damit die Arterkennung auch ohne Netz laeuft.
  if (url.origin !== self.location.origin && AI_HOSTS.test(url.hostname)) {
    e.respondWith((async () => {
      const c = await caches.open(AI_CACHE);
      const hit = await c.match(request);
      if (hit) return hit;
      try {
        const res = await fetch(request);
        if (res && (res.ok || res.type === 'opaque')) { c.put(request, res.clone()).catch(() => {}); }
        return res;
      } catch (err) {
        const again = await c.match(request);
        if (again) return again;
        throw err;
      }
    })());
    return;
  }

  if (url.origin !== self.location.origin) return;
  e.respondWith(
    fetch(request).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {});
      return res;
    }).catch(() => caches.match(request).then((hit) => hit || caches.match('./index.html')))
  );
});
