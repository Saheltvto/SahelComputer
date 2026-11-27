package ir.sahelcomputer.studio;

import android.Manifest;
import android.app.Activity;
import android.app.AlertDialog;
import android.app.DownloadManager;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.os.Message;
import android.util.SparseArray;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.webkit.GeolocationPermissions;
import android.webkit.JsPromptResult;
import android.webkit.JsResult;
import android.webkit.PermissionRequest;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.URLUtil;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.EditText;
import android.widget.Toast;

import androidx.webkit.WebViewAssetLoader;
import androidx.webkit.WebViewCompat;
import androidx.webkit.WebViewFeature;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

public class MainActivity extends Activity {
    static final String HOST = "appassets.androidplatform.net";
    static final String ORIGIN = "https://" + HOST;
    static final String START_URL = ORIGIN + "/dashboard.html";
        static final String SITE_URL = "https://saheltvto.github.io/SahelComputer/";
    private static final int REQ_FILE = 11;

    /** وقتی برنامه روی صفحه است، اعلان پس‌زمینه نشان داده نمی‌شود */
    static volatile boolean visible = false;

    interface PermCb {
        void done(boolean granted);
    }

    WebView webView;
    private WebViewAssetLoader assetLoader;
    private Bridge bridge;
    private ValueCallback<Uri[]> fileCb;
    private final SparseArray<PermCb> permCbs = new SparseArray<PermCb>();
    private int permSeq = 100;
    private long lastBack = 0;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Notifier.ensureChannel(this);

        assetLoader = new WebViewAssetLoader.Builder()
                .setDomain(HOST)
                .addPathHandler("/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();

        webView = new WebView(this);
        webView.setLayoutParams(new ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        setContentView(webView);

        if ((getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0) {
            WebView.setWebContentsDebuggingEnabled(true);
        }

        setupSettings();
        setupBridge();
        setupClients();

        if (Build.VERSION.SDK_INT >= 33) {
            withPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, new PermCb() {
                @Override
                public void done(boolean granted) {
                }
            });
        }
        Poller.schedule(this);

        boolean restored = false;
        if (savedInstanceState != null) {
            restored = webView.restoreState(savedInstanceState) != null;
        }
        if (!restored) webView.loadUrl(START_URL);
    }

    // ------------------------------------------------------------------ تنظیمات

    private void setupSettings() {
        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setSupportMultipleWindows(true);
        s.setJavaScriptCanOpenWindowsAutomatically(true);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);
        s.setTextZoom(100);
        s.setUserAgentString(s.getUserAgentString() + " SahelStudio/1.0");

        CookieManager cm = CookieManager.getInstance();
        cm.setAcceptCookie(true);
        cm.setAcceptThirdPartyCookies(webView, true);
    }

    private String readRaw(int id) throws java.io.IOException {
        InputStream is = getResources().openRawResource(id);
        ByteArrayOutputStream bo = new ByteArrayOutputStream();
        byte[] buf = new byte[4096];
        int n;
        while ((n = is.read(buf)) > 0) bo.write(buf, 0, n);
        is.close();
        return bo.toString("UTF-8");
    }

