package ir.sahelcomputer.studio;

import android.Manifest;
import android.app.PendingIntent;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.os.Handler;
import android.os.Looper;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.provider.MediaStore;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import android.util.Base64;
import android.webkit.MimeTypeMap;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import androidx.core.content.FileProvider;
import androidx.webkit.JavaScriptReplyProxy;
import androidx.webkit.WebMessageCompat;
import androidx.webkit.WebViewCompat;

import org.json.JSONException;
import org.json.JSONObject;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.net.URLDecoder;
import java.util.ArrayList;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/** پل بین صفحهٔ کارتابل (جاوااسکریپت) و قابلیت‌های بومی اندروید */
final class Bridge implements WebViewCompat.WebMessageListener {
    private final MainActivity act;
    private final Handler main = new Handler(Looper.getMainLooper());
    private final ExecutorService io = Executors.newSingleThreadExecutor();
    private JavaScriptReplyProxy reply;
    private int counter = 0;

    // گفتار
    private SpeechRecognizer recognizer;
    private String speechId = "";
    private String speechLast = "";
    private boolean speechDone = true;

    // چاپ
    private WebView printView;

    Bridge(MainActivity a) {
        act = a;
    }

    @Override
    public void onPostMessage(WebView view, WebMessageCompat message, Uri sourceOrigin,
                              boolean isMainFrame, JavaScriptReplyProxy replyProxy) {
        if (!isMainFrame) return;
        reply = replyProxy;
        String data = message.getData();
        if (data == null) return;
        try {
            handle(new JSONObject(data));
        } catch (Exception ignored) {
        }
    }

    private void handle(JSONObject o) {
        String op = o.optString("op");
        switch (op) {
            case "file":
                fileOp(o);
                break;
            case "shareText":
                shareText(o.optString("id"), o.optString("title"), o.optString("text"));
                break;
            case "print":
                printHtml(o.optString("html"), o.optString("title"), o.optString("base"));
                break;
            case "printPage":
                printPage();
                break;
            case "speechStart":
                speechStart(o.optString("id"), o.optString("lang", "fa-IR"));
                break;
            case "speechStop":
                speechStop(o.optString("id"));
                break;
            case "notify":
                String t = o.optString("title");
                Notifier.show(act, 3000 + (counter++ % 500),
                        t.isEmpty() ? act.getString(R.string.app_name) : t,
                        o.optString("body"), Notifier.openApp(act));
                break;
            case "user":
                saveUser(o.optString("user"));
                break;
            case "logout":
                clearUser();
                break;
            case "open":
                act.openExternal(Uri.parse(o.optString("url")));
                break;
            default:
                break;
        }
    }

    // ---------------------------------------------------------------- پاسخ به صفحه

    private void send(final JSONObject o) {
        main.post(new Runnable() {
            @Override
            public void run() {
                try {
                    if (reply != null) reply.postMessage(o.toString());
                } catch (Exception ignored) {
                }
            }
        });
    }

    private void state(String id, String st) {
        try {
            JSONObject o = new JSONObject();
            o.put("id", id);
            o.put("state", st);
            send(o);
        } catch (JSONException ignored) {
        }
    }

    private void speechEvent(String id, String kind, String text, boolean fin, String err) {
        try {
            JSONObject o = new JSONObject();
            o.put("ev", "speech");
            o.put("id", id);
            o.put("kind", kind);
            o.put("text", text == null ? "" : text);
            o.put("fin", fin);
            o.put("err", err == null ? "" : err);
            send(o);
        } catch (JSONException ignored) {
        }
    }

    // ---------------------------------------------------------------- کاربر / اعلان‌ها

    private void saveUser(String json) {
        try {
            JSONObject u = new JSONObject(json);
            String uid = u.optString("id");
            if (uid.isEmpty()) return;
            SharedPreferences sp = act.getSharedPreferences(Poller.PREFS, Context.MODE_PRIVATE);
            if (!uid.equals(sp.getString("user_id", ""))) {
                sp.edit().putString("user_id", uid).putInt("last_chat", -1).putInt("last_files", -1).apply();
            }
            Poller.schedule(act);
        } catch (Exception ignored) {
        }
    }

