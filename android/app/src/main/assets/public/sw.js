/* =============================================
   StreamVibe — Service Worker (sw.js)
   ============================================= */

const CACHE_NAME = 'streamvibe-v1';
const STATIC_ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './channels.js',
  './manifest.json',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap',
  'https://cdn.jsdelivr.net/npm/hls.js@latest/dist/hls.min.js'
];

// Install: cache all static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS.map(url => new Request(url, { mode: 'no-cors' })))
        .catch(err => console.warn('[SW] Some assets failed to cache:', err));
    }).then(() => self.skipWaiting())
  );
});

// Activate: remove old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch strategy:
// - Same-origin (HTML/CSS/JS/icons): Cache-first, fallback to network
// - HLS streams (.m3u8 / .ts): Network-only (live content, never cache)
// - External fonts/CDN: Cache-first with network fallback
self.addEventListener('fetch', event => {
  const url = event.request.url;

  // Never intercept HLS streams or video segments
  if (url.includes('.m3u8') || url.includes('.ts') || url.includes('.mp4') || url.includes('.aac')) {
    return; // Let browser handle it directly
  }

  // For navigations, serve index.html from cache (SPA behavior)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.match('./index.html').then(cached => cached || fetch(event.request))
    );
    return;
  }

  // Cache-first for everything else
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (!response || response.status !== 200) return response;
        // Cache successful responses for static assets
        const url = event.request.url;
        if (
          url.includes('fonts.googleapis.com') ||
          url.includes('fonts.gstatic.com') ||
          url.includes('cdn.jsdelivr.net') ||
          url.includes('i.imgur.com') ||
          url.includes('i.ibb.co')
        ) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // Return offline fallback for HTML requests
        if (event.request.headers.get('accept')?.includes('text/html')) {
          return caches.match('./index.html');
        }
      });
    })
  );
});

// Listen for skip-waiting message from PWA install prompt
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
