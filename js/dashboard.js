/* ===== نگهبان ورود: اگر کاربر لاگین نکرده، بفرست به صفحه ورود ===== */
const sahelUserRaw = sessionStorage.getItem('sahel_user');
if (!sahelUserRaw) {
  window.location.href = 'login.html';
}
const sahelUser = sahelUserRaw ? JSON.parse(sahelUserRaw) : null;

/* ===== ابزار مشترک: موقعیت‌دهی یک پنل ثابت زیر دکمه‌ی محرک آن ===== */
function positionPanel(panel, trigger) {
  const rect = trigger.getBoundingClientRect();
  panel.style.top = (rect.bottom + 10) + 'px';
  panel.style.right = (window.innerWidth - rect.right) + 'px';
  panel.style.left = 'auto';
}

/* ===== منوی کاربر (باز شدن با کلیک روی نام، بستن با کلیک بیرون) ===== */
const topbarUser = document.getElementById('topbarUser');
const userDropdown = document.getElementById('userDropdown');

if (topbarUser && userDropdown) {
  topbarUser.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = userDropdown.style.display === 'block';
    closeAllPanels();
    if (!isOpen) {
      positionPanel(userDropdown, topbarUser);
      userDropdown.style.display = 'block';
    }
  });
  userDropdown.addEventListener('click', (e) => e.stopPropagation());
}

const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    sessionStorage.removeItem('sahel_user');
  });
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

/* ===== کشوی کارتابل اعضا (فقط مدیر) ===== */
const membersSwitchBtn = document.getElementById('membersSwitchBtn');
const membersPanel = document.getElementById('membersPanel');
const membersList = document.getElementById('membersList');
let activeMemberId = null;

/* لیست اعضا را نگه می‌داریم تا چت‌باکس هم بتواند برای انتخاب مخاطب از آن استفاده کند */
window.sahelWorkspaces = [];

