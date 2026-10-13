package com.zhi321wei.romanticrestaurant;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.os.Bundle;
import android.view.View;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

public class MainActivity extends Activity {

    private WebView webView;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // 沉浸式：隐藏状态栏与导航栏
        getWindow().getDecorView().setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                        | View.SYSTEM_UI_FLAG_FULLSCREEN
                        | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                        | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                        | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                        | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION);

        webView = new WebView(this);
        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);            // localStorage（游戏存档）
        s.setMediaPlaybackRequiresUserGesture(false); // 背景音乐自动播放
        s.setAllowFileAccess(true);
        s.setAllowFileAccessFromFileURLs(true);       // file:// 页面读写本地存档
        s.setAllowUniversalAccessFromFileURLs(true);
        s.setUseWideViewPort(true);
        s.setLoadWithOverviewMode(true);
        s.setBuiltInZoomControls(false);
        s.setDisplayZoomControls(false);

        webView.setWebViewClient(new WebViewClient());
        webView.loadUrl("file:///android_asset/www/index.html");

        setContentView(webView);
    }

    @Override
    public void onBackPressed() {
        // 单击返回键退到桌面而不是杀进程，保住游戏状态
        moveTaskToBack(true);
    }

    // v1.2 切后台时静音：暂停页面里的背景音乐，回前台再恢复
    @Override
    protected void onPause() {
        if (webView != null) {
            webView.evaluateJavascript(
                "window.__rrAudioSuspend && window.__rrAudioSuspend()", null);
        }
        super.onPause();
    }

    @Override
    protected void onResume() {
        if (webView != null) {
            webView.evaluateJavascript(
                "window.__rrAudioResume && window.__rrAudioResume()", null);
        }
        super.onResume();
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }
}
