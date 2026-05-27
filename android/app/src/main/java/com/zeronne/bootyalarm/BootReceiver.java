package com.zeronne.bootyalarm;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/**
 * Reagenda las alarmas tras reiniciar el teléfono (AlarmManager se borra al
 * reiniciar). Lee la lista persistida en SharedPreferences.
 */
public class BootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null) return;
        String action = intent.getAction();
        if (Intent.ACTION_BOOT_COMPLETED.equals(action)
                || "android.intent.action.QUICKBOOT_POWERON".equals(action)) {
            AlarmScheduler.scheduleFrom(context, AlarmScheduler.loadAlarms(context));
        }
    }
}
