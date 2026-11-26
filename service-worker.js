// ===== سرویس‌ورکر ساحل — کش کامل آفلاین (نسخهٔ ۴) =====
// استراتژی: اول کش (فوری، حتی وقتی گیت‌هاب فیلتر است) + به‌روزرسانی در پس‌زمینه
const CACHE_NAME = 'sahel-dashboard-shell-v11';
const SHELL_FILES = [
  './',
  './index.html',
  './login.html',
  './dashboard.html',
  './css/style.css',
  './js/config.js',
  './js/main.js',
  './js/auth.js',
  './js/dashboard.js',
  './js/chat.js',
  './js/topbar-widgets.js',
  './js/offline-cache.js',
  './manifest.json',
  './assets/favicon.svg',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/apple-touch-icon.png',
  './assets/fonts/Vazirmatn-Variable.woff2'
];
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];
const NETWORK_TIMEOUT = 8000;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      // تک‌تک کش می‌شوند تا اگر یک فایل پیدا نشد، بقیه هم کش نشدن اتفاق نیفتد
      Promise.allSettled(
        SHELL_FILES.map((f) => cache.add(new Request(f, { cache: 'reload' })))
      )
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

function fetchWithTimeout(req) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), NETWORK_TIMEOUT);
  return fetch(req, { signal: ctrl.signal }).finally(() => clearTimeout(t));
}

async function cacheFirst(event, sameOrigin) {
  const req = event.request;
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(req, { ignoreSearch: sameOrigin });

  const network = fetchWithTimeout(req).then((res) => {
    // پاسخ ریدایرکت‌شده را کش نکن (مرورگر برای navigate قبولش نمی‌کند)
    if (res && !res.redirected && (res.ok || res.type === 'opaque')) {
      cache.put(req, res.clone());
    }
    return res;
  });

  if (cached) {
    event.waitUntil(network.catch(() => {}));
    return cached;
  }

  try {
    return await network;
  } catch (e) {
    if (req.mode === 'navigate') {
      const fallback = await cache.match('./login.html');
      if (fallback) return fallback;
    }
    return new Response('آفلاین هستید', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // فونت وزیرمتن: کش شود تا بعد از بار اول به گوگل فونت وابسته نباشیم
  if (FONT_HOSTS.includes(url.hostname)) {
    event.respondWith(cacheFirst(event, false));
    return;
  }

  // بقیهٔ دامنه‌ها (script.google.com، تصاویر درایو و ...) دست‌نخورده
  if (url.origin !== self.location.origin) return;

  event.respondWith(cacheFirst(event, true));
});

// Background Sync برای همگام‌سازی داده‌ها
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-chat') {
    event.waitUntil(
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => client.postMessage({ type: 'SYNC_CHAT' }));
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
      return self.clients.openWindow(new URL('dashboard.html', self.registration.scope).href);
    })
  );
});
