/* ===== نگهبان ورود ===== */
const sahelUserRaw = sessionStorage.getItem('sahel_user');
if (!sahelUserRaw) {
  window.location.href = 'login.html';
}
const sahelUser = sahelUserRaw ? JSON.parse(sahelUserRaw) : null;

/* ===== متغیرهای سراسری ===== */
let allData = null; // همه داده‌ها اینجا ذخیره میشود

/* ===== ابزار مشترک ===== */
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

function toFaDigits(n) {
  const fa = ['۰','۱','۲','۳','۴','۵','۶','۷','۸','۹'];
  return String(n).replace(/[0-9]/g, d => fa[d]);
}

/* ===== بارگذاری اولیه همه داده‌ها ===== */
async function loadAllData() {
  try {
    document.getElementById('topbarName').textContent = sahelUser.name;
    document.getElementById('topbarRole').textContent = sahelUser.role === 'admin' ? 'مدیر سیستم' : 'کاربر';
    document.getElementById('topbarAvatar').textContent = sahelUser.initials || sahelUser.name.slice(0, 2);
    
    // یک درخواست برای همه چیز
    const data = await sahelApiCall({ action: 'getAll', userId: sahelUser.id });
    
    if (data.success) {
      allData = data;
      
      // نمایش کارتابل
      if (sahelUser.role === 'admin' && data.workspaces.length) {
        document.getElementById('membersSwitchBtn').style.display = 'flex';
        renderMembers(data.workspaces);
        const own = data.workspaces.find(w => String(w.id) === String(sahelUser.id));
        openWorkspace(own ? own.appUrl : sahelUser.appUrl);
      } else {
        openWorkspace(sahelUser.appUrl);
      }
      
      // نمایش فایل‌ها
      if (data.unreadFiles > 0) {
        document.getElementById('fileBadge').style.display = 'flex';
        document.getElementById('fileBadge').textContent = toFaDigits(data.unreadFiles);
      }
      
      // نمایش چت
      if (data.unreadChats > 0) {
        document.getElementById('chatBadge').style.display = 'flex';
        document.getElementById('chatBadge').textContent = toFaDigits(data.unreadChats);
      }
      
      // نمایش نرخ‌ها
      displayRates(data.rates);
      
      // نمایش مخاطبین چت
      renderChatContacts(data.contacts);
    } else {
      openWorkspace(sahelUser.appUrl);
    }
  } catch (err) {
    console.error('Error loading data:', err);
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
    <div class="member-row" data-id="${w.id}" data-url="${w.appUrl}">
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
    <a class="file-item ${f.status === 'نخوانده' ? 'unread' : ''}" href="${f.url}" target="_blank">
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
  
  const formatNumber = (num) => {
    const parts = String(num).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return toFaDigits(parts);
  };
  
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
    <div class="chat-contact-row" data-id="${u.id}">
      <div class="member-avatar">${u.initials || u.name.slice(0, 2)}</div>
      <div class="member-info">
        <b>${u.name}</b>
        <span class="chat-contact-last">کلیک کنید</span>
      </div>
    </div>
  `).join('');
}

/* ===== Event Listeners ===== */
// باز کردن پنل فایل
document.getElementById('fileTransferBtn')?.addEventListener('click', (e) => {
  e.stopPropagation();
  const panel = document.getElementById('filePanel');
  panel.style.display = panel.style.display === 'flex' ? 'none' : 'flex';
  positionPanel(panel, e.currentTarget);
  if (allData) renderFiles(allData.files);
});

// باز کردن پنل اعضا
document.getElementById('membersSwitchBtn')?.addEventListener('click', (e) => {
  e.stopPropagation();
  const panel = document.getElementById('membersPanel');
  panel.style.display = panel.style.display === 'flex' ? 'none' : 'flex';
  positionPanel(panel, e.currentTarget);
});

// باز کردن پنل چت
document.getElementById('chatBtn')?.addEventListener('click', (e) => {
  e.stopPropagation();
  const panel = document.getElementById('chatPanel');
  panel.style.display = panel.style.display === 'flex' ? 'none' : 'flex';
  positionPanel(panel, e.currentTarget);
});

// بستن پنل‌ها با کلیک بیرون
document.addEventListener('click', closeAllPanels);

// شروع
loadAllData();

// آب و هوا مستقیم
async function loadWeather() {
  try {
    const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=26.9576&longitude=56.2719&current_weather=true');
    const data = await res.json();
    if (data?.current_weather) {
      const temp = Math.round(data.current_weather.temperature);
      const code = data.current_weather.weathercode;
      let desc = code === 0 ? 'آفتابی' : code <= 3 ? 'نیمه ابری' : 'بارانی';
      document.getElementById('tiWeather').innerHTML = `☀️ ${toFaDigits(temp)}°C ${desc} قشم`;
    }
  } catch (e) {}
}

loadWeather();
