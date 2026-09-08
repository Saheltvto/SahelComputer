// آدرس Web App
const SAHEL_API_URL = "https://script.google.com/macros/s/AKfycbyS2fUQG28Tpr2H2HrKZkql15UO9XJdnFjrwUk80MSQkhbk-JVODdKzLFPBE4jXdTg91g/exec";

// ========== سیستم کش آفلاین API ==========
const ApiCache = {
  PREFIX: 'sahel_api_',
  TTL: 300000, // ۵ دقیقه
  
  getCacheKey(payload) {
    // ساخت کلید یکتا از payload
    const action = payload.action || 'default';
    return this.PREFIX + action;
  },
  
  async getCached(key) {
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
    try {
      const wrapper = {
        timestamp: Date.now(),
        data: data
      };
      localStorage.setItem(key, JSON.stringify(wrapper));
    } catch (e) {}
  }
};

// ========== تابع API با کش و آفلاین ==========
async function sahelApiCall(payload) {
  const cacheKey = ApiCache.getCacheKey(payload);
  
  // ⚡ اول از کش
  const cached = await ApiCache.getCached(cacheKey);
  
  if (!navigator.onLine) {
    // 📦 آفلاین — فقط از کش
    if (cached) {
      console.log('📦 از کش:', payload.action);
      return cached;
    }
    return { success: false, offline: true, message: 'آفلاین هستید و کش موجود نیست' };
  }
  
  try {
    const res = await fetch(SAHEL_API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    });
    
    const data = await res.json();
    
    // ذخیره در کش
    if (data && data.success !== false) {
      ApiCache.save(cacheKey, data);
    }
    
    // 🔄 اگه کش داشتیم و داده جدید اومد، بروزرسانی کن
    if (cached && JSON.stringify(cached) !== JSON.stringify(data)) {
      console.log('🔄 بروزرسانی از سرور:', payload.action);
    }
    
    return data;
  } catch (e) {
    // خطای شبکه — استفاده از کش
    if (cached) {
      console.log('⚠️ خطای شبکه — استفاده از کش:', payload.action);
      return cached;
    }
    throw e;
  }
}

// ========== ثبت Service Worker ==========
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js').catch((err) => {
      console.warn('ثبت سرویس‌ورکر ناموفق بود:', err);
    });
  });
}
