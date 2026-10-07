# ThoughtAnchor 0.5.0

让散乱的想法有处安放，少花一点耐心整理，多留一点注意力给想法本身。ThoughtAnchor 为维护者自己和 ADHD 人群设计，希望让保存、整理与复用想法更轻松，让进入心流容易一些。

- 新增 GLM、Kimi、Qwen、MiMo、MiniMax、Grok、腾讯混元 API 预设，配有官方基础地址和可编辑模型；适配 Kimi/Qwen 参数与 MiniMax 的正文／思考分离。混元默认 TokenHub，文档同时说明旧版和国际接口。
- 发布 Windows 原生安装版、免安装 EXE/ZIP 与 Android 签名 APK；手机侧栏、平板桌面布局、局域网 TLS 同步与离线冲突保留。
- 各端都有画笔和橡皮擦；卡片绘图小窗保留全文及下方空白，可调整卡片大小。直接在卡片上绘制默认关闭。双击切换到上一个工具。
- 提供简体中文、繁體中文、English、日本語、한국어、Français、Deutsch、Español 八种语言的使用与开发指南，说明本项目完全由 Codex 构建，采用 MIT 许可，允许修改、分发与商用，保留版权和许可声明。
- 发布前检查源码和 Git 历史、依赖、密钥隔离、原生消息来源、成品内容、APK 签名及摘要。Android 请求与密钥范围绑定同一快照；Windows 限制同步连接数量。CI 权限只读，固定 action 提交，不覆盖已验证的发布成品。

**English:** A local-first board for scattered thoughts, designed for the maintainer and people with ADHD to make organizing take less patience and help make room for flow. Adds seven provider presets; ships native Windows and signed Android packages, tablet/phone layouts, drawing and optional pinned-TLS LAN sync. Eight-language documentation, entirely built by Codex under the maintainer's direction, MIT licensed. Source/history, dependencies, credentials, package contents and hashes are checked before publication.

Windows requires WebView2 Runtime and .NET Framework 4.8; its binaries are unsigned. Android requires Android 8.0+ and an updated system WebView. AI adapters are validated with local mocks, without paid provider calls. macOS/iOS packages are not included.

## 0.4.1：可选的卡片直接绘图

- 设置新增“直接在卡片上绘制”，默认关闭，旧数据升级也保持关闭；每台设备独立保存这个选择。
- 开启后，从卡片正文落笔会直接写入卡片，保留文字与卡片尺寸；每笔自动保存，擦除按一次手势保存，工作台可撤销／重做。空白处落笔继续写入白板。
- 保留卡片绘图小窗、局部撤销／重做、保存和取消。小窗显示原有文字和纸面，文字下方额外预留空白绘图区域；小窗内可以设置卡片宽高，与笔迹一起保存或取消，保存可整体撤销。
- 移动画布、画笔、橡皮擦和框选记住上一次使用的工具；双击画布或双击触摸切回上一个工具，再双击切回当前工具。双击不新增点或误擦已有笔迹；重复点击当前工具不改变历史。
- 卡片笔迹跟随卡片移动、分组、重启恢复、导出和同步。取消触摸或出现第二个指针时丢弃未完成的笔迹。

## 0.4.0：Android、触控和卡片绘图

- Android 原生容器与系统 WebView，提供签名 APK。手机以白板为首页，闪念和成文独立切换；右划或点击目录按钮打开上层侧栏，背景有缩放、模糊与动画，设置入口位于目录底部。
- 平板默认使用 PC 三栏工作台；设置支持自动、移动、桌面模式，本机选择不被同步覆盖。保留暖白纸面、水彩和衬线字体。
- 手机、平板和 Windows 均增加画笔、橡皮擦、颜色、粗细、压力笔迹与撤销。触控笔在移动模式也可直接落笔；手指绘图需切换画笔。
- 画笔可以保存在卡片里，和文字共存。绘图编辑器可反复打开，支持局部撤销／重做和桌面 Ctrl+Z／Ctrl+Y；保存后跟随卡片移动、归组、同步与导出，工作台可以撤销保存。
- v3 思路纸和工作区保存白板及卡片矢量笔迹，继续读 v1/v2，没有笔迹的导出保留 v2。首次写入 v3 时额外保留 v2 备份。
- Windows 局域网 TLS 同步、二维码／文字配对、固定证书指纹和设备凭据。同步思路纸、收件盒、语言、写作与接口设置；密钥和设备设置保留本机。
- 离线修改采用共同基线合并，冲突思路纸保留两份，重试不增加副本；通用设置冲突提供本机／电脑选择。前台自动同步，后台使用系统周期任务尽力同步。
- Android 支持系统文件导入导出、文本分享、Keystore 加密密钥和原生 AI 请求。macOS/iOS 暂未生成安装包。

