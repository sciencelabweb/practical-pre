const CACHE_NAME = 'sciencelab-pro-v1';
const urlsToCache = [
  './',
  './index.html',
  './style.css',
  './firebase-config.js',
  './icon192.jpg',
  './icon512.jpg'
];

// Install Service Worker and cache core files
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

// Fetch files from cache, fallback to network
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});
