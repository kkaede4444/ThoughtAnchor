using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.NetworkInformation;
using System.Net.Security;
using System.Net.Sockets;
using System.Security.Authentication;
using System.Security.Cryptography;
using System.Security.Cryptography.X509Certificates;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using System.Windows.Forms;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace ThoughtAnchor {
  internal sealed partial class Host {
    const int SyncPort = 43871;
    TcpListener syncListener;
    UdpClient syncDiscovery;
    readonly SemaphoreSlim syncClients = new SemaphoreSlim(8, 8);
    X509Certificate2 syncCertificate;
    JObject syncState = new JObject { ["enabled"] = false, ["peers"] = new JObject() };
    string syncAddress, syncError, syncPairing, pendingPairToken;
    DateTime pairExpires;
    string SyncFile { get { return Path.Combine(DirectoryPath, "sync-native.json"); } }
    string SyncJournal { get { return Path.Combine(DirectoryPath, "sync-commit.json"); } }
    static string Secret(string value, bool protect) {
      return protect ? Convert.ToBase64String(ProtectedData.Protect(Encoding.UTF8.GetBytes(value), null, DataProtectionScope.CurrentUser)) : Encoding.UTF8.GetString(ProtectedData.Unprotect(Convert.FromBase64String(value), null, DataProtectionScope.CurrentUser));
    }
    static void AtomicText(string file, string text) { WriteSynced(file + ".tmp", text); if (File.Exists(file)) File.Replace(file + ".tmp", file, null); else File.Move(file + ".tmp", file); }
    static string Digest(byte[] bytes) { using (var sha = SHA256.Create()) return BitConverter.ToString(sha.ComputeHash(bytes)).Replace("-", "").ToLowerInvariant(); }
    void RecoverSyncJournal() {
      if (!File.Exists(SyncJournal)) return;
      try {
        var journal = JObject.Parse(File.ReadAllText(SyncJournal));
        var file = Path.Combine(DirectoryPath, "workspace.json");
        if (File.Exists(file) && Digest(File.ReadAllBytes(file)) == (string)journal["workspaceHash"]) AtomicText(SyncFile, journal["metadata"].ToString(Formatting.None));
        File.Delete(SyncJournal);
      } catch { recovery = "Sync recovery needs attention; local content is preserved."; }
    }
    void LoadSync() {
      try { if (File.Exists(SyncFile)) syncState = JObject.Parse(File.ReadAllText(SyncFile)); }
      catch { syncError = "Pairing metadata is damaged. Pair again."; }
      if ((bool?)syncState["enabled"] == true) { try { StartSync(); } catch (Exception e) { syncError = e.Message; } }
      Application.ApplicationExit += delegate { StopSync(); if (syncCertificate != null) syncCertificate.Dispose(); };
    }
    void SaveSync() { AtomicText(SyncFile, syncState.ToString(Formatting.None)); }
    string Fingerprint { get { return Digest(syncCertificate.RawData); } }
    void StartSync() {
      if (syncListener != null) return;
      if (syncCertificate == null) {
        if (syncState["certificate"] != null) syncCertificate = new X509Certificate2(Convert.FromBase64String(Secret((string)syncState["certificate"], false)), "", X509KeyStorageFlags.Exportable | X509KeyStorageFlags.PersistKeySet);
        else using (var rsa = RSA.Create()) {
          rsa.KeySize = 2048;
          var request = new CertificateRequest("CN=ThoughtAnchor Local Sync", rsa, HashAlgorithmName.SHA256, RSASignaturePadding.Pkcs1);
          using (var generated = request.CreateSelfSigned(DateTimeOffset.UtcNow.AddDays(-1), DateTimeOffset.UtcNow.AddYears(5))) syncCertificate = new X509Certificate2(generated.Export(X509ContentType.Pfx, ""), "", X509KeyStorageFlags.Exportable | X509KeyStorageFlags.PersistKeySet);
          syncState["certificate"] = Secret(Convert.ToBase64String(syncCertificate.Export(X509ContentType.Pfx, "")), true);
        }
      }
      var addresses = NetworkInterface.GetAllNetworkInterfaces().Where(n => n.OperationalStatus == OperationalStatus.Up && (n.NetworkInterfaceType == NetworkInterfaceType.Wireless80211 || n.NetworkInterfaceType == NetworkInterfaceType.Ethernet) && !n.Description.ToLowerInvariant().Contains("virtual") && !n.Description.ToLowerInvariant().Contains("vpn")).SelectMany(n => n.GetIPProperties().UnicastAddresses).Select(a => a.Address).Where(a => a.AddressFamily == AddressFamily.InterNetwork && (a.ToString().StartsWith("192.168.") || a.ToString().StartsWith("10.") || (a.GetAddressBytes()[0] == 172 && a.GetAddressBytes()[1] >= 16 && a.GetAddressBytes()[1] <= 31))).ToList();
      if (!addresses.Any()) throw new IOException("No local network adapter is available.");
      syncAddress = addresses[0].ToString();
      syncListener = new TcpListener(addresses[0], SyncPort); syncListener.Start();
      syncState["enabled"] = true; syncError = null; SaveSync();
      var listener = syncListener;
      Task.Run(async () => { while (listener == syncListener) { try { var client = await listener.AcceptTcpClientAsync(); _ = ServeSync(client); } catch { break; } } });
      try {
        syncDiscovery = new UdpClient(new IPEndPoint(addresses[0], 43872)); var discovery = syncDiscovery;
        Task.Run(async () => { while (discovery == syncDiscovery) { try { var packet = await discovery.ReceiveAsync(); if (Encoding.UTF8.GetString(packet.Buffer) != "ThoughtAnchor/1") continue; var bytes = Encoding.UTF8.GetBytes(new JObject { ["version"] = 1, ["address"] = syncAddress, ["port"] = SyncPort, ["certificate"] = Fingerprint }.ToString(Formatting.None)); await discovery.SendAsync(bytes, bytes.Length, packet.RemoteEndPoint); } catch { break; } } });
      } catch { /* Direct address pairing remains available. */ }
    }
    void StopSync() { var listener = syncListener; syncListener = null; if (listener != null) listener.Stop(); var discovery = syncDiscovery; syncDiscovery = null; if (discovery != null) discovery.Close(); }
    JObject SyncStatus() {
      if (DateTime.UtcNow > pairExpires) syncPairing = null;
      return new JObject { ["enabled"] = (bool?)syncState["enabled"] == true, ["paired"] = ((JObject)syncState["peers"]).Count > 0, ["connected"] = syncListener != null && syncState["lastSync"] != null && DateTime.UtcNow - DateTime.Parse((string)syncState["lastSync"]).ToUniversalTime() < TimeSpan.FromSeconds(20), ["address"] = syncAddress, ["pairing"] = syncPairing, ["error"] = syncError, ["lastSync"] = syncState["lastSync"], ["conflicts"] = syncState["conflicts"] ?? 0 };
    }
    async Task<JToken> SyncAction(string action) {
      if (action == "enable") StartSync();
      else if (action == "disable") { StopSync(); syncState["enabled"] = false; SaveSync(); }
      else if (action == "disconnect") { ((JObject)syncState["peers"]).RemoveAll(); pendingPairToken = null; syncPairing = null; SaveSync(); }
      else if (action == "pair") {
        StartSync(); var bytes = new byte[32]; using (var random = RandomNumberGenerator.Create()) random.GetBytes(bytes);
        pendingPairToken = Convert.ToBase64String(bytes); pairExpires = DateTime.UtcNow.AddMinutes(5);
        var pair = new JObject { ["version"] = 1, ["host"] = syncAddress, ["port"] = SyncPort, ["certificate"] = Fingerprint, ["token"] = pendingPairToken, ["expires"] = pairExpires.ToString("o") };
        syncPairing = "thoughtanchor://pair?data=" + Uri.EscapeDataString(Convert.ToBase64String(Encoding.UTF8.GetBytes(pair.ToString(Formatting.None))));
      } else if (action != "status" && action != "now") throw new ArgumentException("Unknown sync operation.");
      await Task.CompletedTask; return SyncStatus();
    }
    static async Task<byte[]> ReadExactly(Stream stream, int length, CancellationToken token) {
      var data = new byte[length]; int at = 0;
      while (at < length) { int size = await stream.ReadAsync(data, at, length - at, token); if (size == 0) throw new EndOfStreamException(); at += size; } return data;
    }
    async Task ServeSync(TcpClient client) {
      if (!syncClients.Wait(0)) { client.Close(); return; }
      try {
      using (client) using (var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(30))) using (var closeOnTimeout = timeout.Token.Register(() => client.Close())) using (var tls = new SslStream(client.GetStream(), false)) {
        try {
          await tls.AuthenticateAsServerAsync(syncCertificate, false, SslProtocols.Tls12, false);
          var size = await ReadExactly(tls, 4, timeout.Token); int length = (size[0] << 24) | (size[1] << 16) | (size[2] << 8) | size[3];
          if (length < 1 || length > 32 * 1024 * 1024) return;
          var input = JObject.Parse(Encoding.UTF8.GetString(await ReadExactly(tls, length, timeout.Token)));
          var result = new TaskCompletionSource<JObject>();
          Main.BeginInvoke(new Action(async () => {
            await gate.WaitAsync();
            try {
              if (syncListener == null || (bool?)syncState["enabled"] != true) throw new IOException("Sync is disabled.");
              var peers = (JObject)syncState["peers"]; string peer = (string)input["device"], token = (string)input["token"];
              if (String.IsNullOrEmpty(peer) || peer.Length > 100 || (int?)input["version"] != 1) throw new IOException("Invalid sync request.");
              var known = peers[peer] as JObject;
              bool approved = known != null && Secret((string)known["token"], false) == token;
              if (!approved && !String.IsNullOrEmpty(pendingPairToken) && pendingPairToken == token && DateTime.UtcNow <= pairExpires) { known = new JObject { ["token"] = Secret(token, true) }; peers[peer] = known; pendingPairToken = null; syncPairing = null; approved = true; }
              if (!approved) throw new IOException("Pairing was rejected. Pair the devices again.");
              if ((string)known["request"] == (string)input["request"] && known["response"] != null) { result.TrySetResult((JObject)known["response"].DeepClone()); return; }
              var nextState = (JObject)syncState.DeepClone();
              known = (JObject)nextState["peers"][peer];
              var merge = (JObject)await Domain("prepare-sync", input["base"], input["content"]);
              var response = new JObject { ["version"] = 1, ["request"] = input["request"], ["content"] = merge["content"], ["conflicts"] = merge["conflicts"], ["settingsConflicts"] = merge["settingsConflicts"] };
              known["request"] = input["request"]; known["response"] = response.DeepClone();
              nextState["lastSync"] = DateTime.UtcNow.ToString("o"); nextState["conflicts"] = merge["conflicts"];
              var proposed = (JObject)merge["workspace"];
              var previousLocale = (string)workspace["settings"]["locale"];
              AtomicText(SyncJournal, new JObject { ["workspaceHash"] = Digest(new UTF8Encoding(false).GetBytes(proposed.ToString(Formatting.Indented))), ["metadata"] = nextState }.ToString(Formatting.None));
              if (!JToken.DeepEquals(workspace, proposed)) await Persist(proposed, false);
              workspace = (JObject)await Domain("commit"); syncState = nextState; SaveSync(); File.Delete(SyncJournal); if (previousLocale != (string)workspace["settings"]["locale"]) await UpdateLanguage(); await Broadcast(); result.TrySetResult(response);
            } catch (Exception error) { try { await Domain("discard"); } catch {} result.TrySetResult(new JObject { ["error"] = error.Message }); }
            finally { gate.Release(); }
          }));
          var reply = Encoding.UTF8.GetBytes((await result.Task).ToString(Formatting.None)); var header = new byte[] { (byte)(reply.Length >> 24), (byte)(reply.Length >> 16), (byte)(reply.Length >> 8), (byte)reply.Length };
          await tls.WriteAsync(header, 0, 4, timeout.Token); await tls.WriteAsync(reply, 0, reply.Length, timeout.Token);
        } catch { /* Untrusted and interrupted connections do not touch content. */ }
      }
      } finally { syncClients.Release(); }
    }
  }
}