使用与构建见 [Android 说明](android-runtime.md)，验证边界见 [验证记录](verification.md)。

## 0.3.0：原生 Windows 运行时与白板稳定性

- 替换 Electron 为原生 Windows 窗口＋系统 WebView2，移除应用内 Node 与 Chromium；portable EXE 约 7.5 MB。
- 选中卡片右上角显示小 ×；撤销和重做移至工具栏左侧。
- 双击空白处切换移动画布／框选工具，悬停按钮显示用法；文字仍可双击编辑。
- 修复框架删除读取已删除父节点的崩溃，新增／恢复节点不再等待测量才能显示；框架在当前视野附近生成并自动完整显示。
- 加固拆组、嵌套删除、撤销重做、编辑时切换思路纸、拖动中删除及待连接起点删除。方向键移动保存并可撤销。
- 保留 v1/v2 数据、捕捉、稿件及八语言；旧密钥尝试解密迁移后重新使用 Windows DPAPI 加密，保留原文件。
- 原生进程管理串行持久化、托盘、单实例、快捷键、文件与 AI；文档规则在隔离的 WebView2 上下文执行。

成品已在本机检查，不上传 GitHub。完整结果与验证边界见 [verification.md](verification.md)，架构说明见 [native-runtime.md](native-runtime.md)。

## 0.2.0：白板、AI 成文与八语言

- 修复圆点操作及多选后点空白引发的渲染循环；保留节点测量结果，增加可恢复的错误界面。
- 左键平移、右键增减选中、框选工具、整卡拖动、双击文字编辑，以及组内重排、移出和跨组拖放。
- 四向共享端点、反向去重、手动圆点与自动就近连接；选线删除和两端流动虚线框。
- 拼接／美化／拼接＋美化，默认不重排。逐字插入原文，当前稿件优先美化，失败后保留拼接预览并支持重试。
- 每纸一份独立稿件，预览后采用、编辑、撤销、重启恢复，原文与稿件均可导出 MD／TXT。
- 简繁中文、英语、日语、韩语、法语、德语、西班牙语；文学传统自动跟随语言，也支持手动选择、四种表达风格和自定义要求。
- v2 工作区与思路纸文件，迁移前备份并兼容 v1。

本次生成本地 Windows x64 安装版与免安装版，不上传 GitHub。AI 验证使用模拟响应，真实文学效果和语义保留仍需实际模型验证。检查详情见 [verification.md](verification.md)。

## 0.1.0 已发布版本

ThoughtAnchor 0.1.0 首个 Windows 桌面版本。

- 全局闪念收件盒与可配置的快速捕捉快捷键。
- 自由白板、带预览的归组/排序/关系吸附、可折叠的嵌套组合。
- 三种可选框架，同一板块直接接入成文，导出思路纸、Markdown 或纯文本。
- 串行自动保存、两份恢复备份、撤销/重做。
- 默认 DeepSeek，可配置 OpenAI 兼容、Anthropic、Gemini 接口；仅补过渡句与建议现有板块的顺序。
- 原创水彩、暖白纸纹与逐笔加载动画；可关闭声音并减少动态效果。

下载 `nsis.exe` 安装，或运行 `portable.exe`。发布包未进行付费代码签名。真实 AI 服务需要自己的 API 密钥；离线适配器测试不等于真实厂商调用验证。
