/* ===== نگهبان ورود ===== */
const sahelUserRaw = sessionStorage.getItem('sahel_user');
if (!sahelUserRaw) {
  window.location.href = 'login.html';
}
const sahelUser = sahelUserRaw ? JSON.parse(sahelUserRaw) : null;

/* ===== کش آفلاین دادهها ===== */
const DataCache = {
  PREFIX: 'sahel_data_',
  
  get(key) {
    try {
      const raw = localStorage.getItem(this.PREFIX + key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  },
  
  set(key, data) {
    try {
      localStorage.setItem(this.PREFIX + key, JSON.stringify(data));
    } catch (e) {}
  },
  
  // کش مخصوص هر کاربر
  getUserKey(key) {
    return key + '_' + (sahelUser ? sahelUser.id : 'guest');
  }
};

/* ===== توابع کمکی ===== */
function toFaDigits(n) {
  const fa = ['۰','۱','۲','۳','۴','۵','۶','۷','۸','۹'];
  return String(n).replace(/[0-9]/g, d => fa[d]);
}

function positionPanel(panel, trigger) {
  const rect = trigger.getBoundingClientRect();
  panel.style.top = (rect.bottom + 10) + 'px';
  panel.style.right = (window.innerWidth - rect.right) + 'px';
  panel.style.left = 'auto';
}

function closeAllPanels() {
  document.querySelectorAll('.user-dropdown, .file-panel, .members-panel, .chat-panel').forEach(p => {
    p.style.display = 'none';
  });
}

function formatNumber(num) {
  const parts = String(num).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return toFaDigits(parts);
}

function formatTime(time) {
  try {
    return new Date(time).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
  } catch (e) { return ''; }
}

/* ===== کارتابل ===== */
const workspaceFrame = document.getElementById('workspaceFrame');
const workspaceEmpty = document.getElementById('workspaceEmpty');

function openWorkspace(url) {
  if (!url) {
    workspaceFrame.style.display = 'none';
    workspaceEmpty.style.display = 'flex';
    return;
  }
  workspaceEmpty.style.display = 'none';
  workspaceFrame.style.display = 'block';
  if (workspaceFrame.src !== url) workspaceFrame.src = url;
}

/* ===== بجهای اعلان ===== */
function updateFileBadge(count) {
  const badge = document.getElementById('fileBadge');
  if (count > 0) {
    badge.style.display = 'flex';
    badge.textContent = toFaDigits(count);
  } else {
    badge.style.display = 'none';
  }
}

function updateChatBadge(count) {
  const badge = document.getElementById('chatBadge');
  if (count > 0) {
    badge.style.display = 'flex';
    badge.textContent = toFaDigits(count);
  } else {
    badge.style.display = 'none';
  }
}

/* ===== بارگذاری فایلها و چت با کش ===== */
async function loadFiles() {
  try {
    const fileData = await sahelApiCall({ action: 'getFiles', userId: sahelUser.id });
    if (fileData.success) {
      DataCache.set(DataCache.getUserKey('files'), fileData);
      renderFiles(fileData.files);
      updateFileBadge(fileData.unreadCount);
    }
  } catch (e) {
    // استفاده از کش
    const cached = DataCache.get(DataCache.getUserKey('files'));
    if (cached && cached.success) {
      renderFiles(cached.files);
      updateFileBadge(cached.unreadCount);
    }
  }
}

async function loadChatContacts() {
  try {
    const chatData = await sahelApiCall({ action: 'getChatContacts', userId: sahelUser.id });
    if (chatData.success) {
      DataCache.set(DataCache.getUserKey('chat_contacts'), chatData);
      renderChatContacts(chatData.users);
      updateChatBadge(chatData.unreadCount);
    }
  } catch (e) {
    const cached = DataCache.get(DataCache.getUserKey('chat_contacts'));
    if (cached && cached.success) {
      renderChatContacts(cached.users);
      updateChatBadge(cached.unreadCount);
    }
  }
}

/* ===== شروع با کش ===== */
async function start() {
  document.getElementById('topbarName').textContent = sahelUser.name;
  document.getElementById('topbarRole').textContent = sahelUser.role === 'admin' ? 'مدیر سیستم' : 'کاربر';
  document.getElementById('topbarAvatar').textContent = sahelUser.initials || sahelUser.name.slice(0, 2);

  // ⚡ اول از کش
  const cachedBootstrap = DataCache.get(DataCache.getUserKey('bootstrap'));
  if (cachedBootstrap && cachedBootstrap.success) {
    applyBootstrapData(cachedBootstrap);
  }

  try {
    const data = await sahelApiCall({ action: 'getBootstrap', userId: sahelUser.id });
    if (!data.success) throw new Error(data.message || 'خطا در دریافت اطلاعات');
    
    // ذخیره در کش
    DataCache.set(DataCache.getUserKey('bootstrap'), data);
    
    // 🔄 اعمال داده جدید فقط اگه با کش فرق داره
    if (!cachedBootstrap || JSON.stringify(cachedBootstrap) !== JSON.stringify(data)) {
      applyBootstrapData(data);
    }
  } catch (e) {
    // اگه کش داشتیم، کاری نکنیم — قبلاً نمایش داده شده
    if (!cachedBootstrap) {
      openWorkspace(sahelUser.appUrl);
    }
  }
  
  // بارگذاری فایلها و چت
  loadFiles();
  loadChatContacts();
}

function applyBootstrapData(data) {
  // کارتابل / اعضا
  if (data.dashboard && data.dashboard.workspaces && data.dashboard.workspaces.length) {
    document.getElementById('membersSwitchBtn').style.display = 'flex';
    renderMembers(data.dashboard.workspaces);
    const own = data.dashboard.workspaces.find(w => String(w.id) === String(sahelUser.id));
    if (own) {
      setActiveMember({ id: own.id, name: own.name, url: own.appUrl });
    } else {
      openWorkspace(sahelUser.appUrl);
    }
  } else {
    openWorkspace(sahelUser.appUrl);
  }

  if (data.rates) displayR
