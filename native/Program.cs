using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using System.Windows.Forms;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

[assembly: System.Reflection.AssemblyTitle("ThoughtAnchor")]
[assembly: System.Reflection.AssemblyProduct("ThoughtAnchor")]
[assembly: System.Reflection.AssemblyVersion("0.5.0.0")]
[assembly: System.Reflection.AssemblyFileVersion("0.5.0.0")]

namespace ThoughtAnchor {
  internal static class Program {
    [DllImport("user32.dll")] static extern bool SetProcessDPIAware();
    [STAThread] static void Main(string[] args) {
      SetProcessDPIAware();
      Application.EnableVisualStyles();
      Application.SetCompatibleTextRenderingDefault(false);
      ServicePointManager.SecurityProtocol = SecurityProtocolType.Tls12;
      Application.SetUnhandledExceptionMode(UnhandledExceptionMode.CatchException);
      Application.ThreadException += delegate(object sender, ThreadExceptionEventArgs e) { MessageBox.Show(e.Exception.Message, "ThoughtAnchor"); };
      try { using (var host = new Host(args)) Application.Run(host); }
      catch (AlreadyRunningException) { }
      catch (Exception e) { MessageBox.Show(e.Message, "ThoughtAnchor"); }
    }
  }

  internal sealed class BoardWindow : Form {
    internal readonly WebView2 View = new WebView2();
    internal uint DomainContext;
    readonly Host host;
    readonly bool capture;
    internal BoardWindow(Host owner, bool isCapture) {
      host = owner; capture = isCapture;
      Text = isCapture ? "ThoughtAnchor · 留住闪念" : "ThoughtAnchor · 思维拼图";
      Size = isCapture ? new Size(540, 360) : new Size(1420, 940);
      MinimumSize = isCapture ? new Size(420, 300) : new Size(1050, 700);
      StartPosition = FormStartPosition.CenterScreen;
      AutoScaleDimensions = new SizeF(96, 96);
      AutoScaleMode = AutoScaleMode.Dpi;
      BackColor = Color.FromArgb(250, 249, 245);
      Icon = new Icon(Path.Combine(host.Root, "icon.ico"));
      TopMost = isCapture;
      View.Dock = DockStyle.Fill;
      View.DefaultBackgroundColor = BackColor;
      Controls.Add(View);
      FormClosing += delegate(object s, FormClosingEventArgs e) { if (!host.Quitting) { e.Cancel = true; Hide(); } };
    }
    protected override void WndProc(ref Message message) {
      if (message.Msg == 0x0312) host.Capture();
      if (message.Msg == host.ActivateMessage) host.ShowMain();
      base.WndProc(ref message);
    }
    internal async Task Start(CoreWebView2Environment environment) {
      await View.EnsureCoreWebView2Async(environment);
      var core = View.CoreWebView2;
      core.Settings.AreDefaultContextMenusEnabled = false;
      core.Settings.AreDevToolsEnabled = host.AutomationPort != null;
      core.Settings.IsStatusBarEnabled = false;
      core.Settings.AreBrowserAcceleratorKeysEnabled = false;
      core.Settings.IsPasswordAutosaveEnabled = false;
      core.Settings.IsGeneralAutofillEnabled = false;
      core.SetVirtualHostNameToFolderMapping("thoughtanchor.local", Path.Combine(host.Root, "ui"), CoreWebView2HostResourceAccessKind.DenyCors);
      core.AddWebResourceRequestedFilter("https://thoughtanchor.local/index.html*", CoreWebView2WebResourceContext.Document);
      core.WebResourceRequested += delegate(object sender, CoreWebView2WebResourceRequestedEventArgs e) {
        var stream = new MemoryStream(File.ReadAllBytes(Path.Combine(host.Root, "ui", "index.html")));
        e.Response = environment.CreateWebResourceResponse(stream, 200, "OK", "Content-Type: text/html; charset=utf-8\r\nX-Content-Type-Options: nosniff\r\nContent-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");
      };
      core.NavigationStarting += delegate(object sender, CoreWebView2NavigationStartingEventArgs e) {
        Uri uri;
        if (!Uri.TryCreate(e.Uri, UriKind.Absolute, out uri) || uri.Scheme != "https" || uri.Authority != "thoughtanchor.local") e.Cancel = true;
      };
      core.NewWindowRequested += delegate(object sender, CoreWebView2NewWindowRequestedEventArgs e) { e.Handled = true; };
      core.PermissionRequested += delegate(object sender, CoreWebView2PermissionRequestedEventArgs e) { e.State = CoreWebView2PermissionState.Deny; };
      core.WebMessageReceived += async delegate(object sender, CoreWebView2WebMessageReceivedEventArgs e) { await host.Handle(this, e); };
      var loaded = new TaskCompletionSource<bool>();
      core.NavigationCompleted += async delegate(object sender, CoreWebView2NavigationCompletedEventArgs e) {
        try {
          if (!e.IsSuccess) throw new IOException("WebView2 could not load the workspace: " + e.WebErrorStatus);
          if (!capture) {
            var frames = JObject.Parse(await core.CallDevToolsProtocolMethodAsync("Page.getFrameTree", "{}"));
            var frameId = (string)frames["frameTree"]["frame"]["id"];
            var world = JObject.Parse(await core.CallDevToolsProtocolMethodAsync("Page.createIsolatedWorld", new JObject { ["frameId"] = frameId, ["worldName"] = "ThoughtAnchor.Domain", ["grantUniversalAccess"] = false }.ToString(Formatting.None)));
            DomainContext = (uint)world["executionContextId"];
            await RawEvaluate(File.ReadAllText(Path.Combine(host.Root, "domain.js"), Encoding.UTF8));
          }
          loaded.TrySetResult(true);
        } catch (Exception error) { loaded.TrySetException(error); }
      };
      core.DocumentTitleChanged += delegate { Text = core.DocumentTitle; };
      core.ProcessFailed += async delegate(object sender, CoreWebView2ProcessFailedEventArgs e) {
        await host.Recover(this, capture);
      };
      core.Navigate("https://thoughtanchor.local/index.html" + (capture ? "#capture" : ""));
      await loaded.Task;
    }
    internal async Task<JToken> RawEvaluate(string expression) {
      var options = new JObject { ["expression"] = expression, ["contextId"] = DomainContext, ["returnByValue"] = true, ["awaitPromise"] = true };
      var response = JObject.Parse(await View.CoreWebView2.CallDevToolsProtocolMethodAsync("Runtime.evaluate", options.ToString(Formatting.None)));
      if (response["exceptionDetails"] != null) throw new InvalidOperationException("Document service could not execute the operation.");
      return response["result"]["value"];
    }
    internal void Post(JObject message) { if (!IsDisposed && View.CoreWebView2 != null) View.CoreWebView2.PostWebMessageAsJson(message.ToString(Formatting.None)); }
  }

