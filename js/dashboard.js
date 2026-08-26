/* ===== نگهبان ورود ===== */
const sahelUserRaw = sessionStorage.getItem('sahel_user');
if (!sahelUserRaw) {
  window.location.href = 'login.html';
}
const sahelUser = sahelUserRaw ? JSON.parse(sahelUserRaw) : null;

/* ===== متغیرهای سراسری ===== */
let allData = null;

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

/* ===== بارگذاری همه داده‌ها ===== */
async function loadAllData() {
  try {
    // نمایش اطلاعات کاربر
    document.getElementById('topbarName').textContent = sahelUser.name;
    document.getElementById('topbarRole').textContent = sahelUser.role === 'admin' ? 'مدیر سیستم' : 'کاربر';
    document.getElementById('topbarAvatar').textContent = sahelUser.initials || sahelUser.name.slice(0, 2);

    // یک درخواست برای همه
    const data = await sahelApiCall({ action: 'getAll', userId: sahelUser.id });

    if (data.success) {
      allData = data;

      // کارتابل
      if (sahelUser.role === 'admin' && data.workspaces && data.workspaces.length) {
        document.getElementById('membersSwitchBtn').style.display = 'flex';
        renderMembers(data.workspaces);
        const own = data.workspaces.find(w => String(w.id) === String(sahelUser.id));
        openWorkspace(own ? own.appUrl : sahelUser.appUrl);
      } else {
        openWorkspace(sahelUser.appUrl);
      }

      // فایل‌ها
      if (data.unreadFiles > 0) {
        document.getElementById('fileBadge').style.display = 'flex';
        document.getElementById('fileBadge').textContent = toFaDigits(data.unreadFiles);
      }

      // چت
      if (data.unreadChats > 0) {
        document.getElementById('chatBadge').style.display = 'flex';
        document.getElementById('chatBadge').textContent = toFaDigits(data.unreadChats);
      }

      // نرخ‌ها
      displayRates(data.rates);

      // مخاطبین چت
      renderChatContacts(data.contacts);

      // کاربران برای ارسال فایل
      renderRecipients(data.users);
    } else {
      openWorkspace(sahelUser.appUrl);
    }
  } catch (err) {
    console.error('Error:', err);
    openWorkspace(sahelUser.appUrl);
  }
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

/* ===== نمایش اعضا ===== */
function renderMembers(workspaces) {
  const membersList = document.getElementById('membersList');
  membersList.innerHTML = workspaces.map(w => `
    <div class="member-row" data-url="${w.appUrl}">
      <div class="member-avatar">${w.initials || w.name.slice(0, 2)}</div>
      <div class="member-info">
        <b>${w.name}${String(w.id) === String(sahelUser.id) ? ' (شما)' : ''}</b>
        <span>${w.role === 'admin' ? 'مدیر سیستم' : 'کاربر'}</span>
      </div>
    </div>
  `).join('');

  membersList.querySelectorAll('.member-row').forEach(row => {
    row.addEventListener('click', () => {
      openWorkspace(row.dataset.url);
      closeAllPanels();
    });
  });
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

  if (rates.USD) {
    document.getElementById('tiUsd').innerHTML = `💵 <span class="rate-label">دلار</span> <span class="rate-value">${formatNumber(rates.USD)}</span>`;
  }
  if (rates.AED) {
    document.getElementById('tiAed').innerHTML = `💴 <span class="rate-label">درهم</span> <span class="rate-value">${formatNumber(rates.AED)}</span>`;
  }
  if (rates.COIN) {
    document.getElementById('tiCoin').innerHTML = `🪙 <span class="rate-label">سکه</span> <span class="rate-value">${formatNumber(rates.COIN)}</span>`;
  }
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
        <span class="chat-contact-last">برای گفتگو کلیک کنید</span>
      </div>
    </div>
  `).join('');

  contactsList.querySelectorAll('.chat-contact-row').forEach(row => {
    row.addEventListener('click', () => {
      openChatWith(row.dataset.id, row.dataset.name);
    });
  });
}

/* ===== نمایش گیرندگان فایل ===== */
function renderRecipients(users) {
  const select = document.getElementById('fileRecipient');
  if (!select || !users || !users.length) return;

  select.innerHTML = '<option value="">انتخاب گیرنده...</option>' +
    users.map(u => `<option value="${u.id}">${u.name}</option>`).join('');
}

/* ===== باز کردن چت با کاربر ===== */
function openChatWith(contactId, contactName) {
  const chatPanel = document.getElementById('chatPanel');
  const chatContactsView = document.getElementById('chatContactsView');
  const chatThreadView = document.getElementById('chatThreadView');
  const chatPanelTitle = document.getElementById('chatPanelTitle');
  const chatBackBtn = document.getElementById('chatBackBtn');

  chatPanelTitle.textContent = contactName;
  chatContactsView.style.display = 'none';
  chatThreadView.style.display = 'flex';
  chatBackBtn.style.display = 'flex';

  // بارگذاری پیام‌ها
  loadChatMessages(contactId);
}

/* ===== بارگذاری پیام‌های چت ===== */
async function loadChatMessages(contactId) {
  const chatMessages = document.getElementById('chatMessages');
  chatMessages.innerHTML = '<div style="text-align:center;color:#7F9A9C;padding:20px;">در حال بارگذاری...</div>';

  try {
    const data = await sahelApiCall({
      action: 'getChatMessages',
      userId: sahelUser.id,
      contactId: contactId
    });

    if (data.success && data.messages) {
      renderChatMessages(data.messages, contactId);
    } else {
      chatMessages.innerHTML = '<div style="text-align:center;color:#7F9A9C;padding:20px;">گفتگو را شروع کنید</div>';
    }
  } catch (e) {
    chatMessages.innerHTML = '<div style="text-align:center;color:#7F9A9C;padding:20px;">خطا در بارگذاری</div>';
  }
}

/* ===== نمایش پیام‌ها ===== */
function renderChatMessages(messages, contactId) {
  const chatMessages = document.getElementById('chatMessages');

  if (!messages.length) {
    chatMessages.innerHTML = '<div style="text-align:center;color:#7F9A9C;padding:20px;">گفتگو را شروع کنید</div>';
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

  // ذخیره contactId برای ارسال پیام
  chatMessages.dataset.contactId = contactId;
}

function formatTime(time) {
  try {
    return new Date(time).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    return '';
  }
}

/* ===== ارسال پیام چت ===== */
document.getElementById('chatSendBtn')?.addEventListener('click', async () => {
  const input = document.getElementById('chatInput');
  const chatMessages = document.getElementById('chatMessages');
  const text = input.value.trim();
  const contactId = chatMessages.dataset.contactId;

  if (!text || !contactId) return;

  try {
    const data = await sahelApiCall({
      action: 'sendChatMessage',
      senderId: sahelUser.id,
      receiverId: contactId,
      text: text
    });

    if (data.success) {
      input.value = '';
      loadChatMessages(contactId);
    }
  } catch (e) {
    console.error('Error sending:', e);
  }
});

/* ===== ارسال پیام با Enter ===== */
document.getElementById('chatInput')?.addEventListener('keypress', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    document.getElementById('chatSendBtn').click();
  }
});

/* ===== بازگشت به لیست مخاطبین ===== */
document.getElementById('chatBackBtn')?.addEventListener('click', () => {
  document.getElementById('chatThreadView').style.display = 'none';
  document.getElementById('chatContactsView').style.display = 'flex';
  document.getElementById('chatBackBtn').style.display = 'none';
  document.getElementById('chatPanelTitle').textContent = 'گفتگوها';
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
    if (allData) renderFiles(allData.files);
  }
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

/* ===== منوی کاربر ===== */
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

/* ===== بستن پنل‌ها ===== */
document.addEventListener('click', closeAllPanels);
window.addEventListener('resize', closeAllPanels);
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
  fileInputLabel.textContent = selectedFiles.length === 1
    ? selectedFiles[0].name
    : `${selectedFiles.length} فایل انتخاب شد`;

  fileChipsList.innerHTML = selectedFiles.map((f, i) => `
    <div class="file-chip">
      <span class="file-chip-name">${f.name}</span>
      <span class="file-chip-size">${formatFileSize(f.size)}</span>
      <button type="button" class="file-chip-remove" data-i="${i}">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M6 6L18 18M18 6L6 18" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>
      </button>
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

  if (!receiverId) {
    fileSendStatus.style.color = '#C0472B';
    fileSendStatus.textContent = 'گیرنده را انتخاب کنید.';
    return;
  }
  if (!selectedFiles.length) {
    fileSendStatus.style.color = '#C0472B';
    fileSendStatus.textContent = 'حداقل یک فایل انتخاب کنید.';
    return;
  }
  const tooBig = selectedFiles.find(f => f.size > 8 * 1024 * 1024);
  if (tooBig) {
    fileSendStatus.style.color = '#C0472B';
    fileSendStatus.textContent = `حجم «${tooBig.name}» بیشتر از ۸ مگابایت است.`;
    return;
  }

  fileSendBtn.disabled = true;

  const readAsBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  let sentCount = 0;
  let failedNames = [];

  for (const file of selectedFiles) {
    fileSendStatus.style.color = '#7F9A9C';
    fileSendStatus.textContent = `در حال ارسال ${sentCount + 1} از ${selectedFiles.length}...`;
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
      if (data.success) {
        sentCount++;
      } else {
        failedNames.push(file.name);
      }
    } catch (err) {
      failedNames.push(file.name);
    }
  }

  fileSendBtn.disabled = false;

  if (!failedNames.length) {
    fileSendStatus.style.color = '#2FB8A6';
    fileSendStatus.textContent = sentCount > 1 ? `${toFaDigits(sentCount)} فایل ارسال شد.` : 'فایل ارسال شد.';
    selectedFiles = [];
    renderFileChips();
    setTimeout(() => {
      fileSendForm.style.display = 'none';
      newFileBtn.classList.remove('is-open');
      fileSendStatus.textContent = '';
      loadAllData();
    }, 1000);
  } else {
    fileSendStatus.style.color = '#C0472B';
    fileSendStatus.textContent = `ارسال ناموفق: ${failedNames.join('، ')}`;
  }
});
/* ===== شروع ===== */
loadAllData();

/* ===== آب و هوا ===== */
async function loadWeather() {
  try {
    const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=26.9576&longitude=56.2719&current_weather=true');
    const data = await res.json();
    if (data?.current_weather) {
      const temp = Math.round(data.current_weather.temperature);
      const code = data.current_weather.weathercode;
      let icon = '☀️';
      let desc = 'آفتابی';
      if (code <= 3) { icon = '⛅'; desc = 'نیمه ابری'; }
      else if (code <= 48) { icon = '🌫️'; desc = 'مه‌آلود'; }
      else if (code <= 67) { icon = '🌧️'; desc = 'بارانی'; }
      document.getElementById('tiWeather').innerHTML = `${icon} <span class="weather-temp">${toFaDigits(temp)}°C</span> <span class="weather-desc">${desc}</span> <span class="weather-city">قشم</span>`;
    }
  } catch (e) {}
}

/* ===== تاریخ شمسی ===== */
function loadDate() {
  try {
    const now = new Date();
    const dateStr = new Intl.DateTimeFormat('fa-IR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }).format(now);
    document.getElementById('tiDate').innerHTML = `📅 <span class="date-value">${dateStr}</span>`;
  } catch (e) {}
}

loadDate();
loadWeather();
