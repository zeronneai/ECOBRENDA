package com.zeronne.bootyalarm;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

import androidx.core.content.ContextCompat;

/**
 * Recibe el disparo exacto de AlarmManager. Arranca el Foreground Service (que
 * suena en loop + full-screen sobre el lockscreen) y reagenda esa alarma para
 * la próxima semana (setAlarmClock es de un solo disparo).
 */
public class AlarmReceiver extends BroadcastReceiver {
    public static final String EXTRA_ALARM_ID = "alarm_id";
    public static final String EXTRA_EXERCISE = "exercise";
    public static final String EXTRA_REPS = "reps";
    public static final String EXTRA_SONG_URL = "song_url";
    public static final String EXTRA_HOUR = "hour";
    public static final String EXTRA_MINUTE = "minute";
    public static final String EXTRA_DOW = "dow";

    @Override
    public void onReceive(Context context, Intent intent) {
        Intent svc = new Intent(context, AlarmService.class);
        if (intent != null && intent.getExtras() != null) {
            svc.putExtras(intent.getExtras());
        }
        ContextCompat.startForegroundService(context, svc);
        AlarmScheduler.rescheduleNext(context, intent);
    }
}
