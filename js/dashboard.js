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
  
  getUserKey(key) {
    return key + '_' + (sahelUser ? sahelUser.id : 'guest');
  }
};

/* ===== عنوان شغلی ===== */
// اگر ستون jobTitle (مثلاً دفتردار / انباردار / حسابدار) پر باشد همان نمایش داده می‌شود
function roleLabel(role, jobTitle) {
  const t = String(jobTitle || '').trim();
  return t || (role === 'admin' ? 'مدیر سیستم' : 'کاربر');
}

/* ===== عکس پرسنلی (آواتار) ===== */
// هر آدرس عکس: لینک گوگل درایو (هر شکلی)، فقط ID فایل درایو، یا لینک مستقیم تصویر
function sahelPhotoUrl(raw, size) {
  const W = '=w' + (size || 200);
  if (!raw) return '';
  raw = String(raw).trim();
  if (!raw) return '';
  if (/drive\.google\.com|docs\.google\.com/i.test(raw)) {
    const m = raw.match(/\/d\/([a-zA-Z0-9_-]{20,})/) || raw.match(/[?&]id=([a-zA-Z0-9_-]{20,})/);
    if (m) return 'https://lh3.googleusercontent.com/d/' + m[1] + W;
  }
  if (/^[a-zA-Z0-9_-]{25,}$/.test(raw)) {
    return 'https://lh3.googleusercontent.com/d/' + raw + W;
  }
  const lm = raw.match(/^https:\/\/lh3\.googleusercontent\.com\/d\/([a-zA-Z0-9_-]+)/);
  if (lm) return 'https://lh3.googleusercontent.com/d/' + lm[1] + W;
  if (/^(https?:\/\/|data:image\/)/i.test(raw)) return raw.replace(/"/g, '%22');
  return '';
}

// اگر عکس نبود یا لود نشد، همان حروف اول نام نمایش داده می‌شود
function avatarHtml(photo, text, size) {
  const url = sahelPhotoUrl(photo, size);
  // اگر آدرس اصلی لود نشد، یک بار آدرس جایگزین درایو را امتحان می‌کند؛ بعد حروف اول می‌ماند
  const m = url.match(/lh3\.googleusercontent\.com\/d\/([a-zA-Z0-9_-]+)/);
  const fb = m ? 'https://drive.google.com/thumbnail?id=' + m[1] + '&sz=w' + (size || 200) : '';
  const img = url
    ? `<img class="avatar-img" src="${escAttr(url)}" data-fb="${escAttr(fb)}" alt="" referrerpolicy="no-referrer" onerror="if(this.dataset.fb){this.src=this.dataset.fb;this.dataset.fb='';}else{this.remove();}">`
    : '';
  return `<span class="avatar-txt">${escHtml(text)}</span>${img}`;
}

function setAvatar(el, photo, text, size) {
  if (el) el.innerHTML = avatarHtml(photo, text, size);
}

/* ===== دفترچهٔ عکس همکاران =====
   لیست گفتگو/فایل/گیرنده‌ها ممکن است عکس را نفرستند؛ عکسی که از هر لیست دیگری
   (کارتابل اعضا، کاربران، خودم) رسیده بر اساس شناسه یا نام برای همهٔ لیست‌ها استفاده می‌شود. */
const PhotoBook = {
  byId: {}, byName: {},
  load() {
    const c = DataCache.get(DataCache.getUserKey('photobook'));
    if (c && c.byId && c.byName) { this.byId = c.byId; this.byName = c.byName; }
  },
  learn(list) {
    let changed = false;
    (Array.isArray(list) ? list : []).forEach((u) => {
      if (!u || typeof u !== 'object') return;
      const photo = u.photo || u.avatar || u.image || u.picture || '';
      const initials = u.initials || '';
      const merge = (map, key) => {
        const old = map[key] || {};
        const next = { photo: photo || old.photo || '', initials: initials || old.initials || '' };
        if (next.photo !== old.photo || next.initials !== old.initials) { map[key] = next; changed = true; }
      };
      if (u.id !== undefined && u.id !== null && u.id !== '') merge(this.byId, String(u.id));
      if (u.name) merge(this.byName, String(u.name).trim());
    });
    if (changed) DataCache.set(DataCache.getUserKey('photobook'), { byId: this.byId, byName: this.byName });
  },
  get(id, name) {
    const a = (id !== undefined && id !== null && id !== '') ? this.byId[String(id)] : null;
    const b = name ? this.byName[String(name).trim()] : null;
    return { photo: (a && a.photo) || (b && b.photo) || '', initials: (a && a.initials) || (b && b.initials) || '' };
  }
};

// آواتار با عکس (اگر از هر منبعی پیدا شد) و در غیر این صورت حروف اول
function avatarFor(o, size) {
  const pb = PhotoBook.get(o.id, o.name);
  const photo = o.photo || o.avatar || pb.photo;
  const txt = o.initials || pb.initials || String(o.name || '').trim().slice(0, 2);
  return avatarHtml(photo, txt, size);
}

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
  document.querySelectorAll('.user-dropdown, .file-panel, .members-panel, .chat-panel, .app-menu').forEach(p => {
    p.style.display = 'none';
  });
  const sw = document.getElementById('appSwitch');
  if (sw) sw.setAttribute('aria-expanded', 'false');
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

/* ===== کارتابل (پشتیبانی از چند اپ برای هر کاربر) ===== */
const workspaceFrame = document.getElementById('workspaceFrame');
const workspaceEmpty = document.getElementById('workspaceEmpty');
const appTabsEl = document.getElementById('appTabs');
let wsFrames = {};   // آدرس اپ -> iframe (هر اپ یک بار بارگذاری می‌شود و با تعویض تب حفظ می‌ماند)
let wsKey = '';

// ستون appUrl می‌تواند یک لینک ساده یا چند خط «عنوان|لینک» باشد
// (کوتیشن اضافه، فاصله و نویسه‌های نامرئی RTL که موقع کپی از شیت می‌آیند پاک می‌شوند)
function parseApps(raw) {
  const clean = (t) => String(t || '')
    .replace(/[\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g, '')
    .replace(/^[\s"'“”‘’]+|[\s"'“”‘’]+$/g, '');
  const list = [];
  String(raw || '').split(/\r?\n/).forEach((line) => {
    line = clean(line);
    if (!line) return;
    const m = line.match(/^(.*?)\s*\|\s*(https?:\/\/\S+)$/i) || line.match(/^()(https?:\/\/\S+)$/i);
    if (!m) return;
    const url = clean(m[2]);
    if (!/^https?:\/\//i.test(url)) return;
    list.push({ title: clean(m[1]) || (list.length === 0 ? 'کارتابل' : 'برنامه ' + (list.length + 1)), url });
  });
  return list;
}

// امن‌سازی متن برای قرارگرفتن داخل HTML / attribute
function escHtml(v) {
  return String(v == null ? '' : v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function escAttr(v) {
  return escHtml(v).replace(/\r?\n/g, '&#10;');
}

function resetWorkspaceFrames() {
  Object.keys(wsFrames).forEach(u => {
    const f = wsFrames[u];
    if (f !== workspaceFrame) f.remove();
  });
  workspaceFrame.removeAttribute('src');
  workspaceFrame.style.display = 'none';
  wsFrames = {};
}

function getAppFrame(url) {
  if (wsFrames[url]) return wsFrames[url];
  let f;
  if (!Object.keys(wsFrames).length) {
    f = workspaceFrame;
  } else {
    f = workspaceFrame.cloneNode(false);
    f.removeAttribute('id');
    f.removeAttribute('src');
    f.className = 'ws-frame';
    workspaceFrame.parentNode.appendChild(f);
  }
  f.src = url;
  wsFrames[url] = f;
  return f;
}

function showApp(url) {
  const frame = getAppFrame(url);
  Object.keys(wsFrames).forEach(u => { wsFrames[u].style.display = wsFrames[u] === frame ? 'block' : 'none'; });
  const nameEl = document.getElementById('appSwitchName');
  document.querySelectorAll('#appMenu .app-menu-item').forEach(t => {
    const on = t.dataset.url === url;
    t.setAttribute('aria-selected', String(on));
    if (on && nameEl) nameEl.textContent = t.querySelector('.am-title').textContent;
  });
  try { sessionStorage.setItem('sahel_last_app', url); } catch (e) {}
}

// به‌جای نوار تب زیر نوار بالا، یک کپسول کوچک در نوار بالا + منوی بازشو
function renderAppTabs(apps) {
  const sw = document.getElementById('appSwitch');
  const menu = document.getElementById('appMenu');
  appTabsEl.hidden = true; appTabsEl.innerHTML = '';
  if (menu) { menu.innerHTML = ''; menu.style.display = 'none'; }
  if (!sw || !menu) return;
  if (apps.length < 2) { sw.hidden = true; return; }
  sw.hidden = false;
  apps.forEach(a => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'app-menu-item';
    b.dataset.url = a.url;
    b.setAttribute('role', 'option');
    const t = document.createElement('span');
    t.className = 'am-title';
    t.textContent = a.title;
    b.appendChild(t);
    b.insertAdjacentHTML('beforeend', '<svg class="am-check" viewBox="0 0 24 24" fill="none"><path d="M5 12.5L10 17.5L19 7" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>');
    b.addEventListener('click', () => { showApp(a.url); closeAllPanels(); });
    menu.appendChild(b);
  });
}

function openWorkspace(raw) {
  const apps = parseApps(raw);
  if (!apps.length) {
    resetWorkspaceFrames();
    wsKey = '';
    renderAppTabs([]);
    workspaceEmpty.style.display = 'flex';
    return;
  }
  workspaceEmpty.style.display = 'none';
  const key = apps.map(a => a.url).join('\n');
  if (key !== wsKey) {            // کاربر یا لیست اپ‌ها عوض شده است
    resetWorkspaceFrames();
    wsKey = key;
    renderAppTabs(apps);
  }
  let active = apps[0].url;
  try {
    const last = sessionStorage.getItem('sahel_last_app');
    if (apps.some(a => a.url === last)) active = last;
  } catch (e) {}
  showApp(active);
}

/* ===== شمارندهٔ نخوانده‌ها (گفتگو + فایل در یک آیکن) ===== */
const SahelMsgr = {
  chatUnread: 0, fileUnread: 0,
  contacts: [], files: [],
  contact: null,            // گفتگوی بازِ فعلی: {id, name, photo, initials}
  view: 'chats',            // chats | files | thread
  listView: 'chats',        // آخرین تب فهرست (برای دکمهٔ بازگشت)
  pending: [], sending: false
};
const mgEl = (id) => document.getElementById(id);

function badgeText(n) { return n > 99 ? toFaDigits(99) + '+' : toFaDigits(n); }

function setPill(id, n) {
  const el = mgEl(id);
  if (!el) return;
  el.hidden = !(n > 0);
  el.textContent = n > 0 ? badgeText(n) : '';
}

function refreshUnreadUi() {
  const total = SahelMsgr.chatUnread + SahelMsgr.fileUnread;
  const badge = mgEl('chatBadge');
  const btn = mgEl('chatBtn');
  if (badge) {
    if (total > 0) { badge.style.display = 'flex'; badge.textContent = badgeText(total); }
    else badge.style.display = 'none';
  }
  if (btn) {
    btn.classList.toggle('has-unread', total > 0);
    btn.title = total > 0 ? 'پیام‌رسان — ' + toFaDigits(total) + ' مورد جدید' : 'پیام‌رسان';
  }
  setPill('mgPillChats', SahelMsgr.chatUnread);
  setPill('mgPillFiles', SahelMsgr.fileUnread);
}

function updateFileBadge(count) {
  SahelMsgr.fileUnread = Math.max(0, Number(count) || 0);
  refreshUnreadUi();
}

function updateChatBadge(count) {
  SahelMsgr.chatUnread = Math.max(0, Number(count) || 0);
  refreshUnreadUi();
}

function mgPanelOpen() {
  const p = mgEl('chatPanel');
  return !!p && p.style.display === 'flex';
}

/* ===== بارگذاری فایل‌ها و چت با کش ===== */
async function loadFiles() {
  try {
    const fileData = await sahelApiCall({ action: 'getFiles', userId: sahelUser.id });
    if (fileData.success) {
      DataCache.set(DataCache.getUserKey('files'), fileData);
      renderFiles(fileData.files);
      // اگر همین الان تب «فایل‌ها» جلوی چشم کاربر است، فایل تازه رسیده را خوانده حساب کن
      if (SahelMsgr.view === 'files' && mgPanelOpen() && fileData.unreadCount > 0) {
        updateFileBadge(0);
        sahelApiCall({ action: 'markFilesRead', userId: sahelUser.id }).catch(() => {});
      } else {
        updateFileBadge(fileData.unreadCount);
      }
    }
  } catch (e) {
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
      updateChatBadge(chatData.unreadCount != null ? chatData.unreadCount : sumUnread(chatData.users));
    }
  } catch (e) {
    const cached = DataCache.get(DataCache.getUserKey('chat_contacts'));
    if (cached && cached.success) {
      renderChatContacts(cached.users);
      updateChatBadge(cached.unreadCount != null ? cached.unreadCount : sumUnread(cached.users));
    }
  }
}

function sumUnread(users) {
  return (users || []).reduce((n, u) => n + (Number(u && u.unreadCount) || 0), 0);
}

/* ===== شروع با کش ===== */
async function start() {
  PhotoBook.load();
  PhotoBook.learn([sahelUser]);
  document.getElementById('topbarName').textContent = sahelUser.name;
  document.getElementById('topbarRole').textContent = roleLabel(sahelUser.role, sahelUser.jobTitle);
  setAvatar(document.getElementById('topbarAvatar'), sahelUser.photo, sahelUser.initials || sahelUser.name.slice(0, 2));
  document.getElementById('topbarUser').classList.remove('is-loading');
  
  // ذخیره اطلاعات کاربر در کش
  DataCache.set(DataCache.getUserKey('user_data'), {
    name: sahelUser.name,
    role: roleLabel(sahelUser.role, sahelUser.jobTitle),
    avatar: sahelUser.initials || sahelUser.name.slice(0, 2),
    photo: sahelUser.photo || ''
  });

  // ⚡ اول از کش — نمایش فوری، بدون انتظار برای شبکه
  const cachedBootstrap = DataCache.get(DataCache.getUserKey('bootstrap'));
  if (cachedBootstrap && cachedBootstrap.success) {
    applyBootstrapData(cachedBootstrap);
  }

  // ⚡ هر سه درخواست («بوت‌استرپ»، فایل‌ها، مخاطبین چت) هم‌زمان اجرا می‌شوند
  // نه پشت‌سرهم — تا صفحه در مجموع سریع‌تر کامل بارگذاری شود.
  const bootstrapPromise = sahelApiCall({ action: 'getBootstrap', userId: sahelUser.id }, { retries: 2, timeoutMs: 12000 })
    .then((data) => {
      if (!data.success) throw new Error(data.message || 'خطا در دریافت اطلاعات');

      DataCache.set(DataCache.getUserKey('bootstrap'), data);

      if (!cachedBootstrap || JSON.stringify(cachedBootstrap) !== JSON.stringify(data)) {
        applyBootstrapData(data);
      }
    })
    .catch(() => {
      if (!cachedBootstrap) {
        openWorkspace(sahelUser.appUrl);
      }
    });

  loadFiles();
  loadChatContacts();
  startMessengerPolling();

  await bootstrapPromise;
}

function applyBootstrapData(data) {
  if (data.dashboard && data.dashboard.workspaces) PhotoBook.learn(data.dashboard.workspaces);
  if (data.users) PhotoBook.learn(data.users);
  if (data.chatContacts) PhotoBook.learn(data.chatContacts);
  if (data.me) PhotoBook.learn([data.me]);
  // کارتابل / اعضا
  if (data.dashboard && data.dashboard.workspaces && data.dashboard.workspaces.length) {
    document.getElementById('membersSwitchBtn').style.display = 'flex';
    renderMembers(data.dashboard.workspaces);
    const own = data.dashboard.workspaces.find(w => String(w.id) === String(sahelUser.id));
    if (own) {
      sahelUser.jobTitle = own.jobTitle || '';
      try { sessionStorage.setItem('sahel_user', JSON.stringify(sahelUser)); } catch (e) {}
      setActiveMember({ id: own.id, name: own.name, url: own.appUrl, photo: own.photo || sahelUser.photo, role: own.role || sahelUser.role, jobTitle: own.jobTitle });
    } else {
      openWorkspace(sahelUser.appUrl);
    }
  } else {
    openWorkspace(sahelUser.appUrl);
  }

  // کاربر عادی (بدون کارتابل اعضا): عکس و عنوان شغلی خودش را از سرور تازه کن
  if (data.me && !(data.dashboard && data.dashboard.workspaces && data.dashboard.workspaces.length)) {
    sahelUser.photo = data.me.photo || '';
    sahelUser.jobTitle = data.me.jobTitle || '';
    document.getElementById('topbarRole').textContent = roleLabel(sahelUser.role, sahelUser.jobTitle);
    try { sessionStorage.setItem('sahel_user', JSON.stringify(sahelUser)); } catch (e) {}
    setAvatar(document.getElementById('topbarAvatar'), sahelUser.photo, sahelUser.initials || sahelUser.name.slice(0, 2));
  }

  if (data.rates) displayRates(data.rates);
  if (data.users) renderRecipients(data.users);

  renderFiles(data.files || []);
  updateFileBadge(data.filesUnreadCount || 0);

  renderChatContacts(data.chatContacts || []);
  updateChatBadge(data.chatUnreadCount != null ? data.chatUnreadCount : sumUnread(data.chatContacts));
}

function renderMembers(workspaces) {
  const membersList = document.getElementById('membersList');
  membersList.innerHTML = workspaces.map(w => `
    <div class="member-row" data-id="${escAttr(w.id)}" data-url="${escAttr(w.appUrl)}" data-name="${escAttr(w.name)}" data-initials="${escAttr(w.initials || '')}" data-photo="${escAttr(sahelPhotoUrl(w.photo))}" data-role="${escAttr(w.role || '')}" data-jobtitle="${escAttr(w.jobTitle || '')}">
      <div class="member-avatar">${avatarFor(w)}</div>
      <div class="member-info">
        <b>${escHtml(w.name)}${String(w.id) === String(sahelUser.id) ? ' (شما)' : ''}</b>
        <span>${escHtml(roleLabel(w.role, w.jobTitle))}</span>
      </div>
      <div class="member-check">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M4 12L10 18L20 6" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </div>
    </div>
  `).join('');

  membersList.querySelectorAll('.member-row').forEach(row => {
    row.addEventListener('click', (e) => {
      e.stopPropagation();
      const member = {
        id: row.dataset.id,
        url: row.dataset.url,
        name: row.dataset.name,
        initials: row.dataset.initials,
        photo: row.dataset.photo,
        role: row.dataset.role,
        jobTitle: row.dataset.jobtitle
      };
      setActiveMember(member);
      closeAllPanels();
    });
  });
}

// پروفایلی که الان کارتابلش دیده می‌شود (برای کارت پروفایل)
let viewedProfile = null;
let activeMemberId = '';

function setActiveMember(member) {
  activeMemberId = String(member.id);
  viewedProfile = {
    id: String(member.id), name: member.name, photo: member.photo, role: member.role,
    jobTitle: member.jobTitle, initials: member.initials || String(member.name || '').slice(0, 2)
  };
  document.querySelectorAll('.member-row').forEach(r => {
    r.classList.toggle('active', r.dataset.id === activeMemberId);
  });
  openWorkspace(member.url);
  document.getElementById('topbarName').textContent = member.name;
  document.getElementById('topbarRole').textContent = roleLabel(member.role, member.jobTitle);
  setAvatar(document.getElementById('topbarAvatar'), member.photo, viewedProfile.initials);
}

/* ===== کمکی‌های پیام‌رسان ===== */
function safeUrl(u) {
  u = String(u || '').trim();
  return /^https?:\/\//i.test(u) ? u : '#';
}

function fileExt(name) {
  const m = String(name || '').match(/\.([A-Za-z0-9]{1,5})$/);
  return m ? m[1].toUpperCase() : 'FILE';
}

function fileExtClass(ext) {
  if (ext === 'PDF') return 't-pdf';
  if (/^(XLS|XLSX|XLSM|CSV)$/.test(ext)) return 't-xls';
  if (/^(PNG|JPG|JPEG|GIF|WEBP|HEIC)$/.test(ext)) return 't-img';
  return '';
}

function relTime(t) {
  const d = new Date(t);
  if (!t || isNaN(d.getTime())) return '';
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return formatTime(t);
  const y = new Date(now); y.setDate(now.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return 'دیروز';
  try { return d.toLocaleDateString('fa-IR', { month: 'short', day: 'numeric' }); } catch (e) { return ''; }
}

function dayLabel(t) {
  const d = new Date(t);
  if (isNaN(d.getTime())) return '';
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return 'امروز';
  const y = new Date(now); y.setDate(now.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return 'دیروز';
  try { return d.toLocaleDateString('fa-IR', { weekday: 'long', month: 'long', day: 'numeric' }); } catch (e) { return ''; }
}

function linkify(text) {
  return escHtml(text).replace(/(https?:\/\/[^\s<]+)/g, (u) => '<a href="' + u + '" target="_blank" rel="noopener">' + u + '</a>');
}

/* ===== فایل‌های دریافتی ===== */
function renderFiles(files) {
  const fileList = mgEl('fileList');
  if (!fileList) return;
  SahelMsgr.files = Array.isArray(files) ? files : [];
  if (!SahelMsgr.files.length) {
    fileList.innerHTML = '<div class="mg-empty">فایلی دریافت نشده است.</div>';
    renderThreadFiles();
    return;
  }
  fileList.innerHTML = SahelMsgr.files.map((f) => {
    const ext = fileExt(f.fileName);
    const unread = f.status === 'نخوانده';
    return `
    <a class="file-item mg-file ${unread ? 'unread' : ''}" href="${escAttr(safeUrl(f.url))}" target="_blank" rel="noopener">
      <div class="member-avatar">${avatarFor({ id: f.senderId, name: f.senderName, photo: f.senderPhoto }, 100)}</div>
      <div class="file-item-body">
        <div class="mg-file-line"><span class="mg-ext ${fileExtClass(ext)}">${escHtml(ext)}</span><b>${escHtml(f.fileName)}</b></div>
        <span>از طرف ${escHtml(f.senderName)}</span>
      </div>
      ${unread ? '<span class="mg-new">جدید</span>' : ''}
    </a>`;
  }).join('');
  renderThreadFiles();
}

// فایل‌های دریافتی از همین همکار، بالای صفحهٔ گفتگو
function renderThreadFiles() {
  const box = mgEl('mgThreadFiles');
  const c = SahelMsgr.contact;
  if (!box) return;
  if (!c) { box.hidden = true; box.innerHTML = ''; return; }
  const list = (SahelMsgr.files || []).filter((f) =>
    (f.senderId != null && f.senderId !== '' && String(f.senderId) === String(c.id)) ||
    String(f.senderName || '').trim() === String(c.name || '').trim());
  if (!list.length) { box.hidden = true; box.innerHTML = ''; return; }
  box.hidden = false;
  box.innerHTML = list.slice(0, 8).map((f) => {
    const ext = fileExt(f.fileName);
    return `<button type="button" class="mg-fchip" data-url="${escAttr(safeUrl(f.url))}" data-name="${escAttr(f.fileName)}"><span class="mg-ext ${fileExtClass(ext)}">${escHtml(ext)}</span><span>${escHtml(f.fileName)}</span></button>`;
  }).join('');
}

/* ===== نمایش فایل دریافتی داخل خود برنامه (با دکمهٔ بازگشت و پشتیبانی از «برگشت» گوشی) =====
   قبلاً فایل در همان پنجره/تب بیرونی باز می‌شد و در موبایل راه برگشت به برنامه نبود. */
let _fvEl = null, _fvOpen = false;
function fileViewerEl() {
  if (_fvEl) return _fvEl;
  const st = document.createElement('style');
  st.textContent = '#fileViewer{position:fixed;inset:0;z-index:100000;display:none;flex-direction:column;background:#0b1220;direction:rtl}'
    + '#fileViewer .fv-bar{display:flex;align-items:center;gap:8px;padding:calc(env(safe-area-inset-top,0px) + 8px) 10px 8px;background:#0f1b2d;color:#fff;border-bottom:1px solid rgba(255,255,255,.12)}'
    + '#fileViewer .fv-name{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:14px;font-weight:700}'
    + '#fileViewer button{font:inherit;font-size:13px;font-weight:700;color:#fff;background:rgba(255,255,255,.14);border:0;border-radius:10px;padding:9px 14px;cursor:pointer;white-space:nowrap}'
    + '#fileViewer button:active{background:rgba(255,255,255,.28)}'
    + '#fileViewer iframe{flex:1;width:100%;border:0;background:#fff}';
  document.head.appendChild(st);
  _fvEl = document.createElement('div');
  _fvEl.id = 'fileViewer';
  _fvEl.innerHTML = '<div class="fv-bar"><button type="button" class="fv-back">→ بازگشت</button><span class="fv-name"></span><button type="button" class="fv-ext">باز کردن در مرورگر</button></div><iframe allow="fullscreen" referrerpolicy="no-referrer"></iframe>';
  document.body.appendChild(_fvEl);
  _fvEl.querySelector('.fv-back').addEventListener('click', () => closeFileViewer());
  return _fvEl;
}
function closeFileViewer(fromPop) {
  if (!_fvOpen) return;
  _fvOpen = false;
  _fvEl.style.display = 'none';
  _fvEl.querySelector('iframe').src = 'about:blank';
  if (!fromPop && history.state && history.state.sahelViewer) history.back();
}
function openFileViewer(url, name) {
  const el = fileViewerEl();
  const m = String(url).match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:[^#]*&)?id=)([\w-]+)/);
  const src = m ? 'https://drive.google.com/file/d/' + m[1] + '/preview' : url;
  el.querySelector('.fv-name').textContent = name || 'فایل';
  el.querySelector('.fv-ext').onclick = () => { window.open(url, '_blank', 'noopener'); };
  el.querySelector('iframe').src = src;
  closeAllPanels();
  el.style.display = 'flex';
  if (!_fvOpen) { _fvOpen = true; try { history.pushState({ sahelViewer: 1 }, ''); } catch (e) {} }
}
window.addEventListener('popstate', () => closeFileViewer(true));
document.getElementById('fileList')?.addEventListener('click', (e) => {
  const a = e.target.closest && e.target.closest('a.file-item');
  if (!a) return;
  e.preventDefault(); e.stopPropagation();
  openFileViewer(a.getAttribute('href'), (a.querySelector('b') || {}).textContent);
});

function displayRates(rates) {
  if (!rates) return;
  if (rates.USD)  document.getElementById('tiUsd').innerHTML  = `<span class="rate-label">دلار</span> <span class="rate-value">${formatNumber(rates.USD)}</span>`;
  if (rates.AED)  document.getElementById('tiAed').innerHTML  = `<span class="rate-label">درهم</span> <span class="rate-value">${formatNumber(rates.AED)}</span>`;
  if (rates.COIN) document.getElementById('tiCoin').innerHTML = `<span class="rate-label">سکه</span> <span class="rate-value">${formatNumber(rates.COIN)}</span>`;
  if (rates.GOLD) document.getElementById('tiGold').innerHTML = `<span class="rate-label">طلا</span> <span class="rate-value">${formatNumber(rates.GOLD)}</span>`;
}

/* ===== فهرست گفتگوها (شبیه واتساپ) ===== */
function contactSortKey(u) {
  const t = Date.parse(u.lastTime || u.lastMessageTime || u.time || '');
  return isNaN(t) ? 0 : t;
}

function renderChatContacts(contacts) {
  if (Array.isArray(contacts)) {
    SahelMsgr.contacts = contacts;
    PhotoBook.learn(contacts);
  }
  const list = mgEl('chatContactsList');
  if (!list) return;
  const all = SahelMsgr.contacts || [];
  if (!all.length) {
    list.innerHTML = '<div class="mg-empty">کاربری نیست.</div>';
    return;
  }
  const q = String((mgEl('mgSearch') || {}).value || '').trim().toLowerCase();
  const rows = all
    .filter((u) => !q || String(u.name || '').toLowerCase().includes(q))
    .sort((a, b) => ((Number(b.unreadCount) > 0) - (Number(a.unreadCount) > 0)) || (contactSortKey(b) - contactSortKey(a)));
  if (!rows.length) {
    list.innerHTML = '<div class="mg-empty">موردی پیدا نشد.</div>';
    return;
  }
  list.innerHTML = rows.map((u) => {
    const unread = Number(u.unreadCount) || 0;
    const tm = relTime(u.lastTime || u.lastMessageTime || u.time);
    return `
    <div class="chat-contact-row mg-row ${unread > 0 ? 'has-unread' : ''}" data-id="${escAttr(u.id)}" data-name="${escAttr(u.name)}">
      <div class="member-avatar">${avatarFor(u, 120)}</div>
      <div class="mg-row-main">
        <div class="mg-row-top"><b>${escHtml(u.name)}</b>${tm ? '<span class="mg-time">' + escHtml(tm) + '</span>' : ''}</div>
        <div class="mg-row-bot">
          <span class="chat-contact-last">${escHtml(u.lastMessage || 'برای گفتگو کلیک کنید')}</span>
          ${unread > 0 ? '<span class="mg-count">' + badgeText(unread) + '</span>' : ''}
        </div>
      </div>
    </div>`;
  }).join('');
}

mgEl('chatContactsList')?.addEventListener('click', (e) => {
  const row = e.target.closest && e.target.closest('.chat-contact-row');
  if (!row) return;
  e.stopPropagation();
  openChatWith(row.dataset.id, row.dataset.name);
});
mgEl('mgSearch')?.addEventListener('input', () => renderChatContacts());

function renderRecipients(users) {
  const select = mgEl('fileRecipient');
  if (!select || !users || !users.length) return;
  PhotoBook.learn(users);
  const prev = select.value;
  select.innerHTML = '<option value="">انتخاب گیرنده...</option>' +
    users.map((u) => `<option value="${escAttr(u.id)}">${escHtml(u.name)}</option>`).join('');
  if (prev) select.value = prev;
}

/* ===== نمای پنل: گفتگوها | فایل‌ها | صفحهٔ گفتگو ===== */
function mgShow(view) {
  SahelMsgr.view = view;
  const thread = view === 'thread';
  if (!thread) SahelMsgr.listView = view;
  mgEl('chatContactsView').style.display = view === 'chats' ? 'flex' : 'none';
  mgEl('mgFilesView').style.display = view === 'files' ? 'flex' : 'none';
  mgEl('chatThreadView').style.display = thread ? 'flex' : 'none';
  mgEl('mgTabs').style.display = thread ? 'none' : 'flex';
  mgEl('chatBackBtn').style.display = thread ? 'flex' : 'none';
  mgEl('mgHeadAvatar').style.display = thread ? 'flex' : 'none';
  document.querySelectorAll('#mgTabs .mg-tab').forEach((t) => {
    const on = t.dataset.tab === view;
    t.classList.toggle('is-active', on);
    t.setAttribute('aria-selected', String(on));
  });
  const c = SahelMsgr.contact;
  if (thread && c) {
    mgEl('chatPanelTitle').textContent = c.name;
    mgEl('mgHeadSub').textContent = c.sub || 'گفتگوی داخلی';
    setAvatar(mgEl('mgHeadAvatar'), c.photo, c.initials || String(c.name || '').trim().slice(0, 2), 120);
  } else {
    mgEl('chatPanelTitle').textContent = view === 'files' ? 'فایل‌ها' : 'پیام‌رسان ساحل';
    mgEl('mgHeadSub').textContent = view === 'files' ? 'ارسال و دریافت فایل' : 'گفتگو و فایل‌های داخلی';
  }
}

document.getElementById('mgTabs')?.addEventListener('click', (e) => {
  const tab = e.target.closest && e.target.closest('.mg-tab');
  if (!tab) return;
  e.stopPropagation();
  if (tab.dataset.tab === 'files') openFilesTab(); else { mgShow('chats'); loadChatContacts(); }
});

async function openFilesTab() {
  mgShow('files');
  try {
    const data = await sahelApiCall({ action: 'getFiles', userId: sahelUser.id });
    if (data.success) {
      renderFiles(data.files);          // برچسب «جدید» همین یک بار دیده می‌شود
      if (data.unreadCount > 0) {
        sahelApiCall({ action: 'markFilesRead', userId: sahelUser.id }).catch(() => {});
        data.unreadCount = 0;
      }
      DataCache.set(DataCache.getUserKey('files'), data);
      updateFileBadge(0);
    }
  } catch (err) {
    const cached = DataCache.get(DataCache.getUserKey('files'));
    if (cached && cached.success) renderFiles(cached.files);
  }
}

/* ===== صفحهٔ گفتگو ===== */
function openChatWith(contactId, contactName) {
  const known = (SahelMsgr.contacts || []).find((x) => String(x.id) === String(contactId)) || {};
  SahelMsgr.contact = {
    id: String(contactId), name: contactName,
    photo: known.photo || PhotoBook.get(contactId, contactName).photo,
    initials: known.initials || PhotoBook.get(contactId, contactName).initials,
    sub: known.jobTitle ? String(known.jobTitle) : ''
  };
  SahelMsgr.pending = [];
  renderAttachPreview();
  mgShow('thread');
  renderThreadFiles();
  loadChatMessages(contactId);

  // نخوانده‌ها همان لحظه صفر می‌شوند؛ اگر سرور تأیید نکرد، بارگذاری بعدی دوباره نشان می‌دهد
  if (known && Number(known.unreadCount) > 0) {
    updateChatBadge(Math.max(0, SahelMsgr.chatUnread - Number(known.unreadCount)));
    known.unreadCount = 0;
    renderChatContacts();
  }
  sahelApiCall({ action: 'markChatRead', userId: sahelUser.id, contactId: contactId })
    .then(() => loadChatContacts())
    .catch(() => {});
}

/* پیام‌های ارسال‌شدهٔ فایل (سرور فقط فایل‌های «دریافتی» را برمی‌گرداند؛ ارسال‌ها اینجا نگه داشته می‌شوند) */
function sentFilesKey() { return DataCache.getUserKey('sent_files'); }
function getSentFiles(cid) {
  const all = DataCache.get(sentFilesKey()) || {};
  return all[String(cid)] || [];
}
function addSentFiles(cid, items) {
  const all = DataCache.get(sentFilesKey()) || {};
  const k = String(cid);
  all[k] = (all[k] || []).concat(items).slice(-50);
  DataCache.set(sentFilesKey(), all);
}

async function loadChatMessages(contactId, silent, forceBottom) {
  const box = mgEl('chatMessages');
  if (!silent) box.innerHTML = '<div class="mg-empty">در حال بارگذاری...</div>';
  const stillCurrent = () => !SahelMsgr.contact || String(SahelMsgr.contact.id) === String(contactId);
  try {
    const data = await sahelApiCall({ action: 'getChatMessages', userId: sahelUser.id, contactId: contactId });
    if (!stillCurrent()) return;
    if (!data.success) { if (!silent) box.innerHTML = '<div class="mg-empty">خطا در دریافت پیام‌ها</div>'; return; }
    const msgs = data.messages || [];
    DataCache.set(DataCache.getUserKey('msgs_' + contactId), msgs.slice(-80));
    const last = msgs[msgs.length - 1];
    const sig = msgs.length + '|' + (last ? String(last.time || '') + String((last.text || '').length) : '') + '|' + getSentFiles(contactId).length;
    if (silent && box.dataset.contactId === String(contactId) && box.dataset.sig === sig) return;
    const hadSig = box.dataset.sig !== undefined && box.dataset.contactId === String(contactId);
    const prevTop = box.scrollTop;
    const nearBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 90;
    renderChatMessages(msgs, contactId);
    box.dataset.sig = sig;
    if (silent && hadSig && !forceBottom && !nearBottom) box.scrollTop = prevTop;
    // پیام تازه‌ای وسط گفتگوی باز رسید: همان لحظه خوانده شود
    if (silent && hadSig && last && String(last.senderId) !== String(sahelUser.id)) {
      sahelApiCall({ action: 'markChatRead', userId: sahelUser.id, contactId: contactId })
        .then(() => loadChatContacts()).catch(() => {});
    }
  } catch (e) {
    if (silent || !stillCurrent()) return;
    const cached = DataCache.get(DataCache.getUserKey('msgs_' + contactId));
    if (cached && cached.length) renderChatMessages(cached, contactId);
    else box.innerHTML = '<div class="mg-empty">خطا در اتصال</div>';
  }
}

function renderChatMessages(messages, contactId) {
  const box = mgEl('chatMessages');
  box.dataset.contactId = contactId;
  const sent = getSentFiles(contactId).map((f) => ({ kind: 'file', t: Date.parse(f.time), f }));
  const items = (messages || []).map((m) => ({ kind: 'msg', t: Date.parse(m.time), m }));
  if (!items.length && !sent.length) {
    box.innerHTML = '<div class="mg-empty">گفتگو را شروع کنید</div>';
    return;
  }
  let all = items.concat(sent);
  if (all.every((x) => !isNaN(x.t))) all = all.map((x, i) => ({ x, i })).sort((a, b) => (a.x.t - b.x.t) || (a.i - b.i)).map((o) => o.x);
  let lastDay = '';
  box.innerHTML = all.map((it) => {
    let day = '';
    if (!isNaN(it.t)) {
      const d = dayLabel(it.t);
      if (d && d !== lastDay) { lastDay = d; day = '<div class="mg-day">' + escHtml(d) + '</div>'; }
    }
    if (it.kind === 'file') {
      const ext = fileExt(it.f.name);
      return day + `
      <div class="chat-bubble chat-bubble-out mg-b">
        <div class="mg-fcard">
          <div class="mg-fcard-ico">${escHtml(ext)}</div>
          <div class="mg-fcard-body"><b>${escHtml(it.f.name)}</b><span>${escHtml(formatFileSize(it.f.size || 0))} • ارسال شد</span></div>
        </div>
        <span class="chat-bubble-time">${escHtml(formatTime(it.f.time))}</span>
      </div>`;
    }
    const isOut = String(it.m.senderId) === String(sahelUser.id);
    return day + `
      <div class="chat-bubble mg-b ${isOut ? 'chat-bubble-out' : 'chat-bubble-in'}">
        <div class="mg-text">${linkify(it.m.text || '')}</div>
        <span class="chat-bubble-time">${escHtml(formatTime(it.m.time))}</span>
      </div>`;
  }).join('');
  box.scrollTop = box.scrollHeight;
}

document.getElementById('chatBackBtn')?.addEventListener('click', (e) => {
  e.stopPropagation();
  SahelMsgr.contact = null;
  SahelMsgr.pending = [];
  renderAttachPreview();
  renderThreadFiles();
  mgShow(SahelMsgr.listView || 'chats');
  loadChatContacts();
});

document.getElementById('mgThreadFiles')?.addEventListener('click', (e) => {
  const b = e.target.closest && e.target.closest('.mg-fchip');
  if (!b) return;
  e.preventDefault(); e.stopPropagation();
  openFileViewer(b.dataset.url, b.dataset.name);
});

const newFileBtn = document.getElementById('newFileBtn');
const fileSendForm = document.getElementById('fileSendForm');
const fileSendBtn = document.getElementById('fileSendBtn');
const fileSendStatus = document.getElementById('fileSendStatus');
const fileRecipient = document.getElementById('fileRecipient');
const fileInput = document.getElementById('fileInput');
const fileUploadLabel = document.getElementById('fileUploadLabel');
const fileInputLabel = document.getElementById('fileInputLabel');
const fileChipsList = document.getElementById('fileChipsList');
let selectedFiles = [];

function formatFileSize(bytes) {
  if (bytes < 1024) return toFaDigits(bytes) + ' B';
  if (bytes < 1024 * 1024) return toFaDigits(Math.round(bytes / 1024)) + ' KB';
  return toFaDigits((bytes / (1024 * 1024)).toFixed(1)) + ' MB';
}

function readAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

// ارسال یک یا چند فایل برای یک گیرنده؛ ایندکس فایل‌های ناموفق را برمی‌گرداند
async function sendFilesTo(receiverId, files, onProgress) {
  const failed = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (onProgress) onProgress(i + 1, files.length, file.name);
    try {
      const base64 = await readAsBase64(file);
      const data = await sahelApiCall({
        action: 'sendFile',
        senderId: sahelUser.id,
        receiverId: receiverId,
        fileName: file.name,
        mimeType: file.type,
        fileData: base64
      });
      if (!(data && data.success)) failed.push(i);
    } catch (err) { failed.push(i); }
  }
  return { sent: files.length - failed.length, failed: failed };
}

function rememberSent(receiverId, files, failedIdx) {
  const ok = files.filter((f, i) => failedIdx.indexOf(i) === -1)
    .map((f) => ({ name: f.name, size: f.size, time: new Date().toISOString() }));
  if (ok.length) addSentFiles(receiverId, ok);
}

/* --- تب «فایل‌ها»: فرم ارسال با انتخاب گیرنده --- */
function renderFileChips() {
  if (!selectedFiles.length) {
    fileChipsList.innerHTML = '';
    fileInputLabel.textContent = 'انتخاب فایل (چند فایل هم‌زمان ممکن است)';
    fileUploadLabel.classList.remove('has-file');
    return;
  }
  fileUploadLabel.classList.add('has-file');
  fileInputLabel.textContent = selectedFiles.length === 1 ? selectedFiles[0].name : `${toFaDigits(selectedFiles.length)} فایل انتخاب شد`;
  fileChipsList.innerHTML = selectedFiles.map((f, i) => `
    <div class="file-chip">
      <span class="file-chip-name">${escHtml(f.name)}</span>
      <span class="file-chip-size">${formatFileSize(f.size)}</span>
      <button type="button" class="file-chip-remove" data-i="${i}" aria-label="حذف">✕</button>
    </div>
  `).join('');
  fileChipsList.querySelectorAll('.file-chip-remove').forEach((btn) => {
    btn.addEventListener('click', () => {
      selectedFiles.splice(Number(btn.dataset.i), 1);
      renderFileChips();
    });
  });
}

newFileBtn?.addEventListener('click', (e) => {
  e.stopPropagation();
  const isOpen = fileSendForm.style.display === 'flex';
  fileSendForm.style.display = isOpen ? 'none' : 'flex';
  newFileBtn.classList.toggle('is-open', !isOpen);
  fileSendStatus.textContent = '';
});

fileInput?.addEventListener('change', () => {
  Array.from(fileInput.files).forEach((nf) => {
    const exists = selectedFiles.some((f) => f.name === nf.name && f.size === nf.size);
    if (!exists) selectedFiles.push(nf);
  });
  fileInput.value = '';
  renderFileChips();
});

fileSendBtn?.addEventListener('click', async () => {
  const receiverId = fileRecipient.value;
  if (!receiverId) { fileSendStatus.textContent = 'گیرنده را انتخاب کنید.'; return; }
  if (!selectedFiles.length) { fileSendStatus.textContent = 'حداقل یک فایل انتخاب کنید.'; return; }

  fileSendBtn.disabled = true;
  const files = selectedFiles.slice();
  const res = await sendFilesTo(receiverId, files, (i, n) => {
    fileSendStatus.textContent = `در حال ارسال ${toFaDigits(i)} از ${toFaDigits(n)}...`;
  });
  rememberSent(receiverId, files, res.failed);
  fileSendBtn.disabled = false;

  if (!res.failed.length) {
    fileSendStatus.textContent = res.sent > 1 ? `${toFaDigits(res.sent)} فایل ارسال شد.` : 'فایل ارسال شد.';
    selectedFiles = [];
    renderFileChips();
    setTimeout(() => { fileSendForm.style.display = 'none'; newFileBtn.classList.remove('is-open'); }, 1000);
  } else {
    fileSendStatus.textContent = 'ارسال ناموفق: ' + res.failed.map((i) => files[i].name).join('، ');
    // فقط فایل‌های ناموفق می‌مانند تا دوباره تلاش شود
    selectedFiles = res.failed.map((i) => files[i]);
    renderFileChips();
  }
});

/* --- داخل گفتگو: دکمهٔ پیوست (گیرنده همان همکارِ باز است) --- */
function renderAttachPreview() {
  const box = mgEl('mgAttachPreview');
  if (!box) return;
  if (!SahelMsgr.pending.length) { box.hidden = true; box.innerHTML = ''; return; }
  box.hidden = false;
  box.innerHTML = SahelMsgr.pending.map((f, i) => `
    <div class="file-chip">
      <span class="file-chip-name">${escHtml(f.name)}</span>
      <span class="file-chip-size">${formatFileSize(f.size)}</span>
      <button type="button" class="file-chip-remove" data-i="${i}" aria-label="حذف">✕</button>
    </div>
  `).join('');
}

mgEl('mgAttachPreview')?.addEventListener('click', (e) => {
  const btn = e.target.closest && e.target.closest('.file-chip-remove');
  if (!btn) return;
  e.stopPropagation();
  SahelMsgr.pending.splice(Number(btn.dataset.i), 1);
  renderAttachPreview();
});

mgEl('mgAttachBtn')?.addEventListener('click', (e) => { e.stopPropagation(); mgEl('mgAttachInput').click(); });

mgEl('mgAttachInput')?.addEventListener('change', () => {
  const input = mgEl('mgAttachInput');
  Array.from(input.files).forEach((nf) => {
    if (!SahelMsgr.pending.some((f) => f.name === nf.name && f.size === nf.size)) SahelMsgr.pending.push(nf);
  });
  input.value = '';
  renderAttachPreview();
});

async function sendThreadFiles() {
  const c = SahelMsgr.contact;
  if (!c || !SahelMsgr.pending.length || SahelMsgr.sending) return;
  SahelMsgr.sending = true;
  const files = SahelMsgr.pending.slice();
  const box = mgEl('mgAttachPreview');
  const note = (t) => { box.hidden = false; box.innerHTML = '<span class="mg-attach-note">' + escHtml(t) + '</span>'; };
  const res = await sendFilesTo(c.id, files, (i, n, name) => note(`در حال ارسال ${toFaDigits(i)} از ${toFaDigits(n)}: ${name}`));
  rememberSent(c.id, files, res.failed);
  SahelMsgr.pending = res.failed.map((i) => files[i]);
  SahelMsgr.sending = false;
  renderAttachPreview();
  if (res.failed.length) {
    const n = document.createElement('span');
    n.className = 'mg-attach-note';
    n.textContent = 'ارسال ناموفق بود؛ دوباره دکمهٔ ارسال را بزنید.';
    mgEl('mgAttachPreview').appendChild(n);
  }
  if (SahelMsgr.contact && SahelMsgr.contact.id === c.id) loadChatMessages(c.id, true, true);
}

// متن پیام با منطق جداگانهٔ چت ارسال می‌شود؛ این شنونده فقط فایل‌های پیوست‌شده را می‌فرستد
mgEl('chatSendBtn')?.addEventListener('click', () => {
  sendThreadFiles();
  setTimeout(() => { const t = mgEl('chatInput'); if (t) t.style.height = ''; }, 60);
});

mgEl('chatInput')?.addEventListener('input', (e) => {
  const t = e.target;
  t.style.height = 'auto';
  t.style.height = Math.min(t.scrollHeight, 120) + 'px';
});


document.getElementById('membersSwitchBtn')?.addEventListener('click', (e) => {
  e.stopPropagation();
  const panel = document.getElementById('membersPanel');
  const isOpen = panel.style.display === 'flex';
  closeAllPanels();
  if (!isOpen) {
    positionPanel(panel, e.currentTarget);
    panel.style.display = 'flex';
  }
});

document.getElementById('membersPanel')?.addEventListener('click', (e) => e.stopPropagation());

// آیکن یکپارچهٔ پیام‌رسان: اگر فقط فایل تازه دارد، مستقیم تب فایل‌ها باز می‌شود
function toggleMessenger(trigger) {
  const panel = mgEl('chatPanel');
  const isOpen = panel.style.display === 'flex';
  closeAllPanels();
  if (isOpen) return;
  positionPanel(panel, trigger);
  panel.style.display = 'flex';
  SahelMsgr.contact = null;
  SahelMsgr.pending = [];
  renderAttachPreview();
  renderThreadFiles();
  if (SahelMsgr.fileUnread > 0 && SahelMsgr.chatUnread === 0) {
    openFilesTab();
  } else {
    mgShow('chats');
    loadChatContacts();
    loadFiles();
  }
}

document.getElementById('chatBtn')?.addEventListener('click', (e) => {
  e.stopPropagation();
  toggleMessenger(e.currentTarget);
});
document.getElementById('chatBtn')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); toggleMessenger(e.currentTarget); }
});

document.getElementById('chatPanel')?.addEventListener('click', (e) => e.stopPropagation());

/* ===== به‌روزرسانی خودکار: شمارندهٔ نخوانده‌ها و گفتگوی باز ===== */
function startMessengerPolling() {
  setInterval(() => {
    if (document.hidden) return;
    loadChatContacts();
    loadFiles();
  }, 30000);
  setInterval(() => {
    if (document.hidden || !mgPanelOpen()) return;
    if (SahelMsgr.view === 'thread' && SahelMsgr.contact) loadChatMessages(SahelMsgr.contact.id, true);
  }, 8000);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) { loadChatContacts(); loadFiles(); }
  });
}

