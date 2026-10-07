# 0.3.0 原生 Windows 运行时

ThoughtAnchor 已从 Electron 迁移为 .NET Framework 4.8 WinForms 窗口 + 系统 WebView2。应用仍使用现有 React / React Flow 白板；原文、独立稿件、框架与 v1/v2 数据格式保留。构建和测试时使用 Node，应用成品中没有 Node、Electron 或独立打包的 Chromium。

## 原生职责与文档隔离

Windows 层管理主窗口、捕捉窗、托盘、单实例、全局快捷键、文件选择、串行保存、Windows DPAPI 和 HTTP。主窗口关闭后驻留托盘，退出菜单释放快捷键和数据锁。

文档操作复用已测试的 TypeScript 规则，编译为本地 `domain.js`，在 WebView2 的隔离执行上下文中运行。这个上下文与白板界面不共享 JavaScript 全局变量。界面只能调用固定的消息操作；源地址必须是本应用页面。没有通用文件读写、任意执行、远程页面或宿主对象接口。

命令先生成待提交状态，原生层刷新临时文件并原子替换后再提交文档状态、撤销历史和广播。保存失败时丢弃待提交操作。数据文件被其他程序修改时拒绝覆盖。建议退出旧 Electron 应用后运行新版，避免两种运行时同时修改同一目录。

AI 请求在原生层发送；密钥仅在原生层与隔离的请求构造上下文中使用。保留 HTTPS / 本机 HTTP 限制、禁止重定向、每阶段 60 秒、响应大小限制、取消、来源变化拒绝、拼接后美化失败保留拼接稿等规则。测试只使用本机模拟服务。

## 旧数据与密钥

默认仍读取 `%APPDATA%/ThoughtAnchor/data`。v1 升级前备份，v2 文件直接读取，导入创建独立副本。损坏主文件保留为 `.damaged-*`，从校验有效的备份恢复。

新密钥写入 `keys-native.json`，以 Windows 当前账户 DPAPI 加密。首次运行尝试读取 `keys.json`；直接 DPAPI 密文和 `v10` AES-GCM 密文分别处理，后者读取同目录上一级的 Local State 中受 DPAPI 保护的旧主密钥。迁移不修改 `keys.json` 或 Local State。无法解密时保留原文件并提示重新保存；损坏的密钥文件不会阻止白板启动。

白板渲染错误保留局部恢复按钮。WebView2 渲染进程退出时原生层重建窗口，并恢复当前已提交文档；撤销历史在该异常恢复后重新开始。

## 构建与分发

- 构建：Node.js 24、Windows x64、系统 .NET Framework 4.8。SDK 与编译器固定在 `native/packages.json`，下载缓存位于 `.local/native-packages`。没有 Rust、Visual Studio 或 .NET SDK 要求。
- 运行：Windows 10/11 x64、.NET Framework 4.8、系统 Microsoft Edge WebView2 Runtime。
- 分发：NSIS 安装包、解压版 ZIP 与自动解包的 portable EXE。便携版仍使用正常的数据目录，不把用户数据保存到临时解包目录。
- 安装目录为 `%LOCALAPPDATA%/Programs/ThoughtAnchorNative`，与旧 Electron 文件分开；新快捷方式指向原生应用。卸载只删除包内文件，保留数据目录。
- `--automation-port` 必须同时明确指定数据目录，才允许本机调试端口和测试导入/导出。普通运行不开放调试端口。

官方说明：[WebView2 分发](https://learn.microsoft.com/microsoft-edge/webview2/concepts/distribution)、[WebView2 WinForms](https://learn.microsoft.com/microsoft-edge/webview2/get-started/winforms)。

成品约 7.5 MB，原 Electron 0.2.0 portable EXE 约 126.4 MB，体积减少约 94%。这是分发体积比较，不包含系统已有运行时，也不等于所有场景的内存、启动速度或帧率改善；尚未进行长期性能压测。
