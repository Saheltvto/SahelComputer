/* اسکریپت داخل اپ‌های Apps Script (iframe): چاپ، دانلود، اشتراک‌گذاری و اعلان را به برنامهٔ اصلی می‌فرستد */
(function () {
  'use strict';
  if (window.top === window) return;

  function toTop(msg, transfer) {
    try { window.top.postMessage(msg, '*', transfer || []); }
    catch (e) { try { window.top.postMessage(msg, '*'); } catch (e2) {} }
  }

  /* چاپ: عکس لحظه‌ای از سند به برنامه فرستاده می‌شود و پنجرهٔ چاپ/ذخیره PDF اندروید باز می‌شود */
  window.print = function () {
    var html = '<!DOCTYPE html>' + document.documentElement.outerHTML;
    toTop({ __sahelPrint: { html: html, title: document.title || '', base: location.href } });
  };

  /* دانلود فایل‌های blob: و data: (مثلاً خروجی اکسل و PDF) */
  function saveFromUrl(url, name) {
    fetch(url).then(function (r) { return r.blob(); }).then(function (b) {
      return b.arrayBuffer().then(function (buf) {
        toTop({ sahelCmd: 'save', id: 'f' + Date.now(), buf: buf, name: name || 'file', type: b.type || 'application/octet-stream' }, [buf]);
      });
    }).catch(function () {});
  }
  function isLocalUrl(h) { return /^(blob:|data:)/i.test(h || ''); }

  try {
    var origClick = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function () {
      if (this.hasAttribute('download') && isLocalUrl(this.href)) {
        saveFromUrl(this.href, this.getAttribute('download'));
        return;
      }
      return origClick.apply(this, arguments);
    };
  } catch (e) {}

  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a[download]') : null;
    if (a && isLocalUrl(a.href)) {
      e.preventDefault();
      e.stopPropagation();
      saveFromUrl(a.href, a.getAttribute('download'));
    }
  }, true);

  /* اشتراک‌گذاری (Web Share) */
  try {
    navigator.canShare = function () { return true; };
    navigator.share = function (data) {
      data = data || {};
      var id = 'sh' + Date.now();
      var base = { sahelCmd: 'share', id: id, title: data.title || '', text: data.text || data.url || '' };
      if (data.files && data.files.length) {
        var f = data.files[0];
        return f.arrayBuffer().then(function (buf) {
          base.buf = buf; base.name = f.name; base.type = f.type || 'application/octet-stream';
          toTop(base, [buf]);
        });
      }
      toTop(base);
      return Promise.resolve();
    };
  } catch (e) {}

  /* اعلان‌های مرورگر */
  function Notif(title, opts) {
    toTop({ __sahelNotify: { title: String(title || ''), body: String((opts && opts.body) || '') } });
  }
  Notif.permission = 'granted';
  Notif.requestPermission = function (cb) { if (typeof cb === 'function') cb('granted'); return Promise.resolve('granted'); };
  try { window.Notification = Notif; } catch (e) {}
})();
