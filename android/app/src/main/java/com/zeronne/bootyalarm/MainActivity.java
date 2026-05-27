package com.zeronne.bootyalarm;

import android.content.Intent;
import android.os.Build;
import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(AlarmPlugin.class);
        super.onCreate(savedInstanceState);
        setupLockscreen();
        handleAlarmIntent(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleAlarmIntent(intent);
    }

    // Permite que la Activity aparezca sobre el lockscreen y encienda la pantalla.
    private void setupLockscreen() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
        }
    }

    // Conecta el disparo nativo -> WebView: guarda el id (cold start) y emite un
    // evento 'native-alarm' (warm start, JS ya escuchando).
    private void handleAlarmIntent(Intent intent) {
        if (intent == null) return;
        String id = intent.getStringExtra(AlarmReceiver.EXTRA_ALARM_ID);
        if (id == null) return;
        AlarmPlugin.pendingAlarmId = id;
        final String safe = id.replace("\\", "").replace("'", "");
        if (bridge != null && bridge.getWebView() != null) {
            bridge.getWebView().post(() ->
                    bridge.eval("window.dispatchEvent(new CustomEvent('native-alarm',{detail:{id:'" + safe + "'}}))", null));
        }
    }
}
