# Security · 安全

## Report a vulnerability / 报告漏洞

Use [GitHub private vulnerability reporting](https://github.com/kkaede4444/ThoughtAnchor/security/advisories/new) if available. If it is unavailable, open an issue asking for a private contact channel without including credentials, personal boards, exploit details or pairing codes. Ordinary bug reports can use Issues. There is no guaranteed response time or formal security certification.

如发现安全问题，优先使用 GitHub 的私密漏洞报告。如果入口不可用，可在 Issue 中请求私密联系方式，不公开密钥、个人思路纸、利用细节或配对码。

## Data and request boundaries / 数据与请求边界

- Offline boards need no account. There is no telemetry, automatic AI request or hosted cloud synchronization.
- Windows keys use current-user DPAPI; Android keys use Android Keystore AES-GCM. Keys are scoped to protocol + base URL, never returned to the renderer, exported or synchronized. This does not protect an unlocked/compromised account or device from malware.
- An explicit AI action sends only its required current article or draft to the configured service. Remote API endpoints require HTTPS; HTTP is allowed only for loopback development services. Native HTTP clients refuse redirects. Provider retention/billing policies remain the provider's responsibility.
- The UI loads packaged assets only. CSP, navigation restrictions and origin-scoped bridges separate the renderer from files, credentials and the document engine. The production APK is not debuggable; explicit isolated test modes are for developers.
- Optional LAN synchronization uses TLS, a pinned certificate fingerprint, expiring pairing tokens and revocable per-device credentials. Pair only devices you control. Turning synchronization off stops transfer; revoking credentials removes access. Keys and device-specific settings stay local.
- Board exports contain readable text and drawings, not encryption. Store backups in a location you trust. No untrusted executable content is evaluated during import.

白板可离线使用。密钥由系统加密、按接口隔离，不进入导出或同步；仅主动点击 AI 时向所选服务发送当前操作需要的内容。远程 API 必须 HTTPS 且不跟随重定向。局域网同步使用 TLS 与固定证书指纹，配对凭据可撤销。导出的思路纸是可读文件，请自行保管。

## Release checks / 发布检查

`npm run security` scans version-controlled history and the pending source tree for recognizable credentials/private files, verifies local exclusions and checks documentation links. `npm audit` checks the npm lockfile against current advisories. Native/Maven dependencies are checked separately during this release. These checks have limits and cannot prove absence of every vulnerability.

Before publishing, the release process also checks production package contents, exact source archive contents, APK signature/debug flags, matching versions and SHA-256 hashes. GitHub upload digests are compared before a draft is made public. CI has read-only repository permissions, pins third-party actions to commits and does not replace locally verified/signed release assets.

NuGet package bytes are pinned in `native/package-checksums.json` and were compared with the official NuGet catalog hashes. Gradle's distribution SHA-256 is pinned in its wrapper properties. This validates downloaded archives; build machines and dependency advisory coverage remain part of the trust boundary.

Android signing keys, user workspaces, pairing secrets, `.env` files and local tool caches must never be committed or uploaded. The persistent signing key is stored outside published artifacts. Windows binaries are currently unsigned; no App Store, Play Store, macOS or iOS package is included.
