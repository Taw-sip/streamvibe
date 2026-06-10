# Add project specific ProGuard rules here.
# Keep WebView JavaScript interfaces
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
-keepattributes JavascriptInterface
-keep public class com.streamvibe.livesports.MainActivity