  internal sealed class AlreadyRunningException : Exception { }
  internal sealed partial class Host : ApplicationContext {
    internal readonly string Root = AppDomain.CurrentDomain.BaseDirectory;
    internal readonly string DirectoryPath;
    internal readonly string AutomationPort;
    internal bool Quitting;
    internal readonly int ActivateMessage;
    internal BoardWindow Main;
    BoardWindow capture;
    CoreWebView2Environment environment;
    readonly SemaphoreSlim gate = new SemaphoreSlim(1, 1);
    readonly TaskCompletionSource<bool> ready = new TaskCompletionSource<bool>();
    readonly HttpClient http = new HttpClient(new HttpClientHandler { AllowAutoRedirect = false });
    CancellationTokenSource ai;
    JObject workspace;
    JObject keys = new JObject();
    string recovery;
    string diskText;
    string shortcut;
    int shortcutId;
    NotifyIcon tray;
    FileStream lockFile;
    Mutex mutex;
    internal readonly bool Automation;
    [DllImport("user32.dll")] static extern int RegisterWindowMessage(string name);
    [DllImport("user32.dll")] static extern bool PostMessage(IntPtr hWnd, int msg, IntPtr wParam, IntPtr lParam);
    [DllImport("user32.dll")] static extern bool RegisterHotKey(IntPtr hWnd, int id, uint modifiers, uint key);
    [DllImport("user32.dll")] static extern bool UnregisterHotKey(IntPtr hWnd, int id);
    internal Host(string[] args) {
      AutomationPort = Option(args, "--automation-port");
      if (AutomationPort != null && (int.Parse(AutomationPort) < 1024 || int.Parse(AutomationPort) > 65535)) throw new ArgumentException("Invalid automation port");
      Automation = AutomationPort != null;
      var explicitDirectory = Option(args, "--data-dir") ?? Environment.GetEnvironmentVariable("THOUGHTANCHOR_DATA_DIR");
      if (Automation && explicitDirectory == null) throw new ArgumentException("Automation requires an isolated data directory.");
      DirectoryPath = Path.GetFullPath(Path.Combine(explicitDirectory ?? Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "ThoughtAnchor"), "data"));
      Directory.CreateDirectory(DirectoryPath);
      string identity;
      using (var sha = SHA256.Create()) identity = BitConverter.ToString(sha.ComputeHash(Encoding.UTF8.GetBytes(DirectoryPath.ToUpperInvariant()))).Replace("-", "");
      ActivateMessage = RegisterWindowMessage("ThoughtAnchor.Native.Activate." + identity);
      bool owner;
      mutex = new Mutex(true, "Local\\ThoughtAnchor-" + identity, out owner);
      if (!owner) { PostMessage(new IntPtr(0xffff), ActivateMessage, IntPtr.Zero, IntPtr.Zero); mutex.Dispose(); throw new AlreadyRunningException(); }
      lockFile = new FileStream(Path.Combine(DirectoryPath, "workspace.lock"), FileMode.OpenOrCreate, FileAccess.ReadWrite, FileShare.None);
      Main = new BoardWindow(this, false);
      Main.Show();
      Main.Shown += async delegate { await Start(); };
      // Show can raise Shown before the subscription; defer initialization onto the UI queue.
      Main.BeginInvoke(new Action(async delegate { await Start(); }));
    }
    static string Option(string[] args, string key) { int at = Array.IndexOf(args, key); return at >= 0 && at + 1 < args.Length ? args[at + 1] : null; }
    bool started;
    async Task Start() {
      if (started) return; started = true;
      try {
        var options = new CoreWebView2EnvironmentOptions(AutomationPort == null ? "" : "--remote-debugging-address=127.0.0.1 --remote-debugging-port=" + AutomationPort);
        environment = await CoreWebView2Environment.CreateAsync(null, Path.Combine(Path.GetDirectoryName(DirectoryPath), "webview2"), options);
        await Main.Start(environment);
        RecoverSyncJournal();
        await Load();
        LoadKeys();
        LoadSync();
        try { RegisterShortcut((string)workspace["settings"]["shortcut"]); } catch { recovery = "捕捉快捷键被占用，请在设置中修改。"; }
        await UpdateLanguage();
        ready.TrySetResult(true);
      } catch (Exception e) {
        ready.TrySetException(e);
        File.WriteAllText(Path.Combine(DirectoryPath, "startup-error.txt"), e.ToString());
        MessageBox.Show(e.Message, "ThoughtAnchor");
        Quit();
      }
    }
    internal async Task<JToken> Domain(string action, params object[] args) {
      var input = new JObject { ["action"] = action, ["args"] = JArray.FromObject(args) };
      // Pass data as JSON.parse(string), so imported keys cannot become JavaScript code or object prototypes.
      var response = await Main.RawEvaluate("Anchor.invoke(JSON.parse(" + JsonConvert.SerializeObject(input.ToString(Formatting.None)) + "))");
      if (response["error"] != null) throw new InvalidOperationException((string)response["error"]);
      return response["result"];
    }
    async Task<string> T(string value) { return (string)await Domain("translate", value); }
    async Task Load() {
      string filename = Path.Combine(DirectoryPath, "workspace.json");
      bool invalid = false;
      foreach (var candidate in new[] { filename, filename + ".bak", filename + ".bak2" }) {
        if (!File.Exists(candidate)) continue;
        string text = File.ReadAllText(candidate, Encoding.UTF8);
        JObject parsed;
        try { parsed = (JObject)await Domain("validate", JToken.Parse(text)); }
        catch {
          invalid = true;
          if (candidate == filename) File.Copy(candidate, filename + ".damaged-" + DateTime.UtcNow.Ticks, false);
          continue;
        }
        workspace = (JObject)await Domain("initialize", parsed);
        diskText = File.Exists(filename) ? File.ReadAllText(filename, Encoding.UTF8) : null;
        bool migration = (int)JObject.Parse(text)["version"] == 1;
        if (migration) {
          string backup = filename + ".v1-backup";
          if (File.Exists(backup) && File.ReadAllText(backup, Encoding.UTF8) != text) backup += "-" + DateTime.UtcNow.Ticks;
          if (!File.Exists(backup)) File.Copy(candidate, backup, false);
        }
        if (invalid || candidate != filename || migration) await Persist(workspace, true);
        if (invalid) recovery = "上次的文件不完整，已从最近的备份恢复。损坏文件已保留。";
        return;
      }
      if (invalid) recovery = "无法读取原文件和备份。原文件已保留，请打开数据目录检查。";
      workspace = (JObject)await Domain("initialize", (object)null);
      diskText = File.Exists(filename) ? File.ReadAllText(filename, Encoding.UTF8) : null;
      await Persist(workspace, true);
    }
    async Task Persist(JObject next, bool recovering) {
      string filename = Path.Combine(DirectoryPath, "workspace.json");
      var previous = File.Exists(filename) ? File.ReadAllText(filename, Encoding.UTF8) : null;
      if (!recovering && previous != diskText) throw new IOException(await T("数据文件已被其他程序修改，请关闭其他实例后重新打开。"));
      var text = next.ToString(Formatting.Indented);
      bool valid = false;
      if (previous != null) { try { await Domain("validate", JToken.Parse(previous)); valid = true; } catch {} }
      string temp = filename + "." + Guid.NewGuid().ToString("N") + ".tmp";
      try {
        WriteSynced(temp, text);
        if (valid) {
          if ((int?)JObject.Parse(previous)["version"] < 3 && (int?)next["version"] == 3 && !File.Exists(Path.Combine(DirectoryPath, "workspace.v2-backup.json"))) WriteSynced(Path.Combine(DirectoryPath, "workspace.v2-backup.json"), previous);
          if (File.Exists(filename + ".bak")) File.Copy(filename + ".bak", filename + ".bak2", true);
          WriteSynced(filename + ".bak", previous);
        }
        if (File.Exists(filename)) File.Replace(temp, filename, null);
        else File.Move(temp, filename);
        diskText = text;
      } finally { if (File.Exists(temp)) File.Delete(temp); }
    }
    static void WriteSynced(string filename, string text) {
      var bytes = new UTF8Encoding(false).GetBytes(text);
      using (var file = new FileStream(filename, FileMode.Create, FileAccess.Write, FileShare.None)) { file.Write(bytes, 0, bytes.Length); file.Flush(true); }
    }
    async Task<JObject> Snapshot() {
      var scope = (string)await Domain("scope");
      return (JObject)await Domain("snapshot", keys[scope] != null, DirectoryPath, recovery);
    }
    async Task Broadcast() {
      var message = new JObject { ["kind"] = "changed", ["snapshot"] = await Snapshot() };
      Main.Post(message); if (capture != null) capture.Post(message);
    }
    internal async Task Handle(BoardWindow window, CoreWebView2WebMessageReceivedEventArgs message) {
      long id = 0;
      try {
        Uri source;
        if (!Uri.TryCreate(message.Source, UriKind.Absolute, out source) || source.Scheme != "https" || source.Authority != "thoughtanchor.local" || source.AbsolutePath != "/index.html") return;
        var input = JObject.Parse(message.WebMessageAsJson);
        id = (long)input["id"];
        var action = (string)input["action"];
        var args = (JArray)input["args"];
        await ready.Task;
        JToken result;
        if (action == "cancel-ai") { if (ai != null) ai.Cancel(); result = null; }
        else if (action == "ai") result = await Generate(args[0]);
        else {
          await gate.WaitAsync();
          try { result = await Dispatch(window, action, args); }
          finally { gate.Release(); }
        }
        window.Post(new JObject { ["id"] = id, ["result"] = result });
      } catch (Exception error) {
        string text = error.Message;
        try { if (ready.Task.Status == TaskStatus.RanToCompletion) text = await T(text); } catch { }
        window.Post(new JObject { ["id"] = id, ["error"] = text });
      }
    }
    async Task<JToken> Dispatch(BoardWindow window, string action, JArray args) {
      if (action == "sync") return await SyncAction((string)args[0]);
      if (action == "snapshot") return await Snapshot();
      if (action == "automation-exit" && Automation) { Main.BeginInvoke(new Action(Quit)); return null; }
      if (action == "command" || action == "import-project") {
        JToken proposed;
        if (action == "import-project") {
          string filename;
          if (Automation) filename = Path.Combine(Path.GetDirectoryName(DirectoryPath), "import.thoughtanchor");
          else using (var dialog = new OpenFileDialog { Title = await T("导入思路纸"), Filter = "ThoughtAnchor|*.thoughtanchor;*.json", CheckFileExists = true }) {
            if (dialog.ShowDialog(Main) != DialogResult.OK) return null;
            filename = dialog.FileName;
          }
          if (new FileInfo(filename).Length > 30 * 1024 * 1024) throw new IOException(await T("导入文件不能超过 30 MB。"));
          proposed = await Domain("prepare-import", JToken.Parse(File.ReadAllText(filename, Encoding.UTF8)));
        } else proposed = await Domain("prepare-command", args[0]);
        string previousShortcut = shortcut;
        try {
          if (action == "command" && (string)args[0]["type"] == "settings" && (string)proposed["settings"]["shortcut"] != (string)workspace["settings"]["shortcut"]) RegisterShortcut((string)proposed["settings"]["shortcut"]);
          if (!JToken.DeepEquals(workspace, proposed)) await Persist((JObject)proposed, false);
          workspace = (JObject)await Domain("commit");
        } catch {
          await Domain("discard");
          if (shortcut != previousShortcut && previousShortcut != null) RegisterShortcut(previousShortcut);
          throw;
        }
        if (action == "command" && (string)args[0]["type"] == "settings") {
          if (shortcutId != 0 && recovery == "捕捉快捷键被占用，请在设置中修改。") recovery = null;
          await UpdateLanguage();
        }
        await Broadcast(); return await Snapshot();
      }
      if (action == "key") {
        var scope = (string)await Domain("scope");
        var next = (JObject)keys.DeepClone();
        if ((string)args[0] == "delete") next.Remove(scope);
        else if ((string)args[0] == "set") {
          var value = (string)args[1];
          if (String.IsNullOrWhiteSpace(value) || value.Length > 4000) throw new ArgumentException(await T("输入格式不正确，操作没有应用。"));
          next[scope] = Convert.ToBase64String(ProtectedData.Protect(Encoding.UTF8.GetBytes(value.Trim()), null, DataProtectionScope.CurrentUser));
        } else throw new ArgumentException(await T("输入格式不正确，操作没有应用。"));
        SaveKeys(next); keys = next; await Broadcast(); return await Snapshot();
      }
      if (action == "capture-window") { await CaptureAsync(); return null; }
      if (action == "hide-capture") { if (capture != null) capture.Hide(); return null; }
      if (action == "open-storage") { Process.Start(new ProcessStartInfo("explorer.exe", "\"" + DirectoryPath + "\"") { UseShellExecute = true }); return null; }
      if (action == "export-project" || action == "export-article") {
        bool project = action == "export-project";
        var value = await Domain(action, project ? new object[] { args[0] } : new object[] { args[0], args[1], args[2] });
        string text = project ? value.ToString(Formatting.Indented) : (string)value;
        string title = project ? (string)value["project"]["title"] : (string)workspace["projects"].First(p => (string)p["id"] == (string)args[0])["title"];
        string extension = project ? "thoughtanchor" : (string)args[1];
        var safe = String.Concat(title.Take(100).Select(c => Path.GetInvalidFileNameChars().Contains(c) ? '_' : c));
        if (Automation) {
          string folder = Path.Combine(Path.GetDirectoryName(DirectoryPath), "exports"); Directory.CreateDirectory(folder);
          string filename = Path.Combine(folder, safe + (project ? "" : "-" + (string)args[2]) + "." + extension);
          WriteSynced(filename, text); return new JValue(filename);
        }
        using (var dialog = new SaveFileDialog { Title = await T(project ? "导出思路纸" : "导出成文"), FileName = safe + "." + extension, Filter = "ThoughtAnchor|*." + extension, AddExtension = true, DefaultExt = extension }) {
          if (dialog.ShowDialog(Main) != DialogResult.OK) return null;
          WriteSynced(dialog.FileName, text); return new JValue(dialog.FileName);
        }
      }
      throw new ArgumentException(await T("不允许的请求来源。"));
    }
    void LoadKeys() {
      string native = Path.Combine(DirectoryPath, "keys-native.json");
      if (File.Exists(native)) {
        try { keys = JObject.Parse(File.ReadAllText(native, Encoding.UTF8)); }
        catch { recovery = "密钥文件无法读取，原文件已保留，请在设置中重新保存。"; }
        foreach (var property in keys.Properties().ToList()) {
          try {
            var plain = ProtectedData.Unprotect(Convert.FromBase64String((string)property.Value), null, DataProtectionScope.CurrentUser);
            Array.Clear(plain, 0, plain.Length);
          } catch { keys.Remove(property.Name); recovery = "密钥文件无法读取，原文件已保留，请在设置中重新保存。"; }
        }
        return;
      }
      string legacy = Path.Combine(DirectoryPath, "keys.json");
      if (!File.Exists(legacy)) return;
      JObject old;
      try { old = JObject.Parse(File.ReadAllText(legacy, Encoding.UTF8)); }
      catch { recovery = "密钥文件无法读取，原文件已保留，请在设置中重新保存。"; return; }
      bool failed = false;
      foreach (var property in old.Properties()) {
        try {
          var plain = LegacyKeys.Decrypt(Convert.FromBase64String((string)property.Value), Path.GetDirectoryName(DirectoryPath));
          try { keys[property.Name] = Convert.ToBase64String(ProtectedData.Protect(plain, null, DataProtectionScope.CurrentUser)); }
          finally { Array.Clear(plain, 0, plain.Length); }
        } catch { failed = true; }
      }
      if (keys.Count > 0) SaveKeys(keys);
      if (failed) recovery = "部分旧密钥无法解密，原文件已保留，请在设置中重新保存。";
    }
    void SaveKeys(JObject next) {
      string filename = Path.Combine(DirectoryPath, "keys-native.json"), temp = filename + ".tmp";
      if (File.Exists(filename)) File.Copy(filename, filename + ".bak", true);
      WriteSynced(temp, next.ToString(Formatting.None));
      if (File.Exists(filename)) File.Replace(temp, filename, null); else File.Move(temp, filename);
    }
    internal void ShowMain() { if (Main != null && !Main.IsDisposed) { Main.Show(); Main.WindowState = FormWindowState.Normal; Main.Activate(); } }
    internal async void Capture() { try { await ready.Task; await CaptureAsync(); } catch {} }
    async Task CaptureAsync() {
      if (capture == null || capture.IsDisposed) {
        capture = new BoardWindow(this, true);
        capture.Show();
        await capture.Start(environment);
      }
      capture.Show(); capture.Activate();
      capture.Post(new JObject { ["kind"] = "focus-capture" });
    }
    void RegisterShortcut(string accelerator) {
      if (accelerator == shortcut && shortcutId != 0) return;
      uint modifiers = 0x4000, key = 0; int keyCount = 0;
      foreach (var part in accelerator.Split('+')) {
        switch (part.ToLowerInvariant()) {
          case "ctrl": case "control": case "commandorcontrol": modifiers |= 2; break;
          case "alt": modifiers |= 1; break;
          case "shift": modifiers |= 4; break;
          case "win": case "super": modifiers |= 8; break;
          default: Keys parsed; if (++keyCount > 1 || !Enum.TryParse<Keys>(part, true, out parsed)) throw new ArgumentException("快捷键不可用或已被其他程序占用，请换一个组合。"); key = (uint)parsed; break;
        }
      }
      int nextId = shortcutId == 1 ? 2 : 1;
      if (key == 0 || !RegisterHotKey(Main.Handle, nextId, modifiers, key)) throw new InvalidOperationException("快捷键不可用或已被其他程序占用，请换一个组合。");
      if (shortcutId != 0) UnregisterHotKey(Main.Handle, shortcutId);
      shortcutId = nextId; shortcut = accelerator;
    }
    async Task UpdateLanguage() {
      Main.Text = await T("ThoughtAnchor · 思维拼图");
      if (capture != null) capture.Text = await T("ThoughtAnchor · 留住闪念");
      if (tray == null) { tray = new NotifyIcon { Icon = Main.Icon, Visible = true }; tray.DoubleClick += delegate { ShowMain(); }; }
      tray.Text = await T("ThoughtAnchor · 留住闪念");
      var menu = new ContextMenuStrip();
      menu.Items.Add(await T("打开思路纸"), null, delegate { ShowMain(); });
      menu.Items.Add(await T("留住闪念"), null, delegate { Capture(); });
      menu.Items.Add(new ToolStripSeparator());
      menu.Items.Add(await T("退出"), null, delegate { Quit(); });
      var previous = tray.ContextMenuStrip;
      tray.ContextMenuStrip = menu;
      if (previous != null) previous.Dispose();
    }
    internal async Task Recover(BoardWindow window, bool isCapture) {
      if (Quitting) return;
      await gate.WaitAsync();
      try {
        if (isCapture) { capture = null; window.Dispose(); return; }
        ready.TrySetException(new IOException("WebView2 process restarted"));
        var restored = new BoardWindow(this, false);
        Main = restored; restored.Show();
        await restored.Start(environment);
        await Domain("initialize", workspace);
        window.Dispose();
        shortcutId = 0;
        try { RegisterShortcut(shortcut); } catch { recovery = "捕捉快捷键被占用，请在设置中修改。"; }
        await Broadcast();
      } finally { gate.Release(); }
    }
    internal void Quit() {
      if (Quitting) return; Quitting = true;
      if (ai != null) ai.Cancel();
      if (shortcutId != 0) UnregisterHotKey(Main.Handle, shortcutId);
      if (tray != null) { tray.Visible = false; tray.Dispose(); }
      if (capture != null) capture.Dispose();
      if (Main != null) Main.Dispose();
      if (lockFile != null) lockFile.Dispose();
      if (mutex != null) mutex.Dispose();
      http.Dispose(); ExitThread();
    }
    protected override void Dispose(bool disposing) { if (disposing) Quit(); base.Dispose(disposing); }

