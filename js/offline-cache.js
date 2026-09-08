/**
 * سیستم کش آفلاین — کارتابل ساحل
 */

const OfflineCache = {
  PREFIX: 'sahel_cartable_',
  LAST_SYNC_KEY: 'sahel_cartable_last_sync',
  isOnline: navigator.onLine,
  
  init() {
    this.setupListeners();
    this.loadCachedUserData();
    this.updateConnectionUI();
  },
  
  setupListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.updateConnectionUI();
      this.syncInBackground();
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.updateConnectionUI();
    });
  },
  
  updateConnectionUI() {
    const el = document.getElementById('connStatus');
    const dot = document.getElementById('connDot');
    const label = document.getElementById('connLabel');
    if (!el) return;
    
    if (this.isOnline) {
      el.classList.remove('is-offline');
      el.title = 'اتصال برقرار است';
      if (label) label.textContent = 'آنلاین';
    } else {
      el.classList.add('is-offline');
      el.title = 'اتصال اینترنت قطع شده — نمایش کش';
      if (label) label.textContent = 'آفلاین';
    }
  },
  
  // ذخیره داده
  save(key, data) {
    try {
      localStorage.setItem(this.PREFIX + key, JSON.stringify(data));
      localStorage.setItem(this.LAST_SYNC_KEY, new Date().toISOString());
      return true;
    } catch (e) {
      return false;
    }
  },
  
  // بارگذاری داده
  load(key) {
    try {
      const raw = localStorage.getItem(this.PREFIX + key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  },
  
  // بارگذاری کش کاربر
  loadCachedUserData() {
    const userData = this.load('user_data');
    if (userData) {
      this.applyUserData(userData);
    }
  },
  
  applyUserData(data) {
    const nameEl = document.getElementById('topbarName');
    const roleEl = document.getElementById('topbarRole');
    const avatarEl = document.getElementById('topbarAvatar');
    
    if (nameEl && data.name) nameEl.textContent = data.name;
    if (roleEl && data.role) roleEl.textContent = data.role;
    if (avatarEl && data.avatar) avatarEl.textContent = data.avatar;
    
    const chip = document.getElementById('topbarUser');
    if (chip) chip.classList.remove('is-loading');
  },
  
  // بروزرسانی در پسزمینه
  syncInBackground() {
    console.log('🔄 همگامسازی پسزمینه...');
    // اینجا دادههای کاربر رو از سرور بگیر و کش کن
    if (typeof window.loadUserData === 'function') {
      window.loadUserData().then((data) => {
        if (data) {
          this.save('user_data', data);
          this.applyUserData(data);
        }
      });
    }
  }
};

// شروع خودکار
document.addEventListener('DOMContentLoaded', () => {
  OfflineCache.init();
});
