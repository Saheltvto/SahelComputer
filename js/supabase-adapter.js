/* ساحل — اتصال به Supabase (پیام و فایل سریع)
   بعد از js/config.js بارگذاری می‌شود. فقط ورود را زیر نظر می‌گیرد تا نشست Supabase ساخته شود
   و API ساده‌ای به نام window.SahelSB در اختیار پیام‌رسان (messenger.js) می‌گذارد. */
(function () {
  'use strict';

  // ===== دو مقدار زیر را از Supabase › Project Settings › API بردارید =====
  var SB_URL  = 'https://gflxbtiuslbbnmomwstu.supabase.co';
  var SB_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdmbHhidGl1c2xiYm5tb213c3R1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIyMDg1NjUsImV4cCI6MjEwNzc4NDU2NX0.jFWYdllzl32VPUNf7NPkUwG7nLLFtEIt2YioXdIxnYg';
  // ========================================================================

  var BUCKET = 'kt-files';
  var SKEY = 'sahel_sb_session';
  var orig = window.sahelApiCall;
  var configured = SB_URL.indexOf('PASTE') === -1 && SB_ANON.indexOf('PASTE') === -1;

  // ---------- نشست ----------
  var session = null;
  try { session = JSON.parse(localStorage.getItem(SKEY) || 'null'); } catch (e) {}
  try { if (!sessionStorage.getItem('sahel_user')) { session = null; localStorage.removeItem(SKEY); } } catch (e) {}

  function saveSession(s) {
    session = s;
    try { s ? localStorage.setItem(SKEY, JSON.stringify(s)) : localStorage.removeItem(SKEY); } catch (e) {}
  }

  function timeoutFetch(url, opt, ms) {
    var ctrl = new AbortController();
    var t = setTimeout(function () { ctrl.abort(); }, ms || 15000);
    opt.signal = ctrl.signal;
    return fetch(url, opt).finally(function () { clearTimeout(t); });
  }

  function authCall(path, body) {
    return timeoutFetch(SB_URL + '/auth/v1/' + path, {
      method: 'POST',
      headers: { apikey: SB_ANON, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok) throw new Error(j.error_description || j.msg || ('auth ' + r.status));
        return j;
      });
    });
  }

  function toSession(j) {
    return { access: j.access_token, refresh: j.refresh_token, exp: Date.now() + (j.expires_in || 3600) * 1000 - 60000 };
  }

  var refreshing = null;
  function token() {
    if (!session) return Promise.reject(new Error('no-supabase-session'));
    if (Date.now() < session.exp) return Promise.resolve(session.access);
    if (!refreshing) {
      refreshing = authCall('token?grant_type=refresh_token', { refresh_token: session.refresh })
        .then(function (j) { saveSession(toSession(j)); return session.access; })
        .finally(function () { refreshing = null; });
    }
    return refreshing;
  }

  function rest(path, opt) {
    opt = opt || {};
    return token().then(function (tk) {
      var h = { apikey: SB_ANON, Authorization: 'Bearer ' + tk, 'Content-Type': 'application/json' };
      if (opt.prefer) h.Prefer = opt.prefer;
      return timeoutFetch(SB_URL + '/rest/v1/' + path, {
        method: opt.method || 'GET', headers: h, body: opt.body ? JSON.stringify(opt.body) : undefined
      });
    }).then(function (r) {
      if (!r.ok) return r.text().then(function (t) { throw new Error('db ' + r.status + ' ' + t.slice(0, 120)); });
      return r.status === 204 ? null : r.text().then(function (t) { return t ? JSON.parse(t) : null; });
    });
  }

  var enc = encodeURIComponent;
  function nowIso() { return new Date().toISOString(); }

  // ---------- ورود: بعد از ورود موفق Apps Script، نشست Supabase هم ساخته می‌شود ----------
  if (typeof orig === 'function' && configured) {
    window.sahelApiCall = function (payload, opts) {
      if (payload && payload.action === 'login') {
        return orig(payload, opts).then(function (data) {
          if (!(data && data.success)) return data;
          return authCall('token?grant_type=password', { email: payload.email, password: payload.password })
            .then(function (j) {
              saveSession(toSession(j));
              try { // نشست جداگانه برای اعلان‌های اندروید
                if (window.SahelNative) {
                  authCall('token?grant_type=password', { email: payload.email, password: payload.password })
                    .then(function (j2) { window.SahelNative.postMessage(JSON.stringify({ op: 'sbSession', refresh: j2.refresh_token })); })
                    .catch(function () {});
                }
              } catch (e) {}
              return data;
            })
            .catch(function (e) { saveSession(null); console.warn('supabase login:', e.message); return data; });
        });
      }
      return orig(payload, opts);
    };
  }

  // ---------- آدرس امضاشدهٔ فایل‌ها (با کش ۵۰ دقیقه‌ای) ----------
  var signCache = {};
  function signPaths(paths) {
    var now = Date.now(), need = paths.filter(function (p) { return !signCache[p] || signCache[p].exp < now; });
    if (!need.length) return Promise.resolve();
    return token().then(function (tk) {
      return timeoutFetch(SB_URL + '/storage/v1/object/sign/' + BUCKET, {
        method: 'POST',
        headers: { apikey: SB_ANON, Authorization: 'Bearer ' + tk, 'Content-Type': 'application/json' },
        body: JSON.stringify({ expiresIn: 3600, paths: need })
      });
    }).then(function (r) { return r.ok ? r.json() : []; }).then(function (signed) {
      (signed || []).forEach(function (s) {
        if (s && s.signedURL) signCache[s.path] = { url: SB_URL + '/storage/v1' + s.signedURL, exp: Date.now() + 50 * 60000 };
      });
    });
  }

  // ---------- API پیام‌رسان ----------
  window.SahelSB = {
    configured: configured,
    ready: function () { return configured && !!session; },

    contacts: function () {
      return rest('rpc/kt_chat_contacts', { method: 'POST', body: {} }).then(function (rows) {
        return (rows || []).map(function (r) {
          return { id: String(r.id), name: r.name, initials: r.initials, photo: r.photo, jobTitle: r.job_title,
                   last: r.last_message || '', unread: Number(r.unread_count) || 0 };
        });
      });
    },

    // پیام‌ها و فایل‌های بین دو نفر، به ترتیب زمان
    thread: function (uid, cid) {
      uid = String(uid); cid = String(cid);
      var pair = 'or=(and(sender_id.eq.' + enc(uid) + ',receiver_id.eq.' + enc(cid) + '),and(sender_id.eq.' + enc(cid) + ',receiver_id.eq.' + enc(uid) + '))';
      return Promise.all([
        rest('kt_messages?select=id,sender_id,text,created_at&' + pair + '&order=created_at.desc&limit=150'),
        rest('kt_files?select=id,sender_id,file_name,path,legacy_url,created_at&' + pair + '&order=created_at.desc&limit=60')
      ]).then(function (r) {
        var msgs = r[0] || [], files = r[1] || [];
        var paths = files.filter(function (f) { return f.path; }).map(function (f) { return f.path; });
        return signPaths(paths).then(function () {
          var items = [];
          msgs.forEach(function (m) {
            items.push({ key: 'm' + m.id, mine: String(m.sender_id) === uid, type: 'text', text: m.text, time: m.created_at });
          });
          files.forEach(function (f) {
            var url = f.legacy_url || (signCache[f.path] && signCache[f.path].url) || '';
            items.push({ key: 'f' + f.id, mine: String(f.sender_id) === uid, type: 'file', name: f.file_name, url: url, time: f.created_at });
          });
          items.sort(function (a, b) { return a.time < b.time ? -1 : a.time > b.time ? 1 : 0; });
          return items;
        });
      });
    },

    send: function (uid, cid, text) {
      return rest('kt_messages', { method: 'POST', prefer: 'return=minimal',
        body: { sender_id: String(uid), receiver_id: String(cid), text: String(text) } });
    },

    // آپلود مستقیم خود فایل (بدون تبدیل به base64)
    sendFile: function (uid, cid, file) {
      var name = String(file.name || 'file');
      var ext = (name.match(/\.([A-Za-z0-9]{1,8})$/) || [, ''])[1].toLowerCase();
      var path = String(uid) + '/' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + (ext ? '.' + ext : '');
      var type = file.type || 'application/octet-stream';
      return token().then(function (tk) {
        return timeoutFetch(SB_URL + '/storage/v1/object/' + BUCKET + '/' + path, {
          method: 'POST',
          headers: { apikey: SB_ANON, Authorization: 'Bearer ' + tk, 'Content-Type': type, 'x-upsert': 'false' },
          body: file
        }, 180000);
      }).then(function (r) {
        if (!r.ok) return r.text().then(function (t) { throw new Error('upload ' + r.status + ' ' + t.slice(0, 100)); });
        return rest('kt_files', { method: 'POST', prefer: 'return=minimal',
          body: { sender_id: String(uid), receiver_id: String(cid), file_name: name, mime_type: type, path: path, size: file.size } });
      });
    },

    markRead: function (uid, cid) {
      var q = 'receiver_id=eq.' + enc(String(uid)) + '&sender_id=eq.' + enc(String(cid)) + '&read_at=is.null';
      var body = { method: 'PATCH', prefer: 'return=minimal', body: { read_at: nowIso() } };
      return Promise.all([rest('kt_messages?' + q, body), rest('kt_files?' + q, body)]);
    },

    unread: function () {
      return rest('rpc/kt_unread_counts', { method: 'POST', body: {} }).then(function (r) {
        return { chat: Number(r && r.chat) || 0, files: Number(r && r.files) || 0 };
      });
    }
  };
})();
