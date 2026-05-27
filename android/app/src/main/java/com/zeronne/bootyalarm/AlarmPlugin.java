package com.zeronne.bootyalarm;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONArray;

/**
 * Puente JS <-> nativo para la alarma imparable.
 *   schedule(alarms)      agenda con AlarmManager exacto
 *   cancelAll()           cancela todo
 *   stop()                detiene el servicio (al completar las reps)
 *   canScheduleExact()    Android 12+: ¿puede agendar exacto?
 *   openExactSettings()   abre los ajustes para permitirlo
 *   consumePending()      id de alarma con que se abrió la app (cold start)
 */
@CapacitorPlugin(name = "Alarm")
public class AlarmPlugin extends Plugin {
    // id de la alarma con la que se abrió la app desde el full-screen intent.
    public static volatile String pendingAlarmId = null;

    @PluginMethod
    public void schedule(PluginCall call) {
        try {
            JSONArray alarms = call.getArray("alarms");
            AlarmScheduler.scheduleAll(getContext(), alarms);
            call.resolve();
        } catch (Exception e) {
            call.reject("schedule failed: " + e.getMessage());
        }
    }

    @PluginMethod
    public void cancelAll(PluginCall call) {
        AlarmScheduler.cancelAll(getContext());
        call.resolve();
    }

    @PluginMethod
    public void stop(PluginCall call) {
        AlarmService.stop(getContext());
        call.resolve();
    }

    @PluginMethod
    public void canScheduleExact(PluginCall call) {
        JSObject r = new JSObject();
        r.put("value", AlarmScheduler.canScheduleExact(getContext()));
        call.resolve(r);
    }

    @PluginMethod
    public void openExactSettings(PluginCall call) {
        AlarmScheduler.openExactSettings(getContext());
        call.resolve();
    }

    @PluginMethod
    public void consumePending(PluginCall call) {
        JSObject r = new JSObject();
        r.put("id", pendingAlarmId);
        pendingAlarmId = null;
        call.resolve(r);
    }
}
