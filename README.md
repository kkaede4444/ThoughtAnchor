# ThoughtAnchor · 思维拼图

把闪念留住，把思路拼起来。

ThoughtAnchor 是一个 Windows 桌面白板。想法可以先散着存在，再通过归组、排序和连线接成可复用的板块。成文直接引用原片段，不需要从头抄写一次。

原创暖白纸面、水彩颗粒和逐笔铺开的加载图示，让整理像在纸上慢慢动手。

![ThoughtAnchor 工作台](docs/screenshots/workbench.png)

## 使用

下载 Release 中的 Windows x64 安装包（`nsis.exe`）或免安装版（`portable.exe`）。支持 Windows 10/11；关闭主窗口后驻留托盘，托盘菜单可退出。发布包暂未购买代码签名证书。

1. **留住闪念**：在收件盒写下内容，Enter 保存并继续，Shift+Enter 换行。程序运行时按 `Ctrl+Shift+Space` 可从其他应用打开快速捕捉窗。中文输入法确认候选字不会提交。
2. **摊到纸上**：从收件盒放入片段，或双击白板空白处新增。长文本、多行粘贴完整保留；「按段拆分」需要你主动点击。
3. **拼起来**：拖动顶栏靠近另一片。中间归组、上下排前后、两侧建立关系。落点提示显示真实操作，松手提交；放在空处仍是独立片段。Shift 多选后可以归组。
4. **直接复用板块**：给组合命名、折叠、整组移动，或拆回原片段。框架提供命名空位，可以放入片段或已有组合。
5. **慢慢成文**：选中片段或整个组合，点「加入选中」。可拖动或用上下按钮排序。导出 Markdown 或纯文本。

白板空处右键拖动画布，滚轮缩放，左下角可查看全部。`Ctrl+Z` 撤销、`Ctrl+Y` 重做；选中后 Delete 删除，仍可撤销。在文字输入框内保留原生文字编辑快捷键。

## AI：可选的轻协助

没有密钥也能使用全部白板功能。预置 DeepSeek、OpenAI、Claude、Gemini、硅基流动、Groq、OpenRouter，支持 OpenAI 兼容、Anthropic Messages、Gemini GenerateContent 三类协议，可以填写其他厂商的自定义地址和模型名称。OpenAI 兼容接口不支持 JSON 模式时可以关闭该选项，本地的内容与结构校验仍然有效。

- **只补过渡句**：只为成文区当前相邻的板块提供最多 24 个字符的过渡句。逐条接上、略过；已接上的句子是独立图层，可以编辑或移除。原片段不变。
- **建议一个顺序**：只返回现有板块 ID 的完整排列。预览后点「采用顺序」才生效。
- 内容在等待期间改变，建议会失效。错误 ID、重复 ID、缺失板块、越界过渡或改写字段会被拒绝。
- 点击按钮后才向所选接口发送**成文区**的板块标题与原文；收件盒和其他思路纸不发送。没有自动调用、遥测或云同步。
- 密钥通过 Electron `safeStorage` 使用 Windows 系统加密，按接口协议与基础地址隔离保存，不进入导出文件。不能防止能读取当前 Windows 用户账户的恶意软件。

预设模型是可编辑的起点，厂商可用模型和权限会变化。官方协议参考：[DeepSeek](https://api-docs.deepseek.com/)、[OpenAI](https://developers.openai.com/api/docs/)、[Anthropic](https://platform.claude.com/docs/en/api/messages)、[Gemini](https://ai.google.dev/gemini-api/docs/generate-content)、[硅基流动](https://docs.siliconflow.cn/docs/api/chat-completions-post)、[Groq](https://console.groq.com/docs/openai)、[OpenRouter](https://openrouter.ai/docs/quickstart)。

## 本地数据与备份

思路纸、全局收件盒、捕捉草稿和设置在 `%APPDATA%/ThoughtAnchor/data`（实际路径可通过设置的文件夹按钮打开）。命令按顺序保存，写入临时文件并刷新后替换主文件，成功后才确认捕捉。主文件保留两份最近版本备份；损坏时从备份恢复并保留损坏文件。

`.thoughtanchor` 导入/导出是版本化 JSON，包含一张思路纸及其结构、关系和过渡句，不含密钥、设置、收件盒和其他项目。导入创建副本，不覆盖已有纸。重要内容请定期导出到自己的备份位置。撤销历史仅保留本次运行最近 100 步。

## 开发

Node.js 24 LTS、Windows x64。

```sh
npm ci
npx install-electron
npm run dev
npm test
npm run build
npm run smoke
npm run package
```

Electron 44 将运行时下载改为显式 `install-electron` 命令。`npm run package` 输出 NSIS 安装包与 portable EXE 到 `release/`。

`npm run smoke` 使用独立的临时数据目录，在真实 Electron 中检查渲染、捕捉持久化和托盘资源，然后自动退出。要复用检查数据，可指定 `THOUGHTANCHOR_DATA_DIR`。中性示例见 [example.thoughtanchor](docs/example.thoughtanchor)，可以直接从工具栏导入。

代码结构：`src/shared` 是结构、导入验证和纯内容操作；`src/main` 是串行存储、系统集成与 AI 请求；`src/preload` 只暴露经过校验的窄 IPC 接口；`src/renderer` 是工作台与原创 SVG 水彩。渲染进程没有 Node 权限或密钥访问。

验证记录见 [docs/verification.md](docs/verification.md)。本项目旨在降低保存和整理想法的操作阻力；实际是否更容易进入心流由使用体验决定。

## English

ThoughtAnchor is a local-first Windows thinking board. Capture fragments globally, snap them into reusable groups, arrange them on a paper canvas and assemble an article from the same content. Optional AI can suggest connecting sentences or an exact permutation of existing blocks; it never rewrites your cards. Chinese UI, offline core, MIT license.

Visual direction is inspired by Anthropic's editorial rhythm and watercolor charts. All artwork is original SVG/CSS. Bundled Noto Serif SC is licensed under SIL OFL; see [third-party notices](docs/third-party-notices.md).
