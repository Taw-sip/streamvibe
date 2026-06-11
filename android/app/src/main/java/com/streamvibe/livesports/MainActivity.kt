package com.streamvibe.livesports

import android.annotation.SuppressLint
import android.app.PictureInPictureParams
import android.content.pm.ActivityInfo
import android.content.res.Configuration
import android.os.Build
import android.os.Bundle
import android.util.Rational
import android.view.View
import android.view.WindowManager
import android.webkit.*
import android.widget.FrameLayout
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var container: FrameLayout
    private var customView: View? = null
    private var customViewCallback: WebChromeClient.CustomViewCallback? = null
    private var isInPip = false

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        WindowCompat.setDecorFitsSystemWindows(window, false)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

        container = FrameLayout(this)
        container.setBackgroundColor(android.graphics.Color.parseColor("#0a0a0f"))
        setContentView(container)

        webView = WebView(this)
        webView.layoutParams = FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.MATCH_PARENT
        )
        container.addView(webView)

        val settings = webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.databaseEnabled = true
        settings.allowFileAccess = true
        settings.allowContentAccess = true
        settings.loadWithOverviewMode = true
        settings.useWideViewPort = true
        settings.mediaPlaybackRequiresUserGesture = false
        settings.mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
        settings.cacheMode = WebSettings.LOAD_DEFAULT
        settings.setSupportZoom(false)
        settings.builtInZoomControls = false
        settings.displayZoomControls = false
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            settings.safeBrowsingEnabled = false
        }

        // JavaScript → Android bridge
        webView.addJavascriptInterface(PipBridge(), "AndroidPip")

        webView.webChromeClient = object : WebChromeClient() {
            override fun onShowCustomView(view: View?, callback: CustomViewCallback?) {
                customView = view
                customViewCallback = callback
                container.addView(view, FrameLayout.LayoutParams(
                    FrameLayout.LayoutParams.MATCH_PARENT,
                    FrameLayout.LayoutParams.MATCH_PARENT
                ))
                webView.visibility = View.GONE
                hideSystemUI()
                requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE
            }
            override fun onHideCustomView() {
                customView?.let { container.removeView(it) }
                customView = null
                customViewCallback?.onCustomViewHidden()
                customViewCallback = null
                webView.visibility = View.VISIBLE
                showSystemUI()
                requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED
            }
            override fun onPermissionRequest(request: PermissionRequest?) {
                request?.grant(request.resources)
            }
            override fun onConsoleMessage(msg: ConsoleMessage?) = true
        }

        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(
                view: WebView?, request: WebResourceRequest?
            ) = false

            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                view?.evaluateJavascript("""
                    (function(){
                        document.body.style.overscrollBehavior = 'none';
                    })();
                """.trimIndent(), null)
            }
        }

        // Register PiP params
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            setPictureInPictureParams(
                PictureInPictureParams.Builder()
                    .setAspectRatio(Rational(16, 9))
                    .build()
            )
        }

        webView.loadUrl("file:///android_asset/public/index.html")
    }

    // ── JS Bridge ──────────────────────────────
    inner class PipBridge {
        @android.webkit.JavascriptInterface
        fun enter() = runOnUiThread { enterPip() }

        @android.webkit.JavascriptInterface
        fun isSupported(): Boolean =
            Build.VERSION.SDK_INT >= Build.VERSION_CODES.O &&
            packageManager.hasSystemFeature(
                android.content.pm.PackageManager.FEATURE_PICTURE_IN_PICTURE
            )
    }

    // ── Enter native PiP ───────────────────────
    private fun enterPip() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            try {
                enterPictureInPictureMode(
                    PictureInPictureParams.Builder()
                        .setAspectRatio(Rational(16, 9))
                        .build()
                )
            } catch (e: Exception) { e.printStackTrace() }
        }
    }

    // ── PiP mode changed ───────────────────────
    override fun onPictureInPictureModeChanged(
        isInPictureInPictureMode: Boolean,
        newConfig: Configuration
    ) {
        super.onPictureInPictureModeChanged(isInPictureInPictureMode, newConfig)
        isInPip = isInPictureInPictureMode

        if (isInPictureInPictureMode) {
            // Hide all UI, show only video fullscreen
            webView.evaluateJavascript("""
                (function(){
                    var els = document.querySelectorAll(
                        '.header,.sidebar,.mobile-sidebar-toggle,
                         .now-playing-bar,.pip-btn-overlay,
                         .copyright,.player-placeholder'
                    );
                    els.forEach(function(e){ e.dataset.pipHidden='1'; e.style.display='none'; });
                    var v = document.getElementById('videoPlayer');
                    if(v){
                        v.style.cssText = 'position:fixed!important;inset:0!important;' +
                            'width:100%!important;height:100%!important;' +
                            'z-index:99999!important;background:#000!important;display:block!important;';
                    }
                })();
            """.trimIndent(), null)
        } else {
            // Restore all UI
            webView.evaluateJavascript("""
                (function(){
                    var els = document.querySelectorAll('[data-pip-hidden]');
                    els.forEach(function(e){ e.style.display=''; e.removeAttribute('data-pip-hidden'); });
                    var v = document.getElementById('videoPlayer');
                    if(v){ v.style.cssText = ''; v.style.display = 'block'; }
                })();
            """.trimIndent(), null)
        }
    }

    // ── Auto-enter PiP on Home press ──────────
    override fun onUserLeaveHint() {
        super.onUserLeaveHint()
        webView.evaluateJavascript(
            "var v=document.getElementById('videoPlayer'); v && !v.paused ? 'playing' : 'paused'"
        ) { result ->
            if (result?.contains("playing") == true) {
                runOnUiThread { enterPip() }
            }
        }
    }

    // ── Back button ────────────────────────────
    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        when {
            isInPip -> moveTaskToBack(false)
            customView != null -> webView.webChromeClient?.onHideCustomView()
            webView.canGoBack() -> webView.goBack()
            else -> super.onBackPressed()
        }
    }

    private fun hideSystemUI() {
        WindowInsetsControllerCompat(window, window.decorView).apply {
            hide(WindowInsetsCompat.Type.systemBars())
            systemBarsBehavior =
                WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        }
    }

    private fun showSystemUI() {
        WindowInsetsControllerCompat(window, window.decorView)
            .show(WindowInsetsCompat.Type.systemBars())
    }

    override fun onResume() { super.onResume(); webView.onResume(); webView.resumeTimers() }
    override fun onPause()  { super.onPause();  webView.onPause();  webView.pauseTimers()  }
    override fun onDestroy(){ webView.destroy(); super.onDestroy() }
}