    private void clearUser() {
        act.getSharedPreferences(Poller.PREFS, Context.MODE_PRIVATE).edit()
                .remove("user_id").putInt("last_chat", -1).putInt("last_files", -1).apply();
        android.app.NotificationManager nm =
                (android.app.NotificationManager) act.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null) nm.cancelAll();
    }

    // ---------------------------------------------------------------- ذخیره و اشتراک فایل

    private void fileOp(final JSONObject o) {
        final String id = o.optString("id");
        final String mode = o.optString("mode");
        final String name = safeName(o.optString("name", "file"));
        final String type = fixMime(name, o.optString("type"));
        final String b64 = o.optString("b64");
        final String title = o.optString("title");
        final String text = o.optString("text");
        io.execute(new Runnable() {
            @Override
            public void run() {
                try {
                    final byte[] data = Base64.decode(b64, Base64.DEFAULT);
                    if ("share".equals(mode)) {
                        final Uri uri = writeCache(name, data);
                        main.post(new Runnable() {
                            @Override
                            public void run() {
                                shareUri(uri, type, title, text);
                            }
                        });
                    } else {
                        final Uri uri = saveDownload(name, type, data);
                        main.post(new Runnable() {
                            @Override
                            public void run() {
                                afterSave(uri, type, name);
                            }
                        });
                    }
                    state(id, "ok");
                } catch (Throwable t) {
                    state(id, "error");
                }
            }
        });
    }

    /** ذخیرهٔ فایل دریافتی از مرورگر (data:) — برای لینک‌های دانلود */
    void saveDataUri(String url) {
        try {
            int comma = url.indexOf(',');
            if (comma < 0) return;
            String head = url.substring(5, comma);
            String payload = url.substring(comma + 1);
            boolean isB64 = head.contains(";base64");
            String mime = head.split(";")[0];
            if (mime.isEmpty()) mime = "application/octet-stream";
            final byte[] data = isB64 ? Base64.decode(payload, Base64.DEFAULT)
                    : URLDecoder.decode(payload, "UTF-8").getBytes("UTF-8");
            String ext = MimeTypeMap.getSingleton().getExtensionFromMimeType(mime);
            final String name = "sahel-" + System.currentTimeMillis() + (ext == null ? "" : "." + ext);
            final String type = mime;
            io.execute(new Runnable() {
                @Override
                public void run() {
                    try {
                        final Uri uri = saveDownload(name, type, data);
                        main.post(new Runnable() {
                            @Override
                            public void run() {
                                afterSave(uri, type, name);
                            }
                        });
                    } catch (Throwable ignored) {
                    }
                }
            });
        } catch (Exception ignored) {
        }
    }

    private static String safeName(String n) {
        String s = n == null ? "" : n.replaceAll("[\\\\/:*?\"<>|\\x00-\\x1f]", "_").trim();
        if (s.length() > 120) s = s.substring(s.length() - 120);
        return s.isEmpty() ? "file" : s;
    }

    private static String fixMime(String name, String type) {
        if (type != null && !type.isEmpty() && !"application/octet-stream".equals(type)) return type;
        int dot = name.lastIndexOf('.');
        if (dot >= 0) {
            String m = MimeTypeMap.getSingleton().getMimeTypeFromExtension(name.substring(dot + 1).toLowerCase());
            if (m != null) return m;
        }
        return "application/octet-stream";
    }

    private Uri saveDownload(String name, String type, byte[] data) throws IOException {
        if (Build.VERSION.SDK_INT >= 29) {
            ContentResolver cr = act.getContentResolver();
            ContentValues v = new ContentValues();
            v.put(MediaStore.MediaColumns.DISPLAY_NAME, name);
            v.put(MediaStore.MediaColumns.MIME_TYPE, type);
            v.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/Sahel Studio");
            Uri u = cr.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, v);
            if (u == null) throw new IOException("insert failed");
            OutputStream os = cr.openOutputStream(u);
            if (os == null) throw new IOException("stream failed");
            try {
                os.write(data);
            } finally {
                os.close();
            }
            return u;
        }
        File dir = act.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
        if (dir == null) dir = act.getFilesDir();
        File f = new File(dir, name);
        if (f.exists()) f = new File(dir, System.currentTimeMillis() + "-" + name);
        FileOutputStream fo = new FileOutputStream(f);
        try {
            fo.write(data);
        } finally {
            fo.close();
        }
        return FileProvider.getUriForFile(act, act.getPackageName() + ".files", f);
    }

    private Uri writeCache(String name, byte[] data) throws IOException {
        File dir = new File(act.getCacheDir(), "shared");
        if (!dir.exists() && !dir.mkdirs()) throw new IOException("mkdir failed");
        long now = System.currentTimeMillis();
        File[] old = dir.listFiles();
        if (old != null) {
            for (File x : old) {
                if (now - x.lastModified() > 24L * 3600L * 1000L) {
                    //noinspection ResultOfMethodCallIgnored
                    x.delete();
                }
            }
        }
        File f = new File(dir, name);
        FileOutputStream fo = new FileOutputStream(f);
        try {
            fo.write(data);
        } finally {
            fo.close();
        }
        return FileProvider.getUriForFile(act, act.getPackageName() + ".files", f);
    }

    private void afterSave(Uri uri, String type, String name) {
        Toast.makeText(act, "ذخیره شد: " + name + "\nپوشه Download ← Sahel Studio", Toast.LENGTH_LONG).show();
        try {
            Intent view = new Intent(Intent.ACTION_VIEW);
            view.setDataAndType(uri, type);
            view.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
            PendingIntent pi = PendingIntent.getActivity(act, (int) (System.currentTimeMillis() & 0xFFFFFFF),
                    view, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
            Notifier.show(act, 2000 + (counter++ % 500), "فایل ذخیره شد", name + " — برای باز کردن لمس کنید", pi);
        } catch (Exception ignored) {
        }
    }

    private void shareUri(Uri uri, String type, String title, String text) {
        try {
            Intent i = new Intent(Intent.ACTION_SEND);
            i.setType(type);
            i.putExtra(Intent.EXTRA_STREAM, uri);
            if (!title.isEmpty()) i.putExtra(Intent.EXTRA_SUBJECT, title);
            if (!text.isEmpty()) i.putExtra(Intent.EXTRA_TEXT, text);
            i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            act.startActivity(Intent.createChooser(i, title.isEmpty() ? "اشتراک‌گذاری" : title));
        } catch (Exception e) {
            Toast.makeText(act, "اشتراک‌گذاری ممکن نشد", Toast.LENGTH_SHORT).show();
        }
    }

    private void shareText(String id, String title, String text) {
        try {
            Intent i = new Intent(Intent.ACTION_SEND);
            i.setType("text/plain");
            if (!title.isEmpty()) i.putExtra(Intent.EXTRA_SUBJECT, title);
            i.putExtra(Intent.EXTRA_TEXT, text);
            act.startActivity(Intent.createChooser(i, title.isEmpty() ? "اشتراک‌گذاری" : title));
            state(id, "ok");
        } catch (Exception e) {
            state(id, "error");
        }
    }

    // ---------------------------------------------------------------- چاپ

    private static String jobName(String t) {
        String s = t == null ? "" : t.replaceAll("[\\\\/:*?\"<>|]", "_").trim();
        return s.isEmpty() ? "Sahel Studio" : s;
    }

    private void printPage() {
        try {
            PrintManager pm = (PrintManager) act.getSystemService(Context.PRINT_SERVICE);
            String job = jobName(act.webView.getTitle());
            PrintDocumentAdapter ad = act.webView.createPrintDocumentAdapter(job);
            pm.print(job, ad, new PrintAttributes.Builder().build());
        } catch (Exception e) {
            Toast.makeText(act, "چاپ ممکن نشد", Toast.LENGTH_SHORT).show();
        }
    }

    /** عکس لحظه‌ای HTML گزارش داخل اپ را در یک WebView پنهان می‌ریزد و به سامانهٔ چاپ/ذخیره PDF اندروید می‌دهد */
    private void printHtml(String html, String title, String base) {
        if (html.isEmpty()) {
            printPage();
            return;
        }
        if (printView != null) {
            try {
                printView.destroy();
            } catch (Exception ignored) {
            }
            printView = null;
        }
        final String job = jobName(title);
        final WebView w = new WebView(act);
        w.getSettings().setJavaScriptEnabled(false);
        w.setWebViewClient(new WebViewClient() {
            private boolean done = false;

            @Override
            public void onPageFinished(final WebView v, String url) {
                if (done) return;
                done = true;
                main.postDelayed(new Runnable() {
                    @Override
                    public void run() {
                        try {
                            PrintManager pm = (PrintManager) act.getSystemService(Context.PRINT_SERVICE);
                            pm.print(job, v.createPrintDocumentAdapter(job), new PrintAttributes.Builder().build());
                        } catch (Exception e) {
                            Toast.makeText(act, "چاپ ممکن نشد", Toast.LENGTH_SHORT).show();
                        }
                    }
                }, 400);
            }
        });
        printView = w;
        String baseUrl = base.startsWith("http") ? base : "https://script.google.com/";
        w.loadDataWithBaseURL(baseUrl, html, "text/html", "UTF-8", null);
    }

    // ---------------------------------------------------------------- میکروفون / تشخیص گفتار

    private void speechStart(final String id, final String lang) {
        act.withPermissions(new String[]{Manifest.permission.RECORD_AUDIO}, new MainActivity.PermCb() {
            @Override
            public void done(boolean granted) {
                if (!granted) {
                    speechEvent(id, "end", "", false, "not-allowed");
                    return;
                }
                if (!SpeechRecognizer.isRecognitionAvailable(act)) {
                    speechEvent(id, "end", "", false, "service-not-allowed");
                    return;
                }
                destroyRecognizer();
                speechId = id;
                speechLast = "";
                speechDone = false;
                recognizer = SpeechRecognizer.createSpeechRecognizer(act);
                recognizer.setRecognitionListener(new RecognitionListener() {
                    @Override
                    public void onReadyForSpeech(Bundle params) {
                        if (id.equals(speechId)) speechEvent(id, "start", "", false, "");
                    }

                    @Override
                    public void onBeginningOfSpeech() {
                    }

                    @Override
                    public void onRmsChanged(float rmsdB) {
                    }

                    @Override
                    public void onBufferReceived(byte[] buffer) {
                    }

                    @Override
                    public void onEndOfSpeech() {
                    }

                    @Override
                    public void onError(int error) {
                        finishSpeech(id, speechLast, mapError(error));
                    }

                    @Override
                    public void onResults(Bundle results) {
                        String t = firstResult(results);
                        if (t.isEmpty()) t = speechLast;
                        if (!t.isEmpty() && !speechDone && id.equals(speechId)) {
                            speechEvent(id, "text", t, true, "");
                        }
                        finishSpeech(id, t, "");
                    }

                    @Override
                    public void onPartialResults(Bundle partialResults) {
                        String t = firstResult(partialResults);
                        if (!t.isEmpty() && id.equals(speechId) && !speechDone) {
                            speechLast = t;
                            speechEvent(id, "text", t, false, "");
                        }
                    }

                    @Override
                    public void onEvent(int eventType, Bundle params) {
                    }
                });
                Intent i = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
                i.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
                i.putExtra(RecognizerIntent.EXTRA_LANGUAGE, lang);
                i.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true);
                i.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1);
                i.putExtra(RecognizerIntent.EXTRA_CALLING_PACKAGE, act.getPackageName());
                recognizer.startListening(i);
            }
        });
    }

    private void speechStop(final String id) {
        if (recognizer != null && id.equals(speechId) && !speechDone) {
            try {
                recognizer.stopListening();
            } catch (Exception ignored) {
            }
            // اگر نتیجه‌ای نیامد، بعد از چند ثانیه با آخرین متن بسته شود
            main.postDelayed(new Runnable() {
                @Override
                public void run() {
                    finishSpeech(id, speechLast, "");
                }
            }, 4000);
        }
    }

    private void finishSpeech(String id, String text, String err) {
        if (speechDone || !id.equals(speechId)) return;
        speechDone = true;
        String e = err;
        if (text != null && !text.isEmpty() && "no-speech".equals(e)) e = "";
        speechEvent(id, "end", text, false, e);
        main.post(new Runnable() {
            @Override
            public void run() {
                destroyRecognizer();
            }
        });
    }

    private void destroyRecognizer() {
        if (recognizer != null) {
            try {
                recognizer.cancel();
                recognizer.destroy();
            } catch (Exception ignored) {
            }
            recognizer = null;
        }
    }

    private static String firstResult(Bundle b) {
        if (b == null) return "";
        ArrayList<String> l = b.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
        return (l == null || l.isEmpty() || l.get(0) == null) ? "" : l.get(0);
    }

    private static String mapError(int e) {
        switch (e) {
            case SpeechRecognizer.ERROR_NO_MATCH:
            case SpeechRecognizer.ERROR_SPEECH_TIMEOUT:
                return "no-speech";
            case SpeechRecognizer.ERROR_NETWORK:
            case SpeechRecognizer.ERROR_NETWORK_TIMEOUT:
            case SpeechRecognizer.ERROR_SERVER:
                return "network";
            case SpeechRecognizer.ERROR_AUDIO:
                return "audio-capture";
            case SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS:
                return "not-allowed";
            case SpeechRecognizer.ERROR_RECOGNIZER_BUSY:
                return "aborted";
            default:
                return "service-not-allowed";
        }
    }

    void destroy() {
        destroyRecognizer();
        if (printView != null) {
            try {
                printView.destroy();
            } catch (Exception ignored) {
            }
        }
        io.shutdown();
    }
}
