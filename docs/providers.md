# API 接口配置 · API configuration

核对日期 / Checked: **2026-10-07**。预设是可编辑的起点，不承诺厂商账号、地区、额度或模型权限。Settings → AI，选择厂商，按需修改基础地址与模型，填写该平台的 API Key 后保存。基础地址不要包含 `/chat/completions` 或 `/messages`，程序自动追加路径。切换地址或协议后须单独保存密钥。

Choose a provider in Settings → AI, edit the base URL/model if needed, enter that service's API key and save. The app appends the request path. Keys are isolated by protocol and base URL. Model availability and account permissions can change; check the linked official documentation.

| Preset                     | Protocol           | Base URL                                            | Default model   | Official documentation                                                                                                                                     |
| -------------------------- | ------------------ | --------------------------------------------------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GLM                        | OpenAI Chat        | `https://open.bigmodel.cn/api/paas/v4`              | `glm-5.3-flash` | [OpenAI compatibility](https://docs.bigmodel.cn/cn/guide/develop/openai/introduction), [model](https://docs.bigmodel.cn/cn/guide/models/vlm/glm-5.3-flash) |
| Kimi                       | OpenAI Chat        | `https://api.moonshot.cn/v1`                        | `kimi-k2.6`     | [K2.6 guide](https://platform.kimi.com/docs/guide/kimi-k2-6-quickstart)                                                                                    |
| Qwen                       | OpenAI Chat        | `https://dashscope.aliyuncs.com/compatible-mode/v1` | `qwen-plus`     | [Alibaba Cloud compatibility](https://help.aliyun.com/zh/model-studio/compatibility-of-openai-with-dashscope)                                              |
| MiMo                       | OpenAI Chat        | `https://api.xiaomimimo.com/v1`                     | `mimo-v2.5-pro` | [Xiaomi API guide](https://platform.xiaomimimo.com/docs/en-US/usage-guide/passing-back-reasoning_content)                                                  |
| MiniMax                    | Anthropic Messages | `https://api.minimax.cn/anthropic`                  | `MiniMax-M3`    | [Recommended Anthropic protocol](https://platform.minimaxi.com/docs/api-reference/text-anthropic-api)                                                      |
| Grok                       | OpenAI Chat        | `https://api.x.ai/v1`                               | `grok-4.7`      | [Chat Completions](https://docs.x.ai/developers/model-capabilities/legacy/chat-completions)                                                                |
| 腾讯混元 / Tencent Hunyuan | OpenAI Chat        | `https://tokenhub.tencentmaas.com/v1`               | `hy3`           | [TokenHub guide](https://cloud.tencent.com/document/product/1823/132252)                                                                                   |

## 兼容性与地区 · Compatibility and regions

- **GLM**: JSON 模式开启；默认模型支持思考且不能关闭。较长推理可能触及 60 秒阶段超时或输出上限；可自行选用权限内的其他模型。JSON mode is enabled. The default model requires reasoning; long requests may hit the stage timeout/output limit.
- **Kimi**: `kimi-k2.5` / `kimi-k2.6` 在官方 Moonshot 地址使用 `thinking.type: disabled`。默认不附加强制 JSON 参数，仍要求 JSON 并本地校验。国际平台使用 `https://api.moonshot.ai/v1`，账号、余额及密钥与中国平台分开。These two models use instant mode at official endpoints; JSON mode is off by default. Use the international endpoint with its matching account/key.
- **Qwen**: 默认 `qwen-plus` 附加 `enable_thinking: false`，兼容非流式 JSON 输出。北京旧域名仍受支持；官方推荐业务空间域名 `https://{WorkspaceId}.cn-beijing.maas.aliyuncs.com/compatible-mode/v1`，填写实际 ID。新加坡/东京可用对应业务空间域名，美国为 `https://dashscope-us.aliyuncs.com/compatible-mode/v1`。密钥必须匹配地域。The default uses non-thinking JSON mode; regional keys must match the endpoint. Replace `{WorkspaceId}` with your real workspace ID. See the official page for other regions.
- **MiMo**: 默认不强制 `response_format`，避免未经确认的参数兼容性；正常答案取 `content`，不把 `reasoning_content` 当作正文。JSON mode is off by default; only answer content is parsed. Choose another available model if required by your account.
- **MiniMax**: 推荐协议将思考块和正文分开，程序只解析 `text` 块。国际平台可改为 `https://api.minimax.io/anthropic` 并保存国际平台密钥；也支持手动改为 OpenAI 协议与相应 `/v1` 地址。The default Anthropic adapter reads text blocks only. The international platform uses its own endpoint/key. M3 is used instead of a subscription-only preview model.
- **Grok**: JSON 模式开启，使用仍提供的 Chat Completions 接口。**Grok 与 Groq 是不同厂商**，各自密钥不能混用。Uses the legacy Chat Completions endpoint with JSON mode. Grok and Groq are separate providers.
- **混元**: 默认使用 TokenHub 密钥。旧混元服务可以手动填写 `https://api.hunyuan.cloud.tencent.com/v1`、`hunyuan-turbos-latest` 与旧平台 API Key，见[旧接口说明](https://cloud.tencent.com/document/product/1729/111007)。不要填写腾讯云 SecretId/SecretKey。国际 TokenHub 地址为 `https://tokenhub-intl.tencentcloudmaas.com/v1`，使用匹配平台的密钥。默认关闭强制 JSON 参数。The default requires a TokenHub API key, not Tencent Cloud SecretId/SecretKey. Legacy Hunyuan and international TokenHub use different endpoints and matching keys.

原有 DeepSeek、OpenAI、Claude、Gemini、硅基流动、Groq、OpenRouter 和自定义入口继续保留。任何 OpenAI 兼容接口均可在设置里关闭“JSON 模式”；结果仍需通过结构、来源及内容校验后才能采用。

Existing presets and custom services remain available. Turning off JSON mode omits `response_format`; it does not disable local validation. Credentials stay in native encrypted storage and never enter exported boards or LAN synchronization. Only an explicit AI action sends the current article/draft needed for that action. These adapters were tested with local fixtures, not paid provider calls.