// کارت پروفایل: اطلاعات همان کارتابلی که الان باز است (مدیر وقتی روی کارتابل عضو است، پروفایل همان عضو را می‌بیند)
function fillProfileCard() {
  if (!sahelUser) return;
  const own = !viewedProfile || String(viewedProfile.id) === String(sahelUser.id);
  const p = own
    ? { name: sahelUser.name, photo: sahelUser.photo, role: sahelUser.role, jobTitle: sahelUser.jobTitle, initials: sahelUser.initials }
    : viewedProfile;
  setAvatar(document.getElementById('pcAvatar'), p.photo, p.initials || String(p.name || '').slice(0, 2), 400);
  document.getElementById('pcName').textContent = p.name || '';
  document.getElementById('pcRole').textContent = roleLabel(p.role, p.jobTitle);
  const lo = document.getElementById('pcLogoutText');
  if (lo) lo.textContent = own ? 'خروج از حساب' : 'خروج از حساب خودم';
}

document.getElementById('topbarUser')?.addEventListener('click', (e) => {
  e.stopPropagation();
  const panel = document.getElementById('userDropdown');
  const isOpen = panel.style.display === 'block';
  closeAllPanels();
  if (!isOpen) {
    fillProfileCard();
    panel.style.display = 'block';
  }
});

