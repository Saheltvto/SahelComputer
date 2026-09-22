// آدرس Web App
const SAHEL_API_URL = "https://script.google.com/macros/s/AKfycbyS2fUQG28Tpr2H2HrKZkql15UO9XJdnFjrwUk80MSQkhbk-JVODdKzLFPBE4jXdTg91g/exec";

// اکشن‌هایی که نباید کش یا از کش خوانده شوند — نوشتنی/حساس هستند نه فقط خواندنی
// (login حتماً باید همیشه از سرور تازه بیاید، وگرنه پاسخ ورود یک کاربر ممکن است
// اشتباهاً برای کاربر دیگری از کش برگردانده شود)
const SAHEL_NO_CACHE_ACTIONS = new Set([
  'login', 'sendFile', 'sendChatMessage', 'markChatRead', 'markFilesRead', 'ping'
]);

// ========== سیستم کش آفلاین API ==========
const ApiCache = {
  PREFIX: 'sahel_api_',
  TTL: 300000, // ۵ دقیقه

  getCacheKey(payload) {
    const action = payload.action || 'default';
    // شناسه‌های مرتبط (userId / contactId) هم داخل کلید قرار می‌گیرند
    // تا کش دو کاربر یا دو گفتگوی مختلف با هم قاطی نشود
    const idParts = [];
    if (payload.userId) idParts.push('u' + payload.userId);
    if (payload.contactId) idParts.push('c' + payload.contactId);
    return this.PREFIX + action + (idParts.length ? '_' + idParts.join('_') : '');
  },

  async getCached(key) {
    if (!key) return null;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;

      const wrapper = JSON.parse(raw);

      // بررسی TTL
      if (Date.now() - wrapper.timestamp > this.TTL) {
        localStorage.removeItem(key);
        return null;
      }

      return wrapper.data;
    } catch (e) {
      return null;
    }
  },

  save(key, data) {
    if (!key) return;
    try {
      const wrapper = {
        timestamp: Date.now(),
        data: data
      };
      localStorage.setItem(key, JSON.stringify(wrapper));
    } catch (e) {}
  }
};

// ========== کمک‌کننده‌ها: تایم‌اوت و تاخیر ==========
function sahelFetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
}

function sahelSleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ========== تابع API با تایم‌اوت + تلاش مجدد خودکار + کش + آفلاین ==========
// opts: { retries=2, timeoutMs=10000, onRetry=fn(attempt, totalRetries) }
// به‌جای اینکه کاربر مجبور باشد دستی چند بار دکمه را بزند، خود این تابع
// در صورت کند بودن یا قطع لحظه‌ای شبکه، خودکار و با فاصله‌ی افزایشی دوباره تلاش می‌کند.
async function sahelApiCall(payload, opts = {}) {
  const {
    retries = 2,
    timeoutMs = 10000,
    onRetry = null
  } = opts;

  const cacheable = !SAHEL_NO_CACHE_ACTIONS.has(payload.action);
  const cacheKey = cacheable ? ApiCache.getCacheKey(payload) : null;
  const cached = cacheable ? await ApiCache.getCached(cacheKey) : null;

  if (!navigator.onLine) {
    // 📦 آفلاین — فقط از کش (و فقط برای اکشن‌های قابل‌کش)
    if (cached) {
      console.log('📦 از کش:', payload.action);
      return cached;
    }
    return { success: false, offline: true, message: 'آفلاین هستید و کش موجود نیست' };
  }

  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await sahelFetchWithTimeout(SAHEL_API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload)
      }, timeoutMs);

      if (!res.ok) throw new Error('HTTP ' + res.status);

      const data = await res.json();

      if (cacheable && data && data.success !== false) {
        ApiCache.save(cacheKey, data);
      }

      return data;
    } catch (e) {
      lastError = e;
      if (attempt < retries) {
        if (typeof onRetry === 'function') {
          try { onRetry(attempt + 1, retries); } catch (_) {}
        }
        // تاخیر نمایی قبل از تلاش بعدی: ۶۰۰ / ۱۲۰۰ / ۲۴۰۰ میلی‌ثانیه...
        await sahelSleep(600 * Math.pow(2, attempt));
      }
    }
  }

  // همه‌ی تلاش‌ها ناموفق بود
  if (cached) {
    console.log('⚠️ خطای شبکه پس از چند تلاش — استفاده از کش:', payload.action);
    return cached;
  }
  throw lastError;
}

// درخواست «گرم‌کردن» بی‌صدا برای کم‌کردن تاخیر Cold Start اسکریپت گوگل.
// پاسخ/خطای آن به‌طور کامل نادیده گرفته می‌شود — تنها هدف این است که کانتینر
// اسکریپت، همزمان با تایپ‌کردن ایمیل/رمز توسط کاربر، از قبل بیدار شده باشد.
function sahelWarmup() {
  if (!navigator.onLine) return;
  try {
    fetch(SAHEL_API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: 'ping' })
    }).catch(() => {});
  } catch (e) {}
}

// ========== ثبت Service Worker ==========
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js').catch((err) => {
      console.warn('ثبت سرویس‌ورکر ناموفق بود:', err);
    });
  });
}
