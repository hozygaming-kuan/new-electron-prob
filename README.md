# Slot Machine Simulator (Electron + Vue 3)

這是一個基於 **Electron** 與 **Vue 3** 構建的高效能老虎機模擬器。支援 Excel 參數設定、多執行緒 (Worker) 快速運算，以及詳細的統計報表分析。

## 🚀 專案特色 (Key Features)

* **高效能模擬**：使用 `workerpool` 在後端開啟多執行緒進行運算，前端介面流暢不卡頓。
* **多視窗架構**：
    * **主控台**：遊戲試玩、參數調整、Excel 設定載入。
    * **進度監控**：獨立的懸浮小視窗，支援拖移、最小化與隨時中止模擬。
    * **統計報表**：模擬結束後自動彈出獨立報表視窗，提供詳細數據分析。
* **詳細統計數據**：
    * 包含 RTP、存活率、退幣率、標準差 (SD)、信賴區間 (CI 95%)。
    * 支援主遊戲、免費遊戲 (Free Game) 的獨立數據與倍數分佈。
    * 支援反向累積 RTP 與出現率分析。
* **Excel 驅動**：直接讀取 Excel (`.xls`) 定義檔來驅動機率模型 (使用 `xlsx` 與自定義 Parser)。
* **現代化 UI**：深色/淺色主題切換，專業的數據呈現排版。

## 🛠️ 技術棧 (Tech Stack)

* **Core**: Electron, TypeScript
* **Frontend**: Vue 3, Vite
* **State Management**: Vue Reactivity (Composition API)
* **Data Processing**: SheetJS (xlsx), workerpool
* **Styling**: Custom CSS variables (Dark/Light mode support)

## 📂 專案結構 (Project Structure)

```text
.
├── electron/
│   ├── main.ts             # Electron 主進程 (視窗管理、IPC)
│   ├── gameService.ts      # 遊戲服務入口
│   ├── simulation/         # 模擬運算與統計模組 (StatsManager)
│   └── rand-core/          # 核心機率邏輯 (Spin, Plate, Prize)
├── src/
│   ├── components/         # Vue 組件 (SlotMachine, ProgressWindow, ReportWindow)
│   ├── composables/        # 邏輯複用 (useSlotGame, useReportUtils)
│   ├── styles/             # 全域樣式 (dashboard, report)
│   └── App.vue             # 路由分流 (Dashboard / Report / Progress)
└── xls/                    # 遊戲設定檔存放區