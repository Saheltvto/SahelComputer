package ir.sahelcomputer.studio;

import android.app.job.JobInfo;
import android.app.job.JobParameters;
import android.app.job.JobScheduler;
import android.app.job.JobService;
import android.content.ComponentName;
import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * هر ~۱۵ دقیقه (حتی وقتی برنامه بسته است) تعداد پیام و فایل خوانده‌نشده را از سرور می‌پرسد
 * و در صورت افزایش، اعلان نشان می‌دهد.
 */
public class Poller extends JobService {
    static final int JOB_ID = 4242;
    static final String PREFS = "sahel";

    static void schedule(Context c) {
        JobScheduler js = (JobScheduler) c.getSystemService(Context.JOB_SCHEDULER_SERVICE);
        if (js == null) return;
        for (JobInfo j : js.getAllPendingJobs()) {
            if (j.getId() == JOB_ID) return;
        }
        JobInfo info = new JobInfo.Builder(JOB_ID, new ComponentName(c, Poller.class))
                .setRequiredNetworkType(JobInfo.NETWORK_TYPE_ANY)
                .setPeriodic(15 * 60 * 1000L)
                .setPersisted(true)
                .build();
        js.schedule(info);
    }

    @Override
    public boolean onStartJob(final JobParameters params) {
        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    check(getApplicationContext());
                } catch (Throwable ignored) {
                } finally {
                    jobFinished(params, false);
                }
            }
        }).start();
        return true;
    }

    @Override
    public boolean onStopJob(JobParameters params) {
        return false;
    }

    private static void check(Context c) throws Exception {
        SharedPreferences sp = c.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        String uid = sp.getString("user_id", "");
        if (uid.isEmpty()) return;
        String api = readApiUrl(c);
        if (api == null) return;

        int chat = unread(api, "getChatContacts", uid);
        int files = unread(api, "getFiles", uid);
        if (chat < 0 && files < 0) return;

        int lastChat = sp.getInt("last_chat", -1);
        int lastFiles = sp.getInt("last_files", -1);

        if (!MainActivity.visible) {
            if (chat >= 0 && lastChat >= 0 && chat > lastChat) {
                Notifier.show(c, 1001, "پیام جدید در کارتابل",
                        fa(chat) + " پیام خوانده‌نشده دارید.", Notifier.openApp(c));
            }
            if (files >= 0 && lastFiles >= 0 && files > lastFiles) {
                Notifier.show(c, 1002, "فایل جدید دریافت شد",
                        fa(files) + " فایل خوانده‌نشده دارید.", Notifier.openApp(c));
            }
        }
        SharedPreferences.Editor ed = sp.edit();
        if (chat >= 0) ed.putInt("last_chat", chat);
        if (files >= 0) ed.putInt("last_files", files);
        ed.apply();
    }

    private static int unread(String api, String action, String uid) {
        try {
            JSONObject req = new JSONObject();
            req.put("action", action);
            req.put("userId", uid);
            String body = post(api, req.toString());
            JSONObject res = new JSONObject(body);
            if (!res.optBoolean("success", false)) return -1;
            return res.optInt("unreadCount", 0);
        } catch (Exception e) {
            return -1;
        }
    }

    private static String post(String url, String json) throws Exception {
        HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
        try {
            c.setRequestMethod("POST");
            c.setDoOutput(true);
            c.setConnectTimeout(15000);
            c.setReadTimeout(30000);
            c.setInstanceFollowRedirects(true);
            c.setRequestProperty("Content-Type", "text/plain;charset=utf-8");
            OutputStream os = c.getOutputStream();
            os.write(json.getBytes("UTF-8"));
            os.close();
            int code = c.getResponseCode();
            InputStream is = code >= 400 ? c.getErrorStream() : c.getInputStream();
            if (is == null) return "";
            ByteArrayOutputStream bo = new ByteArrayOutputStream();
            byte[] buf = new byte[8192];
            int n;
            while ((n = is.read(buf)) > 0) bo.write(buf, 0, n);
            is.close();
            return bo.toString("UTF-8");
        } finally {
            c.disconnect();
        }
    }

    /** آدرس API از همان js/config.js که داخل برنامه است خوانده می‌شود (تنها یک منبع حقیقت) */
    private static String readApiUrl(Context c) {
        try {
            InputStream is = c.getAssets().open("js/config.js");
            ByteArrayOutputStream bo = new ByteArrayOutputStream();
            byte[] buf = new byte[4096];
            int n;
            while ((n = is.read(buf)) > 0) bo.write(buf, 0, n);
            is.close();
            Matcher m = Pattern.compile("SAHEL_API_URL\\s*=\\s*[\"']([^\"']+)[\"']").matcher(bo.toString("UTF-8"));
            return m.find() ? m.group(1) : null;
        } catch (Exception e) {
            return null;
        }
    }

    private static String fa(int n) {
        String s = String.valueOf(n);
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < s.length(); i++) {
            char ch = s.charAt(i);
            sb.append(ch >= '0' && ch <= '9' ? (char) ('۰' + (ch - '0')) : ch);
        }
        return sb.toString();
    }
}
