// سرویس‌ورکر ساده ساحل — فقط برای قابل‌نصب‌شدن اپ (PWA) لازم است.
// این فایل داده‌ای را آفلاین ذخیره نمی‌کند و کارتابل همیشه آنلاین کار می‌کند.

const CACHE_NAME = 'sahel-dashboard-shell-v1';
const SHELL_FILES = [
  './dashboard.html'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES))
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

// استراتژی: اول شبکه (Network First) — اگر آفلاین بود، از کش پوسته برنامه استفاده کن.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request).catch(() =>
      caches.match(event.request).then((cached) => cached || caches.match('./dashboard.html'))
    )
  );
});
