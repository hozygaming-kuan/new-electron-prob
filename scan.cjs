const fs = require('fs');
const path = require('path');

// ================= 設定區 =================

// 1. 定義輸出的檔案名稱
const OUTPUT_FILES = {
    FRONTEND: 'context_frontend.txt',       // 前端
    BACKEND: 'context_backend_main.txt',   // 後端主進程、模擬
    CORE: 'context_core_logic.txt',     // 核心機率演算法
    PARSER: 'context_config_parser.txt'   // Excel 解析與設定
};

// 2. 定義忽略的資料夾 (掃描時會直接跳過)
const IGNORE_DIRS = [
    'node_modules', 'dist', 'dist-electron',
    '.git', '.vscode', '.idea',
    'public', 'assets', 'coverage' // 圖片等靜態資源通常不需要給 AI
];

// 3. 定義要讀取的副檔名
const ALLOW_EXTS = ['.ts', '.vue', '.js', '.json', '.css', '.html'];

// 4. 定義全域共用檔案 (會被加到所有輸出的開頭)
const GLOBAL_FILES = [
    'package.json',
    'tsconfig.json',
    'vite.config.ts'
];

// ================= 邏輯區 (自動分類器) =================

// 這是一個「分類帽」，根據檔案路徑決定它要去哪裡
function determineCategory(filePath) {
    // 統一將路徑分隔符號轉為 '/' (Windows/Mac 通用)
    const p = filePath.replace(/\\/g, '/');

    // Rule 1: 前端 (src 目錄下所有東西)
    if (p.startsWith('src/')) {
        return OUTPUT_FILES.FRONTEND;
    }

    // Rule 2: Electron 相關
    if (p.startsWith('electron/')) {

        // 2.1: 設定與解析器 (優先判斷特定子目錄)
        // 包含: electron/rand-core/parser, electron/rand-core/config, electron/setting
        if (p.includes('/rand-core/parser/') ||
            p.includes('/rand-core/config/') ||
            p.includes('electron/setting/')) {
            return OUTPUT_FILES.PARSER;
        }

        // 2.2: 核心邏輯 (rand-core 下的其他東西)
        // 包含: electron/rand-core/core, electron/rand-core/game, index.js
        if (p.includes('/rand-core/')) {
            return OUTPUT_FILES.CORE;
        }

        // 2.3: 後端主進程 (electron 下剩餘的所有東西)
        // 包含: main.ts, gameService.ts, simulation/, preload.ts...
        return OUTPUT_FILES.BACKEND;
    }

    // 其他根目錄的雜檔 (如果不重要可以回傳 null 忽略)
    return null;
}

// ================= 執行區 =================

console.log('🚀 Starting smart scan...');

// 準備容器
const fileContents = {
    [OUTPUT_FILES.FRONTEND]: '',
    [OUTPUT_FILES.BACKEND]: '',
    [OUTPUT_FILES.CORE]: '',
    [OUTPUT_FILES.PARSER]: ''
};

// 先讀取全域檔案
let globalContent = '=== GLOBAL SETTINGS ===\n';
GLOBAL_FILES.forEach(file => {
    if (fs.existsSync(file)) {
        try {
            const content = fs.readFileSync(file, 'utf-8');
            globalContent += `\n--- START OF FILE: ${file} ---\n${content}\n--- END OF FILE: ${file} ---\n`;
        } catch (e) { }
    }
});

// 幫所有容器加上 header
Object.keys(fileContents).forEach(key => {
    fileContents[key] = `Project Context Module: ${key}\n\n${globalContent}\n=== MODULE FILES ===\n`;
});

// 遞迴掃描函式
function scanDirectory(currentPath) {
    let files = [];
    try {
        files = fs.readdirSync(currentPath);
    } catch (e) {
        return;
    }

    files.forEach(file => {
        // 忽略特定資料夾
        if (IGNORE_DIRS.includes(file)) return;

        const fullPath = path.join(currentPath, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            scanDirectory(fullPath); // 遞迴進入
        } else {
            const ext = path.extname(file);
            // 檢查副檔名 & 排除 package-lock
            if (ALLOW_EXTS.includes(ext) && !file.includes('lock') && file !== 'scan.js') {

                // 取得相對路徑 (例如: src/components/App.vue)
                const relativePath = path.relative(process.cwd(), fullPath);

                // 丟進分類帽
                const targetFile = determineCategory(relativePath);

                if (targetFile && fileContents[targetFile] !== undefined) {
                    const content = fs.readFileSync(fullPath, 'utf-8');
                    // 統一轉為 forward slash 顯示
                    const displayPath = relativePath.replace(/\\/g, '/');

                    fileContents[targetFile] += `\n--- START OF FILE: ${displayPath} ---\n`;
                    fileContents[targetFile] += content;
                    fileContents[targetFile] += `\n--- END OF FILE: ${displayPath} ---\n`;
                }
            }
        }
    });
}

// 開始掃描
scanDirectory(process.cwd());

// 寫入檔案
Object.entries(fileContents).forEach(([filename, content]) => {
    fs.writeFileSync(filename, content);
    console.log(`✅ Generated: ${filename} \t(${(content.length / 1024).toFixed(1)} KB)`);
});

console.log('🎉 All done! Auto-categorization complete.');