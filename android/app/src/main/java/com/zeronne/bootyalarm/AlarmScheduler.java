package com.zeronne.bootyalarm;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.Calendar;

/**
 * Agenda las alarmas con AlarmManager.setAlarmClock (exacto, sobrevive a Doze,
 * exento de optimización de batería). Persiste la lista en SharedPreferences
 * para poder reagendar tras un reinicio (BootReceiver).
 */
public class AlarmScheduler {
    private static final String PREFS = "booty_alarm";
    private static final String KEY_ALARMS = "alarms";
    // dow app (Lun=0 … Dom=6) -> Calendar.DAY_OF_WEEK (Dom=1 … Sáb=7)
    private static final int[] CAL_DOW = {2, 3, 4, 5, 6, 7, 1};

    private static AlarmManager am(Context ctx) {
        return (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
    }

    public static boolean canScheduleExact(Context ctx) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            return am(ctx).canScheduleExactAlarms();
        }
        return true;
    }

    public static void openExactSettings(Context ctx) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            Intent i = new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM);
            i.setData(Uri.parse("package:" + ctx.getPackageName()));
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            try { ctx.startActivity(i); } catch (Exception ignored) {}
        }
    }

    private static int requestCode(String id, int dow) {
        int h = Math.abs(id.hashCode()) % 100000;
        return h * 10 + dow + 1;
    }

    private static int piFlags() {
        int f = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) f |= PendingIntent.FLAG_IMMUTABLE;
        return f;
    }

    /** Cancela lo anterior, guarda la nueva lista y agenda todo. */
    public static void scheduleAll(Context ctx, JSONArray alarms) {
        cancelAll(ctx);
        saveAlarms(ctx, alarms);
        scheduleFrom(ctx, alarms);
    }

    public static void scheduleFrom(Context ctx, JSONArray alarms) {
        if (alarms == null) return;
        for (int i = 0; i < alarms.length(); i++) {
            JSONObject a = alarms.optJSONObject(i);
            if (a == null) continue;
            String id = a.optString("id");
            int hour = a.optInt("hour");
            int minute = a.optInt("minute");
            int reps = a.optInt("reps", 10);
            String exercise = a.optString("exercise", "squats");
            String songUrl = a.optString("songUrl", "");
            JSONArray days = a.optJSONArray("days");
            if (id == null || id.length() == 0 || days == null) continue;
            for (int d = 0; d < days.length(); d++) {
                int dow = days.optInt(d, -1);
                if (dow < 0 || dow > 6) continue;
                scheduleOne(ctx, id, hour, minute, dow, exercise, reps, songUrl);
            }
        }
    }

    public static void scheduleOne(Context ctx, String id, int hour, int minute, int dow,
                                   String exercise, int reps, String songUrl) {
        long trigger = nextTrigger(hour, minute, dow);

        Intent fire = new Intent(ctx, AlarmReceiver.class);
        fire.putExtra(AlarmReceiver.EXTRA_ALARM_ID, id);
        fire.putExtra(AlarmReceiver.EXTRA_EXERCISE, exercise);
        fire.putExtra(AlarmReceiver.EXTRA_REPS, reps);
        fire.putExtra(AlarmReceiver.EXTRA_SONG_URL, songUrl);
        fire.putExtra(AlarmReceiver.EXTRA_HOUR, hour);
        fire.putExtra(AlarmReceiver.EXTRA_MINUTE, minute);
        fire.putExtra(AlarmReceiver.EXTRA_DOW, dow);

        int rc = requestCode(id, dow);
        PendingIntent op = PendingIntent.getBroadcast(ctx, rc, fire, piFlags());

        Intent show = new Intent(ctx, MainActivity.class);
        PendingIntent showPi = PendingIntent.getActivity(ctx, rc, show, piFlags());

        AlarmManager am = am(ctx);
        try {
            if (canScheduleExact(ctx)) {
                am.setAlarmClock(new AlarmManager.AlarmClockInfo(trigger, showPi), op);
            } else {
                am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, trigger, op);
            }
        } catch (SecurityException e) {
            am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, trigger, op);
        }
    }

    /** Tras disparar, reagenda la MISMA alarma (próxima semana). */
    public static void rescheduleNext(Context ctx, Intent fired) {
        if (fired == null) return;
        String id = fired.getStringExtra(AlarmReceiver.EXTRA_ALARM_ID);
        if (id == null) return;
        scheduleOne(ctx, id,
                fired.getIntExtra(AlarmReceiver.EXTRA_HOUR, 7),
                fired.getIntExtra(AlarmReceiver.EXTRA_MINUTE, 0),
                fired.getIntExtra(AlarmReceiver.EXTRA_DOW, 0),
                fired.getStringExtra(AlarmReceiver.EXTRA_EXERCISE),
                fired.getIntExtra(AlarmReceiver.EXTRA_REPS, 10),
                fired.getStringExtra(AlarmReceiver.EXTRA_SONG_URL));
    }

    public static void cancelAll(Context ctx) {
        JSONArray alarms = loadAlarms(ctx);
        if (alarms == null) return;
        AlarmManager am = am(ctx);
        for (int i = 0; i < alarms.length(); i++) {
            JSONObject a = alarms.optJSONObject(i);
            if (a == null) continue;
            String id = a.optString("id");
            JSONArray days = a.optJSONArray("days");
            if (id == null || id.length() == 0 || days == null) continue;
            for (int d = 0; d < days.length(); d++) {
                int dow = days.optInt(d, -1);
                if (dow < 0 || dow > 6) continue;
                int rc = requestCode(id, dow);
                Intent fire = new Intent(ctx, AlarmReceiver.class);
                PendingIntent op = PendingIntent.getBroadcast(ctx, rc, fire, piFlags());
                am.cancel(op);
            }
        }
    }

    private static long nextTrigger(int hour, int minute, int dow) {
        Calendar c = Calendar.getInstance();
        c.set(Calendar.HOUR_OF_DAY, hour);
        c.set(Calendar.MINUTE, minute);
        c.set(Calendar.SECOND, 0);
        c.set(Calendar.MILLISECOND, 0);
        int target = CAL_DOW[dow];
        long now = System.currentTimeMillis();
        while (c.get(Calendar.DAY_OF_WEEK) != target || c.getTimeInMillis() <= now) {
            c.add(Calendar.DAY_OF_YEAR, 1);
        }
        return c.getTimeInMillis();
    }

    private static SharedPreferences prefs(Context ctx) {
        return ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    private static void saveAlarms(Context ctx, JSONArray alarms) {
        prefs(ctx).edit().putString(KEY_ALARMS, alarms == null ? "[]" : alarms.toString()).apply();
    }

    public static JSONArray loadAlarms(Context ctx) {
        String s = prefs(ctx).getString(KEY_ALARMS, "[]");
        try { return new JSONArray(s); } catch (Exception e) { return new JSONArray(); }
    }
}
