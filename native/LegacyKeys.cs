using System;
using System.IO;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text;
using Newtonsoft.Json.Linq;

namespace ThoughtAnchor {
  // Import Electron's Windows ciphertext once; keep both the original key file and Local State intact.
  internal static class LegacyKeys {
    [StructLayout(LayoutKind.Sequential)] struct AuthInfo {
      internal uint Size, Version;
      internal IntPtr Nonce; internal uint NonceSize;
      internal IntPtr Auth; internal uint AuthSize;
      internal IntPtr Tag; internal uint TagSize;
      internal IntPtr Mac; internal uint MacSize, AadSize;
      internal ulong DataSize; internal uint Flags;
    }
    [DllImport("bcrypt.dll", CharSet = CharSet.Unicode)] static extern int BCryptOpenAlgorithmProvider(out IntPtr algorithm, string name, string implementation, uint flags);
    [DllImport("bcrypt.dll", CharSet = CharSet.Unicode)] static extern int BCryptSetProperty(IntPtr algorithm, string name, byte[] data, int length, uint flags);
    [DllImport("bcrypt.dll")] static extern int BCryptGenerateSymmetricKey(IntPtr algorithm, out IntPtr key, IntPtr keyObject, int objectLength, byte[] secret, int secretLength, uint flags);
    [DllImport("bcrypt.dll")] static extern int BCryptDecrypt(IntPtr key, byte[] input, int length, ref AuthInfo info, IntPtr iv, int ivLength, byte[] output, int outputLength, out int resultLength, uint flags);
    [DllImport("bcrypt.dll")] static extern int BCryptDestroyKey(IntPtr key);
    [DllImport("bcrypt.dll")] static extern int BCryptCloseAlgorithmProvider(IntPtr algorithm, uint flags);
    static void Check(int status) { if (status != 0) throw new CryptographicException("Windows could not decrypt the legacy key."); }
    internal static byte[] Decrypt(byte[] encrypted, string profile) {
      // Old versions wrote DPAPI directly. New Chromium versions use AES-GCM with a DPAPI-protected profile key.
      if (encrypted.Length < 3 || Encoding.ASCII.GetString(encrypted, 0, 3) != "v10")
        return ProtectedData.Unprotect(encrypted, null, DataProtectionScope.CurrentUser);
      if (encrypted.Length < 31) throw new CryptographicException("Invalid legacy key");
      var state = JObject.Parse(File.ReadAllText(Path.Combine(profile, "Local State"), Encoding.UTF8));
      var wrapped = Convert.FromBase64String((string)state["os_crypt"]["encrypted_key"]);
      if (Encoding.ASCII.GetString(wrapped, 0, 5) != "DPAPI") throw new CryptographicException("Unknown legacy key provider");
      var protectedKey = new byte[wrapped.Length - 5]; Array.Copy(wrapped, 5, protectedKey, 0, protectedKey.Length);
      var secret = ProtectedData.Unprotect(protectedKey, null, DataProtectionScope.CurrentUser);
      IntPtr algorithm = IntPtr.Zero, key = IntPtr.Zero, nonce = IntPtr.Zero, tag = IntPtr.Zero;
      try {
        Check(BCryptOpenAlgorithmProvider(out algorithm, "AES", null, 0));
        byte[] mode = Encoding.Unicode.GetBytes("ChainingModeGCM\0");
        Check(BCryptSetProperty(algorithm, "ChainingMode", mode, mode.Length, 0));
        Check(BCryptGenerateSymmetricKey(algorithm, out key, IntPtr.Zero, 0, secret, secret.Length, 0));
        var nonceBytes = new byte[12]; Array.Copy(encrypted, 3, nonceBytes, 0, 12);
        var tagBytes = new byte[16]; Array.Copy(encrypted, encrypted.Length - 16, tagBytes, 0, 16);
        var ciphertext = new byte[encrypted.Length - 31]; Array.Copy(encrypted, 15, ciphertext, 0, ciphertext.Length);
        nonce = Marshal.AllocHGlobal(12); tag = Marshal.AllocHGlobal(16);
        Marshal.Copy(nonceBytes, 0, nonce, 12); Marshal.Copy(tagBytes, 0, tag, 16);
        var info = new AuthInfo { Size = (uint)Marshal.SizeOf(typeof(AuthInfo)), Version = 1, Nonce = nonce, NonceSize = 12, Tag = tag, TagSize = 16 };
        var output = new byte[ciphertext.Length]; int length;
        Check(BCryptDecrypt(key, ciphertext, ciphertext.Length, ref info, IntPtr.Zero, 0, output, output.Length, out length, 0));
        return output;
      } finally {
        Array.Clear(secret, 0, secret.Length);
        if (nonce != IntPtr.Zero) Marshal.FreeHGlobal(nonce);
        if (tag != IntPtr.Zero) Marshal.FreeHGlobal(tag);
        if (key != IntPtr.Zero) BCryptDestroyKey(key);
        if (algorithm != IntPtr.Zero) BCryptCloseAlgorithmProvider(algorithm, 0);
      }
    }
  }
}
