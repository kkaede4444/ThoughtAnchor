package io.github.kkaidoumitsuka.thoughtanchor

import android.app.AlertDialog
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.webkit.*
import android.widget.EditText
import android.widget.FrameLayout
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.webkit.*
import com.journeyapps.barcodescanner.ScanContract
import com.journeyapps.barcodescanner.ScanOptions
import kotlinx.coroutines.*
import org.json.*
import java.util.concurrent.atomic.AtomicInteger

class MainActivity : ComponentActivity() {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)
    private lateinit var web: WebView
    private lateinit var host: AnchorHost
    private var fileResult: CompletableDeferred<Uri?>? = null
    private var scanResult: CompletableDeferred<String?>? = null
    private val open = registerForActivityResult(ActivityResultContracts.OpenDocument()) { fileResult?.complete(it) }
    private val create = registerForActivityResult(ActivityResultContracts.CreateDocument("application/octet-stream")) { fileResult?.complete(it) }
    private val scan = registerForActivityResult(ScanContract()) { scanResult?.complete(it.contents) }
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val container = FrameLayout(this); container.setBackgroundColor(Color.rgb(250,249,245))
        web = WebView(this); web.setBackgroundColor(Color.rgb(250,249,245)); container.addView(web,FrameLayout.LayoutParams(-1,-1)); setContentView(container)
        if (!WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER) || !WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT)) {
            AlertDialog.Builder(this).setMessage("Update Android System WebView to use ThoughtAnchor.").setPositiveButton("OK") { _,_ -> finish() }.show(); return
        }
        configureWeb(web, this)
        WebView.setWebContentsDebuggingEnabled(applicationInfo.flags and android.content.pm.ApplicationInfo.FLAG_DEBUGGABLE != 0)
        val tablet = resources.configuration.smallestScreenWidthDp >= 600
        WebViewCompat.addDocumentStartJavaScript(web, "window.anchorEnvironment={tablet:$tablet};window.AnchorBack=()=>!window.dispatchEvent(new Event('anchor-back',{cancelable:true}));", setOf(ORIGIN))
        WebViewCompat.addWebMessageListener(web, "anchorHost", setOf(ORIGIN)) { _, message, origin, mainFrame, reply ->
            if (!mainFrame || origin.toString() != ORIGIN) return@addWebMessageListener
            scope.launch {
                var id = 0L
                try {
                    val input = JSONObject(message.data ?: "{}"); id = input.getLong("id")
                    val action = input.getString("action"); val args = input.getJSONArray("args")
                    val result: Any? = when (action) {
                        "import-project" -> { fileResult = CompletableDeferred(); open.launch(arrayOf("application/json", "application/octet-stream", "*/*")); val uri = fileResult!!.await(); if (uri == null) null else host.importProject(read(uri)) }
                        "export-project", "export-article" -> {
                            val text = host.export(action, args); fileResult = CompletableDeferred(); create.launch("ThoughtAnchor.${if (action == "export-project") "thoughtanchor" else args.getString(1)}")
                            val uri = fileResult!!.await(); if (uri == null) null else { withContext(Dispatchers.IO) { contentResolver.openOutputStream(uri, "wt")!!.use { it.write(text.toByteArray(Charsets.UTF_8)) } }; uri.toString() }
                        }
                        "capture-window" -> { web.evaluateJavascript("document.querySelector('[aria-label=\"收件盒快速输入\"]')?.focus()", null); null }
                        "hide-capture", "open-storage" -> null
                        "sync" -> {
                            var value = args.optString(1)
                            if (args.getString(0) == "connect" && value == "scan") { scanResult = CompletableDeferred(); scan.launch(ScanOptions().setDesiredBarcodeFormats(ScanOptions.QR_CODE).setOrientationLocked(false).setBeepEnabled(false)); value = scanResult!!.await() ?: "" }
                            host.syncAction(args.getString(0), value)
                        }
                        else -> host.dispatch(action, args)
                    }
                    reply.postMessage(JSONObject().put("id", id).put("result", result ?: JSONObject.NULL).toString())
                } catch (error: Exception) { reply.postMessage(JSONObject().put("id", id).put("error", error.message ?: "Operation failed").toString()) }
            }
        }
        web.webChromeClient = object : WebChromeClient() {
            override fun onJsPrompt(view: WebView?, url: String?, message: String?, defaultValue: String?, result: JsPromptResult): Boolean {
                val input = EditText(this@MainActivity); input.setText(defaultValue)
                AlertDialog.Builder(this@MainActivity).setMessage(message).setView(input).setPositiveButton(android.R.string.ok) { _,_ -> result.confirm(input.text.toString()) }.setNegativeButton(android.R.string.cancel) { _,_ -> result.cancel() }.setOnCancelListener { result.cancel() }.show(); return true
            }
        }
        ViewCompat.setOnApplyWindowInsetsListener(container) { view, insets ->
            val bars = insets.getInsets(WindowInsetsCompat.Type.systemBars()); val ime = insets.getInsets(WindowInsetsCompat.Type.ime())
            view.setPadding(bars.left, bars.top, bars.right, maxOf(bars.bottom, ime.bottom)); insets
        }
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() { web.evaluateJavascript("window.AnchorBack?.() || false") { if (it != "true") moveTaskToBack(true) } }
        })
        scope.launch {
            host = HostManager.get(applicationContext); host.ready.await()
            host.views.add(web)
            web.loadUrl("$ORIGIN/ui/index.html")
            receive(intent)
        }
    }
    private suspend fun read(uri: Uri): String = withContext(Dispatchers.IO) { contentResolver.openInputStream(uri)!!.use { stream -> val output = java.io.ByteArrayOutputStream(); val bytes = ByteArray(8192); while (true) { val count = stream.read(bytes); if (count < 0) break; require(output.size() + count <= 30 * 1024 * 1024) { "File exceeds 30 MB" }; output.write(bytes,0,count) }; output.toString("UTF-8") } }
    private suspend fun receive(input: Intent) {
        if (input.action == Intent.ACTION_SEND) input.getStringExtra(Intent.EXTRA_TEXT)?.takeIf { it.isNotBlank() }?.let { host.dispatch("command", JSONArray().put(JSONObject().put("type", "capture").put("text", it))) }
        if (input.action == Intent.ACTION_VIEW) input.data?.let { host.importProject(read(it)) }
    }
    override fun onNewIntent(intent: Intent) { super.onNewIntent(intent); setIntent(intent); scope.launch { if (::host.isInitialized) receive(intent) } }
    override fun onResume() { super.onResume(); HostManager.foreground.incrementAndGet() }
    override fun onPause() { HostManager.foreground.decrementAndGet(); super.onPause() }
    override fun onDestroy() { if (::host.isInitialized) host.views.remove(web); web.destroy(); scope.cancel(); super.onDestroy() }
}