    async Task<JToken> Generate(JToken input) {
      if (ai != null) throw new InvalidOperationException(await T("已有请求进行中。"));
      var current = new CancellationTokenSource(); ai = current;
      try {
        JObject plan; byte[] plain;
        await gate.WaitAsync();
        try {
          plan = (JObject)await Domain("prepare-ai", input);
          string scope = (string)plan["keyScope"];
          if (keys[scope] == null) throw new InvalidOperationException(await T("先到设置里保存这个接口的 API 密钥。"));
          plain = ProtectedData.Unprotect(Convert.FromBase64String((string)keys[scope]), null, DataProtectionScope.CurrentUser);
        } finally { gate.Release(); }
        string key;
        try { key = Encoding.UTF8.GetString(plain); } finally { Array.Clear(plain, 0, plain.Length); }
        string task = (string)plan["request"]["task"];
        string text, finalTask;
        string warning = null;
        if (task == "polish") { text = await Phase(plan, key, "polish", null, current.Token); finalTask = "polish"; }
        else {
          text = await Phase(plan, key, "assemble", null, current.Token); finalTask = "assemble";
          if (task == "assemble-polish") {
            try { text = await Phase(plan, key, "polish", text, current.Token); finalTask = "polish"; }
            catch { warning = "拼接已完成，美化失败或已取消。可以采用拼接稿或重新美化。"; }
          }
        }
        key = null;
        await gate.WaitAsync();
        try { return await Domain("finish-ai", plan, finalTask, text, warning); }
        finally { gate.Release(); }
      } catch (OperationCanceledException) { throw new InvalidOperationException(await T("请求已取消或超过 60 秒，内容未改变。")); }
      finally { ai = null; current.Dispose(); }
    }
    async Task<string> Phase(JObject plan, string key, string phase, string assembled, CancellationToken token) {
      token.ThrowIfCancellationRequested();
      JObject wire;
      await gate.WaitAsync(token);
      try { wire = (JObject)await Domain("ai-wire", plan, key, phase, assembled); }
      finally { gate.Release(); }
      using (var deadline = CancellationTokenSource.CreateLinkedTokenSource(token)) {
        deadline.CancelAfter(60000);
        using (var request = new HttpRequestMessage(HttpMethod.Post, (string)wire["url"])) {
          request.Content = new StringContent(wire["body"].ToString(Formatting.None), Encoding.UTF8, "application/json");
          foreach (var header in ((JObject)wire["headers"]).Properties()) if (header.Name != "Content-Type") request.Headers.TryAddWithoutValidation(header.Name, (string)header.Value);
          using (var response = await http.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, deadline.Token)) {
            if (!response.IsSuccessStatusCode) throw new InvalidOperationException((string)await Domain("translate", "接口返回 HTTP {0}。请检查地址、模型、密钥和额度。", new JObject { ["0"] = (int)response.StatusCode }));
            using (var body = await response.Content.ReadAsStreamAsync()) using (var buffer = new MemoryStream()) {
              byte[] chunk = new byte[8192]; int size;
              while ((size = await body.ReadAsync(chunk, 0, chunk.Length, deadline.Token)) != 0) {
                if (buffer.Length + size > 2000000) throw new IOException(await T("接口响应过大，已停止读取。"));
                buffer.Write(chunk, 0, size);
              }
              deadline.Token.ThrowIfCancellationRequested();
              await gate.WaitAsync(deadline.Token);
              try { return (string)await Domain("ai-phase", plan, phase, JToken.Parse(Encoding.UTF8.GetString(buffer.ToArray()))); }
              finally { gate.Release(); }
            }
          }
        }
      }
    }
  }
}
