# ThoughtAnchor

[All languages](../README.md) · [Download Windows / Android](https://github.com/kkaede4444/ThoughtAnchor/releases/latest)

ThoughtAnchor is a local-first thinking board for Windows and Android. Capture fragments, arrange cards, draw, connect reusable groups and assemble an article from your original words. Warm paper, watercolor and serif type are shared across devices.

I started ThoughtAnchor to help myself and people with ADHD organize scattered thoughts with less effort. Put an idea down when it arrives, then connect and arrange it when you have the energy. The aim is to spend less patience on organizing, leave more attention for the ideas themselves and make it easier to find a state of flow. Capture first, reuse your words and undo freely; work at your own pace.

This project was **built entirely by Codex** under the maintainer's direction, including implementation, interface, tests, documentation and packaging. Third-party open-source components retain their own licenses. The [MIT license](../../LICENSE) permits use, modification, redistribution and commercial use without prior permission; retain the copyright and license notices. The software is provided as is.

## Install

- Windows 10/11 x64: choose the NSIS installer, portable EXE or portable ZIP. ZIP users run `ThoughtAnchor.exe`. Microsoft WebView2 Runtime and .NET Framework 4.8 are required. Closing the main window keeps the tray app running; exit through the tray menu. Windows binaries are unsigned.
- Android 8.0+: install the release APK and keep Android System WebView updated. Phones open the mobile interface; tablets default to the desktop layout. Settings can override the layout on each device. Only Windows and Android packages are currently available.
- Compare downloads against the release's `SHA256SUMS.txt` (PowerShell: `Get-FileHash -Algorithm SHA256 <file>`).

## Use

1. Write in the inbox: Enter saves; Shift+Enter adds a line. On Windows, `Ctrl+Shift+Space` opens quick capture while the app is running.
2. Move fragments to the board, drag cards, connect their four ports, group cards and reuse groups. Double-click text to edit it. Add selected cards/groups to the article and arrange their order.
3. Choose move, selection, pen or eraser. Double-click/tap the canvas to return to the previous tool; another double-click returns to the current one. Undo/redo supports `Ctrl+Z` / `Ctrl+Y` on Windows.
4. Open a card's drawing editor to keep its text visible, draw in the extra space below it and change card width/height. Save commits ink and size together; Cancel discards both. Direct drawing on cards is an optional setting, **off by default**; when enabled, each stroke saves automatically.
5. Export a board as `.thoughtanchor`, or an article/draft as Markdown/plain text. Import creates a new copy. Export important work regularly; undo history lasts for the current session.

On phones, swipe right or tap the directory button to open the animated sidebar. Settings are at its bottom. Optional LAN pairing connects Android to a running Windows app: display the pairing code on Windows, then scan/paste it on Android. Both devices need the same reachable network. Offline conflicting boards are preserved as two copies. Credentials and device layout/drawing settings stay local.

## Optional AI and privacy

No key is needed for the board. Settings include GLM, Kimi, Qwen, MiMo, MiniMax, Grok and Tencent Hunyuan alongside the existing providers. Select the provider, edit the model/base URL if required and save that platform's key. See the bilingual [API configuration guide](../providers.md) for exact endpoints, regional keys and JSON defaults.

Assembly preserves the exact source fragments and adds transitions; polishing creates a separate draft in the selected language/style. Results remain previews until adopted and never overwrite cards. Only explicit AI actions send the required current article/draft. Keys use Windows DPAPI or Android Keystore, are isolated by endpoint and are not exported or synchronized. There is no telemetry or hosted cloud sync. Exports are readable files. See [security](../../SECURITY.md) and [verification limits](../verification.md); provider adapters were checked with fixtures, not paid API calls.

## Develop

Use Node.js 24 LTS. Windows builds need Windows x64, WebView2 and .NET Framework 4.8. Android builds need JDK 21 and Android SDK 36; set `JAVA_HOME` and `ANDROID_HOME`/`ANDROID_SDK_ROOT` as described in the [Android guide](../android-runtime.md).

```sh
npm ci
npm test
npm run security
npm run package
npm run build:android
```

Windows output: `release/` (installer, portable EXE/ZIP). Android output: signed release APK in `release/`, plus a separate `.test` debug package. Preserve your private signing key to allow future APK updates; never commit it. Runtime regression commands are `npm run test:native` and `npm run test:android`; they use isolated test data. [Architecture](../native-runtime.md) · [Third-party notices](../third-party-notices.md).
