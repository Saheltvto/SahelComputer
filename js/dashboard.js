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
function sahelPhotoUrl(raw) {
  if (!raw) return '';
  raw = String(raw).trim();
  if (!raw) return '';
  if (/drive\.google\.com|docs\.google\.com/i.test(raw)) {
    const m = raw.match(/\/d\/([a-zA-Z0-9_-]{20,})/) || raw.match(/[?&]id=([a-zA-Z0-9_-]{20,})/);
    if (m) return 'https://lh3.googleusercontent.com/d/' + m[1] + '=w200';
  }
  if (/^[a-zA-Z0-9_-]{25,}$/.test(raw)) {
    return 'https://lh3.googleusercontent.com/d/' + raw + '=w200';
  }
  if (/^(https?:\/\/|data:image\/)/i.test(raw)) return raw.replace(/"/g, '%22');
  return '';
}

// اگر عکس نبود یا لود نشد، همان حروف اول نام نمایش داده می‌شود
function avatarHtml(photo, text) {
  const url = sahelPhotoUrl(photo);
  // اگر آدرس اصلی لود نشد، یک بار آدرس جایگزین درایو را امتحان می‌کند؛ بعد حروف اول می‌ماند
  const m = url.match(/lh3\.googleusercontent\.com\/d\/([a-zA-Z0-9_-]+)/);
  const fb = m ? 'https://drive.google.com/thumbnail?id=' + m[1] + '&sz=w200' : '';
  const img = url
    ? `<img class="avatar-img" src="${url}" data-fb="${fb}" alt="" referrerpolicy="no-referrer" onerror="if(this.dataset.fb){this.src=this.dataset.fb;this.dataset.fb='';}else{this.remove();}">`
    : '';
  return `<span class="avatar-txt">${text}</span>${img}`;
}

function setAvatar(el, photo, text) {
  if (el) el.innerHTML = avatarHtml(photo, text);
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
  appTabsEl.querySelectorAll('.app-tab').forEach(t => t.setAttribute('aria-selected', String(t.dataset.url === url)));
  try { sessionStorage.setItem('sahel_last_app', url); } catch (e) {}
}

function renderAppTabs(apps) {
  if (apps.length < 2) { appTabsEl.hidden = true; appTabsEl.innerHTML = ''; return; }
  appTabsEl.hidden = false;
  appTabsEl.innerHTML = '';
  apps.forEach(a => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'app-tab';
    b.dataset.url = a.url;
    b.setAttribute('role', 'tab');
    b.textContent = a.title;
    b.addEventListener('click', () => showApp(a.url));
    appTabsEl.appendChild(b);
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

  await bootstrapPromise;
}

function applyBootstrapData(data) {
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
  updateChatBadge(data.chatUnreadCount || 0);
}

function renderMembers(workspaces) {
  const membersList = document.getElementById('membersList');
  membersList.innerHTML = workspaces.map(w => `
    <div class="member-row" data-id="${escAttr(w.id)}" data-url="${escAttr(w.appUrl)}" data-name="${escAttr(w.name)}" data-photo="${escAttr(sahelPhotoUrl(w.photo))}" data-role="${escAttr(w.role || '')}" data-jobtitle="${escAttr(w.jobTitle || '')}">
      <div class="member-avatar">${avatarHtml(w.photo, w.initials || w.name.slice(0, 2))}</div>
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
        photo: row.dataset.photo,
        role: row.dataset.role,
        jobTitle: row.dataset.jobtitle
      };
      setActiveMember(member);
      closeAllPanels();
    });
  });
}

function setActiveMember(member) {
  activeMemberId = String(member.id);
  document.querySelectorAll('.member-row').forEach(r => {
    r.classList.toggle('active', r.dataset.id === activeMemberId);
  });
  openWorkspace(member.url);
  document.getElementById('topbarName').textContent = member.name;
  document.getElementById('topbarRole').textContent = roleLabel(member.role, member.jobTitle);
  setAvatar(document.getElementById('topbarAvatar'), member.photo, member.name.slice(0, 2));
}

function renderFiles(files) {
  const fileList = document.getElementById('fileList');
  if (!files || !files.length) {
    fileList.innerHTML = '<div class="file-empty">فایلی دریافت نشده است.</div>';
    return;
  }
  fileList.innerHTML = files.map(f => `
    <a class="file-item ${f.status === 'نخوانده' ? 'unread' : ''}" href="${f.url}" target="_blank" rel="noopener">
      <div class="file-item-body">
        <b>${f.fileName}</b>
        <span>از طرف ${f.senderName}</span>
      </div>
    </a>
  `).join('');
}

function displayRates(rates) {
  if (!rates) return;
  if (rates.USD)  document.getElementById('tiUsd').innerHTML  = `<span class="rate-label">دلار</span> <span class="rate-value">${formatNumber(rates.USD)}</span>`;
  if (rates.AED)  document.getElementById('tiAed').innerHTML  = `<span class="rate-label">درهم</span> <span class="rate-value">${formatNumber(rates.AED)}</span>`;
  if (rates.COIN) document.getElementById('tiCoin').innerHTML = `<span class="rate-label">سکه</span> <span class="rate-value">${formatNumber(rates.COIN)}</span>`;
  if (rates.GOLD) document.getElementById('tiGold').innerHTML = `<span class="rate-label">طلا</span> <span class="rate-value">${formatNumber(rates.GOLD)}</span>`;
}

function renderChatContacts(contacts) {
  const contactsList = document.getElementById('chatContactsList');
  if (!contacts || !contacts.length) {
    contactsList.innerHTML = '<div class="file-empty">کاربری نیست.</div>';
    return;
  }
  contactsList.innerHTML = contacts.map(u => `
    <div class="chat-contact-row" data-id="${u.id}" data-name="${u.name}">
      <div class="member-avatar">${avatarHtml(u.photo, u.initials || u.name.slice(0, 2))}</div>
      <div class="member-info">
        <b>${u.name}</b>
        <span class="chat-contact-last">${u.lastMessage || 'برای گفتگو کلیک کنید'}</span>
      </div>
      ${u.unreadCount > 0 ? '<span class="chat-unread-dot"></span>' : ''}
    </div>
  `).join('');

  contactsList.querySelectorAll('.chat-contact-row').forEach(row => {
    row.addEventListener('click', (e) => {
      e.stopPropagation();
      openChatWith(row.dataset.id, row.dataset.name);
    });
  });
}

function renderRecipients(users) {
  const select = document.getElementById('fileRecipient');
  if (!select || !users || !users.length) return;
  select.innerHTML = '<option value="">انتخاب گیرنده...</option>' +
    users.map(u => `<option value="${u.id}">${u.name}</option>`).join('');
}

function openChatWith(contactId, contactName) {
  document.getElementById('chatPanelTitle').textContent = contactName;
  document.getElementById('chatContactsView').style.display = 'none';
  document.getElementById('chatThreadView').style.display = 'flex';
  document.getElementById('chatBackBtn').style.display = 'flex';
  loadChatMessages(contactId);

  sahelApiCall({ action: 'markChatRead', userId: sahelUser.id, contactId: contactId })
    .then(() => loadChatContacts())
    .catch(() => {});
}

async function loadChatMessages(contactId) {
  const chatMessages = document.getElementById('chatMessages');
  chatMessages.innerHTML = '<div style="text-align:center;color:#7F9A9C;padding:20px;">در حال بارگذاری...</div>';
  try {
    const data = await sahelApiCall({ action: 'getChatMessages', userId: sahelUser.id, contactId: contactId });
    if (data.success) {
      renderChatMessages(data.messages, contactId);
    }
  } catch (e) {
    chatMessages.innerHTML = '<div style="text-align:center;color:#7F9A9C;padding:20px;">خطا</div>';
  }
}

function renderChatMessages(messages, contactId) {
  const chatMessages = document.getElementById('chatMessages');
  if (!messages || !messages.length) {
    chatMessages.innerHTML = '<div style="text-align:center;color:#7F9A9C;padding:20px;">گفتگو را شروع کنید</div>';
    chatMessages.dataset.contactId = contactId;
    return;
  }
  chatMessages.innerHTML = messages.map(msg => {
    const isOut = String(msg.senderId) === String(sahelUser.id);
    const timeStr = formatTime(msg.time);
    const textWithLinks = msg.text.replace(/https?:\/\/[^\s]+/g, url => `<a href="${url}" target="_blank">${url}</a>`);
    return `
      <div class="chat-bubble ${isOut ? 'chat-bubble-out' : 'chat-bubble-in'}">
        ${textWithLinks}
        <span class="chat-bubble-time">${timeStr}</span>
      </div>
    `;
  }).join('');
  chatMessages.scrollTop = chatMessages.scrollHeight;
  chatMessages.dataset.contactId = contactId;
}

document.getElementById('chatBackBtn')?.addEventListener('click', () => {
  document.getElementById('chatThreadView').style.display = 'none';
  document.getElementById('chatContactsView').style.display = 'flex';
  document.getElementById('chatBackBtn').style.display = 'none';
  document.getElementById('chatPanelTitle').textContent = 'گفتگوها';
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
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function renderFileChips() {
  if (!selectedFiles.length) {
    fileChipsList.innerHTML = '';
    fileInputLabel.textContent = 'انتخاب فایل (چند فایل هم‌زمان ممکن است)';
    fileUploadLabel.classList.remove('has-file');
    return;
  }
  fileUploadLabel.classList.add('has-file');
  fileInputLabel.textContent = selectedFiles.length === 1 ? selectedFiles[0].name : `${selectedFiles.length} فایل انتخاب شد`;
  fileChipsList.innerHTML = selectedFiles.map((f, i) => `
    <div class="file-chip">
      <span class="file-chip-name">${f.name}</span>
      <span class="file-chip-size">${formatFileSize(f.size)}</span>
      <button type="button" class="file-chip-remove" data-i="${i}">✕</button>
    </div>
  `).join('');
  fileChipsList.querySelectorAll('.file-chip-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedFiles.splice(Number(btn.dataset.i), 1);
      renderFileChips();
    });
  });
}

newFileBtn?.addEventListener('click', () => {
  const isOpen = fileSendForm.style.display === 'flex';
  fileSendForm.style.display = isOpen ? 'none' : 'flex';
  newFileBtn.classList.toggle('is-open', !isOpen);
  fileSendStatus.textContent = '';
});

fileInput?.addEventListener('change', () => {
  const newFiles = Array.from(fileInput.files);
  newFiles.forEach(nf => {
    const exists = selectedFiles.some(f => f.name === nf.name && f.size === nf.size);
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
  let sentCount = 0;
  let failedNames = [];

  for (const file of selectedFiles) {
    fileSendStatus.textContent = `در حال ارسال ${sentCount + 1} از ${selectedFiles.length}...`;
    try {
      const reader = new FileReader();
      const base64 = await new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const data = await sahelApiCall({
        action: 'sendFile',
        senderId: sahelUser.id,
        receiverId: receiverId,
        fileName: file.name,
        mimeType: file.type,
        fileData: base64
      });
      if (data.success) { sentCount++; } else { failedNames.push(file.name); }
    } catch (err) { failedNames.push(file.name); }
  }

  fileSendBtn.disabled = false;
  if (!failedNames.length) {
    fileSendStatus.textContent = sentCount > 1 ? `${toFaDigits(sentCount)} فایل ارسال شد.` : 'فایل ارسال شد.';
    selectedFiles = [];
    renderFileChips();
    setTimeout(() => { fileSendForm.style.display = 'none'; newFileBtn.classList.remove('is-open'); }, 1000);
  } else {
    fileSendStatus.textContent = `ارسال ناموفق: ${failedNames.join('، ')}`;
  }
});

document.getElementById('fileTransferBtn')?.addEventListener('click', async (e) => {
  e.stopPropagation();
  const panel = document.getElementById('filePanel');
  const isOpen = panel.style.display === 'flex';
  closeAllPanels();
  if (!isOpen) {
    positionPanel(panel, e.currentTarget);
    panel.style.display = 'flex';
    try {
      const data = await sahelApiCall({ action: 'getFiles', userId: sahelUser.id });
      if (data.success) {
        renderFiles(data.files);
        if (data.unreadCount > 0) {
          updateFileBadge(0);
          sahelApiCall({ action: 'markFilesRead', userId: sahelUser.id }).catch(() => {});
        }
      }
    } catch (err) {}
  }
});

document.getElementById('filePanel')?.addEventListener('click', (e) => e.stopPropagation());

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

document.getElementById('chatBtn')?.addEventListener('click', (e) => {
  e.stopPropagation();
  const panel = document.getElementById('chatPanel');
  const isOpen = panel.style.display === 'flex';
  closeAllPanels();
  if (!isOpen) {
    positionPanel(panel, e.currentTarget);
    panel.style.display = 'flex';
    document.getElementById('chatContactsView').style.display = 'flex';
    document.getElementById('chatThreadView').style.display = 'none';
    document.getElementById('chatBackBtn').style.display = 'none';
    document.getElementById('chatPanelTitle').textContent = 'گفتگوها';
    loadChatContacts();
  }
});

document.getElementById('chatPanel')?.addEventListener('click', (e) => e.stopPropagation());

document.getElementById('topbarUser')?.addEventListener('click', (e) => {
  e.stopPropagation();
  const panel = document.getElementById('userDropdown');
  const isOpen = panel.style.display === 'block';
  closeAllPanels();
  if (!isOpen) {
    positionPanel(panel, e.currentTarget);
    panel.style.display = 'block';
  }
});

document.getElementById('logoutBtn')?.addEventListener('click', () => {
  sessionStorage.removeItem('sahel_user');
});

document.addEventListener('click', closeAllPanels);
window.addEventListener('resize', closeAllPanels);

/* ===== پل میکروفون برای اپ‌های Apps Script داخل iframe =====
   گوگل به قاب داخلی Apps Script اجازهٔ میکروفون نمی‌دهد؛ پس تشخیص گفتار اینجا
   (صفحهٔ اصلی GitHub Pages) انجام می‌شود و متن به همان اپ برگردانده می‌شود. */
(function () {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
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

  function reply(src, id, msg) {
    msg.sahelMic = id;
    try { src.postMessage(msg, '*'); } catch (e) {}
  }

  function finish(session) { if (cur === session) cur = null; }

  function start(src, id) {
    if (cur) { try { cur.rec.abort(); } catch (e) {} cur = null; }
    if (!SR) { reply(src, id, { t: 'error', code: 'service-not-allowed' }); return; }
    const session = { id: id, rec: null };
    cur = session;
    reply(src, id, { t: 'ack' });

    function run(i) {
      const rec = new SR();
      let skipEnd = false;
      session.rec = rec;
      rec.lang = LANGS[i];
      rec.interimResults = true;
      rec.continuous = false;
      rec.maxAlternatives = 1;
      rec.onresult = function (e) {
        let text = '';
        for (let k = 0; k < e.results.length; k++) text += e.results[k][0].transcript;
        reply(src, id, { t: 'result', text: text, final: !!e.results[e.results.length - 1].isFinal });
      };
      rec.onerror = function (e) {
        const code = e.error;
        if (code === 'aborted') return;
        if (code === 'language-not-supported' && i < LANGS.length - 1) { skipEnd = true; run(i + 1); return; }
        reply(src, id, { t: 'error', code: code });
        finish(session);
      };
      rec.onend = function () {
        if (skipEnd || cur !== session) return;
        reply(src, id, { t: 'end' });
        finish(session);
      };
      try { rec.start(); }
      catch (x) { reply(src, id, { t: 'error', code: 'service-not-allowed' }); finish(session); }
    }
    run(0);
  }

  window.addEventListener('message', function (ev) {
    const d = ev.data;
    if (!d || typeof d !== 'object' || !d.sahelMic || !ev.source || !isOurs(ev.source)) return;
    if (d.t === 'start') start(ev.source, String(d.sahelMic));
    else if (d.t === 'stop' && cur && cur.id === String(d.sahelMic)) { try { cur.rec.stop(); } catch (e) {} }
  });
})();

start();
