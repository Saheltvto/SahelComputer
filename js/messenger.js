/* ساحل — پیام‌رسان کوچک و یکپارچه (گفتگو + لینک + فایل) با دو موتور:
   «سریع» (Supabase) و «گوگل» (Apps Script). آیکن 💬 موتور سریع و آیکن 🔔 موتور گوگل را باز می‌کند.
   بعد از dashboard.js بارگذاری می‌شود. */
(function () {
  'use strict';

  var ICON_BACKEND = { chatBtn: 'sb', fileTransferBtn: 'gas' };   // برای عوض کردن جای دو آیکن اینجا را عوض کنید
  var FILE_TAG = '[[FILE]]';
  var MAX_GAS_FILE = 8 * 1024 * 1024;

  // ---------- ابزار ----------
  function $(s, r) { return (r || document).querySelector(s); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function fa(n) { return String(n).replace(/\d/g, function (d) { return '۰۱۲۳۴۵۶۷۸۹'[d]; }); }
  function me() { return (typeof sahelUser !== 'undefined' && sahelUser) ? String(sahelUser.id) : null; }
  function sizeText(b) { if (!b) return ''; return b > 1048576 ? fa((b / 1048576).toFixed(1)) + ' MB' : fa(Math.max(1, Math.round(b / 1024))) + ' KB'; }
  function timeText(t) { var d = new Date(t); return isNaN(d) ? '' : d.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }); }
  function dayText(t) { var d = new Date(t); return isNaN(d) ? '' : d.toLocaleDateString('fa-IR', { month: 'long', day: 'numeric' }); }
  function dayKey(t) { var d = new Date(t); return isNaN(d) ? '' : d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate(); }
  function linkify(text) {
    return esc(text).replace(/(https?:\/\/[^\s<]*[^\s<.,;:!?)\]}"'،؛])/g, function (u) {
      return '<a href="' + u + '" target="_blank" rel="noopener">' + u + '</a>';
    }).replace(/\n/g, '<br>');
  }
  function parseFileMsg(text) {
    if (typeof text !== 'string' || text.indexOf(FILE_TAG) !== 0) return null;
    try { var o = JSON.parse(text.slice(FILE_TAG.length)); return o && o.u ? o : null; } catch (e) { return null; }
  }
  function previewText(t) { var f = parseFileMsg(t); return f ? '📎 ' + (f.n || 'فایل') : String(t || ''); }
  function extOf(n) { var m = String(n || '').match(/\.([A-Za-z0-9]+)$/); return m ? m[1].toLowerCase() : ''; }
  function fileKind(n) {
    var e = extOf(n);
    if (e === 'pdf') return { c: '#d0482f', t: 'PDF' };
    if (e === 'xls' || e === 'xlsx' || e === 'csv') return { c: '#1b9b6b', t: 'XLS' };
    if (/^(png|jpe?g|gif|webp)$/.test(e)) return { c: '#2f7fd0', t: 'IMG' };
    if (e === 'doc' || e === 'docx') return { c: '#2f5fd0', t: 'DOC' };
    return { c: '#6b8583', t: (e || 'FILE').slice(0, 4).toUpperCase() };
  }
  function toB64(file) {
    return new Promise(function (res, rej) {
      var r = new FileReader();
      r.onload = function () { res(String(r.result).split(',')[1] || ''); };
      r.onerror = function () { rej(new Error('خواندن فایل ناموفق بود')); };
      r.readAsDataURL(file);
    });
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
                   last: previewText(u.lastMessage), unread: Number(u.unreadCount) || 0 };
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
          if (f) { seen[f.u] = 1; items.push({ key: 'g' + m.time + i, mine: mine, type: 'file', name: f.n, url: f.u, size: f.s, time: m.time }); }
          else items.push({ key: 'g' + m.time + i, mine: mine, type: 'text', text: m.text, time: m.time });
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
      if (file.size > MAX_GAS_FILE) return Promise.reject(new Error('حجم فایل بیشتر از ۸ مگابایت است (در موتور گوگل)'));
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
    sendFile: function (uid, c, file) { return window.SahelSB.sendFile(uid, c.id, file); },
    markRead: function (uid, c) { return window.SahelSB.markRead(uid, c.id); },
    unread: function () { return window.SahelSB.unread().then(function (r) { return r.chat + r.files; }); }
  };

  var BE = { sb: SB, gas: GAS };

  // ---------- وضعیت ----------
  var S = { be: SB, open: false, contact: null, contacts: [], items: [], sig: '', files: [], sending: false, anchor: null, lastList: 0, lastBadge: { sb: 0, gas: 0 } };
  var panel, listEl, msgsEl, inputEl, chipsEl, statusEl, titleEl;

  // ---------- ظاهر ----------
  var CSS = '\
.msgr{position:fixed;z-index:520;display:none;flex-direction:column;width:380px;height:560px;max-height:calc(100vh - 90px);background:var(--glass-bg-strong,#fff);backdrop-filter:blur(26px) saturate(1.6);-webkit-backdrop-filter:blur(26px) saturate(1.6);border:1px solid var(--glass-border,#e0eaea);border-radius:20px;box-shadow:var(--glass-shadow,0 8px 32px rgba(11,61,66,.18)),0 20px 50px rgba(11,61,66,.18);overflow:hidden;color:var(--text,#0B3D42);font-family:inherit;text-align:right;direction:rtl;animation:msgrPop .25s cubic-bezier(.34,1.4,.64,1)}\
.msgr.on{display:flex}\
@keyframes msgrPop{from{opacity:0;transform:translateY(-10px) scale(.96)}to{opacity:1;transform:none}}\
.msgr-head{display:flex;align-items:center;gap:8px;padding:12px 14px;background:linear-gradient(135deg,var(--deep,#0B3D42),var(--teal,#14808A));color:#fff;flex:none}\
.msgr-head b{font-size:15px;font-weight:700;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\
.msgr-ib{background:rgba(255,255,255,.16);border:0;color:#fff;width:32px;height:32px;border-radius:10px;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;flex:none;padding:0}\
.msgr-ib:hover{background:rgba(255,255,255,.28)}\
.msgr-seg{display:flex;background:rgba(0,0,0,.22);border-radius:10px;padding:2px;flex:none}\
.msgr-seg button{border:0;background:transparent;color:rgba(255,255,255,.75);font:600 11.5px inherit;font-family:inherit;padding:5px 10px;border-radius:8px;cursor:pointer}\
.msgr-seg button.on{background:#fff;color:var(--deep,#0B3D42)}\
.msgr-body{flex:1;min-height:0;display:flex;flex-direction:column}\
.msgr-search{margin:10px 12px 6px;padding:9px 12px;border:1px solid var(--border,#e0eaea);border-radius:12px;background:var(--bg-light,#f6fafa);color:inherit;font:13px inherit;font-family:inherit;outline:0}\
.msgr-search:focus{border-color:var(--accent,#2FB8A6)}\
.msgr-list{flex:1;overflow-y:auto;padding:2px 6px 8px}\
.msgr-row{display:flex;align-items:center;gap:10px;padding:9px 8px;border-radius:12px;cursor:pointer}\
.msgr-row:hover{background:var(--bg-accent,#eaf6f4)}\
.msgr-av{width:40px;height:40px;border-radius:50%;flex:none;background:linear-gradient(135deg,var(--accent,#2FB8A6),var(--teal,#14808A));color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;overflow:hidden}\
.msgr-av img{width:100%;height:100%;object-fit:cover}\
.msgr-info{flex:1;min-width:0}\
.msgr-info b{display:block;font-size:14px;font-weight:600}\
.msgr-info span{display:block;font-size:12px;color:var(--text-muted,#7f9a9c);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px}\
.msgr-dot{background:var(--accent,#2FB8A6);color:#06302c;font-size:11px;font-weight:700;min-width:20px;height:20px;border-radius:10px;display:flex;align-items:center;justify-content:center;padding:0 6px;flex:none}\
.msgr-empty{padding:30px 18px;text-align:center;color:var(--text-muted,#7f9a9c);font-size:13px;line-height:2}\
.msgr-empty button{margin-top:8px;border:0;background:var(--accent,#2FB8A6);color:#06302c;font:700 13px inherit;font-family:inherit;padding:8px 16px;border-radius:10px;cursor:pointer}\
.msgr-msgs{flex:1;overflow-y:auto;padding:12px 12px 6px;background:var(--chat-area-bg,#f9fcfc);display:flex;flex-direction:column;gap:5px}\
.msgr-day{align-self:center;font-size:11px;color:var(--text-muted,#7f9a9c);background:var(--bg-accent,#eaf6f4);padding:2px 10px;border-radius:10px;margin:6px 0}\
.msgr-b{max-width:82%;padding:7px 11px 5px;border-radius:14px;font-size:13.5px;line-height:1.75;word-break:break-word;position:relative}\
.msgr-b.in{align-self:flex-start;background:var(--bubble-in-bg,#eaf6f4);border-bottom-right-radius:4px}\
.msgr-b.out{align-self:flex-end;background:linear-gradient(135deg,var(--deep,#0B3D42),var(--teal,#14808A));color:#fff;border-bottom-left-radius:4px}\
.msgr-b a{color:inherit;text-decoration:underline}\
.msgr-b i{display:block;font-style:normal;font-size:10px;opacity:.65;margin-top:1px}\
.msgr-b.out i{text-align:left}\
.msgr-b.tmp{opacity:.6}\
.msgr-f{display:flex;align-items:center;gap:9px;min-width:190px;text-decoration:none!important;color:inherit}\
.msgr-fi{width:38px;height:38px;border-radius:10px;color:#fff;font-size:10.5px;font-weight:700;display:flex;align-items:center;justify-content:center;flex:none}\
.msgr-fn{flex:1;min-width:0;font-size:12.5px;font-weight:600;direction:ltr;text-align:right;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\
.msgr-fs{font-size:10.5px;opacity:.7}\
.msgr-img{display:block;max-width:100%;max-height:170px;border-radius:9px;margin-bottom:5px}\
.msgr-chips{display:flex;flex-wrap:wrap;gap:6px;padding:6px 12px 0;background:var(--glass-bg-strong,#fff)}\
.msgr-chip{display:flex;align-items:center;gap:6px;background:var(--bg-accent,#eaf6f4);border-radius:10px;padding:4px 6px 4px 10px;font-size:12px;max-width:100%}\
.msgr-chip span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:170px;direction:ltr}\
.msgr-chip button{border:0;background:rgba(0,0,0,.12);color:inherit;width:18px;height:18px;border-radius:50%;cursor:pointer;line-height:1;padding:0;font-size:12px}\
.msgr-comp{display:flex;align-items:flex-end;gap:7px;padding:9px 10px 10px;background:var(--glass-bg-strong,#fff);flex:none}\
.msgr-comp textarea{flex:1;resize:none;border:1px solid var(--border,#e0eaea);border-radius:16px;padding:9px 13px;font:13.5px/1.6 inherit;font-family:inherit;max-height:110px;background:var(--bg-light,#f6fafa);color:inherit;outline:0}\
.msgr-comp textarea:focus{border-color:var(--accent,#2FB8A6)}\
.msgr-cb{width:38px;height:38px;border-radius:50%;border:0;display:flex;align-items:center;justify-content:center;cursor:pointer;flex:none;padding:0}\
.msgr-cb.att{background:var(--bg-accent,#eaf6f4);color:var(--teal,#14808A)}\
.msgr-cb.snd{background:linear-gradient(135deg,var(--accent,#2FB8A6),var(--teal,#14808A));color:#fff}\
.msgr-cb:disabled{opacity:.55;cursor:default}\
.msgr-status{font-size:11.5px;padding:0 14px 4px;min-height:0;color:var(--danger,#c0472b);background:var(--glass-bg-strong,#fff)}\
.msgr-status:empty{display:none}\
@media(max-width:720px){.msgr{left:10px!important;right:10px!important;top:auto!important;bottom:10px;width:auto;height:min(82vh,640px);border-radius:22px}}';

  function icon(d, w) { return '<svg width="' + (w || 18) + '" height="' + (w || 18) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' + d + '</svg>'; }
  var I = {
    back: icon('<path d="M9 6l6 6-6 6"/>', 17),
    close: icon('<path d="M6 6l12 12M18 6L6 18"/>', 16),
    clip: icon('<path d="M20.5 11.5l-8.2 8.2a5 5 0 01-7.1-7.1l8.5-8.5a3.3 3.3 0 014.7 4.7l-8.5 8.5a1.7 1.7 0 01-2.4-2.4l7.8-7.8"/>', 19),
    send: icon('<path d="M21 3L3 10.5l7 2.5 2.5 7L21 3z"/><path d="M10 13L21 3"/>', 18)
  };

  function build() {
    if (panel) return;
    var st = document.createElement('style'); st.id = 'msgr-css'; st.textContent = CSS; document.head.appendChild(st);
    panel = document.createElement('div');
    panel.className = 'msgr';
    panel.innerHTML =
      '<div class="msgr-head">' +
        '<button type="button" class="msgr-ib" id="msgrBack" style="display:none" title="بازگشت">' + I.back + '</button>' +
        '<b id="msgrTitle">پیام‌ها</b>' +
        '<div class="msgr-seg" id="msgrSeg"><button type="button" data-be="sb">⚡ سریع</button><button type="button" data-be="gas">☁ گوگل</button></div>' +
        '<button type="button" class="msgr-ib" id="msgrClose" title="بستن">' + I.close + '</button>' +
      '</div>' +
      '<div class="msgr-body" id="msgrListView">' +
        '<input class="msgr-search" id="msgrSearch" placeholder="جستجوی همکاران..." autocomplete="off">' +
        '<div class="msgr-list" id="msgrList"></div>' +
      '</div>' +
      '<div class="msgr-body" id="msgrThreadView" style="display:none">' +
        '<div class="msgr-msgs" id="msgrMsgs"></div>' +
        '<div class="msgr-chips" id="msgrChips"></div>' +
        '<div class="msgr-status" id="msgrStatus"></div>' +
        '<div class="msgr-comp">' +
          '<button type="button" class="msgr-cb att" id="msgrAttach" title="پیوست فایل">' + I.clip + '</button>' +
          '<textarea id="msgrInput" rows="1" placeholder="پیام یا لینک بنویسید..."></textarea>' +
          '<button type="button" class="msgr-cb snd" id="msgrSend" title="ارسال">' + I.send + '</button>' +
          '<input type="file" id="msgrFile" multiple accept=".pdf,.xlsx,.xls,.csv,.doc,.docx,.png,.jpg,.jpeg,.webp,.zip" style="display:none">' +
        '</div>' +
      '</div>';
    document.body.appendChild(panel);
    listEl = $('#msgrList', panel); msgsEl = $('#msgrMsgs', panel); inputEl = $('#msgrInput', panel);
    chipsEl = $('#msgrChips', panel); statusEl = $('#msgrStatus', panel); titleEl = $('#msgrTitle', panel);

    $('#msgrClose', panel).onclick = close;
    $('#msgrBack', panel).onclick = showList;
    $('#msgrSeg', panel).onclick = function (e) { var b = e.target.closest('button[data-be]'); if (b) switchBackend(b.dataset.be); };
    $('#msgrSearch', panel).oninput = renderList;
    $('#msgrAttach', panel).onclick = function () { $('#msgrFile', panel).click(); };
    $('#msgrFile', panel).onchange = function (e) {
      Array.prototype.forEach.call(e.target.files, function (f) { S.files.push(f); });
      e.target.value = ''; renderChips();
    };
    $('#msgrSend', panel).onclick = doSend;
    inputEl.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey && !('ontouchstart' in window)) { e.preventDefault(); doSend(); }
    });
    inputEl.addEventListener('input', function () { inputEl.style.height = 'auto'; inputEl.style.height = Math.min(inputEl.scrollHeight, 110) + 'px'; });
    chipsEl.onclick = function (e) { var b = e.target.closest('button[data-i]'); if (b) { S.files.splice(+b.dataset.i, 1); renderChips(); } };
    msgsEl.addEventListener('dragover', function (e) { e.preventDefault(); });
    msgsEl.addEventListener('drop', function (e) {
      e.preventDefault();
      Array.prototype.forEach.call((e.dataTransfer && e.dataTransfer.files) || [], function (f) { S.files.push(f); });
      renderChips();
    });
  }

  // ---------- جابه‌جایی صفحه‌ها ----------
  function position() {
    if (window.innerWidth <= 720 || !S.anchor) { panel.style.left = panel.style.top = ''; return; }
    var r = S.anchor.getBoundingClientRect();
    var w = 380, left = Math.round(r.left + r.width / 2 - w / 2);
    left = Math.max(8, Math.min(left, window.innerWidth - w - 8));
    panel.style.left = left + 'px';
    panel.style.top = Math.round(r.bottom + 10) + 'px';
    panel.style.right = 'auto';
  }

  function openPanel(beId, anchor) {
    build();
    S.anchor = anchor || S.anchor;
    S.open = true;
    panel.classList.add('on');
    position();
    switchBackend(beId, true);
  }
  function close() { S.open = false; if (panel) panel.classList.remove('on'); }

  function switchBackend(id, keepContact) {
    S.be = BE[id];
    var btns = panel.querySelectorAll('#msgrSeg button');
    Array.prototype.forEach.call(btns, function (b) { b.classList.toggle('on', b.dataset.be === id); });
    if (!keepContact) { S.contact = null; }
    S.contacts = []; S.items = []; S.sig = ''; S.files = []; renderChips();
    showList();
  }

  function showList() {
    S.contact = null;
    $('#msgrListView', panel).style.display = 'flex';
    $('#msgrThreadView', panel).style.display = 'none';
    $('#msgrBack', panel).style.display = 'none';
    $('#msgrSeg', panel).style.display = 'flex';
    titleEl.textContent = 'پیام‌ها';
    statusEl.textContent = '';
    loadContacts(true);
  }

  function openThread(c) {
    S.contact = c; S.items = []; S.sig = ''; S.files = []; renderChips();
    $('#msgrListView', panel).style.display = 'none';
    $('#msgrThreadView', panel).style.display = 'flex';
    $('#msgrBack', panel).style.display = 'inline-flex';
    $('#msgrSeg', panel).style.display = 'none';
    titleEl.textContent = c.name;
    msgsEl.innerHTML = '<div class="msgr-empty">در حال بارگذاری...</div>';
    inputEl.value = ''; inputEl.style.height = 'auto';
    refreshThread(true);
    S.be.markRead(me(), c).then(function () { c.unread = 0; refreshBadge(); }).catch(function () {});
    if (window.innerWidth > 720) setTimeout(function () { inputEl.focus(); }, 50);
  }

  // ---------- لیست همکاران ----------
  function avatar(c) {
    return '<div class="msgr-av">' + (c.photo ? '<img src="' + esc(c.photo) + '" alt="" onerror="this.remove()">' : '') +
           (c.photo ? '' : esc((c.initials || (c.name || '؟').slice(0, 2)))) + '</div>';
  }

  function notReady() {
    var sb = S.be.id === 'sb';
    return '<div class="msgr-empty">' + (sb
      ? (window.SahelSB && window.SahelSB.configured
          ? 'اتصال سریع هنوز برای این حساب فعال نشده.<br>یک بار از حساب خارج و دوباره وارد شوید.'
          : 'اتصال سریع هنوز تنظیم نشده است.')
      : 'اتصال برقرار نیست.') +
      (sb ? '<br><button type="button" data-be="gas">استفاده از موتور گوگل</button>' : '') + '</div>';
  }

  function loadContacts(show) {
    var be = S.be;
    if (!be.ready()) { listEl.innerHTML = notReady(); listEl.onclick = function (e) { var b = e.target.closest('button[data-be]'); if (b) switchBackend(b.dataset.be); }; return; }
    listEl.onclick = function (e) { var r = e.target.closest('.msgr-row'); if (r) { var c = S.contacts.filter(function (x) { return x.id === r.dataset.id; })[0]; if (c) openThread(c); } };
    if (show && !S.contacts.length) listEl.innerHTML = '<div class="msgr-empty">در حال بارگذاری...</div>';
    S.lastList = Date.now();
    be.contacts().then(function (cs) {
      if (S.be !== be) return;
      cs.sort(function (a, b) { return (b.unread - a.unread) || 0; });
      S.contacts = cs; renderList(); refreshBadge();
    }).catch(function () {
      if (S.be === be && !S.contacts.length) listEl.innerHTML = '<div class="msgr-empty">دریافت لیست ممکن نشد.<br>اینترنت را بررسی کنید.</div>';
    });
  }

  function renderList() {
    var q = ($('#msgrSearch', panel).value || '').trim().toLowerCase();
    var rows = S.contacts.filter(function (c) { return !q || (c.name || '').toLowerCase().indexOf(q) !== -1; });
    if (!rows.length) { listEl.innerHTML = '<div class="msgr-empty">' + (q ? 'همکاری پیدا نشد' : 'همکاری برای گفتگو وجود ندارد') + '</div>'; return; }
    listEl.innerHTML = rows.map(function (c) {
      return '<div class="msgr-row" data-id="' + esc(c.id) + '">' + avatar(c) +
        '<div class="msgr-info"><b>' + esc(c.name) + '</b><span>' + esc(c.last || c.jobTitle || '') + '</span></div>' +
        (c.unread ? '<div class="msgr-dot">' + fa(c.unread) + '</div>' : '') + '</div>';
    }).join('');
  }

  // ---------- گفتگو ----------
  function renderThread(stick) {
    var items = S.items, html = '', lastDay = '';
    if (!items.length) { msgsEl.innerHTML = '<div class="msgr-empty">هنوز پیامی نیست.<br>اولین پیام، لینک یا فایل را بفرستید 👋</div>'; return; }
    var nearBottom = msgsEl.scrollHeight - msgsEl.scrollTop - msgsEl.clientHeight < 80;
    items.forEach(function (m) {
      var dk = dayKey(m.time);
      if (dk && dk !== lastDay) { lastDay = dk; html += '<div class="msgr-day">' + esc(dayText(m.time)) + '</div>'; }
      var cls = 'msgr-b ' + (m.mine ? 'out' : 'in') + (m.tmp ? ' tmp' : '');
      if (m.type === 'file') {
        var k = fileKind(m.name), isImg = k.t === 'IMG' && m.url && /supabase/.test(m.url);
        html += '<div class="' + cls + '">' + (isImg ? '<img class="msgr-img" src="' + esc(m.url) + '" alt="">' : '') +
          '<a class="msgr-f" ' + (m.url ? 'href="' + esc(m.url) + '" target="_blank" rel="noopener"' : '') + '>' +
          '<div class="msgr-fi" style="background:' + k.c + '">' + k.t + '</div>' +
          '<div style="flex:1;min-width:0"><div class="msgr-fn">' + esc(m.name || 'فایل') + '</div><div class="msgr-fs">' + (m.tmp ? 'در حال ارسال...' : (sizeText(m.size) || 'دانلود / باز کردن')) + '</div></div></a>' +
          '<i>' + (m.tmp ? '' : timeText(m.time)) + '</i></div>';
      } else {
        html += '<div class="' + cls + '">' + linkify(m.text) + '<i>' + (m.tmp ? 'در حال ارسال...' : timeText(m.time)) + '</i></div>';
      }
    });
    msgsEl.innerHTML = html;
    if (stick || nearBottom) msgsEl.scrollTop = msgsEl.scrollHeight;
  }

  function refreshThread(stick) {
    var be = S.be, c = S.contact;
    if (!c || !be.ready()) { if (c) msgsEl.innerHTML = notReady(); return Promise.resolve(); }
    return be.thread(me(), c).then(function (items) {
      if (S.be !== be || S.contact !== c) return;
      var last = items.length ? items[items.length - 1] : null;
      var sig = items.length + '|' + (last ? last.key : '');
      var incoming = last && !last.mine && sig !== S.sig && S.sig !== '';
      if (sig === S.sig && !stick) return;
      S.sig = sig;
      S.items = items.concat(S.items.filter(function (x) { return x.tmp; }));
      renderThread(stick);
      if (incoming) be.markRead(me(), c).catch(function () {});
    }).catch(function () { /* خطای گذرا؛ دور بعد دوباره */ });
  }

  // ---------- ارسال ----------
  function renderChips() {
    if (!chipsEl) return;
    chipsEl.innerHTML = S.files.map(function (f, i) {
      return '<div class="msgr-chip"><span>' + esc(f.name) + '</span><button type="button" data-i="' + i + '" title="حذف">×</button></div>';
    }).join('');
  }
  function setStatus(t) { statusEl.textContent = t || ''; }

  function doSend() {
    var c = S.contact, be = S.be;
    if (!c || S.sending) return;
    var text = inputEl.value.trim(), files = S.files.slice();
    if (!text && !files.length) return;
    if (navigator.onLine === false) { setStatus('اینترنت قطع است.'); return; }
    S.sending = true; setStatus('');
    var btn = $('#msgrSend', panel); btn.disabled = true;
    var now = new Date().toISOString();
    if (text) S.items.push({ key: 'tmp' + Date.now(), tmp: true, mine: true, type: 'text', text: text, time: now });
    files.forEach(function (f, i) { S.items.push({ key: 'tmpf' + Date.now() + i, tmp: true, mine: true, type: 'file', name: f.name, size: f.size, time: now }); });
    inputEl.value = ''; inputEl.style.height = 'auto'; S.files = []; renderChips(); renderThread(true);

    var chain = text ? be.send(me(), c, text) : Promise.resolve();
    var failed = [];
    files.forEach(function (f) {
      chain = chain.then(function () {
        return be.sendFile(me(), c, f).catch(function (e) { failed.push(f.name + ' — ' + (e.message || 'ناموفق')); });
      });
    });
    chain.catch(function (e) {
      setStatus('ارسال پیام ناموفق بود: ' + (e.message || ''));
      if (text) inputEl.value = text;
    }).then(function () {
      if (failed.length) setStatus('این فایل‌ها ارسال نشدند: ' + failed.join('، '));
      S.items = S.items.filter(function (x) { return !x.tmp; });
      S.sending = false; btn.disabled = false;
      S.sig = ''; return refreshThread(true);
    });
  }

  // ---------- نشان‌های خوانده‌نشده ----------
  function setBadge(id, n) {
    var el = document.getElementById(id); if (!el) return;
    if (n > 0) { el.style.display = 'flex'; el.textContent = fa(n > 99 ? '99+' : n); } else el.style.display = 'none';
  }
  function refreshBadge() {
    // بعد از باز کردن/خواندن، شمارنده لیست را هم در نشان آیکن لحاظ کن
    var sum = S.contacts.reduce(function (s, c) { return s + (c.unread || 0); }, 0);
    setBadge(S.be === SB ? 'chatBadge' : 'fileBadge', sum);
  }
  function pollBadges() {
    if (document.hidden || !me()) return;
    var now = Date.now();
    [['sb', SB, 'chatBadge'], ['gas', GAS, 'fileBadge']].forEach(function (x) {
      var id = x[0], be = x[1], badgeId = x[2];
      if (now - S.lastBadge[id] < be.badgeMs) return;
      if (!be.ready()) { setBadge(badgeId, 0); return; }
      S.lastBadge[id] = now;
      be.unread().then(function (n) { setBadge(badgeId, n); }).catch(function () {});
    });
  }

  // ---------- زمان‌بندی ----------
  var tick = 0;
  setInterval(function () {
    if (document.hidden) return;
    tick += 1000;
    if (S.open && S.contact && tick % S.be.pollMs < 1000) refreshThread(false);
    if (S.open && !S.contact && Date.now() - S.lastList > S.be.listMs) loadContacts(false);
    pollBadges();
  }, 1000);

  // ---------- اتصال به آیکن‌ها ----------
  function setup() {
    // داشبورد خودش شمارندهٔ پیام و فایل قدیمی را می‌نویسد؛ از این به بعد شمارنده را پیام‌رسان می‌نویسد
    window.updateChatBadge = function () {};
    window.updateFileBadge = function () {};
    var c = document.getElementById('chatBtn'), f = document.getElementById('fileTransferBtn');
    if (c) c.title = 'پیام و فایل — موتور سریع';
    if (f) f.title = 'پیام و فایل — موتور گوگل';

    document.addEventListener('click', function (e) {
      var ic = e.target.closest && e.target.closest('#chatBtn,#fileTransferBtn');
      if (ic) {
        e.preventDefault(); e.stopPropagation();
        var beId = ICON_BACKEND[ic.id] || 'sb';
        if (S.open && S.anchor === ic) { close(); return; }
        if (typeof closeAllPanels === 'function') { try { closeAllPanels(); } catch (x) {} }
        openPanel(beId, ic);
        return;
      }
      if (S.open && panel && e.composedPath().indexOf(panel) === -1) close();
    }, true);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && S.open) close(); });
    window.addEventListener('resize', function () { if (S.open) position(); });
    window.addEventListener('beforeunload', function () { /* پیام‌های در حال نوشتن ذخیره نمی‌شود */ });
    setTimeout(pollBadges, 1500);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup); else setup();
})();
