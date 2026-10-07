# ThoughtAnchor · 思維拼圖

[全部語言](../README.md) · [下載 Windows / Android](https://github.com/kkaede4444/ThoughtAnchor/releases/latest)

ThoughtAnchor 是 Windows 與 Android 的本機白板。先保存零散想法，再用卡片、群組、連線與畫筆整理，成文直接引用原文。各裝置共用暖白紙面、水彩與襯線字體。

我做 ThoughtAnchor，是想讓自己與 ADHD 人群散亂的思維有一個更容易整理的地方。想法出現時先留下，有餘力再慢慢移動、歸組和連線。希望少消耗一點整理所需的耐心，把注意力留給想法本身，讓進入心流容易一些。先保存、反覆運用原文、隨時復原，按照自己的節奏推進。

本專案完全由 **Codex 構建**：維護者提出需求與產品方向，Codex 完成程式、介面、測試、文件和打包流程。第三方元件各自保留原有授權。採用 [MIT 授權](../../LICENSE)，可自由使用、修改、散布及商用，無須事先申請；請保留著作權與授權聲明。軟體按現狀提供。

## 安裝與操作

- Windows 10/11 x64：下載安裝版、免安裝 EXE 或 ZIP；解壓 ZIP 後執行 `ThoughtAnchor.exe`。需要 WebView2 Runtime 與 .NET Framework 4.8。關閉視窗後留在系統匣，可從系統匣退出。Windows 成品尚無程式碼簽章。
- Android 8.0 以上：安裝 APK，保持系統 WebView 更新。手機預設行動介面，平板預設桌面介面，可在設定切換。目前提供 Windows 和 Android 安裝包。
- 下載後以 Release 的 `SHA256SUMS.txt` 核對檔案摘要。

收件盒按 Enter 保存、Shift+Enter 換行；Windows 執行期間可用 `Ctrl+Shift+Space` 開啟快速捕捉。把片段放到白板，拖曳卡片、使用四邊圓點連線、建立群組；雙擊文字編輯。選取片段或群組加入成文區，再調整順序。

移動畫布、框選、畫筆與橡皮擦記住上一個工具；雙擊畫布切回，再雙擊切回目前工具。Windows 支援 `Ctrl+Z` / `Ctrl+Y`。卡片繪圖小窗顯示完整文字，下方預留繪圖空白，也能設定卡片寬高。保存一併提交筆跡和尺寸，取消丟棄變更。「直接在卡片上繪製」**預設關閉**，開啟後每筆自動保存。

手機右滑或點目錄按鈕開啟側欄，設定在側欄底部。區域網路同步需要同一個可連線網路與執行中的 Windows：在電腦顯示配對碼，Android 掃描或貼上。離線衝突保留兩份；密鑰、介面和直接繪圖選項留在本機。思路紙可匯出 `.thoughtanchor`，文章與稿件可匯出 Markdown／純文字；匯入建立副本。請定期自行備份，復原歷史只保留本次執行。

## AI 與隱私

白板不需要 API 密鑰。設定提供 GLM、Kimi、Qwen、MiMo、MiniMax、Grok、騰訊混元和原有廠商。選擇廠商、按需修改基礎網址與模型、保存對應平台密鑰。網址、地區與 JSON 相容性見 [API 配置](../providers.md)。拼接逐字保留片段，美化產生獨立稿件；預覽必須手動採用，不覆寫卡片。

只有主動點擊 AI 才發送當前操作需要的文章或稿件。Windows DPAPI／Android Keystore 加密密鑰，不匯出、不同步。無遙測或託管雲端同步。匯出檔是可讀資料。[安全說明](../../SECURITY.md) 與 [驗證記錄](../verification.md) 說明檢查範圍；沒有使用付費廠商 API 測試。

## 開發

使用 Node.js 24 LTS。Windows 需要上述執行環境；Android 需要 JDK 21 和 SDK 36，設定方式見 [Android 文件](../android-runtime.md)。

```sh
npm ci
npm test
npm run security
npm run package
npm run build:android
```

成品在 `release/`。請保存自己的 Android 簽章私鑰以便更新，切勿提交。原生與真機回歸使用隔離測試資料：`npm run test:native`、`npm run test:android`。[架構](../native-runtime.md) · [第三方授權](../third-party-notices.md)。
