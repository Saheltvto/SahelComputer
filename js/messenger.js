/* ساحل — پیام‌رسان (ظاهر و رفتار شبیه واتساپ)
   دو موتور: «سریع» (Supabase، با Realtime) و «گوگل» (Apps Script، پشتیبان).
   بعد از dashboard.js بارگذاری می‌شود. ظاهر در css/messenger.css است.
   میانبرها: Alt+M باز/بسته · Ctrl+K جستجو · Alt+↑/↓ گفتگوی بعدی/قبلی · Alt+A پیوست · Alt+R پاسخ · Esc بازگشت */
(function () {
  'use strict';

  var FILE_TAG = '[[FILE]]', META_TAG = '[[M]]';
  var MAX_GAS_FILE = 8 * 1024 * 1024, MAX_SB_FILE = 50 * 1024 * 1024;
  var ICON_BACKEND = { chatBtn: 'sb', fileTransferBtn: 'gas' };
  var AV = ['linear-gradient(135deg,#14808A,#0B3D42)', 'linear-gradient(135deg,#7C5CFC,#4B33C9)', 'linear-gradient(135deg,#F2994A,#E2573A)',
    'linear-gradient(135deg,#2D9CDB,#1F5FBF)', 'linear-gradient(135deg,#EB5C8A,#B83280)', 'linear-gradient(135deg,#27AE60,#0E7C4A)',
    'linear-gradient(135deg,#E6A92B,#C27A0E)', 'linear-gradient(135deg,#9B51E0,#6B2FB3)', 'linear-gradient(135deg,#00B8A9,#00796B)',
    'linear-gradient(135deg,#EF6C57,#C0392B)'];
  var EMOJI = [
    ['خندان', '😀 😃 😄 😁 😆 😅 😂 🤣 🙂 😉 😊 😇 🥰 😍 🤩 😘 😋 😛 😜 🤪 😎 🤓 🥳 😏 😌 😔 😴 🤔 🤭 🫡 😬 🙄 😢 😭 😤 😡 🥺 😱 🤯 😳'],
    ['دست و حالت', '👍 👎 👏 🙌 🙏 🤝 💪 ✌️ 🤞 👌 🤌 👋 🤙 ☝️ 👇 👉 👈 ✍️'],
    ['نمادها', '❤️ 🧡 💛 💚 💙 💜 🖤 🤍 💔 💯 ✅ ❌ ⚠️ ❓ ❗ ⭐ ✨ 🔥 🎉 🎊 🏆'],
    ['کار و دفتر', '💼 📎 📁 📄 📊 📈 📉 🧾 💰 💳 🕒 📅 📞 📧 💡 🔒 🔑 🛠️ 💻 🖨️ 📦 🚚']
  ];

  // ---------- آیکن‌ها ----------
  var SPR = {
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4 4"/>',
    menu: '<circle cx="12" cy="5" r="1.7" fill="currentColor"/><circle cx="12" cy="12" r="1.7" fill="currentColor"/><circle cx="12" cy="19" r="1.7" fill="currentColor"/>',
    back: '<path d="M9 6l6 6-6 6"/>',
    down: '<path d="M6 9l6 6 6-6"/>',
    clip: '<path d="M20.5 11.5l-8.2 8.2a5 5 0 01-7.1-7.1l8.5-8.5a3.3 3.3 0 014.7 4.7l-8.5 8.5a1.7 1.7 0 01-2.4-2.4l7.8-7.8"/>',
    emoji: '<circle cx="12" cy="12" r="9"/><path d="M8.5 14.2c.9 1.3 2.1 2 3.5 2s2.6-.7 3.5-2"/><circle cx="9" cy="10" r=".9" fill="currentColor"/><circle cx="15" cy="10" r=".9" fill="currentColor"/>',
    send: '<path d="M21 3L3 10.5l7 2.5 2.5 7L21 3z"/><path d="M10 13L21 3"/>',
    doc: '<path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8l-5-5z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>',
    image: '<rect x="3" y="4" width="18" height="16" rx="2.5"/><circle cx="9" cy="10" r="1.6"/><path d="M21 16l-5-5-8 8"/>',
    cam: '<path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 011 1v9a1 1 0 01-1 1H4a1 1 0 01-1-1V9a1 1 0 011-1z"/><circle cx="12" cy="13" r="3.4"/>',
    reply: '<path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 016 6v2"/>',
    copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 012-2h9"/>',
    fwd: '<path d="M15 14l5-5-5-5"/><path d="M20 9H10a6 6 0 00-6 6v2"/>',
    share: '<circle cx="18" cy="5" r="2.6"/><circle cx="6" cy="12" r="2.6"/><circle cx="18" cy="19" r="2.6"/><path d="M8.3 10.8l7.4-4.3M8.3 13.2l7.4 4.3"/>',
    dl: '<path d="M12 4v11M7.5 10.5L12 15l4.5-4.5M5 19h14"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    warn: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5"/><circle cx="12" cy="16.4" r=".6" fill="currentColor"/>',
    retry: '<path d="M4 12a8 8 0 0113.7-5.7L20 8"/><path d="M20 4v4h-4"/><path d="M20 12a8 8 0 01-13.7 5.7L4 16"/><path d="M4 20v-4h4"/>',
    trash: '<path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    kb: '<rect x="2.5" y="6" width="19" height="12" rx="2.5"/><path d="M6.5 10h.01M10 10h.01M14 10h.01M17.5 10h.01M7 14h10"/>',
    bell: '<path d="M6 16v-5a6 6 0 1112 0v5l1.5 2h-15L6 16z"/><path d="M10 20.5a2 2 0 004 0"/>',
    bellx: '<path d="M6 16v-5a6 6 0 019-5.2M18 11v5l1.5 2H8"/><path d="M10 20.5a2 2 0 004 0M4 4l16 16"/>',
    bolt: '<path d="M13 3L5 13.5h6L10 21l8-11h-6l1-7z"/>',
    cloud: '<path d="M7 18a4.5 4.5 0 01-.5-9A6 6 0 0118 10a4 4 0 010 8H7z"/>',
    chat: '<path d="M21 11.5C21 16.2 16.97 20 12 20c-1.14 0-2.23-.2-3.23-.56L4 20.5l1.3-3.9A7.7 7.7 0 014 12.1C4 7.4 8.03 3.6 12 3.6c4.97 0 9 3.2 9 7.9z"/><path d="M8.6 10.2h6.8M8.6 13.4h4.2"/>'
  };
  function spriteHtml() {
    var s = '<svg xmlns="http://www.w3.org/2000/svg" style="display:none" aria-hidden="true">';
    Object.keys(SPR).forEach(function (k) {
      s += '<symbol id="mi-' + k + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' + SPR[k] + '</symbol>';
    });
    s += '<symbol id="mi-t1" viewBox="0 0 20 12" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M2 6.5L5.5 10 13 2"/></symbol>';
    s += '<symbol id="mi-t2" viewBox="0 0 20 12" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M1.5 6.5L5 10l7.5-8M7.5 9.4l.6.6L15.6 2"/></symbol>';
    return s + '</svg>';
  }
  function ic(n, c) { return '<svg class="ic ' + (c || '') + '" aria-hidden="true"><use href="#mi-' + n + '"/></svg>'; }
  function tickSvg(read) { return '<svg class="tk' + (read ? ' read' : '') + '" aria-hidden="true"><use href="#mi-' + (read ? 't2' : 't1') + '"/></svg>'; }

  // ---------- ابزار ----------
  function $(s, r) { return (r || document).querySelector(s); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function fa(n) { return String(n).replace(/\d/g, function (d) { return '۰۱۲۳۴۵۶۷۸۹'[d]; }); }
  function me() { return (typeof sahelUser !== 'undefined' && sahelUser) ? String(sahelUser.id) : null; }
  function load(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }
  function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function hash(s) { var h = 0; s = String(s); for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); }
  function isMobile() { return window.innerWidth <= 760; }
  function isTouch() { return !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches); }
  function vib(ms) { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) {} }
  function sizeText(b) { if (!b) return ''; return b > 1048576 ? fa((b / 1048576).toFixed(1)) + ' مگابایت' : fa(Math.max(1, Math.round(b / 1024))) + ' کیلوبایت'; }
  function extOf(n) { var m = String(n || '').match(/\.([A-Za-z0-9]+)$/); return m ? m[1].toLowerCase() : ''; }
  function isImgName(n) { return /^(png|jpe?g|gif|webp|bmp|heic)$/.test(extOf(n)); }
  function fileKind(n) {
    var e = extOf(n);
    if (e === 'pdf') return { c: '#e5483a', t: 'PDF' };
    if (/^(xls|xlsx|csv)$/.test(e)) return { c: '#1e9e63', t: 'XLS' };
    if (/^(doc|docx)$/.test(e)) return { c: '#2f6fe0', t: 'DOC' };
    if (/^(ppt|pptx)$/.test(e)) return { c: '#e8793a', t: 'PPT' };
    if (isImgName(n)) return { c: '#2d9cdb', t: 'IMG' };
    if (/^(zip|rar|7z)$/.test(e)) return { c: '#9a7b3c', t: 'ZIP' };
    if (e === 'txt') return { c: '#6b7c85', t: 'TXT' };
    return { c: '#5e7a78', t: (e || 'FILE').slice(0, 4).toUpperCase() };
  }
  function initialsOf(name) {
    var w = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (!w.length) return '؟';
    if (w.length === 1) return w[0].slice(0, 2);
    return w[0].charAt(0) + '\u200c' + w[w.length - 1].charAt(0);
  }
  function dirOf(s) {
    var m = String(s).match(/[A-Za-z\u00C0-\u024F\u0590-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFC]/);
    return m && /[A-Za-z\u00C0-\u024F]/.test(m[0]) ? 'ltr' : 'rtl';
  }
  var EMO_RE = null; try { EMO_RE = new RegExp('^(?:\\p{Extended_Pictographic}[\\u{1F3FB}-\\u{1F3FF}\\uFE0F\\u200D]*|\\s){1,8}$', 'u'); } catch (e) {}
  function bigEmoji(s) {
    s = String(s).trim(); if (!s || s.length > 24 || !EMO_RE) return false;
    try { return EMO_RE.test(s) && (s.match(/\p{Extended_Pictographic}/gu) || []).length <= 3; } catch (e) { return false; }
  }
  function linkify(text) {
    return esc(text).replace(/(https?:\/\/[^\s<]*[^\s<.,;:!?)\]}"'،؛])/g, function (u) {
      return '<a href="' + u + '" target="_blank" rel="noopener">' + u + '</a>';
    });
  }
  var tfm = null, wfm = null, dfm = null, sfm = null;
  try {
    tfm = new Intl.DateTimeFormat('fa-IR', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
    wfm = new Intl.DateTimeFormat('fa-IR', { weekday: 'long' });
    dfm = new Intl.DateTimeFormat('fa-IR', { day: 'numeric', month: 'long', year: 'numeric' });
    sfm = new Intl.DateTimeFormat('fa-IR', { year: '2-digit', month: '2-digit', day: '2-digit' });
  } catch (e) {}
  function timeText(t) { var d = new Date(t); if (isNaN(d)) return ''; return tfm ? tfm.format(d) : d.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }); }
  function dayKey(t) { var d = new Date(t); return isNaN(d) ? '' : d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate(); }
  function daysAgo(t) { var a = new Date(t), b = new Date(); a.setHours(0, 0, 0, 0); b.setHours(0, 0, 0, 0); return Math.round((b - a) / 864e5); }
  function dayLabel(t) {
    var n = daysAgo(t), d = new Date(t); if (isNaN(d)) return '';
    if (n === 0) return 'امروز'; if (n === 1) return 'دیروز';
    if (n > 1 && n < 7 && wfm) return wfm.format(d);
    return dfm ? dfm.format(d) : d.toLocaleDateString('fa-IR');
  }
  function listTime(t) {
    if (!t) return ''; var n = daysAgo(t), d = new Date(t);
    if (n === 0) return timeText(t); if (n === 1) return 'دیروز';
    if (n < 7 && wfm) return wfm.format(d);
    return sfm ? sfm.format(d) : d.toLocaleDateString('fa-IR');
  }
  function toB64(file) {
    return new Promise(function (res, rej) {
      var r = new FileReader();
      r.onload = function () { res(String(r.result).split(',')[1] || ''); };
      r.onerror = function () { rej(new Error('خواندن فایل ناموفق بود')); };
      r.readAsDataURL(file);
    });
  }

  // ---------- قالب پیام‌ها ----------
  function parseFileMsg(text) {
    if (typeof text !== 'string' || text.indexOf(FILE_TAG) !== 0) return null;
    try { var o = JSON.parse(text.slice(FILE_TAG.length)); return o && o.u ? o : null; } catch (e) { return null; }
  }
  function unpack(t) {
    t = String(t == null ? '' : t);
    if (t.indexOf(META_TAG) === 0) {
      var i = t.indexOf('\n');
      if (i > 0) { try { return { meta: JSON.parse(t.slice(META_TAG.length, i)), body: t.slice(i + 1) }; } catch (e) {} }
    }
    return { meta: null, body: t };
  }
  function pack(body, meta) { return meta && Object.keys(meta).length ? META_TAG + JSON.stringify(meta) + '\n' + body : body; }
  function previewStr(raw) {
    var f = parseFileMsg(raw); if (f) return '📎 ' + (f.n || 'فایل');
    return unpack(raw).body.replace(/\s+/g, ' ').trim();
  }
  function itemPreview(m) { return m.type === 'file' ? (isImgItem(m) ? '📷 ' : '📎 ') + (m.name || 'فایل') : String(m.body || '').replace(/\s+/g, ' ').trim().slice(0, 110); }
  function normItem(i) {
    if (i.type === 'text') { var u = unpack(i.text); i.raw = i.text; i.body = u.body; i.meta = u.meta; }
    return i;
  }

  // ---------- موتور گوگل (Apps Script) ----------
  var GAS = {
    id: 'gas', label: 'گوگل', pollMs: 8000, listMs: 15000, badgeMs: 45000,
    ready: function () { return typeof sahelApiCall === 'function'; },
    contacts: function () {
      return sahelApiCall({ action: 'getChatContacts', userId: me() }).then(function (d) {
        if (!d || !d.success) throw new Error((d && d.message) || 'خطا');
        return (d.users || []).map(function (u) {
          return { id: String(u.id), name: u.name, initials: u.initials, photo: u.photo, jobTitle: u.jobTitle,
                   last: u.lastMessage || '', unread: Number(u.unreadCount) || 0, lastAt: u.lastTime || u.lastAt || null };
        });
      });
    },
    thread: function (uid, c) {
      return Promise.all([
        sahelApiCall({ action: 'getChatMessages', userId: uid, contactId: c.id }),
        sahelApiCall({ action: 'getFiles', userId: uid })
      ]).then(function (r) {
        var items = [], seen = {};
        ((r[0] && r[0].messages) || []).forEach(function (m, i) {
          var f = parseFileMsg(m.text), mine = String(m.senderId) === String(uid);
          var rd = m.read === true || m.read === 'true' || m.isRead === true || !!m.readAt || m.seen === true;
          if (f) { seen[f.u] = 1; items.push({ key: 'g' + m.time + i, mine: mine, type: 'file', name: f.n, url: f.u, size: f.s, time: m.time, read: rd }); }
          else items.push({ key: 'g' + m.time + i, mine: mine, type: 'text', text: m.text, time: m.time, read: rd });
        });
        ((r[1] && r[1].files) || []).forEach(function (f, i) {
          if (f.senderName === c.name && !seen[f.url]) items.push({ key: 'gf' + f.date + i, mine: false, type: 'file', name: f.fileName, url: f.url, time: f.date });
        });
        items.sort(function (a, b) { return new Date(a.time) - new Date(b.time); });
        return items;
      });
    },
    send: function (uid, c, text) {
      return sahelApiCall({ action: 'sendChatMessage', senderId: uid, receiverId: c.id, text: text }).then(function (d) {
        if (!d || !d.success) throw new Error((d && d.message) || 'ارسال نشد');
      });
    },
    sendFile: function (uid, c, file) {
      if (file.size > MAX_GAS_FILE) return Promise.reject(new Error('حجم فایل بیشتر از ۸ مگابایت است (موتور گوگل)'));
      return toB64(file).then(function (b64) {
        return sahelApiCall({ action: 'sendFile', senderId: uid, receiverId: c.id, fileName: file.name,
                              mimeType: file.type || 'application/octet-stream', fileData: b64 });
      }).then(function (d) {
        if (!d || !d.success) throw new Error((d && d.message) || 'ارسال فایل نشد');
        return GAS.send(uid, c, FILE_TAG + JSON.stringify({ n: file.name, u: d.url, s: file.size }));
      });
    },
    markRead: function (uid, c) {
      return Promise.all([
        sahelApiCall({ action: 'markChatRead', userId: uid, contactId: c.id }),
        sahelApiCall({ action: 'markFilesRead', userId: uid })
      ]);
    },
    unread: function () {
      return sahelApiCall({ action: 'unreadCounts', userId: me() }).then(function (d) {
        if (d && d.success) return (Number(d.chat) || 0) + (Number(d.files) || 0);
        return Promise.all([sahelApiCall({ action: 'getChatContacts', userId: me() }), sahelApiCall({ action: 'getFiles', userId: me() })])
          .then(function (r) { return ((r[0] && r[0].unreadCount) || 0) + ((r[1] && r[1].unreadCount) || 0); });
      });
    }
  };

  // ---------- موتور سریع (Supabase) ----------
  var SB = {
    id: 'sb', label: 'سریع', pollMs: 3000, listMs: 6000, badgeMs: 12000,
    ready: function () { return !!(window.SahelSB && window.SahelSB.ready()); },
    contacts: function () { return window.SahelSB.contacts(); },
    thread: function (uid, c) { return window.SahelSB.thread(uid, c.id); },
    send: function (uid, c, text) { return window.SahelSB.send(uid, c.id, text); },
    sendFile: function (uid, c, file, pg) { return window.SahelSB.sendFile(uid, c.id, file, pg); },
    markRead: function (uid, c) { return window.SahelSB.markRead(uid, c.id); },
    unread: function () { return window.SahelSB.unread().then(function (r) { return r.chat + r.files; }); }
  };
  var BE = { sb: SB, gas: GAS };

  // ---------- وضعیت ----------
  var seq = 0;
  var S = {
    be: SB, fallback: false, open: false, contact: null, contacts: [], byId: {}, loaded: false,
    filter: 'all', items: [], tmps: [], sig: '', rk: null, att: [], reply: null, drafts: {}, act: {}, tc: {},
    pop: null, menu: null, lb: null, divKey: null, unreadAtOpen: 0, firstLoad: false, stick: true, newBelow: 0,
    fetching: null, again: false, lastThread: 0, lastList: 0, lastBadge: 0, total: 0, listSig: '',
    notified: {}, hist: 0, skip: 0, noClick: 0, queue: [], pumping: false, lastInKey: null,
    mute: !!load('sahel_msgr_mute'), asked: !!load('sahel_msgr_asked')
  };
  var R = {};
  var KC = function () { return 'sahel_mg_c_' + me() + '_' + S.be.id; };
  var KT = function (cid) { return 'sahel_mg_t_' + me() + '_' + S.be.id + '_' + cid; };
  var KA = function () { return 'sahel_mg_a_' + me() + '_' + S.be.id; };
  var KD = function () { return 'sahel_mg_d_' + me(); };

  function pickBackend() {
    var pref = load('sahel_msgr_be') || 'sb', be = BE[pref] || SB;
    S.fallback = false;
    if (!be.ready()) { var alt = be === SB ? GAS : SB; if (alt.ready()) { S.fallback = true; be = alt; } }
    return be;
  }
  function rtLive() { try { var r = S.be === SB && window.SahelSB && window.SahelSB.realtime(); return !!(r && r.ok && r.events > 0); } catch (e) { return false; } }

  // ---------- ساخت رابط ----------
  function build() {
    if (R.root) return;
    if (!document.querySelector('link[href*="messenger.css"]')) {
      var l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'css/messenger.css'; document.head.appendChild(l);
    }
    var sp = document.createElement('div'); sp.innerHTML = spriteHtml(); document.body.appendChild(sp.firstChild);
    var root = document.createElement('div');
    root.className = 'msgr'; root.id = 'msgr'; root.setAttribute('role', 'dialog'); root.setAttribute('aria-label', 'پیام‌رسان'); root.setAttribute('aria-modal', 'true');
    root.innerHTML =
      '<div class="msgr-bd" id="mpBd"></div>' +
      '<div class="msgr-app" id="mpApp">' +
        '<aside class="mp-side">' +
          '<header class="mp-hd"><div id="mpMe"></div><h2>پیام‌ها</h2>' +
            '<button type="button" class="mp-ib" id="mpMenu" title="تنظیمات" aria-label="تنظیمات">' + ic('menu') + '</button>' +
            '<button type="button" class="mp-ib" id="mpClose" title="بستن (Esc)" aria-label="بستن">' + ic('close') + '</button></header>' +
          '<div class="mp-sr"><label>' + ic('search', 's') + '<input id="mpQ" type="search" placeholder="جستجوی همکاران… (Ctrl+K)" autocomplete="off" enterkeyhint="search"></label></div>' +
          '<div class="mp-fl"><button type="button" class="mp-chip on" data-f="all">همه</button><button type="button" class="mp-chip" data-f="un">نخوانده‌ها <i id="mpUnN" hidden></i></button></div>' +
          '<div class="mp-list" id="mpList"></div>' +
        '</aside>' +
        '<main class="mp-main" id="mpMain">' +
          '<div class="mp-hero"><div class="logo">' + ic('chat') + '</div><h3>پیام‌رسان ساحل</h3>' +
            '<p>یک همکار را از فهرست انتخاب کنید و پیام یا فایل بفرستید.<br>' +
            '<kbd>Alt</kbd> + <kbd>M</kbd> باز و بسته · <kbd>Ctrl</kbd> + <kbd>K</kbd> جستجو</p></div>' +
          '<section class="mp-thread" id="mpThread">' +
            '<header class="mp-th">' +
              '<button type="button" class="mp-ib mp-bk" id="mpBack" aria-label="بازگشت">' + ic('back') + '</button>' +
              '<div id="mpTAv"></div>' +
              '<div class="mp-who"><b id="mpTName"></b><span id="mpTSub"></span></div>' +
            '</header>' +
            '<div class="mp-msgs" id="mpMsgs" role="log" aria-live="polite"></div>' +
            '<button type="button" class="mp-fab" id="mpFab" aria-label="رفتن به آخرین پیام">' + ic('back') + '<i></i></button>' +
            '<div class="mp-drop" id="mpDrop">' + ic('clip') + '<span>فایل را اینجا رها کنید</span></div>' +
            '<div class="mp-rep" id="mpRep" hidden></div>' +
            '<div class="mp-tray" id="mpTray" hidden></div>' +
            '<div class="mp-comp" id="mpComp">' +
              '<button type="button" class="cb att" id="mpAtt" aria-label="پیوست فایل" title="پیوست فایل (Alt+A)">' + ic('clip') + '</button>' +
              '<button type="button" class="cb emo" id="mpEmo" aria-label="ایموجی" title="ایموجی">' + ic('emoji') + '</button>' +
              '<div class="mp-ta"><textarea id="mpIn" rows="1" placeholder="پیام بنویسید…" enterkeyhint="send"></textarea></div>' +
              '<button type="button" class="cb snd" id="mpSend" aria-label="ارسال" title="ارسال (Enter)" disabled>' + ic('send') + '</button>' +
              '<input type="file" id="mpFDoc" multiple hidden accept=".pdf,.xlsx,.xls,.csv,.doc,.docx,.ppt,.pptx,.txt,.zip">' +
              '<input type="file" id="mpFImg" multiple hidden accept="image/*">' +
              '<input type="file" id="mpFCam" hidden accept="image/*" capture="environment">' +
            '</div>' +
          '</section>' +
        '</main>' +
      '</div>';
    document.body.appendChild(root);
    R.root = root; R.app = $('#mpApp', root); R.main = $('#mpMain', root); R.list = $('#mpList', root); R.q = $('#mpQ', root);
    R.msgs = $('#mpMsgs', root); R.in = $('#mpIn', root); R.send = $('#mpSend', root); R.tray = $('#mpTray', root); R.rep = $('#mpRep', root);
    R.fab = $('#mpFab', root); R.drop = $('#mpDrop', root); R.comp = $('#mpComp', root); R.thread = $('#mpThread', root);
    R.unN = $('#mpUnN', root); R.tAv = $('#mpTAv', root); R.tName = $('#mpTName', root); R.tSub = $('#mpTSub', root);
    var host = document.createElement('div'); host.className = 'msgr-toasts'; host.setAttribute('aria-live', 'polite'); document.body.appendChild(host); R.toasts = host;
    bind();
    if (sahelUserOk()) R.me = $('#mpMe', root), R.me.innerHTML = avatar({ id: me(), name: sahelUser.name, photo: sahelUser.photo, initials: sahelUser.initials }, 'xs', 96);
  }
  function sahelUserOk() { return typeof sahelUser !== 'undefined' && !!sahelUser; }

  // ---------- آواتار ----------
  function avatar(c, cls, size) {
    var g = AV[hash(c.id || c.name) % AV.length], inner = '';
    var o = { id: c.id, name: c.name, photo: c.photo, initials: c.initials || initialsOf(c.name) };
    if (typeof avatarFor === 'function') { try { inner = avatarFor(o, size || 140); } catch (e) { inner = ''; } }
    if (!inner) inner = '<span class="avatar-txt">' + esc(o.initials) + '</span>';
    return '<div class="mp-av ' + (cls || '') + '" style="--g:' + g + '">' + inner + '</div>';
  }
  function photoOf(c) {
    var p = c.photo || '';
    try { if (!p && typeof PhotoBook !== 'undefined') p = PhotoBook.get(c.id, c.name).photo; } catch (e) {}
    return (p && typeof sahelPhotoUrl === 'function') ? sahelPhotoUrl(p, 900) : '';
  }

  // ---------- باز و بسته ----------
  function openPanel(beId, opt) {
    build(); opt = opt || {};
    var was = S.open;
    S.open = true; R.root.classList.add('on'); vv();
    if (!was) pushHist();
    var be = beId ? (BE[beId] || SB) : pickBackend();
    if (beId && !be.ready() && BE[beId] === SB) be = pickBackend();
    setBackend(be, was && !opt.reset);
    if (!isMobile() && !opt.noFocus) setTimeout(function () { if (!S.contact) R.q.focus(); }, 60);
    askNotif();
  }
  function close(fromPop) {
    if (!S.open) return;
    closeMenu(); closePop(); closeLB(); closeOv();
    saveDraft();
    S.open = false; R.root.classList.remove('on');
    if (!fromPop) popHist();
  }
  function toggle() { if (S.open) close(); else openPanel(null, { reset: true }); }
  function setBackend(be, keep) {
    var changed = S.be !== be; S.be = be;
    if (changed || !keep) { S.contacts = []; S.byId = {}; S.loaded = false; S.listSig = ''; S.act = load(KA()) || {}; S.drafts = load(KD()) || {}; }
    if (!S.contacts.length) { var cc = load(KC()); if (cc && cc.length) { S.contacts = cc; indexContacts(); } }
    if (changed && S.contact) closeThread(true);
    R.main.classList.toggle('has', !!S.contact);
    renderList(); loadContacts(true);
  }
  function openChat(cid) {
    openPanel(null, { reset: false, noFocus: true });
    var go = function () { var c = S.byId[String(cid)]; if (c) openThread(c); };
    if (S.byId[String(cid)]) go(); else loadContacts(true).then(go);
  }

  // ---------- تاریخچهٔ مرورگر (دکمهٔ بازگشت اندروید) ----------
  function pushHist() { try { history.pushState({ sahelViewer: 1, msgr: 1 }, ''); S.hist++; } catch (e) {} }
  function popHist() { if (S.hist > 0) { S.skip++; S.hist--; try { history.back(); } catch (e) { S.skip--; } } }
  window.addEventListener('popstate', function () {
    if (S.skip > 0) { S.skip--; return; }
    if (!S.open) return;
    S.hist = Math.max(0, S.hist - 1);
    if (S.lb) { closeLB(); pushHist(); return; }
    if (S.contact && isMobile()) { closeThread(); pushHist(); return; }
    close(true);
  });

  // ---------- همکاران ----------
  function indexContacts() { S.byId = {}; S.contacts.forEach(function (c) { S.byId[c.id] = c; }); }
  function sumUnread() { return S.contacts.reduce(function (s, c) { return s + (c.unread || 0); }, 0); }

  function loadContacts(show) {
    var be = S.be;
    if (!be.ready()) { renderList(); return Promise.resolve(); }
    S.lastList = Date.now();
    if (show && !S.contacts.length) renderList();
    return be.contacts().then(function (cs) {
      if (S.be !== be) return;
      mergeContacts(cs);
    }).catch(function () { if (S.be === be && !S.contacts.length) { S.loaded = 'err'; renderList(); } });
  }

  function mergeContacts(cs) {
    var first = !S.loaded || S.loaded === 'err';
    S.loaded = true;
    cs.forEach(function (c) {
      var a = S.act[c.id], last = c.last || '', t = c.lastAt ? Date.parse(c.lastAt) : 0;
      if (!t) { if (a && a.last === last) t = a.t || 0; else if (last) t = Date.now(); else t = a ? a.t || 0 : 0; }
      var same = a && a.last === last;
      c.t = t; c.mine = c.unread > 0 ? false : (same ? !!a.mine : false); c.st = same ? a.st : null;
      S.act[c.id] = { t: t, last: last, mine: c.mine, st: c.st };
      try { if (typeof PhotoBook !== 'undefined' && (c.photo || c.initials)) PhotoBook.learn([c]); } catch (e) {}
    });
    cs.sort(function (a, b) { return (b.t - a.t) || (b.unread - a.unread) || String(a.name).localeCompare(String(b.name), 'fa'); });
    var prevU = {}; S.contacts.forEach(function (c) { prevU[c.id] = c.unread; });
    if (S.contact) { var cur = cs.filter(function (c) { return c.id === S.contact.id; })[0]; if (cur) { cur.unread = (S.open && !document.hidden) ? 0 : cur.unread; S.contact = cur; } }
    S.contacts = cs; indexContacts(); save(KC(), cs.slice(0, 80)); save(KA(), S.act);
    // اعلان برای پیام‌های تازه‌ای که از راه دیگر (polling) فهمیده شد
    cs.forEach(function (c) {
      var n = c.unread || 0, viewing = S.open && S.contact && S.contact.id === c.id && !document.hidden;
      if (!n || viewing) { if (!n || viewing) S.notified[c.id] = 0; return; }
      if (first) { S.notified[c.id] = n; return; }
      if (n > (S.notified[c.id] || 0)) { S.notified[c.id] = n; alertNew(c, previewStr(c.last), n); }
    });
    S.total = sumUnread(); updateBadges(); renderList();
    if (S.contact) { R.tSub.textContent = S.contact.jobTitle || ''; }
  }

  function rowHtml(c) {
    var dr = S.drafts[c.id], un = c.unread > 0, sel = S.contact && S.contact.id === c.id;
    var line;
    if (dr && !sel) line = '<em>پیش‌نویس:</em><span>' + esc(dr.slice(0, 60)) + '</span>';
    else line = (c.mine ? tickSvg(c.st === 'read') : '') + '<span>' + esc(previewStr(c.last) || c.jobTitle || '') + '</span>';
    return '<div class="mr' + (sel ? ' on' : '') + (un ? ' un' : '') + '" data-id="' + esc(c.id) + '" role="button" tabindex="0">' + avatar(c, '', 140) +
      '<div class="mr-m"><div class="mr-t"><b>' + esc(c.name) + '</b><time>' + esc(c.t ? listTime(c.t) : '') + '</time></div>' +
      '<div class="mr-b"><div class="mr-l">' + line + '</div>' + (un ? '<i class="mr-c">' + fa(c.unread > 99 ? '99+' : c.unread) + '</i>' : '') + '</div></div></div>';
  }

  function visibleContacts() {
    var q = (R.q && R.q.value || '').trim().toLowerCase();
    return S.contacts.filter(function (c) {
      return (!q || (c.name || '').toLowerCase().indexOf(q) !== -1 || (c.jobTitle || '').toLowerCase().indexOf(q) !== -1) && (S.filter !== 'un' || c.unread > 0);
    });
  }
  function renderList() {
    if (!R.list) return;
    var html = '', rows = visibleContacts(), un = sumUnread();
    R.unN.textContent = un ? fa(un > 99 ? '99+' : un) : ''; R.unN.hidden = !un;
    var note = S.fallback ? '<div class="mp-note">اتصال سریع هنوز فعال نیست؛ فعلاً با موتور گوگل کار می‌کنید. یک بار خارج و دوباره وارد شوید.</div>' : '';
    if (!S.be.ready()) html = '<div class="mp-empty">' + ic('chat') + 'اتصال برقرار نیست.<br>یک بار از حساب خارج و دوباره وارد شوید.</div>';
    else if (S.loaded === 'err' && !S.contacts.length) html = '<div class="mp-empty">' + ic('warn') + 'دریافت لیست ممکن نشد.<br>اینترنت را بررسی کنید.<br><button type="button" class="mp-btn" data-retry="1">تلاش دوباره</button></div>';
    else if (!S.loaded && !S.contacts.length) html = '<div class="mp-skel"><i></i><div><b></b><b></b></div></div><div class="mp-skel"><i></i><div><b></b><b></b></div></div><div class="mp-skel"><i></i><div><b></b><b></b></div></div>';
    else if (!rows.length) html = '<div class="mp-empty">' + ic('chat') + (R.q.value ? 'همکاری پیدا نشد.' : (S.filter === 'un' ? 'پیام خوانده‌نشده‌ای ندارید 🎉' : 'همکاری برای گفتگو وجود ندارد.')) + '</div>';
    else html = rows.map(rowHtml).join('');
    html = note + html;
    if (html !== S.listSig) { S.listSig = html; var st = R.list.scrollTop; R.list.innerHTML = html; R.list.scrollTop = st; }
  }

  // ---------- گفتگو ----------
  function openThread(c) {
    if (S.contact && S.contact.id !== c.id) saveDraft();
    S.contact = c; S.items = []; S.sig = ''; S.rk = null; S.reply = null; clearAtt(); S.divKey = null; S.newBelow = 0;
    S.unreadAtOpen = c.unread || 0; S.firstLoad = true; S.stick = true; S.lastInKey = null; S.fetching = null; S.again = false;
    R.app.classList.add('in-thread'); R.main.classList.add('has');
    R.tAv.innerHTML = avatar(c, 'sm zoom', 120); R.tName.textContent = c.name; R.tSub.textContent = c.jobTitle || '';
    var cached = S.tc[c.id] || load(KT(c.id));
    R.msgs.innerHTML = '';
    if (cached && cached.length) { S.items = cached; renderThread({ stick: true, first: true }); S.sig = ''; }
    else R.msgs.innerHTML = '<div class="mp-emp2">در حال بارگذاری…</div>';
    R.in.value = S.drafts[c.id] || ''; autosize(); renderReply(); renderTray(); updateSend(); updateFab();
    renderList();
    refreshThread(true);
    if (!isMobile()) setTimeout(function () { R.in.focus(); }, 60);
  }
  function closeThread() {
    saveDraft(); closePop(); closeMenu(); closeLB();
    S.contact = null; S.reply = null; clearAtt();
    R.app.classList.remove('in-thread'); R.main.classList.remove('has');
    renderList();
    if (Date.now() - S.lastList > 2500) loadContacts(false);
  }
  function stepChat(d) {
    var rows = visibleContacts(); if (!rows.length) return;
    var i = S.contact ? rows.map(function (c) { return c.id; }).indexOf(S.contact.id) : -1;
    i = Math.max(0, Math.min(rows.length - 1, i + d)); if (rows[i]) openThread(rows[i]);
  }

  function refreshThread(stick) {
    var be = S.be, c = S.contact;
    if (!c) return Promise.resolve();
    if (!be.ready()) { if (!S.items.length) R.msgs.innerHTML = '<div class="mp-emp2">اتصال برقرار نیست.</div>'; return Promise.resolve(); }
    if (S.fetching) { S.again = S.again || !!stick; return S.fetching; }
    var t0 = Date.now(); S.lastThread = t0;
    var p = be.thread(me(), c).then(function (items) {
      if (S.be !== be || S.contact !== c) return;
      items.forEach(normItem);
      S.tc[c.id] = items.slice(-80);
      save(KT(c.id), S.tc[c.id].map(function (i) { return Object.assign({}, i, { url: '' }); }));
      applyItems(c, items, t0, stick);
    }).catch(function () {
      if (S.contact === c && !S.items.length && !S.tmps.length) R.msgs.innerHTML = '<div class="mp-emp2">دریافت پیام‌ها ممکن نشد.<br>اینترنت را بررسی کنید.</div>';
    }).then(function () { S.fetching = null; if (S.again) { S.again = false; refreshThread(true); } });
    S.fetching = p; return p;
  }

  function applyItems(c, items, t0, stick) {
    var first = S.firstLoad; S.firstLoad = false;
    var dropped = 0;
    S.tmps = S.tmps.filter(function (t) { if (t.sentAt && t.sentAt <= t0) { dropped++; if (t.blob) { try { URL.revokeObjectURL(t.blob); } catch (e) {} } return false; } return true; });
    S.skipAnim = dropped;
    var lastIn = null; for (var i = items.length - 1; i >= 0; i--) if (!items[i].mine) { lastIn = items[i]; break; }
    var incoming = !!(S.lastInKey && lastIn && lastIn.key !== S.lastInKey);
    S.lastInKey = lastIn ? lastIn.key : null;
    S.items = items;
    if (first && S.unreadAtOpen > 0) {
      var inc = items.filter(function (x) { return !x.mine; }), n = Math.min(S.unreadAtOpen, inc.length);
      if (n > 0) S.divKey = inc[inc.length - n].key;
    }
    activityFromThread(c, items);
    renderThread({ stick: !!stick || first, first: first && !!S.divKey, incoming: incoming });
    if (incoming && !first && !document.hidden) beep('in');
    var pending = items.some(function (x) { return !x.mine && x.read === false; });
    if ((pending || incoming || c.unread > 0) && S.open && !document.hidden) doMarkRead(c);
  }

  function activityFromThread(c, items) {
    var l = items[items.length - 1]; if (!l) return;
    var a = S.act[c.id] || (S.act[c.id] = { t: 0, last: '' }), lt = Date.parse(l.time) || Date.now();
    if (lt >= a.t - 1000) {
      a.t = Math.max(a.t, lt); a.mine = !!l.mine; a.st = l.mine && l.read ? 'read' : 'sent';
      if (l.type === 'text') a.last = l.raw;
    }
    c.t = a.t; c.mine = a.mine; c.st = a.st;
    if (S.loaded === true) { S.contacts.sort(function (x, y) { return ((y.t || 0) - (x.t || 0)) || (y.unread - x.unread); }); save(KA(), S.act); renderList(); }
  }

  function doMarkRead(c) {
    if (S.marking === c.id) return; S.marking = c.id;
    S.be.markRead(me(), c).then(function () {
      c.unread = 0; S.notified[c.id] = 0; S.total = sumUnread(); updateBadges(); renderList();
    }).catch(function () {}).then(function () { S.marking = null; });
  }

  // ---------- نمایش پیام‌ها ----------
  function isImgItem(m) {
    if (m.type !== 'file') return false;
    var img = (m.mime && /^image\//.test(m.mime) && !/svg/.test(m.mime)) || isImgName(m.name);
    return !!(img && (m.blob || (m.url && S.be === SB)));
  }
  function metaHtml(m) {
    var tm = m.tmp && !m.sentAt ? '' : timeText(m.time);
    var st = '';
    if (m.mine) {
      if (m.status === 'failed') st = '<button type="button" class="mt-fail" data-act="retry" aria-label="ارسال دوباره">' + ic('warn') + '</button>';
      else if (m.tmp && !m.sentAt) st = ic('clock');
      else st = tickSvg(!!m.read);
    }
    return '<span class="mt">' + (tm ? '<span>' + tm + '</span>' : '') + st + '</span>';
  }
  function quoteHtml(m) {
    var r = m.meta && m.meta.r; if (!r) return '';
    var nm = String(r.u) === String(me()) ? 'شما' : ((S.byId[String(r.u)] && S.byId[String(r.u)].name) || (S.contact && S.contact.name) || 'همکار');
    return '<div class="mq" data-act="jump" data-k="' + esc(r.k || '') + '"><b>' + esc(nm) + '</b><span>' + esc(r.t || '') + '</span></div>';
  }
  function bubbleHtml(m, prev, isNew) {
    var first = !prev || prev.mine !== m.mine || dayKey(prev.time) !== dayKey(m.time) || (Date.parse(m.time) - Date.parse(prev.time)) > 300000;
    var cls = 'mb ' + (m.mine ? 'out' : 'in') + (first ? ' first' : '') + (m.tmp ? ' tmp' : '') + (m.status === 'failed' ? ' failed' : '') + (isNew ? ' new' : '');
    var inner;
    if (m.type === 'file') {
      var k = fileKind(m.name), url = m.blob || m.url;
      if (isImgItem(m)) {
        cls += ' imgonly';
        inner = '<div class="mi nocap" data-act="view"><img src="' + esc(url) + '" alt="" loading="lazy" decoding="async">' + metaHtml(m) + '</div>';
      } else {
        var sub = m.status === 'failed' ? 'ارسال نشد — برای تلاش دوباره بزنید' : (m.tmp && !m.sentAt ? 'در حال ارسال…' : ((sizeText(m.size) ? sizeText(m.size) + ' · ' : '') + k.t));
        inner = '<a class="mf" ' + (m.url && !m.tmp ? 'href="' + esc(m.url) + '" target="_blank" rel="noopener"' : '') + '><span class="mf-i" style="--c:' + k.c + '">' + k.t + '<span class="pg' + (m.prog > 0 ? '' : ' ind') + '" style="--p:' + Math.round((m.prog || 0) * 100) + '"></span></span>' +
          '<span class="mf-n"><b>' + esc(m.name || 'فایل') + '</b><small>' + sub + '</small></span><span class="mf-d">' + ic('dl') + '</span></a>' +
          '<div class="mfm">' + metaHtml(m) + '</div>';
      }
    } else {
      var body = String(m.body || ''), big = bigEmoji(body);
      inner = (m.meta && m.meta.fw ? '<div class="mfw">' + ic('fwd', 'xs') + 'ارسال‌شده</div>' : '') + quoteHtml(m) +
        '<div class="t' + (big ? ' big' : '') + '" dir="' + dirOf(body) + '">' + linkify(body) + metaHtml(m) + '</div>';
    }
    return '<div class="' + cls + '" data-k="' + esc(m.key) + '"><button type="button" class="mb-act" data-act="menu" aria-label="گزینه‌ها">' + ic('down') + '</button>' + inner + '</div>';
  }

  function nearBottom() { return R.msgs.scrollHeight - R.msgs.scrollTop - R.msgs.clientHeight < 120; }
  function scrollBottom() { R.msgs.scrollTop = R.msgs.scrollHeight; S.stick = true; S.newBelow = 0; updateFab(); }
  function updateFab() {
    var far = R.msgs.scrollHeight - R.msgs.scrollTop - R.msgs.clientHeight > 260;
    R.fab.classList.toggle('on', far); R.fab.querySelector('i').textContent = S.newBelow ? fa(S.newBelow) : '';
  }

  function renderThread(o) {
    o = o || {};
    var c = S.contact; if (!c) return;
    var list = S.items.concat(S.tmps.filter(function (t) { return t.cid === c.id; }));
    var sig = list.map(function (i) { return i.key + (i.read ? 'r' : '') + (i.status || '') + (i.sentAt ? 's' : '') + (i.url ? i.url.length : 0); }).join(',') + '|' + S.divKey;
    if (sig === S.sig) { if (o.stick) scrollBottom(); return; }
    var near = S.stick || nearBottom(), prevRk = S.rk, rk = {}, html = '', prev = null, lastDay = '', added = 0, skip = S.skipAnim || 0;
    if (!list.length) html = '<div class="mp-emp2">هنوز پیامی نیست.<br>اولین پیام، لینک یا فایل را بفرستید 👋</div>';
    list.forEach(function (m) {
      var dk = dayKey(m.time);
      if (dk && dk !== lastDay) { lastDay = dk; html += '<div class="md">' + esc(dayLabel(m.time)) + '</div>'; prev = null; }
      if (S.divKey && m.key === S.divKey) html += '<div class="mu">' + (S.unreadAtOpen ? fa(S.unreadAtOpen) + ' پیام خوانده‌نشده' : 'پیام‌های جدید') + '</div>';
      var isNew = !!prevRk && !prevRk[m.key];
      if (isNew && m.mine && skip > 0) { skip--; isNew = false; }
      if (isNew && !m.mine) added++;
      rk[m.key] = 1; html += bubbleHtml(m, prev, isNew); prev = m;
    });
    S.rk = rk; S.sig = sig; S.skipAnim = 0;
    var oldTop = R.msgs.scrollTop;
    R.msgs.innerHTML = html;
    if (o.first && S.divKey) { var d = R.msgs.querySelector('.mu'); if (d) { R.msgs.scrollTop = Math.max(0, d.offsetTop - 70); S.stick = nearBottom(); updateFab(); return; } }
    if (o.stick || near) scrollBottom();
    else { R.msgs.scrollTop = oldTop; if (added) S.newBelow += added; updateFab(); }
  }
  function itemByKey(k) {
    var all = S.items.concat(S.tmps);
    for (var i = 0; i < all.length; i++) if (all[i].key === k) return all[i];
    return null;
  }

  // ---------- نوشتن و ارسال ----------
  function autosize() { R.in.style.height = '44px'; R.in.style.height = Math.max(44, Math.min(R.in.scrollHeight, 132)) + 'px'; }
  function updateSend() { R.send.disabled = !(R.in.value.trim() || S.att.length); }
  function saveDraft() {
    if (!S.contact || !R.in) return;
    var v = R.in.value; if (v.trim()) S.drafts[S.contact.id] = v; else delete S.drafts[S.contact.id];
    save(KD(), S.drafts);
  }
  var dTimer = 0;
  function draftSoon() { clearTimeout(dTimer); dTimer = setTimeout(saveDraft, 600); }

  function renderReply() {
    var r = S.reply;
    if (!r) { R.rep.hidden = true; R.rep.innerHTML = ''; return; }
    R.rep.hidden = false;
    R.rep.innerHTML = '<div class="mq"><b>' + esc(r.mine ? 'شما' : (S.contact ? S.contact.name : '')) + '</b><span>' + esc(r.preview) + '</span></div><button type="button" class="x" aria-label="لغو پاسخ">' + ic('close', 's') + '</button>';
  }
  function startReply(m) {
    if (!m || !S.contact) return;
    S.reply = { key: m.key, mine: m.mine, preview: itemPreview(m) };
    renderReply(); R.in.focus();
  }

  function clearAtt() { S.att.forEach(function (a) { if (a.url) try { URL.revokeObjectURL(a.url); } catch (e) {} }); S.att = []; if (R.tray) renderTray(); }
  function addFiles(list) {
    var arr = Array.prototype.slice.call(list || []); if (!arr.length || !S.contact) return;
    var max = S.be === GAS ? MAX_GAS_FILE : MAX_SB_FILE;
    arr.forEach(function (f) {
      if (f.size > max) { snack('«' + f.name + '» بزرگ‌تر از ' + fa(Math.round(max / 1048576)) + ' مگابایت است'); return; }
      if (S.att.length >= 10) { snack('حداکثر ۱۰ فایل در هر ارسال'); return; }
      var isImg = /^image\//.test(f.type) || isImgName(f.name);
      S.att.push({ id: ++seq, file: f, url: isImg ? URL.createObjectURL(f) : '' });
    });
    renderTray(); updateSend();
  }
  function renderTray() {
    if (!S.att.length) { R.tray.hidden = true; R.tray.innerHTML = ''; return; }
    R.tray.hidden = false;
    R.tray.innerHTML = S.att.map(function (a, i) {
      var k = fileKind(a.file.name);
      return '<div class="ti"><div class="ti-p" style="--c:' + k.c + '">' + (a.url ? '<img src="' + a.url + '" alt="">' : k.t) + '</div><small>' + esc(a.file.name) + '</small>' +
        '<button type="button" class="x" data-i="' + i + '" aria-label="حذف">' + ic('close') + '</button></div>';
    }).join('');
  }

  function doSend() {
    var c = S.contact; if (!c) return;
    var text = R.in.value.trim(), files = S.att.slice();
    if (!text && !files.length) return;
    askNotif();
    var meta = S.reply ? { r: { k: S.reply.key, u: S.reply.mine ? me() : c.id, t: S.reply.preview.slice(0, 90) } } : null;
    var now = new Date().toISOString();
    if (text) enqueue({ key: 't' + (++seq), tmp: true, mine: true, type: 'text', cid: c.id, body: text, meta: meta, raw: pack(text, meta), time: now, status: 'queued' });
    files.forEach(function (a) {
      enqueue({ key: 't' + (++seq), tmp: true, mine: true, type: 'file', cid: c.id, name: a.file.name, size: a.file.size, mime: a.file.type, file: a.file, blob: a.url, time: now, status: 'queued', prog: 0 });
    });
    S.att = []; S.reply = null; R.in.value = ''; delete S.drafts[c.id]; save(KD(), S.drafts);
    autosize(); renderReply(); renderTray(); updateSend();
    S.stick = true; renderThread({ stick: true });
    pump();
  }
  function enqueue(t) { S.tmps.push(t); S.queue.push(t); }

  function compressImage(file) {
    return new Promise(function (resolve) {
      if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size < 350 * 1024) return resolve(file);
      var done = false, fin = function (f) { if (!done) { done = true; resolve(f); } };
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        try {
          var max = 1920, w = img.naturalWidth, h = img.naturalHeight, k = Math.min(1, max / Math.max(w, h));
          var cv = document.createElement('canvas'); cv.width = Math.round(w * k); cv.height = Math.round(h * k);
          var g = cv.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height); g.drawImage(img, 0, 0, cv.width, cv.height);
          cv.toBlob(function (b) {
            URL.revokeObjectURL(url);
            if (b && b.size < file.size * 0.9) fin(new File([b], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' })); else fin(file);
          }, 'image/jpeg', 0.82);
        } catch (e) { URL.revokeObjectURL(url); fin(file); }
      };
      img.onerror = function () { URL.revokeObjectURL(url); fin(file); };
      img.src = url; setTimeout(function () { fin(file); }, 8000);
    });
  }

  function exec(t) {
    var be = S.be, c = { id: t.cid, name: (S.byId[t.cid] || {}).name };
    if (t.type === 'text') return be.send(me(), c, t.raw);
    return compressImage(t.file).then(function (f) {
      return be.sendFile(me(), c, f, function (p) { t.prog = p; setProg(t); });
    });
  }
  function setProg(t) {
    var el = R.msgs && R.msgs.querySelector('[data-k="' + t.key + '"] .pg'); if (!el) return;
    el.style.setProperty('--p', Math.round(t.prog * 100)); el.classList.toggle('ind', !(t.prog > 0));
  }
  function pump() {
    if (S.pumping) return; S.pumping = true;
    (function next() {
      var t = S.queue.filter(function (x) { return x.status === 'queued'; })[0];
      if (!t) { S.pumping = false; return; }
      if (navigator.onLine === false) { S.pumping = false; return; }
      t.status = 'sending';
      exec(t).then(function () {
        t.status = 'sent'; t.sentAt = Date.now(); t.file = null;
        var a = S.act[t.cid]; if (a) { a.t = Date.now(); a.mine = true; a.st = 'sent'; if (t.type === 'text') a.last = t.raw; save(KA(), S.act); }
        var cc = S.byId[t.cid]; if (cc) { cc.t = Date.now(); cc.mine = true; cc.st = 'sent'; if (t.type === 'text') cc.last = t.raw; S.contacts.sort(function (x, y) { return (y.t || 0) - (x.t || 0); }); }
        beep('sent');
      }).catch(function (e) {
        t.status = 'failed'; t.err = e && e.message || '';
      }).then(function () {
        S.queue = S.queue.filter(function (x) { return x !== t; });
        if (S.contact && S.contact.id === t.cid) { S.sig = ''; renderThread({ stick: true }); if (t.status === 'sent') refreshThread(true); }
        renderList(); next();
      });
    })();
  }
  window.addEventListener('online', function () { if (S.queue.length) pump(); });
  function retry(m) { if (!m || m.status !== 'failed') return; m.status = 'queued'; m.prog = 0; if (S.queue.indexOf(m) === -1) S.queue.push(m); S.sig = ''; renderThread({}); pump(); }
  function discard(m) { S.tmps = S.tmps.filter(function (x) { return x !== m; }); S.queue = S.queue.filter(function (x) { return x !== m; }); S.sig = ''; renderThread({}); }

  // ---------- ایموجی، پیوست، منو ----------
  function closePop() { if (S.pop) { S.pop.remove(); S.pop = null; $('#mpAtt', R.root).classList.remove('on'); } }
  function togglePop(kind) {
    if (S.pop && S.pop.dataset.k === kind) { closePop(); return; }
    closePop();
    var el = document.createElement('div'); el.className = 'mp-pop ' + (kind === 'emo' ? 'mp-emo' : ''); el.dataset.k = kind;
    if (kind === 'att') {
      var cam = isTouch() || 'ontouchstart' in window;
      el.innerHTML = '<div class="mp-att"><button type="button" data-p="doc"><i style="--c:#7c5cfc">' + ic('doc') + '</i>فایل و سند</button>' +
        '<button type="button" data-p="img"><i style="--c:#2d9cdb">' + ic('image') + '</i>عکس</button>' +
        (cam ? '<button type="button" data-p="cam"><i style="--c:#eb5c8a">' + ic('cam') + '</i>دوربین</button>' : '') + '</div>';
      $('#mpAtt', R.root).classList.add('on');
    } else {
      el.innerHTML = '<div class="g">' + EMOJI.map(function (g) { return '<div class="h">' + g[0] + '</div>' + g[1].split(' ').map(function (e) { return '<button type="button" data-e="' + e + '">' + e + '</button>'; }).join(''); }).join('') + '</div>';
    }
    R.comp.appendChild(el); S.pop = el;
  }
  function insertAtCaret(t) {
    var a = R.in, s = a.selectionStart == null ? a.value.length : a.selectionStart, e = a.selectionEnd == null ? s : a.selectionEnd;
    a.value = a.value.slice(0, s) + t + a.value.slice(e); a.selectionStart = a.selectionEnd = s + t.length;
    autosize(); updateSend(); draftSoon();
  }

  function closeMenu() {
    if (S.menu) { S.menu.remove(); S.menu = null; }
    var bd = document.getElementById('mpSheetBd'); if (bd) bd.remove();
    var hl = R.msgs && R.msgs.querySelector('.mb.pop'); if (hl) hl.classList.remove('pop');
  }
  function showMenu(items, pt, opt) {
    closeMenu(); opt = opt || {};
    var sheet = isMobile() || opt.sheet, el = document.createElement('div');
    el.className = 'mp-menu' + (sheet ? ' sheet' : '');
    el.innerHTML = (opt.preview ? '<div class="pv">' + esc(opt.preview) + '</div>' : '') + items.map(function (it, i) {
      if (it.hr) return '<hr>';
      return '<button type="button" data-i="' + i + '" class="' + (it.red ? 'red' : '') + '">' + ic(it.ic) + '<span>' + esc(it.label) + '</span>' + (it.sub ? '<span class="sb">' + esc(it.sub) + '</span>' : '') + '</button>';
    }).join('');
    if (sheet) { var bd = document.createElement('div'); bd.className = 'mp-sheet-bd'; bd.id = 'mpSheetBd'; bd.onclick = closeMenu; R.root.appendChild(bd); }
    R.root.appendChild(el);
    if (!sheet) {
      var w = 230, h = el.offsetHeight, x = Math.min(Math.max(8, pt.x - (opt.alignRight ? w : 0)), window.innerWidth - w - 8), y = Math.min(pt.y, window.innerHeight - h - 8);
      el.style.left = x + 'px'; el.style.top = Math.max(8, y) + 'px'; el.style.width = w + 'px';
    }
    el.onclick = function (e) {
      var b = e.target.closest('button[data-i]'); if (!b) return;
      var it = items[+b.dataset.i]; closeMenu(); if (it && it.fn) it.fn();
    };
    S.menu = el;
  }

  function openMsgMenu(bEl, pt, sheet) {
    var m = itemByKey(bEl.dataset.k); if (!m) return;
    bEl.classList.add('pop');
    var items = [];
    if (m.tmp && m.status === 'failed') {
      items.push({ ic: 'retry', label: 'ارسال دوباره', fn: function () { retry(m); } }, { ic: 'trash', label: 'حذف', red: 1, fn: function () { discard(m); } });
    } else if (!m.tmp) {
      items.push({ ic: 'reply', label: 'پاسخ', fn: function () { startReply(m); } });
      if (m.type === 'text') items.push({ ic: 'copy', label: 'کپی متن', fn: function () { copyText(m.body); } });
      else if (m.url) items.push({ ic: 'dl', label: 'ذخیره / باز کردن', fn: function () { window.open(m.url, '_blank', 'noopener'); } }, { ic: 'copy', label: 'کپی لینک', fn: function () { copyText(m.url); } });
      items.push({ ic: 'fwd', label: 'ارسال به همکار…', fn: function () { openForward(m); } });
      items.push({ ic: 'share', label: 'اشتراک‌گذاری…', fn: function () { shareItem(m); } });
    } else items.push({ ic: 'copy', label: 'کپی متن', fn: function () { copyText(m.body || ''); } });
    showMenu(items, pt, { sheet: sheet, preview: itemPreview(m), alignRight: !!m.mine });
  }

  function copyText(t) {
    var done = function () { snack('کپی شد'); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(done, function () { legacyCopy(t); done(); });
    else { legacyCopy(t); done(); }
  }
  function legacyCopy(t) {
    var a = document.createElement('textarea'); a.value = t; a.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(a); a.select();
    try { document.execCommand('copy'); } catch (e) {} a.remove();
  }
  function shareItem(m) {
    var text = m.type === 'file' ? (m.name + (m.url ? '\n' + m.url : '')) : m.body;
    if (window.SahelPlatform && window.SahelPlatform.shareText) { window.SahelPlatform.shareText({ title: 'پیام ساحل', text: text }); return; }
    if (navigator.share) { navigator.share(m.type === 'file' && m.url ? { title: m.name, url: m.url } : { text: text }).catch(function () {}); return; }
    copyText(text);
  }
  var snT = 0;
  function snack(t) {
    var old = $('.mp-snack', R.root); if (old) old.remove();
    var s = document.createElement('div'); s.className = 'mp-snack'; s.textContent = t; R.thread.appendChild(s);
    clearTimeout(snT); snT = setTimeout(function () { s.remove(); }, 2200);
  }

  // ---------- ارسال به همکاران ----------
  function closeOv() { var o = $('.mp-ov', R.root); if (o) o.remove(); }
  function openForward(m) {
    closeOv();
    var sel = {}, ov = document.createElement('div'); ov.className = 'mp-ov';
    ov.innerHTML = '<div class="mp-card"><div class="mp-hd"><button type="button" class="mp-ib" data-x="1" aria-label="بستن">' + ic('close') + '</button><h2>ارسال به…</h2></div>' +
      '<div class="mp-sr"><label>' + ic('search', 's') + '<input type="search" placeholder="جستجوی همکاران…" autocomplete="off"></label></div><div class="list"></div>' +
      '<div class="foot"><span class="pv">' + esc(itemPreview(m)) + '</span><button type="button" class="mp-btn" disabled>' + ic('send', 's') + '<span>ارسال</span></button></div></div>';
    R.app.appendChild(ov);
    var list = $('.list', ov), inp = $('input', ov), btn = $('.mp-btn', ov);
    function draw() {
      var q = inp.value.trim().toLowerCase();
      list.innerHTML = S.contacts.filter(function (c) { return !q || (c.name || '').toLowerCase().indexOf(q) !== -1; }).map(function (c) {
        return '<div class="mr' + (sel[c.id] ? ' sel' : '') + '" data-id="' + esc(c.id) + '">' + avatar(c, 'xs', 100) + '<div class="mr-m"><div class="mr-t"><b>' + esc(c.name) + '</b></div><div class="mr-b"><div class="mr-l"><span>' + esc(c.jobTitle || '') + '</span></div></div></div><span class="mp-chk">' + ic('check') + '</span></div>';
      }).join('') || '<div class="mp-empty">همکاری پیدا نشد.</div>';
      var n = Object.keys(sel).length; btn.disabled = !n; $('span', btn).textContent = n ? 'ارسال (' + fa(n) + ')' : 'ارسال';
    }
    draw(); inp.oninput = draw;
    list.onclick = function (e) { var r = e.target.closest('.mr'); if (!r) return; var id = r.dataset.id; if (sel[id]) delete sel[id]; else sel[id] = 1; draw(); };
    ov.onclick = function (e) { if (e.target === ov || e.target.closest('[data-x]')) closeOv(); };
    btn.onclick = function () { var ids = Object.keys(sel); closeOv(); forwardTo(m, ids); };
    if (!isMobile()) inp.focus();
  }
  function forwardTo(m, ids) {
    var be = S.be, ok = 0, bad = 0;
    snack('در حال ارسال…');
    var chain = Promise.resolve();
    ids.forEach(function (id) {
      var c = S.byId[id]; if (!c) return;
      chain = chain.then(function () {
        if (m.type === 'text') return be.send(me(), c, pack(m.body, { fw: 1 }));
        if (be === GAS) return be.send(me(), c, FILE_TAG + JSON.stringify({ n: m.name, u: m.url, s: m.size || 0 }));
        return fetch(m.url).then(function (r) { if (!r.ok) throw new Error('dl'); return r.blob(); }).then(function (b) {
          return be.sendFile(me(), c, new File([b], m.name || 'file', { type: m.mime || b.type || 'application/octet-stream' }));
        });
      }).then(function () { ok++; }).catch(function () { bad++; });
    });
    chain.then(function () {
      snack(bad ? 'ارسال به ' + fa(ok) + ' نفر انجام شد، ' + fa(bad) + ' مورد ناموفق بود' : 'برای ' + fa(ok) + ' نفر ارسال شد ✓');
      if (S.contact && ids.indexOf(S.contact.id) !== -1) refreshThread(true);
      loadContacts(false);
    });
  }

  // ---------- نمایشگر تصویر ----------
  function openLB(m) {
    closeLB();
    var imgs = S.items.concat(S.tmps.filter(function (t) { return S.contact && t.cid === S.contact.id; })).filter(isImgItem);
    var i = imgs.indexOf(m); if (i < 0) return;
    var el = document.createElement('div'); el.className = 'mp-lb';
    function draw() {
      var it = imgs[i], url = it.blob || it.url;
      el.innerHTML = '<div class="bar"><button type="button" class="mp-ib" data-x="1" aria-label="بستن">' + ic('close') + '</button>' +
        '<div class="mp-who"><b>' + esc(it.name || 'تصویر') + '</b><span>' + esc(dayLabel(it.time) + ' · ' + timeText(it.time)) + '</span></div>' +
        '<button type="button" class="mp-ib" data-s="1" aria-label="اشتراک‌گذاری">' + ic('share') + '</button>' +
        '<a class="mp-ib" href="' + esc(url) + '" download="' + esc(it.name || 'image') + '" target="_blank" rel="noopener" aria-label="دانلود">' + ic('dl') + '</a></div>' +
        '<div class="stage">' + (imgs.length > 1 ? '<button type="button" class="nv p" data-n="-1" aria-label="قبلی">' + ic('back') + '</button><button type="button" class="nv n" data-n="1" aria-label="بعدی"><svg class="ic" style="transform:scaleX(-1)"><use href="#mi-back"/></svg></button>' : '') + '<img src="' + esc(url) + '" alt=""></div>';
    }
    draw();
    el.onclick = function (e) {
      if (e.target.closest('[data-x]')) return closeLB(true);
      if (e.target.closest('[data-s]')) return shareItem(imgs[i]);
      var n = e.target.closest('[data-n]'); if (n) { i = (i + (+n.dataset.n) + imgs.length) % imgs.length; draw(); return; }
      if (e.target.classList.contains('stage')) closeLB(true);
    };
    var sx = 0; el.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
    el.addEventListener('touchend', function (e) { var dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 70 && imgs.length > 1) { i = (i + (dx > 0 ? -1 : 1) + imgs.length) % imgs.length; draw(); } }, { passive: true });
    R.app.appendChild(el); S.lb = el; S.lbKey = function (d) { i = (i + d + imgs.length) % imgs.length; draw(); };
    if (isMobile()) pushHist();
  }
  function closeLB(popIt) { if (S.lb) { S.lb.remove(); S.lb = null; if (popIt && isMobile()) popHist(); } }
  function openAvatar(c) {
    var url = photoOf(c); if (!url) return;
    closeLB();
    var el = document.createElement('div'); el.className = 'mp-lb';
    el.innerHTML = '<div class="bar"><button type="button" class="mp-ib" data-x="1" aria-label="بستن">' + ic('close') + '</button><div class="mp-who"><b>' + esc(c.name) + '</b><span>' + esc(c.jobTitle || '') + '</span></div></div><div class="stage"><img src="' + esc(url) + '" alt="" style="border-radius:50%;max-width:min(80%,420px);aspect-ratio:1;object-fit:cover"></div>';
    el.onclick = function (e) { if (e.target.closest('[data-x]') || e.target.classList.contains('stage')) closeLB(true); };
    R.app.appendChild(el); S.lb = el; if (isMobile()) pushHist();
  }

  // ---------- تنظیمات و میانبرها ----------
  function openSettings(ev) {
    var r = ev.currentTarget.getBoundingClientRect();
    var perm = ('Notification' in window) ? Notification.permission : 'denied';
    var items = [
      { ic: S.mute ? 'bellx' : 'bell', label: 'صدای اعلان', sub: S.mute ? 'خاموش' : 'روشن', fn: function () { S.mute = !S.mute; save('sahel_msgr_mute', S.mute); snack(S.mute ? 'صدا خاموش شد' : 'صدا روشن شد'); if (!S.mute) beep('in'); } }
    ];
    if ('Notification' in window && !window.SahelNative) items.push({ ic: 'bell', label: 'اعلان روی دسکتاپ', sub: perm === 'granted' ? 'فعال' : (perm === 'denied' ? 'مسدود' : 'فعال‌سازی'), fn: function () { requestNotif(true); } });
    items.push({ ic: S.be === SB ? 'cloud' : 'bolt', label: S.be === SB ? 'رفتن به موتور گوگل' : 'رفتن به موتور سریع', sub: S.be === SB ? 'سریع ⚡' : 'گوگل ☁', fn: function () { save('sahel_msgr_be', S.be === SB ? 'gas' : 'sb'); if (S.contact) closeThread(); setBackend(pickBackend(), false); } });
    items.push({ hr: 1 }, { ic: 'kb', label: 'میانبرهای صفحه‌کلید', fn: openKeys });
    showMenu(items, { x: Math.max(8, r.left), y: r.bottom + 6 }, {});
  }
  function openKeys() {
    closeOv();
    var rows = [['باز و بسته کردن پیام‌رسان', ['Alt', 'M']], ['جستجوی همکاران', ['Ctrl', 'K']], ['گفتگوی بعدی / قبلی', ['Alt', '↓ / ↑']],
      ['پیوست فایل', ['Alt', 'A']], ['ایموجی', ['Alt', 'E']], ['پاسخ به آخرین پیام', ['Alt', 'R']], ['ارسال پیام', ['Enter']], ['خط جدید', ['Shift', 'Enter']],
      ['بازگشت / بستن', ['Esc']], ['چسباندن عکس از کلیپ‌بورد', ['Ctrl', 'V']]];
    var ov = document.createElement('div'); ov.className = 'mp-ov';
    ov.innerHTML = '<div class="mp-card"><div class="mp-hd"><button type="button" class="mp-ib" data-x="1" aria-label="بستن">' + ic('close') + '</button><h2>میانبرهای صفحه‌کلید</h2></div><div class="mp-keys">' +
      rows.map(function (r) { return '<div><b style="font-weight:600">' + r[0] + '</b><span>' + r[1].map(function (k) { return '<kbd>' + k + '</kbd>'; }).join('+') + '</span></div>'; }).join('') + '</div></div>';
    ov.onclick = function (e) { if (e.target === ov || e.target.closest('[data-x]')) closeOv(); };
    R.app.appendChild(ov);
  }

  // ---------- اعلان‌ها ----------
  var actx = null;
  function beep(kind) {
    if (S.mute) return;
    try {
      var C = window.AudioContext || window.webkitAudioContext; if (!C) return;
      actx = actx || new C(); if (actx.state === 'suspended') actx.resume();
      var t = actx.currentTime;
      function tone(f, st, d, v) {
        var o = actx.createOscillator(), g = actx.createGain(); o.type = 'sine'; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, st); g.gain.exponentialRampToValueAtTime(v, st + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, st + d);
        o.connect(g); g.connect(actx.destination); o.start(st); o.stop(st + d + 0.02);
      }
      if (kind === 'in') { tone(880, t, 0.12, 0.07); tone(1318, t + 0.1, 0.2, 0.06); } else { tone(620, t, 0.07, 0.035); }
    } catch (e) {}
  }
  function askNotif() { if (S.asked) return; S.asked = true; save('sahel_msgr_asked', 1); requestNotif(false); }
  function requestNotif(manual) {
    try {
      if (!('Notification' in window)) return;
      if (Notification.permission === 'default') Notification.requestPermission(function () { if (manual) snack('اعلان دسکتاپ فعال شد'); });
      else if (manual) snack(Notification.permission === 'granted' ? 'اعلان دسکتاپ فعال است' : 'اعلان در تنظیمات مرورگر مسدود شده است');
    } catch (e) {}
  }
  function sysNotify(c, text) {
    try {
      if (!('Notification' in window) || Notification.permission !== 'granted') return;
      if (!document.hidden && document.hasFocus()) return;
      var n = new Notification(c.name, { body: text, tag: 'sahel-msg-' + c.id, icon: 'assets/icon-192.png', renotify: true });
      if (n) n.onclick = function () { try { window.focus(); } catch (e) {} openChat(c.id); if (n.close) n.close(); };
    } catch (e) {}
  }
  function alertNew(c, text, n) {
    text = text || 'پیام جدید';
    beep('in'); vib(25); wiggle(); sysNotify(c, text);
    if (!(S.open && !S.contact && !document.hidden)) toast(c, text, n);
  }
  function wiggle() {
    var b = document.getElementById('chatBtn'); if (!b) return;
    b.classList.remove('msgr-wig'); void b.offsetWidth; b.classList.add('msgr-wig'); setTimeout(function () { b.classList.remove('msgr-wig'); }, 900);
  }
  function toast(c, text, n) {
    build();
    var ex = R.toasts.querySelector('.msgr-nt[data-c="' + c.id + '"]');
    if (ex) {
      ex.querySelector('.pv').textContent = text; ex.querySelector('em').textContent = n > 1 ? fa(n) + ' پیام' : '';
      var bar = ex.querySelector('.bar'); bar.style.animation = 'none'; void bar.offsetWidth; bar.style.animation = '';
      clearTimeout(ex._t); ex._t = setTimeout(function () { dismiss(ex); }, 6000); return;
    }
    var el = document.createElement('div'); el.className = 'msgr-nt'; el.dataset.c = c.id; el.setAttribute('role', 'alert');
    el.innerHTML = avatar(c, 'sm', 120) + '<div class="tx"><b><span class="nm">' + esc(c.name) + '</span><em>' + (n > 1 ? fa(n) + ' پیام' : '') + '</em></b><span class="pv">' + esc(text) + '</span></div>' +
      '<button type="button" class="go">پاسخ</button><button type="button" class="cl" aria-label="بستن"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button><i class="bar"></i>';
    el.onclick = function (e) { if (e.target.closest('.cl')) { dismiss(el); return; } dismiss(el); openChat(c.id); };
    var sx = 0, sy = 0;
    el.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
    el.addEventListener('touchend', function (e) { var dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy; if (Math.abs(dx) > 60 || dy < -30) { S.noClick = Date.now(); dismiss(el); } }, { passive: true });
    R.toasts.insertBefore(el, R.toasts.firstChild);
    while (R.toasts.children.length > 3) dismiss(R.toasts.lastChild);
    el._t = setTimeout(function () { dismiss(el); }, 6000);
  }
  function dismiss(el) { if (!el || el._gone) return; el._gone = true; clearTimeout(el._t); el.classList.add('out'); setTimeout(function () { el.remove(); }, 260); }

  function updateBadges() {
    var n = S.total || 0, el = document.getElementById('chatBadge'), btn = document.getElementById('chatBtn'), fb = document.getElementById('fileBadge');
    if (fb) fb.style.display = 'none';
    if (el) { if (n > 0) { el.style.display = 'flex'; el.textContent = n > 99 ? fa(99) + '+' : fa(n); } else el.style.display = 'none'; }
    if (btn) { btn.classList.toggle('has-unread', n > 0); btn.title = n > 0 ? 'پیام‌رسان — ' + fa(n) + ' پیام جدید (Alt+M)' : 'پیام‌رسان (Alt+M)'; }
    var base = document.title.replace(/^\([\d۰-۹]+\)\s*/, ''); document.title = (n > 0 ? '(' + fa(n) + ') ' : '') + base;
    decorateMembers();
  }
  function decorateMembers() {
    var list = document.getElementById('membersList'); if (!list) return;
    var rows = list.querySelectorAll('.member-row');
    Array.prototype.forEach.call(rows, function (row) {
      var id = String(row.dataset.id || ''), b = row.querySelector('.msgr-mb');
      if (id === me()) { if (b) b.remove(); return; }
      if (!b) {
        b = document.createElement('button'); b.type = 'button'; b.className = 'msgr-mb'; b.title = 'ارسال پیام';
        b.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5C21 16.2 16.97 20 12 20c-1.14 0-2.23-.2-3.23-.56L4 20.5l1.3-3.9A7.7 7.7 0 014 12.1C4 7.4 8.03 3.6 12 3.6c4.97 0 9 3.2 9 7.9z"/></svg><i></i>';
        b.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); if (typeof closeAllPanels === 'function') { try { closeAllPanels(); } catch (x) {} } openChat(id); });
        row.appendChild(b);
      }
      var c = S.byId[id], u = c ? c.unread || 0 : 0;
      b.classList.toggle('has', u > 0); b.querySelector('i').textContent = u ? fa(u > 99 ? '99+' : u) : '';
    });
  }

  // ---------- لحظه‌ای ----------
  var kT = {};
  function kick(name, fn, ms) { clearTimeout(kT[name]); kT[name] = setTimeout(fn, ms); }
  function onRT(ev) {
    if (ev.type !== 'change') return;
    var r = ev.record || {}, uid = me(); if (!uid) return;
    var fromMe = String(r.sender_id) === uid, toMe = String(r.receiver_id) === uid;
    if (ev.op === 'INSERT') {
      if (toMe) onIncoming(String(r.sender_id), ev.table === 'kt_files' ? '📎 ' + (r.file_name || 'فایل') : previewStr(r.text));
      if (S.contact && ((toMe && String(r.sender_id) === S.contact.id) || (fromMe && String(r.receiver_id) === S.contact.id))) kick('t', function () { refreshThread(false); }, 80);
    } else if (ev.op === 'UPDATE') {
      if (fromMe && S.contact && String(r.receiver_id) === S.contact.id) kick('t', function () { refreshThread(false); }, 150);
    }
    kick('c', function () { if (S.open) loadContacts(false); else pollBadge(true); }, 350);
  }
  function onIncoming(cid, text) {
    var viewing = S.open && S.contact && S.contact.id === cid && !document.hidden;
    if (viewing) { beep('in'); return; }
    S.notified[cid] = (S.notified[cid] || 0) + 1;
    var n = S.notified[cid], c = S.byId[cid];
    if (c) { alertNew(c, text, n); return; }
    loadContacts(false).then(function () { alertNew(S.byId[cid] || { id: cid, name: 'همکار' }, text, n); });
  }
  function pollBadge(force) {
    if (!me()) return;
    var be = S.be, now = Date.now();
    if (!be.ready()) return;
    if (!force && now - S.lastBadge < (rtLive() ? 45000 : be.badgeMs)) return;
    S.lastBadge = now;
    be.unread().then(function (n) {
      if (S.be !== be) return;
      var prev = S.total; S.total = n; updateBadges();
      if (n !== prev && !S.open) loadContacts(false);
    }).catch(function () {});
  }
  setInterval(function () {
    if (document.hidden || !me()) return;
    var now = Date.now(), be = S.be, live = rtLive();
    if (S.open) {
      if (S.contact && now - S.lastThread > (live ? 15000 : be.pollMs)) refreshThread(false);
      if (now - S.lastList > (live ? 30000 : be.listMs)) loadContacts(false);
    } else pollBadge(false);
  }, 1000);
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) return;
    if (S.open) { if (S.contact) refreshThread(false); loadContacts(false); } else pollBadge(true);
  });

  // ---------- کیبورد موبایل ----------
  function vv() {
    var v = window.visualViewport; if (!v || !R.root) return;
    R.root.style.setProperty('--m-vh', v.height + 'px'); R.root.style.setProperty('--m-top', v.offsetTop + 'px');
    if (S.open && S.contact && S.stick) setTimeout(scrollBottom, 30);
  }

  // ---------- رویدادها ----------
  function isTyping(el) { return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable); }
  function escLayer() {
    if (S.menu) { closeMenu(); return true; }
    if (S.pop) { closePop(); return true; }
    if ($('.mp-ov', R.root)) { closeOv(); return true; }
    if (S.lb) { closeLB(true); return true; }
    if (S.reply) { S.reply = null; renderReply(); return true; }
    if (S.contact) { closeThread(); if (isMobile()) { /* تاریخچه سر جایش می‌ماند */ } return true; }
    return false;
  }

  function bind() {
    var root = R.root;
    $('#mpBd', root).onclick = function () { close(); };
    $('#mpClose', root).onclick = function () { close(); };
    $('#mpBack', root).onclick = function () { closeThread(); };
    $('#mpMenu', root).onclick = openSettings;
    $('.mp-fl', root).onclick = function (e) { var b = e.target.closest('.mp-chip'); if (!b) return; S.filter = b.dataset.f; Array.prototype.forEach.call(root.querySelectorAll('.mp-chip'), function (x) { x.classList.toggle('on', x === b); }); renderList(); };
    R.q.oninput = renderList;
    R.q.addEventListener('keydown', function (e) { if (e.key === 'Enter') { var r = visibleContacts()[0]; if (r) openThread(r); } if (e.key === 'ArrowDown') { var f = R.list.querySelector('.mr'); if (f) { e.preventDefault(); f.focus(); } } });
    R.list.onclick = function (e) {
      if (e.target.closest('[data-retry]')) { loadContacts(true); return; }
      var r = e.target.closest('.mr'); if (r && S.byId[r.dataset.id]) openThread(S.byId[r.dataset.id]);
    };
    R.list.onkeydown = function (e) {
      var r = e.target.closest('.mr'); if (!r) return;
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (S.byId[r.dataset.id]) openThread(S.byId[r.dataset.id]); }
      else if (e.key === 'ArrowDown' && r.nextElementSibling) { e.preventDefault(); r.nextElementSibling.focus(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); if (r.previousElementSibling && r.previousElementSibling.classList.contains('mr')) r.previousElementSibling.focus(); else R.q.focus(); }
    };
    $('#mpTAv', root).onclick = function () { if (S.contact) openAvatar(S.contact); };

    // نوشتن
    R.in.addEventListener('input', function () { autosize(); updateSend(); draftSoon(); });
    R.in.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.isComposing && ((!e.shiftKey && !isTouch()) || e.ctrlKey || e.metaKey)) { e.preventDefault(); doSend(); }
    });
    R.in.addEventListener('paste', function (e) {
      var fs = e.clipboardData && e.clipboardData.files; if (fs && fs.length) { e.preventDefault(); addFiles(fs); }
    });
    R.send.onclick = doSend;
    R.rep.onclick = function (e) { if (e.target.closest('.x')) { S.reply = null; renderReply(); R.in.focus(); } };
    R.tray.onclick = function (e) { var b = e.target.closest('.x'); if (!b) return; var a = S.att.splice(+b.dataset.i, 1)[0]; if (a && a.url) try { URL.revokeObjectURL(a.url); } catch (x) {} renderTray(); updateSend(); };
    $('#mpAtt', root).onclick = function () { togglePop('att'); };
    $('#mpEmo', root).onclick = function () { togglePop('emo'); };
    R.comp.addEventListener('click', function (e) {
      var p = e.target.closest('[data-p]'), em = e.target.closest('[data-e]');
      if (p) { closePop(); $(p.dataset.p === 'doc' ? '#mpFDoc' : p.dataset.p === 'img' ? '#mpFImg' : '#mpFCam', root).click(); }
      if (em) { insertAtCaret(em.dataset.e); if (!isTouch()) R.in.focus(); }
    });
    ['mpFDoc', 'mpFImg', 'mpFCam'].forEach(function (id) { var el = document.getElementById(id); el.onchange = function () { addFiles(el.files); el.value = ''; }; });
    root.addEventListener('mousedown', function (e) {
      if (S.pop && !e.target.closest('.mp-pop') && !e.target.closest('#mpAtt') && !e.target.closest('#mpEmo')) closePop();
      if (S.menu && !e.target.closest('.mp-menu')) closeMenu();
    });

    // کشیدن و رها کردن فایل
    var dc = 0;
    R.thread.addEventListener('dragenter', function (e) { if (e.dataTransfer && Array.prototype.indexOf.call(e.dataTransfer.types || [], 'Files') !== -1) { dc++; R.drop.classList.add('on'); } });
    R.thread.addEventListener('dragover', function (e) { e.preventDefault(); });
    R.thread.addEventListener('dragleave', function () { dc = Math.max(0, dc - 1); if (!dc) R.drop.classList.remove('on'); });
    R.thread.addEventListener('drop', function (e) { e.preventDefault(); dc = 0; R.drop.classList.remove('on'); addFiles(e.dataTransfer && e.dataTransfer.files); });

    // پیام‌ها
    R.msgs.addEventListener('scroll', function () { S.stick = nearBottom(); if (S.stick) S.newBelow = 0; updateFab(); }, { passive: true });
    R.msgs.addEventListener('load', function (e) { if (e.target.tagName === 'IMG' && S.stick) scrollBottom(); }, true);
    R.fab.onclick = function () { scrollBottom(); R.msgs.scrollTo ? R.msgs.scrollTo({ top: R.msgs.scrollHeight, behavior: 'smooth' }) : 0; };
    R.msgs.addEventListener('click', function (e) {
      if (Date.now() - S.noClick < 600) return;
      var b = e.target.closest('.mb'); if (!b) return;
      var act = e.target.closest('[data-act]'), m = itemByKey(b.dataset.k);
      if (!act || !m) return;
      var a = act.dataset.act;
      if (a === 'menu') { e.preventDefault(); e.stopPropagation(); var r = act.getBoundingClientRect(); openMsgMenu(b, { x: r.left, y: r.bottom + 4 }, false); }
      else if (a === 'view') openLB(m);
      else if (a === 'jump') jumpTo(act.dataset.k);
      else if (a === 'retry') { e.preventDefault(); retry(m); }
    });
    R.msgs.addEventListener('contextmenu', function (e) {
      var b = e.target.closest('.mb'); if (!b) return;
      e.preventDefault(); openMsgMenu(b, { x: e.clientX, y: e.clientY }, false);
    });
    R.msgs.addEventListener('dblclick', function (e) { var b = e.target.closest('.mb'); if (b && !window.getSelection().toString()) { var m = itemByKey(b.dataset.k); if (m && !m.tmp) startReply(m); } });
    bindGestures();
    if (window.visualViewport) { window.visualViewport.addEventListener('resize', vv); window.visualViewport.addEventListener('scroll', vv); }
    window.addEventListener('resize', function () { if (S.open && !isMobile()) { R.root.style.removeProperty('--m-vh'); R.root.style.removeProperty('--m-top'); } });
  }

  function jumpTo(k) {
    var kids = R.msgs.children;
    for (var i = 0; i < kids.length; i++) {
      if (kids[i].dataset && kids[i].dataset.k === k) {
        kids[i].scrollIntoView({ block: 'center', behavior: 'smooth' }); kids[i].classList.remove('flash'); void kids[i].offsetWidth; kids[i].classList.add('flash'); return;
      }
    }
    snack('پیام اصلی پیدا نشد');
  }

  // ---------- لمس: کشیدن برای پاسخ، نگه‌داشتن برای گزینه‌ها، کشیدن از لبه برای بازگشت ----------
  function bindGestures() {
    var st = null, lp = null;
    function cancelLP() { if (lp) { clearTimeout(lp); lp = null; } }
    R.msgs.addEventListener('touchstart', function (e) {
      if (e.touches.length !== 1) { st = null; return; }
      var t = e.touches[0], b = e.target.closest && e.target.closest('.mb');
      st = { x: t.clientX, y: t.clientY, b: b, drag: false, hit: false, ind: null, edge: t.clientX > window.innerWidth - 26 };
      cancelLP();
      if (b) lp = setTimeout(function () { lp = null; if (st && !st.drag) { S.noClick = Date.now(); vib(14); var pt = { x: st.x, y: st.y }; st = null; openMsgMenu(b, pt, true); } }, 430);
    }, { passive: true });
    R.msgs.addEventListener('touchmove', function (e) {
      if (!st) return;
      var t = e.touches[0], dx = t.clientX - st.x, dy = t.clientY - st.y;
      if (!st.drag) {
        if (Math.abs(dy) > 9) { cancelLP(); st = null; return; }
        if (Math.abs(dx) > 10) {
          cancelLP();
          if (Math.abs(dx) > Math.abs(dy) * 1.4 && st.b && !st.edge) {
            st.drag = true; st.b.style.transition = 'none';
            st.ind = document.createElement('span'); st.ind.className = 'mb-rp'; st.ind.innerHTML = ic('reply', 's'); st.b.appendChild(st.ind);
          } else { st = null; return; }
        }
      }
      if (st && st.drag) {
        e.preventDefault();
        var d = Math.max(-84, Math.min(84, dx * 0.7)), p = Math.min(1, Math.abs(d) / 54);
        st.b.style.transform = 'translateX(' + d + 'px)';
        st.ind.style[d > 0 ? 'left' : 'right'] = '-46px'; st.ind.style[d > 0 ? 'right' : 'left'] = 'auto'; st.ind.style.opacity = p; st.ind.style.transform = 'scale(' + (0.6 + 0.4 * p) + ')';
        if (p >= 1 && !st.hit) { st.hit = true; vib(10); } else if (p < 1) st.hit = false;
      }
    }, { passive: false });
    function end() {
      cancelLP();
      if (st && st.drag) {
        var b = st.b, hit = st.hit, ind = st.ind;
        b.style.transition = 'transform .2s ease'; b.style.transform = '';
        setTimeout(function () { b.style.transition = ''; if (ind) ind.remove(); }, 220);
        if (hit) { S.noClick = Date.now(); var m = itemByKey(b.dataset.k); if (m && !m.tmp) startReply(m); }
      }
      st = null;
    }
    R.msgs.addEventListener('touchend', end, { passive: true });
    R.msgs.addEventListener('touchcancel', end, { passive: true });

    // کشیدن از لبهٔ راست به چپ = بازگشت به فهرست (فقط موبایل)
    var eg = null;
    R.thread.addEventListener('touchstart', function (e) { var t = e.touches[0]; eg = isMobile() && t.clientX > window.innerWidth - 26 ? { x: t.clientX, y: t.clientY } : null; }, { passive: true });
    R.thread.addEventListener('touchend', function (e) {
      if (!eg) return; var t = e.changedTouches[0];
      if (t.clientX - eg.x < -70 && Math.abs(t.clientY - eg.y) < 70) closeThread();
      eg = null;
    }, { passive: true });
  }

  // ---------- اتصال به صفحه ----------
  function setup() {
    var c = document.getElementById('chatBtn'), f = document.getElementById('fileTransferBtn');
    if (c) c.title = 'پیام‌رسان (Alt+M)';
    document.addEventListener('click', function (e) {
      var icn = e.target.closest && e.target.closest('#chatBtn,#fileTransferBtn');
      if (!icn) return;
      e.preventDefault(); e.stopPropagation();
      if (S.open) { close(); return; }
      if (typeof closeAllPanels === 'function') { try { closeAllPanels(); } catch (x) {} }
      openPanel(ICON_BACKEND[icn.id] === 'gas' ? 'gas' : null, { reset: true });
    }, true);
    document.addEventListener('keydown', function (e) {
      if ((e.key === 'Enter' || e.key === ' ') && e.target && e.target.id === 'chatBtn') { e.preventDefault(); e.stopPropagation(); toggle(); }
    }, true);
    document.addEventListener('keydown', function (e) {
      if (e.altKey && !e.ctrlKey && !e.metaKey && e.code === 'KeyM') { e.preventDefault(); toggle(); return; }
      if (!S.open) return;
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); if (!escLayer()) close(); return; }
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyK') { e.preventDefault(); if (S.contact && isMobile()) closeThread(); R.q.focus(); R.q.select(); return; }
      if (e.altKey && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) { e.preventDefault(); stepChat(e.key === 'ArrowDown' ? 1 : -1); return; }
      if (e.altKey && e.code === 'KeyA' && S.contact) { e.preventDefault(); togglePop('att'); return; }
      if (e.altKey && e.code === 'KeyE' && S.contact) { e.preventDefault(); togglePop('emo'); return; }
      if (e.altKey && e.code === 'KeyR' && S.contact) {
        e.preventDefault();
        for (var i = S.items.length - 1; i >= 0; i--) if (!S.items[i].mine) { startReply(S.items[i]); break; }
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === '/') { e.preventDefault(); openKeys(); return; }
      if (S.lb && S.lbKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) { e.preventDefault(); S.lbKey(e.key === 'ArrowLeft' ? 1 : -1); return; }
      if (e.key === '/' && !isTyping(e.target) && !e.ctrlKey && !e.altKey) { e.preventDefault(); R.q.focus(); }
    }, true);

    // لحظه‌ای
    try { if (window.SahelSB && window.SahelSB.configured) window.SahelSB.onChange(onRT); } catch (e) {}

    // کارتابل اعضا: دکمهٔ پیام و شمارندهٔ نخوانده روی هر عضو
    var ml = document.getElementById('membersList');
    if (ml && window.MutationObserver) new MutationObserver(function () { decorateMembers(); }).observe(ml, { childList: true });

    // گرم کردن: لیست همکاران و شمارنده، بدون اینکه کاربر منتظر بماند
    setTimeout(function () {
      if (!me()) return;
      S.be = pickBackend(); S.act = load(KA()) || {}; S.drafts = load(KD()) || {};
      var cc = load(KC()); if (cc && cc.length) { S.contacts = cc; indexContacts(); S.total = sumUnread(); updateBadges(); }
      if (S.be.ready()) loadContacts(false);
    }, 1200);
    window.SahelMessenger = { open: openChat, openPanel: function () { openPanel(null, { reset: true }); }, close: close, toggle: toggle };
  }

  // پیام‌رسان قدیمی داخل dashboard.js دیگر استفاده نمی‌شود؛ تماس‌های سنگین و تکراری آن به Apps Script متوقف می‌شود
  ['loadChatContacts', 'loadFiles', 'startMessengerPolling'].forEach(function (n) { try { window[n] = function () { return Promise.resolve(); }; } catch (e) {} });
  window.updateChatBadge = function () {};
  window.updateFileBadge = function () {};

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup); else setup();
})();
