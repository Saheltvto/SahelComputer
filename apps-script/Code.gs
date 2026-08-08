/**
 * ساحل — بک‌اند Google Apps Script
 * این فایل باید داخل Extensions > Apps Script همون گوگل‌شیتی که
 * سه تب Users / Projects / Activity رو داره پیست بشه.
 *
 * ساختار تب‌ها (ردیف اول = هدر، دقیقاً همین اسم‌ها):
 *
 * Users:     id | name | email | passwordHash | role | initials | appUrl
 * Projects:  id | name | icon  | status | progress | dueDate | ownerUserId | ownerName
 * Activity:  id | title | type | timestamp | userId
 * QuickLinks: id | title | url | icon | lastVisited
 *
 * appUrl در Users: آدرس وب‌اپ اختصاصی همان کاربر (دفتردار/حسابدار/انباردار).
 * برای admin نیازی نیست پر شود؛ چون مدیر همه‌ی کارتابل‌ها را می‌بیند.
 *
 * role در Users یکی از این دو مقدار: "admin" یا "member"
 *   - admin همه‌ی پروژه‌ها رو می‌بینه
 *   - member فقط پروژه‌هایی که ownerUserId برابر id خودشه رو می‌بینه
 *
 * icon در Projects یکی از: building | chart | user | pie   (برای انتخاب آیکون کارت پروژه)
 * status در Projects یکی از: progress | done | wait
 */

const SHEET_USERS = 'Users';
const SHEET_PROJECTS = 'Projects';
const SHEET_ACTIVITY = 'Activity';
const SHEET_QUICKLINKS = 'QuickLinks';

/* ============ ورودی اصلی ============ */
function doPost(e) {
  let result;
  try {
    const body = JSON.parse(e.postData.contents);
    const action = body.action;

    if (action === 'login') {
      result = handleLogin(body.email, body.password);
    } else if (action === 'dashboard') {
      result = handleDashboard(body.userId);
    } else {
      result = { success: false, message: 'عملیات نامعتبر است.' };
    }
  } catch (err) {
    result = { success: false, message: 'خطای سرور: ' + err.message };
  }
  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// جلوگیری از خطای دسترسی هنگام تست مستقیم لینک در مرورگر
function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok', message: 'Sahel API is running.' }))
    .setMimeType(ContentService.MimeType.JSON);
}

/* ============ ورود کاربر ============ */
function handleLogin(email, password) {
  if (!email || !password) {
    return { success: false, message: 'ایمیل و رمز عبور را وارد کنید.' };
  }
  const users = sheetToObjects(SHEET_USERS);
  const hashed = hashPassword(password);

  const user = users.find(function (u) {
    return String(u.email).toLowerCase() === String(email).toLowerCase();
  });

  if (!user) {
    return { success: false, message: 'کاربری با این ایمیل یافت نشد.' };
  }
  if (String(user.passwordHash) !== hashed) {
    return { success: false, message: 'رمز عبور اشتباه است.' };
  }

  return {
    success: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      initials: user.initials,
      appUrl: user.appUrl || ''
    }
  };
}

/* ============ داده‌های داشبورد ============ */
function handleDashboard(userId) {
  if (!userId) {
    return { success: false, message: 'کاربر مشخص نیست.' };
  }
  const users = sheetToObjects(SHEET_USERS);
  const currentUser = users.find(function (u) { return String(u.id) === String(userId); });
  if (!currentUser) {
    return { success: false, message: 'کاربر یافت نشد.' };
  }

  let projects = sheetToObjects(SHEET_PROJECTS);
  if (currentUser.role !== 'admin') {
    projects = projects.filter(function (p) { return String(p.ownerUserId) === String(userId); });
  }

  const activity = sheetToObjects(SHEET_ACTIVITY)
    .sort(function (a, b) { return new Date(b.timestamp) - new Date(a.timestamp); })
    .slice(0, 6);

  const quickLinks = sheetToObjects(SHEET_QUICKLINKS);

  const workspaces = users
    .filter(function (u) { return u.appUrl; })
    .map(function (u) {
      return { id: u.id, name: u.name, role: u.role, initials: u.initials, appUrl: u.appUrl };
    });

  const stats = {
    activeProjects: projects.filter(function (p) { return p.status !== 'done'; }).length,
    completedProjects: projects.filter(function (p) { return p.status === 'done'; }).length,
    totalProjects: projects.length,
    totalUsers: users.length
  };

  return {
    success: true,
    currentUser: {
      id: currentUser.id,
      name: currentUser.name,
      role: currentUser.role,
      initials: currentUser.initials
    },
    stats: stats,
    projects: projects,
    activity: activity,
    quickLinks: quickLinks,
    workspaces: currentUser.role === 'admin' ? workspaces : []
  };
}

/* ============ ابزارهای کمکی ============ */

// یک شیت رو به آرایه‌ای از object بر اساس ردیف هدر تبدیل می‌کند
function sheetToObjects(sheetName) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) return [];
  const values = sheet.getDataRange().getValues();
  const headers = values.shift();
  return values
    .filter(function (row) { return row.join('') !== ''; })
    .map(function (row) {
      const obj = {};
      headers.forEach(function (h, i) { obj[h] = row[i]; });
      return obj;
    });
}

// رمز عبور را با SHA-256 هش می‌کند
function hashPassword(password) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, password);
  return bytes.map(function (b) {
    const v = (b < 0 ? b + 256 : b).toString(16);
    return v.length === 1 ? '0' + v : v;
  }).join('');
}

/**
 * برای ساختن رمزهای اولیه:
 * این تابع را با نام هرکاربر و رمز دلخواه صدا بزنید (از منوی Run در Apps Script)،
 * سپس در View > Logs مقدار هش‌شده را کپی کرده و در ستون passwordHash شیت Users قرار دهید.
 */
function generateHashForSheet() {
  const password = 'رمز-دلخواه-اینجا'; // این خط را ویرایش کنید
  Logger.log(hashPassword(password));
}
