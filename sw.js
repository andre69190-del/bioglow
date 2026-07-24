/* Aufräum-Service-Worker: entfernt die alte Root-Registrierung + Caches.
   Behebt "Safari kommt nur manchmal auf die App" nach dem Umbau (App liegt jetzt unter /app/). */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
      await self.registration.unregister();
      const cs = await self.clients.matchAll({ type: 'window' });
      cs.forEach((c) => c.navigate(c.url));
    } catch (e) {}
  })());
});
