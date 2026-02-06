# Slot Machine Probability Simulator Framework

高效能老虎機機率驗證與統計模擬框架。整體以 Electron 多進程架構為核心，搭配 Worker Pool 高併發模擬、Excel 配置驅動、模組化統計系統與自動化報表生成。

## 📌 專案定位

- **用途**: 用於驗證機率模型、統計報表生成與快速試算 (千萬級 Spins) 。
- **核心理念**: Configuration Driven，所有機率模型由 `xls/config-game` 驅動，避免直接改 code。
- **定位角色**: 數學/企劃可直接調整 Excel，工程師專注於核心邏輯與統計模組。

## ✨ 核心特色

- **多進程架構**: 主程序與模擬運算分離，UI 不阻塞。
- **Worker Pool 模擬**: Worker 並行跑 Spin，支援進度回報與中止。
- **統計模組化**: StatsManager 統一分發資料，各模組獨立計算。
- **Excel 驅動**: 透過 Parser 解析 Excel，輸出 JSON 與 hash 校驗。
- **自動化報表**: `scaffold.cjs` 自動生成 stats 模組與 report view。
- **全端熱重載**: 開發模式下，前後端皆可熱更新並自動重啟。

## 🧱 架構分層

| 層級 | 主要責任 | 對應目錄 |
| --- | --- | --- |
| Presentation | UI、報表、互動 | [src/](src/) |
| Application | IPC/Window 管理 | [electron/main.ts](electron/main.ts#L1) |
| Simulation | Worker 執行與統計 | [electron/simulation/](electron/simulation/) |
| Domain | RNG、Spin、Plate、Prize | [electron/rand-core/](electron/rand-core/) |
| Data | Excel 解析與 JSON 產生 | [electron/rand-core/parser/](electron/rand-core/parser/) |

## 🧪 模擬流程 (Simulation Flow)

1. 使用者觸發「Lightning」模擬。
2. Main Process 建立 Worker Pool (`maxWorkers = 10`)。
3. 每個 Worker 獨立載入 `rand-core` 並執行 `runSimulation`。
4. `StatsManager` 在 Worker 端累積原始統計資料。
5. Main Process 合併各 Worker 回傳結果，生成最終 Report。
6. 開啟報表視窗 (`#report`) 顯示統計成果。

## 📊 統計系統 (Stats System)

- **StatsManager**: 統一計算 totalWin 並轉交各統計模組處理。
- **模組註冊**: 由 [electron/setting/config.json](electron/setting/config.json) 控制。
- **內建模組**:
  - `BaseStatModule`
  - `LineStatModule`
  - `ScatterStatModule`
  - `WildStatModule`

## 🗂️ Excel 配置規範

Parser 依賴固定結構：

```text
xls/
└── config-game/
    ├── define.xls
    ├── default/
    │   ├── plate_*.xls
    ├── mainPrize/
    │   └── {score}.xls
    ├── itemPrize/
    │   └── {type}/{score}.xls
    └── item.xls
```

解析結果會產生：
- `define.json`, `items.json`, `itemPrize.json`, `mainPrize.json`
- `hash.txt` 供版本比對與快取驗證

## 🧩 自動化 Scaffold (Auto-Generate)

編輯 [electron/setting/config.json](electron/setting/config.json) 後：

1. 開發模式 (`npm run dev`) 下，**儲存檔案即可自動生成**。
2. 可手動執行 `npm run scaffold` 重新生成。
3. 自動更新：
   - `electron/simulation/stats/registry.ts`
   - `src/components/reports/index.ts`
   - `*.ts` / `*.vue` 模板

## 🖥️ 開發模式 (Full-Stack Dev)

```bash
npm run dev
```

行為特點：
- **前端 (Vue)**: Vite HMR，修改 UI 即時更新。
- **後端 (rand-core / simulation)**: 任何後端檔案變更會自動重啟 Electron。
- **Config Watch**: `config.json` 變更即時觸發 Scaffold。
- **Session Signal**: `.dev-session` 用於關閉時自動退出終端。

## 🪟 多視窗與功能支援

- **主視窗**: Dashboard (試玩、Log、統計)。
- **Progress Window**: 無邊框置頂視窗，顯示模擬進度。
- **Report Window**: 模擬完成後自動彈出報表。
- **Project Rename**: Menu -> Rename Project (`Ctrl+R`)，寫回 `spec.json` 並同步標題。

## 📦 匯出與重載

- **system:reload**: 重新解析 Excel 並初始化核心配置。
- **system:export**: 匯出 `rand-core` (可選 zip config 與 Excel source)。
- **system:open-file**: 直接開啟指定 `.xls`。

## 🛠️ Build / Release

```bash
npm run build
```

`build-release.cjs` 會：
- 清理舊目錄 (並終止殘留進程)
- 編譯 Electron + Vite
- 產出 `release/{ProjectName}/`
- 複製 `config-game` 與 `rand-core-lib` 到發行包

## 📎 專案工具

- **scan.cjs**: 自動掃描並輸出 context_*.txt 供 AI/團隊 review。
- **scaffold.cjs**: 自動生成 Stats/Report 代碼與 registry。

## 📂 主要目錄結構

```text
root/
├── build-release.cjs
├── scaffold.cjs
├── scan.cjs
├── electron/
│   ├── main.ts
│   ├── gameService.ts
│   ├── preload.ts
│   ├── simulation/
│   │   ├── worker.ts
│   │   └── stats/
│   └── rand-core/
│       ├── core/
│       ├── game/
│       ├── parser/
│       └── config/
├── src/
│   ├── App.vue
│   ├── components/
│   ├── composables/
│   └── styles/
└── xls/
    └── config-game/
```

## 🧾 指令清單

| 指令 | 說明 |
| --- | --- |
| `npm run dev` | 開發模式，啟動 Scaffold Watch + Vite + Electron 自動重啟 |
| `npm run scaffold` | 生成統計模組與報表模板 |
| `npm run build` | 正式封裝 (Electron Builder) |
| `npm run preview` | 預覽 Vite 打包結果 |
