/* ===== نگهبان ورود ===== */
const sahelUserRaw = sessionStorage.getItem('sahel_user');
if (!sahelUserRaw) {
  window.location.href = 'login.html';
}
const sahelUser = sahelUserRaw ? JSON.parse(sahelUserRaw) : null;

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

async function start() {

/* ===== نمایش اعضا و مدیریت فعال ===== */
let activeMemberId = null;

function renderMembers(workspaces) {
  const membersList = document.getElementById('membersList');
  membersList.innerHTML = workspaces.map(w => `
    <div class="member-row" data-id="${w.id}" data-url="${w.appUrl}" data-name="${w.name}">
      <div class="member-avatar">${w.initials || w.name.slice(0, 2)}</div>
      <div class="member-info">
        <b>${w.name}${String(w.id) === String(sahelUser.id) ? ' (شما)' : ''}</b>
        <span>${w.role === 'admin' ? 'مدیر سیستم' : 'کاربر'}</span>
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
        name: row.dataset.name
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
  // نمایش نام عضو فعال
  document.getElementById('topbarName').textContent = member.name;
  document.getElementById('topbarRole').textContent = member.id === sahelUser.id ? 
    (sahelUser.role === 'admin' ? 'مدیر سیستم' : 'کاربر') : 
    'در حال مشاهده';
  document.getElementById('topbarAvatar').textContent = member.name.slice(0, 2);
}

/* ===== نمایش فایل‌ها ===== */
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

/* ===== نمایش نرخ‌ها ===== */
function displayRates(rates) {
  if (!rates) return;
  if (rates.USD) document.getElementById('tiUsd').innerHTML = `💵 <span class="rate-label">دلار</span> <span class="rate-value">${formatNumber(rates.USD)}</span>`;
  if (rates.AED) document.getElementById('tiAed').innerHTML = `💴 <span class="rate-label">درهم</span> <span class="rate-value">${formatNumber(rates.AED)}</span>`;
  if (rates.COIN) document.getElementById('tiCoin').innerHTML = `🪙 <span class="rate-label">سکه</span> <span class="rate-value">${formatNumber(rates.COIN)}</span>`;
}

/* ===== نمایش مخاطبین چت ===== */
function renderChatContacts(contacts) {
  const contactsList = document.getElementById('chatContactsList');
  if (!contacts || !contacts.length) {
    contactsList.innerHTML = '<div class="file-empty">کاربری نیست.</div>';
    return;
  }
  contactsList.innerHTML = contacts.map(u => `
    <div class="chat-contact-row" data-id="${u.id}" data-name="${u.name}">
      <div class="member-avatar">${u.initials || u.name.slice(0, 2)}</div>
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

/* ===== نمایش گیرندگان ===== */
function renderRecipients(users) {
  const select = document.getElementById('fileRecipient');
  if (!select || !users || !users.length) return;
  select.innerHTML = '<option value="">انتخاب گیرنده...</option>' +
    users.map(u => `<option value="${u.id}">${u.name}</option>`).join('');
}

/* ===== چت ===== */
function openChatWith(contactId, contactName) {
  document.getElementById('chatPanelTitle').textContent = contactName;
  document.getElementById('chatContactsView').style.display = 'none';
  document.getElementById('chatThreadView').style.display = 'flex';
  document.getElementById('chatBackBtn').style.display = 'flex';
  loadChatMessages(contactId);
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

/* ===== ارسال پیام ===== */
document.getElementById('chatSendBtn')?.addEventListener('click', async () => {
  const input = document.getElementById('chatInput');
  const chatMessages = document.getElementById('chatMessages');
  const text = input.value.trim();
  const contactId = chatMessages.dataset.contactId;
  if (!text || !contactId) return;
  try {
    const data = await sahelApiCall({ action: 'sendChatMessage', senderId: sahelUser.id, receiverId: contactId, text: text });
    if (data.success) {
      input.value = '';
      loadChatMessages(contactId);
    }
  } catch (e) {}
});

document.getElementById('chatInput')?.addEventListener('keypress', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    document.getElementById('chatSendBtn').click();
  }
});

document.getElementById('chatBackBtn')?.addEventListener('click', () => {
  document.getElementById('chatThreadView').style.display = 'none';
  document.getElementById('chatContactsView').style.display = 'flex';
  document.getElementById('chatBackBtn').style.display = 'none';
  document.getElementById('chatPanelTitle').textContent = 'گفتگوها';
});

/* ===== ارسال فایل ===== */
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

/* ===== Event Listeners ===== */
document.getElementById('fileTransferBtn')?.addEventListener('click', (e) => {
  e.stopPropagation();
  const panel = document.getElementById('filePanel');
  const isOpen = panel.style.display === 'flex';
  closeAllPanels();
  if (!isOpen) {
    positionPanel(panel, e.currentTarget);
    panel.style.display = 'flex';
    sahelApiCall({ action: 'getFiles', userId: sahelUser.id }).then(data => {
      if (data.success) renderFiles(data.files);
    }).catch(() => {});
  }
});

document.getElementById('filePanel')?.addEventListener('click', (e) => {
  e.stopPropagation();
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

document.getElementById('membersPanel')?.addEventListener('click', (e) => {
  e.stopPropagation();
});

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
  }
});

document.getElementById('chatPanel')?.addEventListener('click', (e) => {
  e.stopPropagation();
});

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

/* ===== تاریخ شمسی ===== */
function loadDate() {
  try {
    const now = new Date();
    const dateStr = new Intl.DateTimeFormat('fa-IR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }).format(now);
    document.getElementById('tiDate').innerHTML = `📅 <span class="date-value">${dateStr}</span>`;
  } catch (e) {}
}

/* ===== آب و هوا ===== */
async function loadWeather() {
  try {
    const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=26.9576&longitude=56.2719&current_weather=true');
    const data = await res.json();
    if (data?.current_weather) {
      const temp = Math.round(data.current_weather.temperature);
      const code = data.current_weather.weathercode;
      let icon = '☀️', desc = 'آفتابی';
      if (code <= 3) { icon = '⛅'; desc = 'نیمه ابری'; }
      else if (code <= 48) { icon = '🌫️'; desc = 'مه‌آلود'; }
      else if (code <= 67) { icon = '🌧️'; desc = 'بارانی'; }
      document.getElementById('tiWeather').innerHTML = `${icon} <span class="weather-temp">${toFaDigits(temp)}°C</span> <span class="weather-desc">${desc}</span> <span class="weather-city">قشم</span>`;
    }
  } catch (e) {}
}

/* ===== شروع ===== */
loadDate();
loadWeather();
start();