document.getElementById('appSwitch')?.addEventListener('click', (e) => {
  e.stopPropagation();
  const menu = document.getElementById('appMenu');
  const btn = e.currentTarget;
  const isOpen = menu.style.display === 'flex';
  closeAllPanels();
  if (!isOpen) {
    const r = btn.getBoundingClientRect();
    const w = Math.min(220, window.innerWidth - 20);
    menu.style.top = (r.bottom + 8) + 'px';
    menu.style.left = 'auto';
    menu.style.right = Math.min(Math.max(10, window.innerWidth - r.right), window.innerWidth - 10 - w) + 'px';
    menu.style.display = 'flex';
    btn.setAttribute('aria-expanded', 'true');
  }
});

document.getElementById('appMenu')?.addEventListener('click', (e) => e.stopPropagation());
// کلیک داخل کارت پروفایل آن را نمی‌بندد؛ فقط ضربدر، کلیک بیرون از کارت یا Esc
document.getElementById('userDropdown')?.addEventListener('click', (e) => e.stopPropagation());
document.getElementById('pcClose')?.addEventListener('click', (e) => { e.stopPropagation(); closeAllPanels(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeAllPanels(); });

document.getElementById('logoutBtn')?.addEventListener('click', () => {
  sessionStorage.removeItem('sahel_user');
});

document.addEventListener('click', closeAllPanels);
// کلیک/لمس داخل اپ (iframe) به صفحه‌ی اصلی نمی‌رسد؛ ولی فوکوس از صفحه‌ی اصلی به iframe می‌رود => پنل‌ها بسته شوند
window.addEventListener('blur', () => {
  setTimeout(() => {
    const a = document.activeElement;
    if (a && a.tagName === 'IFRAME') closeAllPanels();
  }, 0);
});
/* در موبایل با باز شدن کیبورد ارتفاع صفحه تغییر می‌کند و رویداد resize می‌آید؛ نباید پنل (مثلاً پیام) بسته شود. فقط تغییر عرض (چرخش/تغییر اندازه) پنل‌ها را می‌بندد */
let _lastW = window.innerWidth;
window.addEventListener('resize', () => {
  const w = window.innerWidth;
  if (w === _lastW) return;
  _lastW = w;
  closeAllPanels();
});

/* ===== پل میکروفون برای اپ‌های Apps Script داخل iframe =====
   گوگل به قاب داخلی Apps Script اجازهٔ میکروفون نمی‌دهد؛ پس تشخیص گفتار اینجا
   (صفحهٔ اصلی GitHub Pages) انجام می‌شود و متن/موج صدا به همان اپ برگردانده می‌شود.
   دو پروتکل پشتیبانی می‌شود:
   ۱) {sahelMic:id, t:'start'|'stop'}            ← SahelAi.html
   ۲) {sahelCmd:'voice', act:'start'|'stop'}     ← App.html  (پاسخ: {sahelVoice2:{state:...}}) */
(function () {
  const SP = window.SahelPlatform || null;   // آداپتور پلتفرم (ویندوز/اندروید) — در نسخهٔ وب وجود ندارد
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

  // پیام کوچک پایین صفحه (برای حالت‌هایی که پلتفرم کاری را پشتیبانی نمی‌کند)
  let toastEl = null, toastTm = 0;
  function hostToast(msg) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.style.cssText = 'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:900;max-width:88vw;' +
        'background:#0B3D42;color:#fff;padding:10px 18px;border-radius:16px;font:600 13px/1.7 Vazirmatn,Tahoma,sans-serif;' +
        'box-shadow:0 8px 30px rgba(0,0,0,.28);text-align:center;opacity:0;pointer-events:none;transition:opacity .2s';
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.style.opacity = '1';
    clearTimeout(toastTm);
    toastTm = setTimeout(() => { toastEl.style.opacity = '0'; }, 4200);
  }
  const LANGS = ['fa-IR', 'fa', 'en-US'];
  let cur = null;

  // فقط پیام‌هایی که از داخل iframe کارتابل خودمان می‌آیند پذیرفته می‌شوند
  function isOurs(src) {
    const frames = Array.from(document.querySelectorAll('iframe')).map(f => f.contentWindow);
    try {
      for (let w = src, n = 0; w && n < 6; w = w.parent, n++) {
        if (frames.indexOf(w) > -1) return true;
        if (w === w.parent) break;
      }
    } catch (e) {}
    return false;
  }

  function post(src, obj) { try { src.postMessage(obj, '*'); } catch (e) {} }

  // آداپتور پروتکل ۱ (SahelAi)
  function adapterA(src, id) {
    const m = (o) => { o.sahelMic = id; post(src, o); };
    return {
      ack: () => m({ t: 'ack' }),
      start: () => {},
      text: (t, fin) => m({ t: 'result', text: t, final: !!fin }),
      level: () => {},
      end: (t, err) => err ? m({ t: 'error', code: err }) : m({ t: 'end' })
    };
  }

  // آداپتور پروتکل ۲ (App)
  function adapterB(src) {
    const m = (o) => post(src, { sahelVoice2: o });
    return {
      ack: () => m({ state: 'ack' }),
      start: () => m({ state: 'start' }),
      text: (t) => m({ state: 'txt', t: t }),
      level: (a) => m({ state: 'lv', a: a }),
      end: (t, err) => err ? m({ state: 'end', err: err }) : m({ state: 'end', t: t })
    };
  }

  function cleanup(s) {
    cancelAnimationFrame(s.raf);
    try { s.stream && s.stream.getTracks().forEach(t => t.stop()); } catch (e) {}
    try { s.ctx && s.ctx.close(); } catch (e) {}
    s.stream = s.ctx = null;
    if (cur === s) cur = null;
  }

  function stopCur() { if (cur) { try { cur.rec.stop(); } catch (e) {} } }

  async function startLevel(s) {
    try {
      const st = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (cur !== s) { st.getTracks().forEach(t => t.stop()); return; }
      s.stream = st;
      const AC = window.AudioContext || window.webkitAudioContext;
      s.ctx = new AC();
      const an = s.ctx.createAnalyser();
      an.fftSize = 1024;
      s.ctx.createMediaStreamSource(st).connect(an);
      const buf = new Uint8Array(an.fftSize);
      let last = 0;
      const tick = (t) => {
        if (cur !== s) return;
        if (t - last > 60) {
          last = t;
          an.getByteTimeDomainData(buf);
          const a = [];
          for (let k = 0; k < buf.length; k += 16) a.push(buf[k]);
          s.out.level(a);
        }
        s.raf = requestAnimationFrame(tick);
      };
      s.raf = requestAnimationFrame(tick);
    } catch (e) {}
  }

  // تشخیص گفتار بومی پلتفرم (مثلاً اندروید): SP.speech.start(opts, {onStart,onText,onEnd}) => Promise<{stop}>
  function beginHost(out, id) {
    if (cur) { const o = cur; o.silent = true; try { o.rec.abort(); } catch (e) {} cleanup(o); }
    let h = null, stopReq = false;
    const s = { id: id, out: out, last: '', fin: '', err: '', raf: 0, silent: false };
    s.rec = {
      stop() { stopReq = true; try { h && h.stop(); } catch (e) {} },
      abort() { stopReq = true; try { h && h.stop(); } catch (e) {} }
    };
    cur = s;
    out.ack();
    const finish = (text, err) => {
      if (s.silent || cur !== s) return;
      const t = String(text || s.fin || s.last || '').trim();
      cleanup(s);
      out.end(t, err || '');
    };
    SP.speech.start({ lang: 'fa-IR' }, {
      onStart() { if (!s.silent) out.start(); },
      onText(t, fin) { if (s.silent) return; s.last = String(t || ''); if (fin) s.fin = s.last; out.text(s.last, !!fin); },
      onEnd(text, err) { finish(text, err); }
    }).then((hh) => { h = hh; if (stopReq) { try { h && h.stop(); } catch (e) {} } })
      .catch((e) => finish('', (e && e.code) || 'service-not-allowed'));
  }

  function begin(out, id, withLevel) {
    if (SP && SP.speech === false) {              // این پلتفرم اصلاً گفتار ندارد (مثلاً ویندوز/Electron)
      out.ack();
      out.end('', 'host-unsupported');
      try { SP.onSpeechUnsupported && SP.onSpeechUnsupported(); } catch (e) {}
      return;
    }
    if (SP && SP.speech && SP.speech.start) { beginHost(out, id); return; }
    if (cur) { const o = cur; o.silent = true; try { o.rec.abort(); } catch (e) {} cleanup(o); }
    const s = { id: id, out: out, rec: null, last: '', fin: '', err: '', raf: 0, silent: false };
    cur = s;
    out.ack();
    if (!SR) { cleanup(s); out.end('', 'unsupported'); return; }

    function run(i) {
      const rec = new SR();
      let skipEnd = false;
      s.rec = rec;
      rec.lang = LANGS[i];
      rec.interimResults = true;
      rec.continuous = false;
      rec.maxAlternatives = 1;
      rec.onstart = function () { if (!s.silent) { out.start(); if (withLevel) startLevel(s); } };
      rec.onspeechend = function () { try { rec.stop(); } catch (e) {} };
      rec.onresult = function (e) {
        if (s.silent) return;
        let t = '', f = '';
        for (let k = 0; k < e.results.length; k++) {
          const x = e.results[k][0].transcript;
          t += (t && !/\s$/.test(t) ? ' ' : '') + x;
          if (e.results[k].isFinal) f += (f && !/\s$/.test(f) ? ' ' : '') + x;
        }
        s.last = t;
        if (f) s.fin = f;
        out.text(t, !!e.results[e.results.length - 1].isFinal);
      };
      rec.onerror = function (e) {
        const code = e.error || 'x';
        if (code === 'aborted') return;
        if (code === 'language-not-supported' && i < LANGS.length - 1) { skipEnd = true; run(i + 1); return; }
        s.err = code;
      };
      rec.onend = function () {
        if (skipEnd || s.silent) return;
        const text = (s.fin || s.last || '').trim();
        cleanup(s);
        out.end(text, s.err);
      };
      try { rec.start(); }
      catch (x) { s.err = 'service-not-allowed'; cleanup(s); out.end('', s.err); }
    }
    run(0);
  }

  window.addEventListener('message', function (ev) {
    const d = ev.data;
    if (!d || typeof d !== 'object' || !ev.source || !isOurs(ev.source)) return;
    if (d.sahelMic) {
      const id = String(d.sahelMic);
      if (d.t === 'start') begin(adapterA(ev.source, id), id, false);
      else if (d.t === 'stop' && cur && cur.id === id) stopCur();
    } else if (d.sahelCmd === 'voice') {
      if (d.act === 'start') begin(adapterB(ev.source), 'B', !d.noLevel);
      else if (d.act === 'stop') stopCur();
    }
  });

  /* ===== فرمان‌های فایل و چاپ از اپ‌ها =====
     {sahelCmd:'share'|'save', id, buf:ArrayBuffer, name, type, title, text}  ← جواب: {sahelShare|sahelHost:{id,state}}
     {sahelCmd:'print', id}                                                  ← جواب: state = 'passthrough' | 'blocked'
     state ها: ack | ok | cancel | unsupported | error | passthrough | blocked
     Web Share و دانلود blob داخل iframe اپ‌های Apps Script کار نمی‌کند؛ این‌جا (صفحهٔ اصلی) انجام می‌شود.
     کلیک کاربر داخل iframe به صفحهٔ اصلی هم «کنش کاربر» می‌دهد، پس share همین‌جا مجاز است.
     اگر آداپتور پلتفرم (SahelPlatform) باشد، ذخیره/اشتراک بومی همان پلتفرم استفاده می‌شود. */
  function makeReply(ev, key, id) {
    return (state, extra) => {
      try { ev.source.postMessage({ [key]: Object.assign({ id: id, state: state }, extra || {}) }, '*'); } catch (e) {}
    };
  }

  async function handleFile(ev, d, mode) {
    const id = String(d.id || '');
    const reply = makeReply(ev, mode === 'share' ? 'sahelShare' : 'sahelHost', id);
    reply('ack');
    try {
      const name = String(d.name || 'file');
      const type = String(d.type || 'application/octet-stream');
      const meta = { mode: mode, title: d.title ? String(d.title) : '', text: d.text ? String(d.text) : '' };
      // ۱) آداپتور بومی پلتفرم
      if (SP && d.buf && SP.saveFile) { reply(String(await SP.saveFile({ name: name, type: type, buf: d.buf }, meta) || 'ok')); return; }
      if (SP && !d.buf && SP.shareText && mode === 'share') { reply(String(await SP.shareText(meta) || 'ok')); return; }
      // ۲) وب: اشتراک‌گذاری
      if (mode === 'share') {
        const data = {};
        if (d.buf) data.files = [new File([d.buf], name, { type: type })];
        if (meta.title) data.title = meta.title;
        if (meta.text) data.text = meta.text;
        if (!navigator.share || (data.files && !(navigator.canShare && navigator.canShare(data)))) { reply('unsupported'); return; }
        await navigator.share(data);
        reply('ok');
        return;
      }
      // ۳) وب: ذخیره (دانلود در صفحهٔ اصلی)
      if (!d.buf) { reply('error', { msg: 'nofile' }); return; }
      const url = URL.createObjectURL(new Blob([d.buf], { type: type }));
      const a = document.createElement('a');
      a.href = url; a.download = name; a.style.display = 'none';
      document.body.appendChild(a); a.click();
      setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 4000);
      reply('ok');
    } catch (e) {
      reply(e && e.name === 'AbortError' ? 'cancel' : 'error', { msg: String((e && (e.name || e.message)) || '') });
    }
  }

  /* عنوان گزارش برای نام فایل PDF: مرورگر هنگام «Save as PDF» نام فایل را از عنوان همین صفحهٔ اصلی می‌گیرد.
     {sahelCmd:'title', title:'…'} ← عنوان موقت تا پایان چاپ؛ title خالی = برگرداندن عنوان قبلی (برای اطمینان بعد از ۲ دقیقه هم خودکار برمی‌گردد) */
  let _oldTitle = null, _titleTimer = null;
  function restoreTitle() {
    clearTimeout(_titleTimer);
    if (_oldTitle !== null) { document.title = _oldTitle; _oldTitle = null; }
  }
  function handleTitle(ev, d) {
    const reply = makeReply(ev, 'sahelHost', String((d && d.id) || ''));
    const t = d && d.title ? String(d.title).slice(0, 200) : '';
    if (!t) { restoreTitle(); reply('ok'); return; }
    if (_oldTitle === null) _oldTitle = document.title;
    document.title = t;
    clearTimeout(_titleTimer);
    _titleTimer = setTimeout(restoreTitle, 120000);
    reply('ok');   // تأیید برای اپ: عنوان نشست؛ حالا چاپ را شروع کن
  }

  function handlePrint(ev, d) {
    const reply = makeReply(ev, 'sahelHost', String(d.id || ''));
    reply('ack');
    if (SP && SP.print === 'blocked') {
      hostToast(SP.printMsg || 'چاپ مستقیم در این نسخه ممکن نیست؛ از «ذخیره PDF» یا «اشتراک‌گذاری» استفاده کن.');
      reply('blocked');
    } else {
      reply('passthrough');     // خود اپ window.print() را صدا می‌زند
    }
  }

  window.addEventListener('message', function (ev) {
    const d = ev.data;
    if (!d || typeof d !== 'object' || !ev.source || !d.sahelCmd || !isOurs(ev.source)) return;
    if (d.sahelCmd === 'share') handleFile(ev, d, 'share');
    else if (d.sahelCmd === 'save') handleFile(ev, d, 'save');
    else if (d.sahelCmd === 'print') handlePrint(ev, d);
    else if (d.sahelCmd === 'title') handleTitle(ev, d);
  });
})();

start();