const val ORIGIN = "https://thoughtanchor.local"
fun configureWeb(web: WebView, context: android.content.Context, finished: (() -> Unit)? = null) {
    web.settings.javaScriptEnabled = true
    web.settings.allowFileAccess = false; web.settings.allowContentAccess = false
    web.settings.domStorageEnabled = false
    val assets = WebViewAssetLoader.Builder().setDomain("thoughtanchor.local").addPathHandler("/", WebViewAssetLoader.AssetsPathHandler(context)).build()
    web.webViewClient = object : WebViewClientCompat() {
        override fun onPageFinished(view: WebView?, url: String?) { finished?.invoke() }
        override fun shouldInterceptRequest(view: WebView?, request: WebResourceRequest): WebResourceResponse? = assets.shouldInterceptRequest(request.url) ?: WebResourceResponse("text/plain", "UTF-8", 403, "Blocked", emptyMap(), java.io.ByteArrayInputStream(ByteArray(0)))
        override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean = request.url.scheme != "https" || request.url.host != "thoughtanchor.local"
    }
}
object HostManager {
    private var host: AnchorHost? = null
    val foreground = AtomicInteger(0)
    suspend fun get(context: android.content.Context): AnchorHost = withContext(Dispatchers.Main) { host ?: AnchorHost(context.applicationContext).also { host = it } }
}
