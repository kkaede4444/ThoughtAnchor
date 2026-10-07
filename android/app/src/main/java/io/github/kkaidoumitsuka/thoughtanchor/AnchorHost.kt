package io.github.kkaidoumitsuka.thoughtanchor

import android.content.Context
import android.net.Uri
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.AtomicFile
import android.webkit.WebView
import androidx.work.*
import kotlinx.coroutines.*
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import org.json.*
import java.io.*
import java.net.*
import java.security.*
import java.security.cert.X509Certificate
import java.time.Instant
import java.util.*
import java.util.concurrent.TimeUnit
import javax.crypto.*
import javax.crypto.spec.GCMParameterSpec
import javax.net.ssl.*
import kotlin.coroutines.resume

class AnchorHost(private val context: Context) {
    val ready = CompletableDeferred<Unit>()
    val views = mutableSetOf<WebView>()
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)
    private val gate = Mutex()
    private val syncGate = Mutex()
    private val document = WebView(context)
    private val folder = File(context.filesDir, "data").apply { mkdirs() }
    private val workspaceFile = File(folder, "workspace.json")
    private val metaFile = File(folder, "sync.json")
    private val pendingFile = File(folder, "sync-pending.json")
    private var workspace = JSONObject()
    private var secrets = JSONObject()
    private var metadata = JSONObject().put("device", UUID.randomUUID().toString()).put("enabled", false)
    private var recovery: String? = null
    private var error: String? = null
    private var connected = false
    private var aiConnection: HttpURLConnection? = null
    private var aiCanceled = false
    private var aiBusy = false
    init {
        configureWeb(document, context) { if (!ready.isCompleted) scope.launch { initialize() } }
        document.loadUrl("$ORIGIN/domain.html")
        scope.launch {
            ready.await()
            while (isActive) {
                if (HostManager.foreground.get() > 0 && metadata.optBoolean("enabled")) try { syncNow() } catch (_: Exception) {}
                delay(if (connected) 5000 else 10000)
            }
        }
    }
    private suspend fun initialize() {
        try {
            for (candidate in listOf(workspaceFile, File(folder,"workspace.json.bak"), File(folder,"workspace.json.bak2"))) {
                if (!candidate.exists()) continue
                try { workspace = domain("initialize", JSONArray().put(JSONObject(candidate.readText())) ) as JSONObject; if (candidate != workspaceFile) { recovery = "Recovered a local backup."; persist(workspace) }; break }
                catch (_: Exception) { if (candidate == workspaceFile) { candidate.copyTo(File(folder,"workspace.damaged-${System.currentTimeMillis()}.json")); recovery = "The workspace was damaged. A preserved copy is available." } }
            }
            if (!workspace.has("projects")) { workspace = domain("initialize", JSONArray().put(JSONObject.NULL).put(context.resources.configuration.locales[0].toLanguageTag())) as JSONObject; persist(workspace) }
            try { val f = File(folder,"secrets.json"); if (f.exists()) secrets = JSONObject(f.readText()) } catch (_: Exception) { recovery = "Saved keys could not be read. Save them again in Settings." }
            try { if (metaFile.exists()) metadata = JSONObject(metaFile.readText()) } catch (_: Exception) { error = "Pairing metadata could not be read. Pair again." }
            ready.complete(Unit)
            schedule()
        } catch (exception: Exception) { ready.completeExceptionally(exception) }
    }
    private suspend fun domain(action: String, args: JSONArray = JSONArray()): Any? = withContext(Dispatchers.Main) {
        val input = JSONObject().put("action",action).put("args",args).toString()
        val raw = suspendCancellableCoroutine<String> { continuation -> document.evaluateJavascript("JSON.stringify(Anchor.invoke(JSON.parse(${JSONObject.quote(input)})))") { if (continuation.isActive) continuation.resume(it) } }
        val json = JSONObject(JSONTokener(raw).nextValue() as String)
        if (json.has("error")) throw IOException(json.getString("error"))
        json.opt("result").takeUnless { it == JSONObject.NULL }
    }
    private suspend fun atomic(file: File, text: String) = withContext(Dispatchers.IO) {
        val atomic = AtomicFile(file); val output = atomic.startWrite()
        try { output.write(text.toByteArray(Charsets.UTF_8)); output.fd.sync(); atomic.finishWrite(output) } catch (error: Exception) { atomic.failWrite(output); throw error }
    }
    private suspend fun persist(next: JSONObject) {
        withContext(Dispatchers.IO) { if (workspaceFile.exists()) { if (workspace.optInt("version") < 3 && next.optInt("version") == 3) { val migration = File(folder,"workspace.v2-backup.json"); if (!migration.exists()) workspaceFile.copyTo(migration) }; val b = File(folder,"workspace.json.bak"); if (b.exists()) b.copyTo(File(folder,"workspace.json.bak2"),true); workspaceFile.copyTo(b,true) } }
        atomic(workspaceFile,next.toString(2))
    }
    private fun cipher(value: String, encrypt: Boolean): String {
        val store = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        if (!store.containsAlias("thoughtanchor-secrets")) KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES,"AndroidKeyStore").apply { init(KeyGenParameterSpec.Builder("thoughtanchor-secrets",KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT).setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).setKeySize(256).build()); generateKey() }
        val key = store.getKey("thoughtanchor-secrets",null)
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        if (encrypt) { cipher.init(Cipher.ENCRYPT_MODE,key); val bytes = cipher.doFinal(value.toByteArray(Charsets.UTF_8)); return Base64.getEncoder().encodeToString(cipher.iv + bytes) }
        val bytes = Base64.getDecoder().decode(value); cipher.init(Cipher.DECRYPT_MODE,key,GCMParameterSpec(128,bytes.copyOfRange(0,12))); return String(cipher.doFinal(bytes.copyOfRange(12,bytes.size)),Charsets.UTF_8)
    }
    private suspend fun snapshot(): JSONObject {
        val key = domain("scope") as String
        val hasKey = try { if (secrets.has(key)) cipher(secrets.getString(key), false).isNotBlank() else false } catch (_: Exception) { false }
        return domain("snapshot",JSONArray().put(hasKey).put(folder.absolutePath).put(recovery ?: JSONObject.NULL)) as JSONObject
    }
    private suspend fun broadcast() {
        val message = JSONObject().put("kind","changed").put("snapshot",snapshot()).toString()
        withContext(Dispatchers.Main) { views.toList().forEach { it.evaluateJavascript("window.AnchorReceive?.(JSON.parse(${JSONObject.quote(message)}))",null) } }
    }
    private suspend fun commit(next: JSONObject): JSONObject {
        try { if (workspace.toString() != next.toString()) persist(next); workspace = domain("commit") as JSONObject }
        catch (e: Exception) { domain("discard"); throw e }
        broadcast(); return snapshot()
    }
    suspend fun dispatch(action: String, args: JSONArray): Any? {
        ready.await()
        if (action == "cancel-ai") { aiCanceled = true; aiConnection?.disconnect(); return null }
        if (action == "ai") return generate(args.getJSONObject(0))
        return gate.withLock {
            when (action) {
                "snapshot" -> snapshot()
                "command" -> commit(domain("prepare-command",args) as JSONObject)
                "key" -> {
                    val key = domain("scope") as String; val next = JSONObject(secrets.toString())
                    when (args.getString(0)) { "delete" -> next.remove(key); "set" -> { val value = args.getString(1).trim(); require(value.isNotBlank() && value.length <= 4000); next.put(key,cipher(value,true)) }; else -> throw IOException("Unknown key operation") }
                    atomic(File(folder,"secrets.json"),next.toString()); secrets = next; broadcast(); snapshot()
                }
                else -> throw IOException("Unknown host operation")
            }
        }
    }
    suspend fun importProject(text: String): JSONObject { ready.await(); return gate.withLock { commit(domain("prepare-import",JSONArray().put(JSONObject(text))) as JSONObject) } }
    suspend fun export(action: String, args: JSONArray): String { ready.await(); return gate.withLock { val result = domain(action,args); if (result is JSONObject) result.toString(2) else result as String } }
    private suspend fun generate(request: JSONObject): Any? {
        check(!aiBusy) { "AI is already running" }; aiBusy = true; aiCanceled = false
        try {
            val (plan, key) = gate.withLock {
                val plan = domain("prepare-ai",JSONArray().put(request)) as JSONObject
                val keyScope = plan.getString("keyScope")
                check(secrets.has(keyScope)) { domain("translate",JSONArray().put("先到设置里保存这个接口的 API 密钥。")) as String }
                plan to cipher(secrets.getString(keyScope),false)
            }
            suspend fun phase(task: String, assembled: String? = null): String {
                if (aiCanceled) throw IOException("Canceled")
                val wire = gate.withLock { domain("ai-wire",JSONArray().put(plan).put(key).put(task).put(assembled ?: JSONObject.NULL)) as JSONObject }
                val deadline = scope.launch { delay(60000); aiConnection?.disconnect() }
                val body = try { withContext(Dispatchers.IO) {
                    val connection = URL(wire.getString("url")).openConnection() as HttpURLConnection; aiConnection = connection
                    connection.instanceFollowRedirects = false; connection.connectTimeout = 60000; connection.readTimeout = 60000; connection.requestMethod = "POST"; connection.doOutput = true
                    val headers = wire.getJSONObject("headers"); headers.keys().forEach { connection.setRequestProperty(it,headers.getString(it)) }
                    try {
                        connection.outputStream.use { it.write(wire.get("body").toString().toByteArray(Charsets.UTF_8)) }
                        if (connection.responseCode !in 200..299) throw IOException("HTTP ${connection.responseCode}")
                        connection.inputStream.use { input -> val output = ByteArrayOutputStream(); val bytes = ByteArray(8192); while (true) { val size = input.read(bytes); if (size < 0) break; if (aiCanceled) throw IOException("Canceled"); if (output.size()+size > 2000000) throw IOException("Response too large"); output.write(bytes,0,size) }; output.toString("UTF-8") }
                    } finally { connection.disconnect(); aiConnection = null }
                } } finally { deadline.cancel() }
                if (aiCanceled) throw IOException("Canceled")
                return gate.withLock { domain("ai-phase",JSONArray().put(plan).put(task).put(JSONObject(body))) as String }
            }
            val task = request.getString("task")
            if (task == "polish") { val result = phase("polish"); return gate.withLock { domain("finish-ai",JSONArray().put(plan).put("polish").put(result)) } }
            val assembled = phase("assemble")
            if (task == "assemble") return gate.withLock { domain("finish-ai",JSONArray().put(plan).put("assemble").put(assembled)) }
            return try { val polished = phase("polish",assembled); gate.withLock { domain("finish-ai",JSONArray().put(plan).put("polish").put(polished)) } }
            catch (e: Exception) { if (aiCanceled) throw e; gate.withLock { domain("finish-ai",JSONArray().put(plan).put("assemble").put(assembled).put("拼接已完成，美化没有完成；可以采用拼接稿或重试美化。")) } }
        } finally { aiBusy = false }
    }
    private fun status(): JSONObject = JSONObject().put("enabled",metadata.optBoolean("enabled")).put("paired",metadata.has("pair")).put("connected",connected).put("error",error ?: JSONObject.NULL).put("lastSync",metadata.opt("lastSync") ?: JSONObject.NULL).put("conflicts",metadata.optInt("conflicts")).put("settingsConflict",metadata.opt("settingsConflict") ?: JSONObject.NULL)
    suspend fun syncAction(action: String, value: String): JSONObject {
        ready.await()
        when (action) {
            "connect" -> {
                if (value.isBlank()) return status()
                val uri = Uri.parse(value); require(uri.scheme == "thoughtanchor" && uri.host == "pair") { "Invalid pairing code" }
                val pair = JSONObject(String(Base64.getDecoder().decode(uri.getQueryParameter("data")),Charsets.UTF_8))
                require(pair.getInt("version") == 1 && pair.getString("certificate").matches(Regex("[a-f0-9]{64}")) && Base64.getDecoder().decode(pair.getString("token")).size == 32 && Instant.parse(pair.getString("expires")).isAfter(Instant.now())) { "Pairing code expired or invalid" }
                val host = pair.getString("host"); require(localAddress(host)) { "Pairing must use a local address" }; require(pair.getInt("port") in 1024..65535)
                gate.withLock { metadata = JSONObject().put("device",metadata.getString("device")).put("pair",cipher(pair.toString(),true)).put("enabled",true); atomic(metaFile,metadata.toString()); pendingFile.delete() }; schedule(); syncNow()
            }
            "disconnect" -> { syncGate.withLock { gate.withLock { metadata.remove("pair"); metadata.remove("base"); metadata.put("enabled",false); atomic(metaFile,metadata.toString()); pendingFile.delete() }; connected=false; error=null }; schedule() }
            "enable", "disable" -> { syncGate.withLock { gate.withLock { metadata.put("enabled",action == "enable"); atomic(metaFile,metadata.toString()) }; if (action == "disable") connected = false }; schedule() }
            "resolve-local", "resolve-remote" -> { syncGate.withLock { gate.withLock {
                val conflict = metadata.optJSONObject("settingsConflict")
                if (conflict != null) { val current = workspace.getJSONObject("settings"); val chosen = conflict.getJSONObject(if (action == "resolve-local") "local" else "remote"); val next = JSONObject(current.toString()); chosen.keys().forEach { next.put(it,chosen.get(it)) }; commit(domain("prepare-command",JSONArray().put(JSONObject().put("type","settings").put("settings",next))) as JSONObject); metadata.remove("settingsConflict"); atomic(metaFile,metadata.toString()) }
            } }; syncNow() }
            "now" -> syncNow()
            "status" -> {}
            else -> throw IOException("Unknown sync operation")
        }
        return status()
    }
    private fun schedule() {
        if (!metadata.optBoolean("enabled")) { WorkManager.getInstance(context).cancelUniqueWork("anchor-sync"); return }
        val request = PeriodicWorkRequestBuilder<SyncWorker>(15,TimeUnit.MINUTES).setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.UNMETERED).build()).build()
        WorkManager.getInstance(context).enqueueUniquePeriodicWork("anchor-sync",ExistingPeriodicWorkPolicy.KEEP,request)
    }
    private fun localAddress(address: String): Boolean {
        val bytes = InetAddress.getByName(address).address.map { it.toInt() and 255 }
        return bytes.size == 4 && (bytes[0] == 127 || bytes[0] == 10 || bytes[0] == 192 && bytes[1] == 168 || bytes[0] == 172 && bytes[1] in 16..31)
    }
    suspend fun syncNow() = syncGate.withLock {
        ready.await(); if (!metadata.has("pair") || !metadata.optBoolean("enabled")) return@withLock
        try {
            val pair = cipher(metadata.getString("pair"),false).let { JSONObject(it) }
            val request = gate.withLock {
                if (pendingFile.exists()) JSONObject(pendingFile.readText()) else JSONObject().put("version",1).put("device",metadata.getString("device")).put("request",UUID.randomUUID().toString()).put("base",metadata.opt("base") ?: JSONObject.NULL).put("content",domain("sync-content")).also { atomic(pendingFile,it.toString()) }
            }
            val response = withContext(Dispatchers.IO) {
                val body = JSONObject(request.toString()).put("token",pair.getString("token"))
                try { exchange(pair,body) } catch (e: java.net.ConnectException) { val found = discover(pair) ?: throw e; pair.put("host",found); exchange(pair,body) }
            }
            if (response.has("error")) throw IOException(response.getString("error"))
            require(response.getInt("version") == 1 && response.getString("request") == request.getString("request")) { "Invalid sync response" }
            gate.withLock {
                val merge = domain("prepare-sync",JSONArray().put(request.getJSONObject("content")).put(response.getJSONObject("content")).put(request.isNull("base"))) as JSONObject
                if ((response.optJSONArray("settingsConflicts")?.length() ?: 0) > 0) metadata.put("settingsConflict",JSONObject().put("local",request.getJSONObject("content").getJSONObject("settings")).put("remote",response.getJSONObject("content").getJSONObject("settings")))
                commit(merge.getJSONObject("workspace"))
                metadata.put("pair",cipher(pair.toString(),true))
                metadata.put("base",response.getJSONObject("content")).put("lastSync",Instant.now().toString()).put("conflicts",response.optInt("conflicts") + merge.optInt("conflicts")); atomic(metaFile,metadata.toString()); pendingFile.delete()
            }
            connected=true; error=null
        } catch (exception: Exception) { connected=false; error=exception.message }
    }
    private fun discover(pair: JSONObject): String? {
        DatagramSocket().use { socket ->
            socket.broadcast = true; socket.soTimeout = 1200
            val query = "ThoughtAnchor/1".toByteArray(Charsets.UTF_8)
            val addresses = NetworkInterface.getNetworkInterfaces().toList().flatMap { it.interfaceAddresses }.mapNotNull { it.broadcast }.distinct()
            for (address in addresses) try { socket.send(DatagramPacket(query,query.size,address,43872)) } catch (_: Exception) {}
            val deadline = System.currentTimeMillis() + 1500
            while (System.currentTimeMillis() < deadline) {
                try { val packet = DatagramPacket(ByteArray(2048),2048); socket.receive(packet); val found = JSONObject(String(packet.data,0,packet.length,Charsets.UTF_8)); val address = packet.address.hostAddress ?: continue
                    if (found.optInt("version") == 1 && found.optString("certificate") == pair.getString("certificate") && found.optInt("port") == pair.getInt("port") && localAddress(address)) return address
                } catch (_: Exception) { break }
            }
        }
        return null
    }
    private fun exchange(pair: JSONObject, request: JSONObject): JSONObject {
        val pin = pair.getString("certificate")
        val manager = object : X509TrustManager {
            override fun getAcceptedIssuers(): Array<X509Certificate> = emptyArray()
            override fun checkClientTrusted(chain: Array<X509Certificate>, type: String) { throw java.security.cert.CertificateException("Client certificates are not used") }
            override fun checkServerTrusted(chain: Array<X509Certificate>, type: String) { require(chain.isNotEmpty()); chain[0].checkValidity(); val digest = MessageDigest.getInstance("SHA-256").digest(chain[0].encoded).joinToString("") { "%02x".format(it) }; if (digest != pin) throw java.security.cert.CertificateException("Computer certificate changed. Pair again.") }
        }
        val tls = SSLContext.getInstance("TLS").apply { init(null,arrayOf(manager),SecureRandom()) }
        val socket = tls.socketFactory.createSocket() as SSLSocket
        socket.use {
            it.connect(InetSocketAddress(pair.getString("host"),pair.getInt("port")),5000); it.soTimeout=15000; it.enabledProtocols=arrayOf("TLSv1.2"); it.startHandshake()
            val bytes = request.toString().toByteArray(Charsets.UTF_8); require(bytes.size <= 32*1024*1024)
            val output = DataOutputStream(it.outputStream); output.writeInt(bytes.size); output.write(bytes); output.flush()
            val input = DataInputStream(it.inputStream); val size = input.readInt(); require(size in 1..32*1024*1024); val reply = ByteArray(size); input.readFully(reply); return JSONObject(String(reply,Charsets.UTF_8))
        }
    }
}
class SyncWorker(context: Context, parameters: WorkerParameters) : CoroutineWorker(context,parameters) {
    override suspend fun doWork(): Result { return try { val host = HostManager.get(applicationContext); host.ready.await(); host.syncNow(); Result.success() } catch (_: Exception) { Result.retry() } }
}