    private void setupBridge() {
        boolean ok = WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)
                && WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT);
        if (!ok) {
            new AlertDialog.Builder(this)
                    .setTitle("به‌روزرسانی لازم است")
                    .setMessage("برای عملکرد کامل (میکروفون، چاپ، اشتراک‌گذاری) برنامهٔ «Android System WebView» را از Google Play به‌روز کنید.")
                    .setPositiveButton("باشه", null)
                    .show();
            return;
        }
        try {
            bridge = new Bridge(this);
            Set<String> top = new HashSet<String>(Arrays.asList(ORIGIN));
            WebViewCompat.addWebMessageListener(webView, "SahelNative", top, bridge);
            WebViewCompat.addDocumentStartJavaScript(webView, readRaw(R.raw.sahel_top), top);

            Set<String> frames = new HashSet<String>(Arrays.asList(
                    "https://*.googleusercontent.com", "https://script.google.com"));
            WebViewCompat.addDocumentStartJavaScript(webView, readRaw(R.raw.sahel_frame), frames);
        } catch (Exception e) {
            Toast.makeText(this, "راه‌اندازی پل بومی ناموفق بود", Toast.LENGTH_LONG).show();
        }
    }

    // ------------------------------------------------------------------ کلاینت‌ها

    private boolean handleUrl(Uri u, boolean isMain) {
        String scheme = u.getScheme() == null ? "" : u.getScheme().toLowerCase();
        if (scheme.equals("about") || scheme.equals("blob") || scheme.equals("data")
                || scheme.equals("javascript") || scheme.equals("file")) {
            return false;
        }
        boolean http = scheme.equals("http") || scheme.equals("https");
        if (!http) {
            openExternal(u); // tel: mailto: whatsapp: sms: ...
            return true;
        }
        if (HOST.equalsIgnoreCase(u.getHost())) {
                   if (isMain) {
                String p = u.getPath();
                if (p != null && p.endsWith("/index.html")) {
                    openExternal(Uri.parse(SITE_URL)); // لوگوی ساحل ← وب‌سایت ساحل
                    return true;
                }
                if (p == null || p.equals("/") || p.endsWith("/go.html") || p.startsWith("/articles")) {
                    webView.loadUrl(START_URL);
                    return true;
                }
            }
            return false;
        }
        if (isMain) {
            openExternal(u);
            return true;
        }
        return false;
    }

    void openExternal(Uri u) {
        try {
            Intent i = new Intent(Intent.ACTION_VIEW, u);
            i.addCategory(Intent.CATEGORY_BROWSABLE);
            startActivity(i);
        } catch (Exception e) {
            Toast.makeText(this, "برنامه‌ای برای باز کردن این لینک پیدا نشد", Toast.LENGTH_SHORT).show();
        }
    }

    private boolean trustedOrigin(Uri o) {
        String h = o == null || o.getHost() == null ? "" : o.getHost().toLowerCase();
        return h.equals(HOST) || h.endsWith("googleusercontent.com") || h.endsWith("google.com");
    }

    private void setupClients() {
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return assetLoader.shouldInterceptRequest(request.getUrl());
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return handleUrl(request.getUrl(), request.isForMainFrame());
            }

            @Override
            public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
                runOnUiThread(new Runnable() {
                    @Override
                    public void run() {
                        recreate();
                    }
                });
                return true;
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView w, ValueCallback<Uri[]> cb, FileChooserParams params) {
                if (fileCb != null) fileCb.onReceiveValue(null);
                fileCb = cb;
                try {
                    startActivityForResult(params.createIntent(), REQ_FILE);
                } catch (Exception e) {
                    fileCb = null;
                    return false;
                }
                return true;
            }

            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                if (!trustedOrigin(request.getOrigin())) {
                    request.deny();
                    return;
                }
                List<String> need = new ArrayList<String>();
                for (String r : request.getResources()) {
                    if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(r)) need.add(Manifest.permission.RECORD_AUDIO);
                    if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(r)) need.add(Manifest.permission.CAMERA);
                }
                withPermissions(need.toArray(new String[0]), new PermCb() {
                    @Override
                    public void done(boolean granted) {
                        if (granted) request.grant(request.getResources());
                        else request.deny();
                    }
                });
            }

            @Override
            public void onGeolocationPermissionsShowPrompt(final String origin,
                                                           final GeolocationPermissions.Callback callback) {
                withPermissions(new String[]{Manifest.permission.ACCESS_FINE_LOCATION,
                        Manifest.permission.ACCESS_COARSE_LOCATION}, new PermCb() {
                    @Override
                    public void done(boolean granted) {
                        callback.invoke(origin, granted, false);
                    }
                });
            }

            @Override
            public boolean onCreateWindow(WebView view, boolean isDialog, boolean isUserGesture, Message resultMsg) {
                // window.open / target=_blank → در مرورگر یا برنامهٔ مناسب باز می‌شود، صفحهٔ کارتابل سر جایش می‌ماند
                final WebView tmp = new WebView(MainActivity.this);
                tmp.setWebViewClient(new WebViewClient() {
                    private boolean handled = false;

                    private void go(String url) {
                        if (handled || url == null || url.equals("about:blank")) return;
                        handled = true;
                        Uri u = Uri.parse(url);
                        String sc = u.getScheme() == null ? "" : u.getScheme();
                        if (sc.equals("blob") || sc.equals("data")) {
                            if (bridge != null && sc.equals("data")) bridge.saveDataUri(url);
                        } else if (HOST.equalsIgnoreCase(u.getHost())) {
                            webView.loadUrl(url);
                        } else {
                            openExternal(u);
                        }
                        tmp.post(new Runnable() {
                            @Override
                            public void run() {
                                tmp.destroy();
                            }
                        });
                    }

                    @Override
                    public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) {
                        go(r.getUrl().toString());
                        return true;
                    }

                    @Override
                    public void onPageStarted(WebView v, String url, android.graphics.Bitmap favicon) {
                        go(url);
                    }
                });
                WebView.WebViewTransport t = (WebView.WebViewTransport) resultMsg.obj;
                t.setWebView(tmp);
                resultMsg.sendToTarget();
                return true;
            }

            @Override
            public boolean onJsAlert(WebView v, String url, String message, final JsResult result) {
                if (isFinishing()) {
                    result.cancel();
                    return true;
                }
                new AlertDialog.Builder(MainActivity.this)
                        .setMessage(message)
                        .setPositiveButton("باشه", new android.content.DialogInterface.OnClickListener() {
                            @Override
                            public void onClick(android.content.DialogInterface d, int w) {
                                result.confirm();
                            }
                        })
                        .setOnCancelListener(new android.content.DialogInterface.OnCancelListener() {
                            @Override
                            public void onCancel(android.content.DialogInterface d) {
                                result.cancel();
                            }
                        })
                        .show();
                return true;
            }

            @Override
            public boolean onJsConfirm(WebView v, String url, String message, final JsResult result) {
                if (isFinishing()) {
                    result.cancel();
                    return true;
                }
                new AlertDialog.Builder(MainActivity.this)
                        .setMessage(message)
                        .setPositiveButton("تأیید", new android.content.DialogInterface.OnClickListener() {
                            @Override
                            public void onClick(android.content.DialogInterface d, int w) {
                                result.confirm();
                            }
                        })
                        .setNegativeButton("انصراف", new android.content.DialogInterface.OnClickListener() {
                            @Override
                            public void onClick(android.content.DialogInterface d, int w) {
                                result.cancel();
                            }
                        })
                        .setOnCancelListener(new android.content.DialogInterface.OnCancelListener() {
                            @Override
                            public void onCancel(android.content.DialogInterface d) {
                                result.cancel();
                            }
                        })
                        .show();
                return true;
            }

            @Override
            public boolean onJsPrompt(WebView v, String url, String message, String defaultValue,
                                      final JsPromptResult result) {
                if (isFinishing()) {
                    result.cancel();
                    return true;
                }
                final EditText input = new EditText(MainActivity.this);
                input.setText(defaultValue == null ? "" : defaultValue);
                new AlertDialog.Builder(MainActivity.this)
                        .setMessage(message)
                        .setView(input)
                        .setPositiveButton("تأیید", new android.content.DialogInterface.OnClickListener() {
                            @Override
                            public void onClick(android.content.DialogInterface d, int w) {
                                result.confirm(input.getText().toString());
                            }
                        })
                        .setNegativeButton("انصراف", new android.content.DialogInterface.OnClickListener() {
                            @Override
                            public void onClick(android.content.DialogInterface d, int w) {
                                result.cancel();
                            }
                        })
                        .setOnCancelListener(new android.content.DialogInterface.OnCancelListener() {
                            @Override
                            public void onCancel(android.content.DialogInterface d) {
                                result.cancel();
                            }
                        })
                        .show();
                return true;
            }
        });

        webView.setDownloadListener(new android.webkit.DownloadListener() {
            @Override
            public void onDownloadStart(String url, String userAgent, String contentDisposition,
                                        String mimetype, long contentLength) {
                if (url.startsWith("data:")) {
                    if (bridge != null) bridge.saveDataUri(url);
                    return;
                }
                if (url.startsWith("blob:")) {
                    Toast.makeText(MainActivity.this,
                            "برای ذخیره این فایل از دکمهٔ «ذخیره» یا «اشتراک‌گذاری» داخل خود برنامه استفاده کنید",
                            Toast.LENGTH_LONG).show();
                    return;
                }
                try {
                    DownloadManager.Request rq = new DownloadManager.Request(Uri.parse(url));
                    if (mimetype != null && !mimetype.isEmpty()) rq.setMimeType(mimetype);
                    String cookie = CookieManager.getInstance().getCookie(url);
                    if (cookie != null) rq.addRequestHeader("Cookie", cookie);
                    rq.addRequestHeader("User-Agent", userAgent);
                    rq.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
                    String fn = URLUtil.guessFileName(url, contentDisposition, mimetype);
                    if (Build.VERSION.SDK_INT >= 29) {
                        rq.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, "Sahel Studio/" + fn);
                    } else {
                        rq.setDestinationInExternalFilesDir(MainActivity.this, Environment.DIRECTORY_DOWNLOADS, fn);
                    }
                    DownloadManager dm = (DownloadManager) getSystemService(Context.DOWNLOAD_SERVICE);
                    dm.enqueue(rq);
                    Toast.makeText(MainActivity.this, "دانلود شروع شد: " + fn, Toast.LENGTH_SHORT).show();
                } catch (Exception e) {
                    openExternal(Uri.parse(url));
                }
            }
        });
    }

    // ------------------------------------------------------------------ مجوزها

    void withPermissions(String[] perms, PermCb cb) {
        List<String> need = new ArrayList<String>();
        for (String p : perms) {
            if (checkSelfPermission(p) != PackageManager.PERMISSION_GRANTED) need.add(p);
        }
        if (need.isEmpty()) {
            cb.done(true);
            return;
        }
        int code = permSeq++;
        permCbs.put(code, cb);
        requestPermissions(need.toArray(new String[0]), code);
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        PermCb cb = permCbs.get(requestCode);
        if (cb == null) return;
        permCbs.remove(requestCode);
        boolean ok = grantResults.length > 0;
        for (int r : grantResults) {
            if (r != PackageManager.PERMISSION_GRANTED) ok = false;
        }
        cb.done(ok);
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == REQ_FILE && fileCb != null) {
            Uri[] res = WebChromeClient.FileChooserParams.parseResult(resultCode, data);
            fileCb.onReceiveValue(res);
            fileCb = null;
        }
    }

    // ------------------------------------------------------------------ چرخهٔ عمر

    @Override
    public void onBackPressed() {
        webView.evaluateJavascript(
                "(function(){return !!(history.state&&history.state.sahelViewer);})()",
                new ValueCallback<String>() {
                    @Override
                    public void onReceiveValue(String value) {
                        if ("true".equals(value) && webView.canGoBack()) {
                            webView.goBack();
                            return;
                        }
                        long now = System.currentTimeMillis();
                        if (now - lastBack < 2000) {
                            finish();
                        } else {
                            lastBack = now;
                            Toast.makeText(MainActivity.this, "برای خروج، دوباره بازگشت را بزنید",
                                    Toast.LENGTH_SHORT).show();
                        }
                    }
                });
    }

    @Override
    protected void onStart() {
        super.onStart();
        visible = true;
    }

    @Override
    protected void onStop() {
        visible = false;
        super.onStop();
    }

    @Override
    protected void onResume() {
        super.onResume();
        webView.onResume();
    }

    @Override
    protected void onPause() {
        webView.onPause();
        super.onPause();
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        webView.saveState(outState);
    }

    @Override
    protected void onDestroy() {
        if (bridge != null) bridge.destroy();
        webView.destroy();
        super.onDestroy();
    }
}