function renderMembersPanel(workspaces) {
  if (!workspaces || !workspaces.length) {
    membersList.innerHTML = '<div class="file-empty">کارتابلی ثبت نشده است.</div>';
    return;
  }
  membersList.innerHTML = workspaces.map(w => `
    <div class="member-row" data-id="${w.id}" data-url="${w.appUrl}">
      <div class="member-avatar">${w.initials || initials(w.name)}</div>
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
    row.addEventListener('click', () => {
      setActiveMember(row.dataset.id, row.dataset.url);
      closeAllPanels();
    });
  });
}

function setActiveMember(id, url) {
  activeMemberId = String(id);
  membersList.querySelectorAll('.member-row').forEach(r => {
    r.classList.toggle('active', r.dataset.id === activeMemberId);
  });
  openWorkspace(url);
}

function initials(name) {
  if (!name) return '–';
  const parts = String(name).trim().split(/\s+/);
  return parts.length > 1 ? parts[0][0] + parts[1][0] : parts[0].slice(0, 2);
}

async function loadDashboard() {
  document.getElementById('topbarName').textContent = sahelUser.name;
  document.getElementById('topbarRole').textContent = sahelUser.role === 'admin' ? 'مدیر سیستم' : 'کاربر';
  document.getElementById('topbarAvatar').textContent = sahelUser.initials || initials(sahelUser.name);

  if (sahelUser.role === 'admin') {
    membersSwitchBtn.style.display = 'flex';
    try {
      const data = await sahelApiCall({ action: 'dashboard', userId: sahelUser.id });
      if (data.success && data.workspaces && data.workspaces.length) {
        window.sahelWorkspaces = data.workspaces;
        renderMembersPanel(data.workspaces);
        const own = data.workspaces.find(w => String(w.id) === String(sahelUser.id));
        if (own) {
          setActiveMember(own.id, own.appUrl);
        } else {
          // اگر appUrl خود مدیر هنوز در شیت Users پر نشده باشد
          openWorkspace(sahelUser.appUrl);
        }
      } else {
        openWorkspace(sahelUser.appUrl);
      }
    } catch (err) {
      openWorkspace(sahelUser.appUrl);
    }
  } else {
    membersSwitchBtn.style.display = 'none';
    openWorkspace(sahelUser.appUrl);
  }

  // فهرست کاربران را برای چت‌باکس هم آماده می‌کنیم (حتی برای کاربر عادی)
  if (window.sahelChatLoadContacts) window.sahelChatLoadContacts();
}

if (sahelUser) {
  loadDashboard();
}

/* ===== صندوق ارسال/دریافت فایل ===== */
const MAX_FILE_BYTES = 8 * 1024 * 1024; // ۸ مگابایت

const fileTransferBtn = document.getElementById('fileTransferBtn');
const filePanel = document.getElementById('filePanel');
const fileBadge = document.getElementById('fileBadge');
const newFileBtn = document.getElementById('newFileBtn');
const fileSendForm = document.getElementById('fileSendForm');
const fileRecipient = document.getElementById('fileRecipient');
const fileInput = document.getElementById('fileInput');
const fileSendBtn = document.getElementById('fileSendBtn');
const fileSendStatus = document.getElementById('fileSendStatus');
const fileList = document.getElementById('fileList');

let recipientsLoaded = false;

function closeAllPanels() {
  if (userDropdown) userDropdown.style.display = 'none';
  if (filePanel) filePanel.style.display = 'none';
  if (membersPanel) membersPanel.style.display = 'none';
  const chatPanel = document.getElementById('chatPanel');
  if (chatPanel) chatPanel.style.display = 'none';
}

function toFaDigits(n) {
  const fa = ['۰','۱','۲','۳','۴','۵','۶','۷','۸','۹'];
  return String(n).replace(/[0-9]/g, d => fa[d]);
}

function formatFileDate(d) {
  try {
    return new Date(d).toLocaleDateString('fa-IR', { year: 'numeric', month: '2-digit', day: '2-digit' });
  } catch (e) {
    return '';
  }
}

async function loadFileInbox() {
  try {
    const data = await sahelApiCall({ action: 'getFiles', userId: sahelUser.id });
    if (!data.success) {
      fileList.innerHTML = '<div class="file-empty">' + (data.message || 'خطا در دریافت فایل‌ها.') + '</div>';
      return;
    }
    updateFileBadge(data.unreadCount || 0);
    renderFileList(data.files || []);
  } catch (err) {
    fileList.innerHTML = '<div class="file-empty">خطا در برقراری ارتباط با سرور.</div>';
  }
}

function updateFileBadge(count) {
  if (count > 0) {
    fileBadge.style.display = 'flex';
    fileBadge.textContent = toFaDigits(count);
  } else {
    fileBadge.style.display = 'none';
  }
}

function fileTypeIcon(fileName) {
  const ext = (fileName || '').split('.').pop().toLowerCase();
  if (ext === 'pdf') {
    return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M6 2H14L20 8V20C20 21.1 19.1 22 18 22H6C4.9 22 4 21.1 4 20V4C4 2.9 4.9 2 6 2Z" stroke="currentColor" stroke-width="1.6"/><path d="M14 2V8H20" stroke="currentColor" stroke-width="1.6"/></svg>';
  }
  if (ext === 'xlsx' || ext === 'xls') {
    return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M6 2H14L20 8V20C20 21.1 19.1 22 18 22H6C4.9 22 4 21.1 4 20V4C4 2.9 4.9 2 6 2Z" stroke="currentColor" stroke-width="1.6"/><path d="M9 13L15 19M15 13L9 19" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
  }
  if (['png','jpg','jpeg','gif','webp'].includes(ext)) {
    return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" stroke-width="1.6"/><circle cx="9" cy="10" r="1.6" fill="currentColor"/><path d="M4 18L9.5 13L13 16L16 12.5L20 17" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }
  return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M6 2H14L20 8V20C20 21.1 19.1 22 18 22H6C4.9 22 4 21.1 4 20V4C4 2.9 4.9 2 6 2Z" stroke="currentColor" stroke-width="1.6"/></svg>';
}

function renderFileList(files) {
  if (!files.length) {
    fileList.innerHTML = '<div class="file-empty">فایلی دریافت نشده است.</div>';
    return;
  }
  fileList.innerHTML = files.map(f => `
    <a class="file-item ${f.status === 'نخوانده' ? 'unread' : ''}" href="${f.url}" target="_blank" rel="noopener">
      ${f.status === 'نخوانده' ? '<span class="unread-dot"></span>' : ''}
      <div class="file-icon">${fileTypeIcon(f.fileName)}</div>
      <div class="file-item-body">
        <b>${f.fileName}</b>
        <span>از طرف ${f.senderName} · ${formatFileDate(f.date)}</span>
      </div>
    </a>
  `).join('');
}

async function loadRecipients() {
  if (recipientsLoaded) return;
  fileRecipient.innerHTML = '<option value="">در حال بارگذاری کاربران...</option>';
  try {
    const data = await sahelApiCall({ action: 'getUsers', userId: sahelUser.id });
    if (data.success && data.users && data.users.length) {
      fileRecipient.innerHTML =
        '<option value="">انتخاب گیرنده...</option>' +
        data.users.map(u => `<option value="${u.id}">${u.name}</option>`).join('');
      recipientsLoaded = true;
    } else {
      // اگر success=false برگشت یعنی سرور اکشن getUsers را نمی‌شناسد —
      // معمولاً چون Apps Script بعد از تغییر کد، دوباره Deploy نشده است.
      fileRecipient.innerHTML = '<option value="">' + (data.message || 'خطا در دریافت کاربران — Apps Script را دوباره Deploy کنید') + '</option>';
    }
  } catch (err) {
    fileRecipient.innerHTML = '<option value="">خطا در برقراری ارتباط با سرور</option>';
  }
}

if (fileTransferBtn && filePanel) {
  fileTransferBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = filePanel.style.display === 'flex';
    closeAllPanels();
    if (!isOpen) {
      positionPanel(filePanel, fileTransferBtn);
      filePanel.style.display = 'flex';
      loadFileInbox();
      loadRecipients();
      // فایل‌های نخوانده را با کمی تأخیر علامت خوانده‌شده بزن تا کاربر لیست را ببیند
      setTimeout(() => {
        sahelApiCall({ action: 'markFilesRead', userId: sahelUser.id })
          .then(() => updateFileBadge(0))
          .catch(() => {});
      }, 1500);
    }
  });
  filePanel.addEventListener('click', (e) => e.stopPropagation());
}

if (membersSwitchBtn && membersPanel) {
  membersSwitchBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = membersPanel.style.display === 'flex';
    closeAllPanels();
    if (!isOpen) {
      positionPanel(membersPanel, membersSwitchBtn);
      membersPanel.style.display = 'flex';
    }
  });
  membersPanel.addEventListener('click', (e) => e.stopPropagation());
}

document.addEventListener('click', closeAllPanels);
window.addEventListener('resize', closeAllPanels);

if (newFileBtn) {
  newFileBtn.addEventListener('click', () => {
    const isOpen = fileSendForm.style.display === 'flex';
    fileSendForm.style.display = isOpen ? 'none' : 'flex';
    newFileBtn.classList.toggle('is-open', !isOpen);
    fileSendStatus.textContent = '';
  });
}

const fileUploadLabel = document.getElementById('fileUploadLabel');
const fileInputLabel = document.getElementById('fileInputLabel');
const fileChipsList = document.getElementById('fileChipsList');

let selectedFiles = []; // آرایه‌ی خودمان از فایل‌های انتخاب‌شده (چون FileList غیرقابل‌ویرایش است)

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
      <button type="button" class="file-chip-remove" data-i="${i}" title="انصراف از ارسال این فایل">
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

if (fileInput) {
  fileInput.addEventListener('change', () => {
    const newFiles = Array.from(fileInput.files);
    // جلوگیری از افزودن فایل تکراری (بر اساس نام و حجم)
    newFiles.forEach(nf => {
      const exists = selectedFiles.some(f => f.name === nf.name && f.size === nf.size);
      if (!exists) selectedFiles.push(nf);
    });
    fileInput.value = ''; // امکان انتخاب دوباره‌ی همون فایل در آینده
    renderFileChips();
  });
}

if (fileSendBtn) {
  fileSendBtn.addEventListener('click', async () => {
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
    const tooBig = selectedFiles.find(f => f.size > MAX_FILE_BYTES);
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
      }, 1400);
    } else {
      fileSendStatus.style.color = '#C0472B';
      fileSendStatus.textContent = `ارسال ناموفق: ${failedNames.join('، ')}`;
      // فایل‌های موفق را از لیست حذف کن، فقط ناموفق‌ها بمونن برای تلاش دوباره
      selectedFiles = selectedFiles.filter(f => failedNames.includes(f.name));
      renderFileChips();
    }
  });
}

/* بارگذاری اولیه‌ی تعداد فایل‌های نخوانده برای نمایش روی زنگوله (بدون باز کردن پنل) */
if (sahelUser) {
  sahelApiCall({ action: 'getFiles', userId: sahelUser.id })
    .then(data => { if (data.success) updateFileBadge(data.unreadCount || 0); })
    .catch(() => {});
}
