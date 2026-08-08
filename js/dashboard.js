/* ===== نگهبان ورود: اگر کاربر لاگین نکرده، بفرست به صفحه ورود ===== */
const sahelUserRaw = sessionStorage.getItem('sahel_user');
if (!sahelUserRaw) {
  window.location.href = 'login.html';
}
const sahelUser = sahelUserRaw ? JSON.parse(sahelUserRaw) : null;

/* ===== منوی کناری در موبایل ===== */
const sideToggle = document.getElementById('sideToggle');
const sidebar = document.getElementById('sidebar');
const scrim = document.getElementById('scrim');

function closeSidebar() {
  sidebar.classList.remove('open');
  scrim.classList.remove('open');
}
if (sideToggle) {
  sideToggle.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    scrim.classList.toggle('open');
  });
}
if (scrim) {
  scrim.addEventListener('click', closeSidebar);
}

/* ===== نگاشت آیکون و رنگ برای هر نوع پروژه ===== */
const PROJECT_ICONS = {
  building: { cls: 'ic-teal', path: '<path d="M4 21V9L12 4L20 9V21" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M9 21V14H15V21" stroke="currentColor" stroke-width="1.8"/>' },
  chart:    { cls: 'ic-blue', path: '<path d="M4 19L9 12L13 15L20 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>' },
  user:     { cls: 'ic-purple', path: '<circle cx="12" cy="8" r="3.5" stroke="currentColor" stroke-width="1.8"/><path d="M5 20C5 16.5 8 14.5 12 14.5C16 14.5 19 16.5 19 20" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>' },
  pie:      { cls: 'ic-amber', path: '<path d="M4 19V5H20V19H4Z" stroke="currentColor" stroke-width="1.8"/><path d="M8 15L11 11L14 13L17 8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>' }
};
const STATUS_TAG = {
  progress: { cls: 'tag-progress', label: 'در حال انجام', bar: '#3178C6' },
  done:     { cls: 'tag-done', label: 'تکمیل‌شده', bar: '#2FB8A6' },
  wait:     { cls: 'tag-wait', label: 'در انتظار', bar: '#C56A1E' }
};

function initials(name) {
  if (!name) return '–';
  const parts = String(name).trim().split(/\s+/);
  return parts.length > 1 ? parts[0][0] + parts[1][0] : parts[0].slice(0, 2);
}

function toFaDigits(n) {
  const fa = ['۰','۱','۲','۳','۴','۵','۶','۷','۸','۹'];
  return String(n).replace(/[0-9]/g, d => fa[d]);
}

function renderProjects(projects) {
  const el = document.getElementById('projectsList');
  if (!projects.length) {
    el.innerHTML = '<p style="color:#7F9A9C; font-size:13.5px; text-align:center; padding:10px 0;">هنوز پروژه‌ای ثبت نشده است.</p>';
    return;
  }
  el.innerHTML = projects.map(p => {
    const icon = PROJECT_ICONS[p.icon] || PROJECT_ICONS.chart;
    const status = STATUS_TAG[p.status] || STATUS_TAG.progress;
    const progress = Number(p.progress) || 0;
    return `
      <div class="proj-row">
        <div class="proj-ic ${icon.cls}"><svg viewBox="0 0 24 24" fill="none">${icon.path}</svg></div>
        <div class="proj-info">
          <div class="proj-top"><b>${p.name}</b><span class="proj-tag ${status.cls}">${status.label}</span></div>
          <div class="proj-row-inner">
            <div class="bar" style="flex:1;"><i style="width:${progress}%; background:${status.bar};"></i></div>
            <span class="pct">${toFaDigits(progress)}٪</span>
          </div>
          <div class="proj-owner"><span class="mini-avatar">${initials(p.ownerName)}</span> ${p.ownerName || ''} · ${p.dueDate || ''}</div>
        </div>
      </div>`;
  }).join('');
}

function renderActivity(activity) {
  const el = document.getElementById('activityList');
  if (!activity.length) {
    el.innerHTML = '<p style="color:#7F9A9C; font-size:13.5px; text-align:center; padding:10px 0;">فعالیتی ثبت نشده است.</p>';
    return;
  }
  el.innerHTML = activity.map(a => `
    <div class="activity-item">
      <div class="activity-ic ${(PROJECT_ICONS[a.type] || PROJECT_ICONS.chart).cls}"><svg viewBox="0 0 24 24" fill="none">${(PROJECT_ICONS[a.type] || PROJECT_ICONS.chart).path}</svg></div>
      <div><b>${a.title}</b><span>${a.timestamp || ''}</span></div>
    </div>`).join('');
}

function renderSheets(links) {
  const el = document.getElementById('sheetsList');
  if (!links.length) {
    el.innerHTML = '<p style="color:#7F9A9C; font-size:13.5px; text-align:center; padding:10px 0;">هنوز شیتی ثبت نشده است.</p>';
    return;
  }
  el.innerHTML = links.map(l => {
    const icon = PROJECT_ICONS[l.icon] || PROJECT_ICONS.chart;
    const url = l.url || '#';
    return `
      <a class="sheet-card" href="${url}" target="_blank" rel="noopener" style="display:block; text-decoration:none; color:inherit;">
        <div class="stat-ic ${icon.cls}"><svg viewBox="0 0 24 24" fill="none">${icon.path}</svg></div>
        <b>${l.title}</b>
        <span>آخرین بازدید: ${l.lastVisited || '—'}</span>
      </a>`;
  }).join('');
}

async function loadDashboard() {
  document.getElementById('topbarName').textContent = sahelUser.name;
  document.getElementById('topbarRole').textContent = sahelUser.role === 'admin' ? 'مدیر سیستم' : 'کاربر';
  document.getElementById('topbarAvatar').textContent = sahelUser.initials || initials(sahelUser.name);
  document.getElementById('projectsTitle').textContent = sahelUser.role === 'admin' ? 'همه پروژه‌ها' : 'پروژه‌های من';

  try {
    const data = await sahelApiCall({ action: 'dashboard', userId: sahelUser.id });
    if (!data.success) {
      alert(data.message || 'خطا در دریافت اطلاعات داشبورد.');
      return;
    }
    document.getElementById('statActive').textContent = toFaDigits(data.stats.activeProjects);
    document.getElementById('statCompleted').textContent = toFaDigits(data.stats.completedProjects);
    document.getElementById('statTotal').textContent = toFaDigits(data.stats.totalProjects);
    document.getElementById('statUsers').textContent = toFaDigits(data.stats.totalUsers);

    renderProjects(data.projects);
    renderActivity(data.activity);
    renderSheets(data.quickLinks || []);
  } catch (err) {
    document.getElementById('projectsList').innerHTML =
      '<p style="color:#C0472B; font-size:13.5px; text-align:center; padding:10px 0;">خطا در برقراری ارتباط با سرور. آدرس API را در js/config.js بررسی کنید.</p>';
  }
}

if (sahelUser) {
  loadDashboard();
}
