# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# If your project uses WebView with JS, uncomment the following
# and specify the fully qualified class name to the JavaScript interface
# class:
#-keepclassmembers class fqcn.of.javascript.interface.for.webview {
#   public *;
#}

# Uncomment this to preserve the line number information for
# debugging stack traces.
#-keepattributes SourceFile,LineNumberTable

# If you keep the line number information, uncomment this to
# hide the original source file name.
#-renamesourcefileattribute SourceFile

# ── Reglas de seguridad para cuando se active minifyEnabled en el futuro ──────
# Hoy minifyEnabled = false, así que estas reglas no se aplican todavía, pero
# quedan listas para no romper Capacitor ni MediaPipe al optimizar.

# Capacitor / Cordova: usan reflexión para resolver plugins por nombre.
-keep class com.getcapacitor.** { *; }
-keep class org.apache.cordova.** { *; }
-keep @com.getcapacitor.annotation.CapacitorPlugin class * { *; }
-keepclassmembers class * extends com.getcapacitor.Plugin { *; }

# Plugins nativos propios de la alarma (AlarmPlugin, receivers, etc.)
-keep class com.zeronne.bootyalarm.** { *; }

# MediaPipe Tasks Vision: carga clases/JNI por reflexión.
-keep class com.google.mediapipe.** { *; }
-keep class com.google.protobuf.** { *; }
-dontwarn com.google.mediapipe.**

# WebView con interfaz JS (Capacitor bridge).
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
