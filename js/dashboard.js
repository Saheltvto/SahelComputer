/* ===== نگهبان ورود: اگر کاربر لاگین نکرده، بفرست به صفحه ورود ===== */
const sahelUserRaw = sessionStorage.getItem('sahel_user');
if (!sahelUserRaw) {
  window.location.href = 'login.html';
}
const sahelUser = sahelUserRaw ? JSON.parse(sahelUserRaw) : null;

/* ===== منوی کاربر (باز شدن با کلیک روی نام، بستن با کلیک بیرون) ===== */
const topbarUser = document.getElementById('topbarUser');
const userDropdown = document.getElementById('userDropdown');

if (topbarUser && userDropdown) {
  topbarUser.addEventListener('click', (e) => {
    e.stopPropagation();
    userDropdown.style.display = userDropdown.style.display === 'block' ? 'none' : 'block';
  });
  document.addEventListener('click', () => {
    userDropdown.style.display = 'none';
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
