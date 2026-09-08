// ===== سرویس‌ورکر ساحل — با کش کامل آفلاین =====
const CACHE_NAME = 'sahel-dashboard-shell-v2';
const SHELL_FILES = [
  './dashboard.html',
  './index.html',
  './css/style.css',
  './js/config.js',
  './js/dashboard.js',
  './js/chat.js',
  './js/topbar-widgets.js',
  './js/offline-cache.js',
  './manifest.json',
  './assets/favicon.svg',
  './assets/icon-192.png',
  './assets/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('✅ کش کردن فایل‌های اصلی...');
        return cache.addAll(SHELL_FILES);
      })
      .catch((err) => {
        console.warn('خطا در کش کردن:', err);
      })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// استراتژی: Network First + Cache Fallback + Background Update
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  
  const url = new URL(event.request.url);
  
  // فقط منابع همون دامنه
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // 🔄 کش کردن پاسخ جدید در پس‌زمینه
        if (networkResponse && networkResponse.ok) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // 📦 آفلاین — از کش بخون
        return caches.match(event.request).then((cached) => {
          if (cached) return cached;
          
          // اگه درخواست صفحه بود، dashboard.html رو بده
          if (event.request.mode === 'navigate') {
            return caches.match('./dashboard.html');
          }
          
          return new Response('آفلاین هستید', { 
            status: 503,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
          });
        });
      })
  );
});

// Background Sync برای همگام‌سازی داده‌ها
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-chat') {
    event.waitUntil(
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'SYNC_CHAT' });
        });
      })
    );
  }
});

// اعلان پیام جدید
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      return self.clients.openWindow('/dashboard.html');
    })
  );
});
