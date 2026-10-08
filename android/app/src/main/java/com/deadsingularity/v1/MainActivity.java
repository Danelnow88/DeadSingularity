package com.deadsingularity.v1;

import android.app.Activity;
import android.os.Bundle;
import android.view.View;
import android.webkit.WebView;
import android.webkit.WebSettings;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebChromeClient;
import android.webkit.PermissionRequest;
import android.content.Intent;
import android.net.Uri;
import android.webkit.ValueCallback;
import java.io.ByteArrayInputStream;
import java.util.Collections;
import androidx.webkit.WebViewAssetLoader;
import androidx.webkit.WebViewClientCompat;

// All gameplay remains in the same immutable web delivery. No native JS bridge.
public final class MainActivity extends Activity {
 private WebView web;
 private ValueCallback<Uri[]> fileResult;
 private static final int FILE_REQUEST = 7;
 private static final String ORIGIN = "https://appassets.androidplatform.net";
 private boolean local(Uri uri) { return "https".equals(uri.getScheme()) && "appassets.androidplatform.net".equals(uri.getHost()) && uri.getPath() != null && uri.getPath().startsWith("/assets/game/"); }
 @Override public void onCreate(Bundle saved) {
  super.onCreate(saved);
  getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY);
  web = new WebView(this);
  WebSettings settings=web.getSettings();
  settings.setJavaScriptEnabled(true);settings.setDomStorageEnabled(true);
  settings.setAllowFileAccess(false);settings.setAllowContentAccess(false);
  settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
  settings.setMediaPlaybackRequiresUserGesture(true);
  settings.setSupportMultipleWindows(false);
  web.setWebContentsDebuggingEnabled(BuildConfig.DEBUG);
  final WebViewAssetLoader assets=new WebViewAssetLoader.Builder().addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this)).build();
  web.setWebViewClient(new WebViewClientCompat() {
   @Override public WebResourceResponse shouldInterceptRequest(WebView view,WebResourceRequest request){
    if(local(request.getUrl())) {
     WebResourceResponse response=assets.shouldInterceptRequest(request.getUrl());
     if(response!=null)return response;
    }
    return new WebResourceResponse("text/plain","UTF-8",403,"Forbidden",Collections.emptyMap(),new ByteArrayInputStream(new byte[0]));
   }
   @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest request){return !local(request.getUrl());}
  });
  web.setWebChromeClient(new WebChromeClient(){
   @Override public void onPermissionRequest(PermissionRequest request){request.deny();}
   @Override public boolean onShowFileChooser(WebView view,ValueCallback<Uri[]> result,FileChooserParams params){
    if(fileResult!=null)fileResult.onReceiveValue(null);fileResult=result;
    Intent intent=new Intent(Intent.ACTION_OPEN_DOCUMENT);intent.addCategory(Intent.CATEGORY_OPENABLE);intent.setType("application/json");
    try{startActivityForResult(intent,FILE_REQUEST);return true;}catch(Exception error){fileResult.onReceiveValue(null);fileResult=null;return false;}
   }
  });
  setContentView(web);
  if(saved==null||web.restoreState(saved)==null)web.loadUrl(ORIGIN+"/assets/game/index.html?mobile=1");
 }
 @Override protected void onPause(){
  web.evaluateJavascript("(()=>{if(window.NV&&NV.getRuntimeSnapshot){const s=NV.getRuntimeSnapshot();if(s.state==='playing'&&!s.paused)NV.input.togglePause();}if(window.NV&&NV.audio&&NV.audio.stopAllWeapons)NV.audio.stopAllWeapons();})()",null);
  web.onPause();super.onPause();
 }
 @Override protected void onResume(){super.onResume();if(web!=null)web.onResume();}
 @Override public void onSaveInstanceState(Bundle out){web.saveState(out);super.onSaveInstanceState(out);}
 @Override protected void onActivityResult(int request,int result,Intent data){
  super.onActivityResult(request,result,data);
  if(request==FILE_REQUEST&&fileResult!=null){fileResult.onReceiveValue(result==RESULT_OK&&data!=null&&data.getData()!=null?new Uri[]{data.getData()}:null);fileResult=null;}
 }
 @Override public void onBackPressed(){web.evaluateJavascript("(()=>{if(window.NV&&NV.input&&NV.getRuntimeSnapshot){const s=NV.getRuntimeSnapshot();if(s.state==='playing'&&!s.paused)NV.input.togglePause();}})()",null);}
 @Override protected void onDestroy(){if(fileResult!=null)fileResult.onReceiveValue(null);web.destroy();super.onDestroy();}
}

