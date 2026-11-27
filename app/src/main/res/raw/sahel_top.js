/* پل اندروید ← صفحهٔ کارتابل (فقط در قاب اصلی اجرا می‌شود) */
(function () {
  'use strict';
  var pending = {}, speech = {}, seq = 0;
  var origTitle = '';
  var wired = false;

  /* شیء SahelNative توسط اندروید تزریق می‌شود؛ ممکن است کمی دیرتر از این اسکریپت آماده شود */
  function native() {
    var N = window.SahelNative;
    if (N && !wired) { wired = true; N.onmessage = onNative; }
    return N;
  }

  function send(o) { try { var N = native(); if (N) N.postMessage(JSON.stringify(o)); } catch (e) {} }

  /* سرویس‌ورکر در برنامهٔ اندروید لازم نیست (فایل‌ها داخل خود برنامه‌اند)؛
     غیرفعال می‌شود تا کش قدیمی جلوی به‌روزرسانی را نگیرد */
  try {
    if (navigator.serviceWorker) {
      navigator.serviceWorker.register = function () { return Promise.reject(new Error('sw-disabled')); };
      if (navigator.serviceWorker.getRegistrations) {
        navigator.serviceWorker.getRegistrations().then(function (rs) { rs.forEach(function (r) { r.unregister(); }); });
      }
    }
  } catch (e) {}

  function call(o) {
    return new Promise(function (resolve) {
      var id = 'c' + (++seq);
      o.id = id;
      pending[id] = resolve;
      send(o);
      setTimeout(function () { if (pending[id]) { delete pending[id]; resolve('error'); } }, 180000);
    });
  }

  function onNative(ev) {
    var m;
    try { m = JSON.parse(ev.data); } catch (e) { return; }
    if (m.ev === 'speech') {
      var cb = speech[m.id];
      if (!cb) return;
      if (m.kind === 'start') { if (cb.onStart) cb.onStart(); }
      else if (m.kind === 'text') { if (cb.onText) cb.onText(m.text || '', !!m.fin); }
      else if (m.kind === 'end') { delete speech[m.id]; if (cb.onEnd) cb.onEnd(m.text || '', m.err || ''); }
      return;
    }
    var p = pending[m.id];
    if (p) { delete pending[m.id]; p(m.state || 'ok'); }
  }
  native();

  function toB64(buf) {
    var b = new Uint8Array(buf), s = '', step = 0x8000;
    for (var i = 0; i < b.length; i += step) {
      s += String.fromCharCode.apply(null, b.subarray(i, i + step));
    }
    return btoa(s);
  }

  /* ----- آداپتور پلتفرم که dashboard.js انتظارش را دارد ----- */
  window.SahelPlatform = {
    name: 'android',
    speech: {
      start: function (opts, cb) {
        var id = 's' + (++seq);
        speech[id] = cb || {};
        send({ op: 'speechStart', id: id, lang: (opts && opts.lang) || 'fa-IR' });
        return Promise.resolve({ stop: function () { send({ op: 'speechStop', id: id }); } });
      }
    },
    saveFile: function (file, meta) {
      meta = meta || {};
      return call({
        op: 'file', mode: meta.mode === 'share' ? 'share' : 'save',
        name: file.name, type: file.type, b64: toB64(file.buf),
        title: meta.title || '', text: meta.text || ''
      });
    },
    shareText: function (meta) {
      meta = meta || {};
      return call({ op: 'shareText', title: meta.title || '', text: meta.text || '' });
    }
  };

  /* ----- چاپ و اعلان در خود صفحهٔ اصلی ----- */
  window.print = function () { send({ op: 'printPage' }); };

  function Notif(title, opts) {
    opts = opts || {};
    send({ op: 'notify', title: String(title || ''), body: String(opts.body || '') });
  }
  Notif.permission = 'granted';
  Notif.requestPermission = function (cb) { if (typeof cb === 'function') cb('granted'); return Promise.resolve('granted'); };
  try { window.Notification = Notif; } catch (e) {}

  /* ----- نگه‌داشتن نشست ورود بعد از بستن برنامه -----
     dashboard.js کاربر را در sessionStorage نگه می‌دارد که با بستن برنامه پاک می‌شود. */
  var KEY = 'sahel_user', PKEY = '__sahel_persist_user';
  try {
    if (!sessionStorage.getItem(KEY)) {
      var saved = localStorage.getItem(PKEY);
      if (saved) sessionStorage.setItem(KEY, saved);
    }
    var _set = Storage.prototype.setItem, _rm = Storage.prototype.removeItem;
    Storage.prototype.setItem = function (k, v) {
      _set.call(this, k, v);
      if (this === window.sessionStorage && k === KEY) {
        try { _set.call(window.localStorage, PKEY, v); } catch (e) {}
        send({ op: 'user', user: String(v) });
      }
    };
    Storage.prototype.removeItem = function (k) {
      _rm.call(this, k);
      if (this === window.sessionStorage && k === KEY) {
        try { _rm.call(window.localStorage, PKEY); } catch (e) {}
        send({ op: 'logout' });
      }
    };
    var cur = sessionStorage.getItem(KEY);
    if (cur) send({ op: 'user', user: cur });
  } catch (e) {}

  document.addEventListener('DOMContentLoaded', function () {
    origTitle = document.title;
    try {
      if (/login\.html$/.test(location.pathname) && sessionStorage.getItem(KEY)) {
        location.replace('dashboard.html');
      }
    } catch (e) {}
  });

  /* ----- درخواست‌هایی که از داخل اپ‌های Apps Script (iframe) می‌رسد ----- */
  window.addEventListener('message', function (ev) {
    var d = ev.data;
    if (!d || typeof d !== 'object') return;
    if (d.__sahelPrint) {
      var p = d.__sahelPrint;
      var t = (document.title && document.title !== origTitle) ? document.title : (p.title || document.title);
      send({ op: 'print', html: String(p.html || ''), title: String(t || ''), base: String(p.base || '') });
    } else if (d.__sahelNotify) {
      send({ op: 'notify', title: String(d.__sahelNotify.title || ''), body: String(d.__sahelNotify.body || '') });
    }
  }, false);
})();
