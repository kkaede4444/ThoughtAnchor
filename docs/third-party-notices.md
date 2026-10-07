# 第三方许可

ThoughtAnchor 的源码使用 MIT 许可，`LICENSE` 随项目提供。

0.3.0 使用的主要第三方组件：Microsoft WebView2 SDK（Microsoft 许可）、Newtonsoft.Json（MIT）、React/React DOM（MIT）、React Flow（MIT）、Zod（MIT）、Lucide（ISC）、Noto Serif SC（SIL Open Font License 1.1）。系统 WebView2 Runtime 由 Microsoft 分发；本应用不再打包 Electron 或 Chromium。

字体的完整许可位于 [font-OFL.txt](font-OFL.txt)。Noto Serif SC 字体未改名或修改。应用图标、纸纹、水彩图示与动画是本项目原创，没有打包参考网站的字体或插图。

安装和免安装包根目录提供 `LICENSE.txt`、`third-party-licenses.txt`、`microsoft.web.webview2-LICENSE.txt` 和 `newtonsoft.json-LICENSE.txt`，构建脚本从实际下载或安装的依赖中收集。

0.4.0 另外使用 QRCode（MIT）生成配对码。Android 使用 Kotlin 与 Kotlin Coroutines、AndroidX Activity/Core/WebKit/WorkManager、ZXing Android Embedded 和 ZXing Core，均使用 Apache License 2.0。Gradle Wrapper 使用 Apache License 2.0；完整许可见 [Apache 2.0](https://www.apache.org/licenses/LICENSE-2.0)。系统 Android WebView 由设备系统分发。APK assets 中包含本项目 MIT、前端依赖许可和字体 OFL；Android 原生组件许可见 `android/NOTICE.txt`。
