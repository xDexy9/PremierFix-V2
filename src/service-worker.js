const CACHE_VERSION = 'v1.2.3'; // Update this when you deploy new versions

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => {
        return cache.addAll([
          '/',
          '/index.html',
          '/styles.css',
          '/app.js'
        ]);
      })
  );
});

// Clear old caches during activation
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(cacheName => {
          return cacheName !== CACHE_VERSION;
        }).map(cacheName => {
          return caches.delete(cacheName);
        })
      );
    })
  );
}); 