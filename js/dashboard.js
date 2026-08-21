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
const workspaceTabs = document.getElementById('workspaceTabs');

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

function renderWorkspaceTabs(workspaces) {
  if (!workspaces || !workspaces.length) {
    workspaceTabs.style.display = 'none';
    workspaceTabs.innerHTML = '';
    openWorkspace('');
    return;
  }
  workspaceTabs.style.display = 'flex';
  workspaceTabs.innerHTML = workspaces.map((w, i) =>
    `<button class="btn ${i === 0 ? 'btn-primary' : 'btn-ghost'}" data-url="${w.appUrl}" data-i="${i}" style="padding:9px 18px; font-size:13.5px;">${w.name}</button>`
  ).join('');
  workspaceTabs.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      workspaceTabs.querySelectorAll('button').forEach(b => { b.classList.remove('btn-primary'); b.classList.add('btn-ghost'); });
      btn.classList.remove('btn-ghost'); btn.classList.add('btn-primary');
      openWorkspace(btn.dataset.url);
    });
  });
  openWorkspace(workspaces[0].appUrl);
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
    try {
      const data = await sahelApiCall({ action: 'dashboard', userId: sahelUser.id });
      if (data.success) {
        renderWorkspaceTabs(data.workspaces || []);
      } else {
        openWorkspace('');
      }
    } catch (err) {
      openWorkspace('');
    }
  } else {
    workspaceTabs.style.display = 'none';
    openWorkspace(sahelUser.appUrl);
  }
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

function renderFileList(files) {
  if (!files.length) {
    fileList.innerHTML = '<div class="file-empty">فایلی دریافت نشده است.</div>';
    return;
  }
  fileList.innerHTML = files.map(f => `
    <a class="file-item ${f.status === 'نخوانده' ? 'unread' : ''}" href="${f.url}" target="_blank" rel="noopener">
      <b>${f.fileName}</b>
      <span>از طرف ${f.senderName} · ${formatFileDate(f.date)}</span>
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

document.addEventListener('click', closeAllPanels);
window.addEventListener('resize', closeAllPanels);

if (newFileBtn) {
  newFileBtn.addEventListener('click', () => {
    fileSendForm.style.display = fileSendForm.style.display === 'flex' ? 'none' : 'flex';
    fileSendStatus.textContent = '';
  });
}

if (fileSendBtn) {
  fileSendBtn.addEventListener('click', () => {
    const receiverId = fileRecipient.value;
    const file = fileInput.files[0];

    if (!receiverId) {
      fileSendStatus.style.color = '#C0472B';
      fileSendStatus.textContent = 'گیرنده را انتخاب کنید.';
      return;
    }
    if (!file) {
      fileSendStatus.style.color = '#C0472B';
      fileSendStatus.textContent = 'یک فایل انتخاب کنید.';
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      fileSendStatus.style.color = '#C0472B';
      fileSendStatus.textContent = 'حجم فایل بیشتر از ۸ مگابایت است.';
      return;
    }

    fileSendBtn.disabled = true;
    fileSendStatus.style.color = '#7F9A9C';
    fileSendStatus.textContent = 'در حال ارسال...';

    const reader = new FileReader();
    reader.onload = async () => {
      // خروجی FileReader.readAsDataURL شکل «data:mime;base64,XXXX» است — فقط بخش base64 لازم است
      const base64 = reader.result.split(',')[1];
      try {
        const data = await sahelApiCall({
          action: 'sendFile',
          senderId: sahelUser.id,
          receiverId: receiverId,
          fileName: file.name,
          mimeType: file.type,
          fileData: base64
        });
        if (data.success) {
          fileSendStatus.style.color = '#2FB8A6';
          fileSendStatus.textContent = 'فایل ارسال شد.';
          fileInput.value = '';
          setTimeout(() => {
            fileSendForm.style.display = 'none';
            fileSendStatus.textContent = '';
          }, 1200);
        } else {
          fileSendStatus.style.color = '#C0472B';
          fileSendStatus.textContent = data.message || 'خطا در ارسال فایل.';
        }
      } catch (err) {
        fileSendStatus.style.color = '#C0472B';
        fileSendStatus.textContent = 'خطا در برقراری ارتباط با سرور.';
      } finally {
        fileSendBtn.disabled = false;
      }
    };
    reader.readAsDataURL(file);
  });
}

/* بارگذاری اولیه‌ی تعداد فایل‌های نخوانده برای نمایش روی زنگوله (بدون باز کردن پنل) */
if (sahelUser) {
  sahelApiCall({ action: 'getFiles', userId: sahelUser.id })
    .then(data => { if (data.success) updateFileBadge(data.unreadCount || 0); })
    .catch(() => {});
}
