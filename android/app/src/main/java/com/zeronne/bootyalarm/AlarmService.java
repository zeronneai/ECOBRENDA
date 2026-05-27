package com.zeronne.bootyalarm;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.content.res.AssetFileDescriptor;
import android.media.AudioAttributes;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.os.VibratorManager;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;
import androidx.core.app.ServiceCompat;

/**
 * Foreground Service de la alarma imparable. Reproduce la canción elegida en
 * loop (USAGE_ALARM, volumen al máximo) con fallback al pitido empaquetado
 * (res/raw/alarm.wav) si la URL falla u offline. Vibra y publica una
 * notificación CATEGORY_ALARM con full-screen intent que abre la app sobre el
 * lockscreen. Solo se detiene cuando el WebView llama AlarmPlugin.stop()
 * (al completar las reps).
 */
public class AlarmService extends Service {
    private static final String CHANNEL = "alarm_service";
    private static final int NOTIF_ID = 4711;

    private MediaPlayer player;
    private Vibrator vibrator;
    private PowerManager.WakeLock wakeLock;
    private boolean started = false;
    private final Handler handler = new Handler(Looper.getMainLooper());

    public static void stop(Context ctx) {
        ctx.stopService(new Intent(ctx, AlarmService.class));
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        int reps = intent != null ? intent.getIntExtra(AlarmReceiver.EXTRA_REPS, 10) : 10;
        String exercise = intent != null ? intent.getStringExtra(AlarmReceiver.EXTRA_EXERCISE) : "squats";
        String songUrl = intent != null ? intent.getStringExtra(AlarmReceiver.EXTRA_SONG_URL) : "";
        String id = intent != null ? intent.getStringExtra(AlarmReceiver.EXTRA_ALARM_ID) : null;

        startForegroundWithNotif(id, exercise, reps);
        acquireWakeLock();
        maxAlarmVolume();
        startSound(songUrl);
        startVibration();
        return START_STICKY;
    }

    private void startForegroundWithNotif(String id, String exercise, int reps) {
        NotificationManager nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel ch = new NotificationChannel(CHANNEL, "Alarma activa", NotificationManager.IMPORTANCE_HIGH);
            ch.setDescription("Booty Alarm sonando");
            try { ch.setBypassDnd(true); } catch (Exception ignored) {}
            ch.setSound(null, null); // el audio lo maneja el MediaPlayer, no el canal
            ch.enableVibration(false);
            nm.createNotificationChannel(ch);
        }

        Intent full = new Intent(this, MainActivity.class);
        full.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        full.putExtra(AlarmReceiver.EXTRA_ALARM_ID, id);
        int piFlags = PendingIntent.FLAG_UPDATE_CURRENT
                | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0);
        PendingIntent pi = PendingIntent.getActivity(this, 0, full, piFlags);

        String exLabel = "lunges".equals(exercise) ? "lunges" : "squats";
        Notification notif = new NotificationCompat.Builder(this, CHANNEL)
                .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
                .setContentTitle("🍑 Booty Alarm")
                .setContentText("Hora de tus " + reps + " " + exLabel + ". ¡A darle!")
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setCategory(NotificationCompat.CATEGORY_ALARM)
                .setOngoing(true)
                .setAutoCancel(false)
                .setFullScreenIntent(pi, true)
                .setContentIntent(pi)
                .build();

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            ServiceCompat.startForeground(this, NOTIF_ID, notif, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
        } else {
            startForeground(NOTIF_ID, notif);
        }
    }

    private AudioAttributes alarmAttrs() {
        return new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_ALARM)
                .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                .build();
    }

    private void startSound(String songUrl) {
        if (songUrl != null && songUrl.startsWith("http")) {
            try {
                player = new MediaPlayer();
                player.setAudioAttributes(alarmAttrs());
                player.setLooping(true);
                player.setDataSource(songUrl);
                player.setOnPreparedListener(mp -> { started = true; mp.start(); });
                player.setOnErrorListener((mp, what, extra) -> { fallbackSound(); return true; });
                player.prepareAsync();
                handler.postDelayed(() -> { if (!started) fallbackSound(); }, 5000);
                return;
            } catch (Exception e) {
                fallbackSound();
                return;
            }
        }
        fallbackSound();
    }

    private void fallbackSound() {
        if (started && player != null) return;
        started = true;
        releasePlayer();
        try {
            AssetFileDescriptor afd = getResources().openRawResourceFd(R.raw.alarm);
            player = new MediaPlayer();
            player.setAudioAttributes(alarmAttrs());
            player.setDataSource(afd.getFileDescriptor(), afd.getStartOffset(), afd.getLength());
            afd.close();
            player.setLooping(true);
            player.prepare();
            player.start();
        } catch (Exception ignored) {}
    }

    private void releasePlayer() {
        if (player != null) {
            try { player.stop(); } catch (Exception ignored) {}
            try { player.release(); } catch (Exception ignored) {}
            player = null;
        }
    }

    private void maxAlarmVolume() {
        try {
            AudioManager am = (AudioManager) getSystemService(AUDIO_SERVICE);
            am.setStreamVolume(AudioManager.STREAM_ALARM, am.getStreamMaxVolume(AudioManager.STREAM_ALARM), 0);
        } catch (Exception ignored) {}
    }

    private void startVibration() {
        long[] pattern = {0, 600, 400};
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                VibratorManager vm = (VibratorManager) getSystemService(Context.VIBRATOR_MANAGER_SERVICE);
                vibrator = vm.getDefaultVibrator();
            } else {
                vibrator = (Vibrator) getSystemService(VIBRATOR_SERVICE);
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                vibrator.vibrate(VibrationEffect.createWaveform(pattern, 0));
            } else {
                vibrator.vibrate(pattern, 0);
            }
        } catch (Exception ignored) {}
    }

    private void acquireWakeLock() {
        try {
            PowerManager pm = (PowerManager) getSystemService(POWER_SERVICE);
            wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "booty:alarm");
            wakeLock.acquire(10 * 60 * 1000L);
        } catch (Exception ignored) {}
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        handler.removeCallbacksAndMessages(null);
        releasePlayer();
        if (vibrator != null) { try { vibrator.cancel(); } catch (Exception ignored) {} }
        if (wakeLock != null && wakeLock.isHeld()) { try { wakeLock.release(); } catch (Exception ignored) {} }
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) { return null; }
}
