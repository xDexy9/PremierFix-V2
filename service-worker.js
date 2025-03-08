// Service Worker for PremierFix PWA

const CACHE_NAME = 'premierfix-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './tracking.html',
  './css/normalize.css',
  './css/autoprefixer.css',
  './css/styles.css',
  './js/modernizr-custom.js',
  './js/form.js',
  './js/tracking.js',
  './js/firebase-config.js',
  './images/icon-192x192.png',
  './images/icon-512x512.png',
  './images/PremierFix.png',
  './manifest.json'
];

// Install event - cache assets
self.addEventListener('install', event => {
  console.log('[Service Worker] Installing Service Worker...');
  
  // Skip waiting to ensure the new service worker activates immediately
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Caching app shell and content...');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .catch(error => {
        console.error('[Service Worker] Cache addAll failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('[Service Worker] Activating Service Worker...');
  
  // Claim clients to ensure that the service worker controls all clients
  self.clients.claim();
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Removing old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', event => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }
  
  // Skip Firebase API requests
  if (event.request.url.includes('firestore.googleapis.com') || 
      event.request.url.includes('firebase') ||
      event.request.url.includes('googleapis')) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached response if found
        if (response) {
          return response;
        }
        
        // Clone the request because it's a one-time use stream
        const fetchRequest = event.request.clone();
        
        return fetch(fetchRequest)
          .then(response => {
            // Check if we received a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Clone the response because it's a one-time use stream
            const responseToCache = response.clone();
            
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
            
            return response;
          })
          .catch(error => {
            console.error('[Service Worker] Fetch failed:', error);
            // You could return a custom offline page here
          });
      })
  );
});

// Handle push notifications
self.addEventListener('push', event => {
  console.log('[Service Worker] Push received:', event);
  
  const title = 'PremierFix';
  const options = {
    body: event.data ? event.data.text() : 'New maintenance update',
    icon: '/images/icon-192x192.png',
    badge: '/images/icon-192x192.png'
  };
  
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
  console.log('[Service Worker] Notification click:', event.notification.tag);
  
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow('https://premierfix.github.io/tracking.html')
  );
}); 