import { app, BrowserWindow, dialog, ipcMain, Menu, MenuItemConstructorOptions, shell } from 'electron'
import { fileURLToPath } from 'url'
import path from 'path'
import fs from 'fs'
import GameService from './gameService.js'
import { createRequire } from 'module'; // 引入 createRequire
import fse from 'fs-extra';
import AdmZip from 'adm-zip'
import { StatsManager } from './simulation/stats/StatsManager.js'

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 🔥 這一行非常重要，它定義了專案根目錄
process.env.APP_ROOT = path.join(__dirname, '..');

// 🔥 修正後的 require
const require = createRequire(import.meta.url);
const parserServicePath = path.join(process.env.APP_ROOT, 'electron/rand-core/parser/parserService.js');
const ParserService = require(parserServicePath);
const workerpool = require('workerpool');
// ... (後面的變數定義)
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

const workerPath = path.join(process.env.APP_ROOT, 'dist-electron/worker.js');
let pool: any = null;

function initPool() {
  if (pool) return; // 已經有就不用建
  pool = workerpool.pool(workerPath, { maxWorkers: 10 });
}

let reportCache: any = null;
let reportConfigCache: any = null;
let progressWin: BrowserWindow | null = null; // 存讀條視窗

let win: BrowserWindow | null

type betInfo = {
  /** 押注等級 */
  betlv: number;
  /** 線下注額 */
  lineBet: number;
  /** 線數選擇數量 */
  lineSelect: number;
  /** 購買特色遊戲類型 */
  buyFeatureType?: number;
  betValue?: number;
}

type SysInfo = {
  /** 指定RTP */
  targetRTP?: number;
  /** 指定贏分限紅 */
  targetWinLimit?: number;
  targetPrizeType?: number;
  randMode?: string;
};

function createAppMenu(win: BrowserWindow) {

  const template: MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Rename Project...', // ✨ 這裡加入修改名稱
          accelerator: 'CmdOrCtrl+R', // 快捷鍵 Ctrl+R
          click: () => {
            win.webContents.send('sys:open-rename-modal');
          }
        },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        { role: 'close' }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function loadStatConfig() {
  try {
    // 定義路徑：
    // 開發模式: 專案根目錄/electron/setting/config.json
    // 打包模式: resources/setting/config.json (需要在 builder config 設定，稍後說明)
    const configPath = app.isPackaged
      ? path.join(process.resourcesPath, 'setting', 'config.json')
      : path.join(process.env.APP_ROOT, 'electron', 'setting', 'config.json');

    // console.log('[Main] Loading Stat Config from:', configPath);

    if (fs.existsSync(configPath)) {
      const data = fs.readFileSync(configPath, 'utf-8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('[Main] Error loading stat config:', e);
  }
}

function loadGameSpec() {
  try {
    const specPath = app.isPackaged
      ? path.join(process.resourcesPath, 'rand-core/config/spec.json')
      : path.join(process.env.APP_ROOT, 'electron/rand-core/config/spec.json');

    if (fs.existsSync(specPath)) {
      const data = fs.readFileSync(specPath, 'utf-8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Error loading spec.json:', e);
  }
  return { name: 'Slot Machine Simulator' };
}

function createProgressWindow() {
  if (progressWin) return; // 避免重複開

  progressWin = new BrowserWindow({
    width: 400,  // 設定小尺寸
    height: 400,
    frame: false, // 🔥 無邊框 (這樣才像自訂 UI)
    resizable: false, // 禁止縮放
    alwaysOnTop: true, // 🔥 永遠置頂 (使用者切去其他視窗也能看到進度)
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
  });

  // 載入 Progress 頁面
  if (VITE_DEV_SERVER_URL) {
    const url = VITE_DEV_SERVER_URL.endsWith('/') ? VITE_DEV_SERVER_URL : `${VITE_DEV_SERVER_URL}/`;
    progressWin.loadURL(`${url}#progress`);
  } else {
    progressWin.loadFile(path.join(RENDERER_DIST, 'index.html'), { hash: 'progress' });
  }

  progressWin.on('closed', () => { progressWin = null; });
}

function createWindow() {

  const spec = loadGameSpec();
  const gameName = spec.name || 'Slot Machine Simulator';

  win = new BrowserWindow({
    width: 1200,
    height: 850,
    title: gameName,
    autoHideMenuBar: false,
    icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
  })

  createAppMenu(win);

  win.webContents.on('did-finish-load', () => {
    const currentSpec = loadGameSpec();
    const title = currentSpec.name || 'Slot Machine Simulator';
    win?.setTitle(title); // 確保視窗標題同步
    win?.webContents.send('sys:update-title', title);
  });

  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

// --- App 啟動邏輯 (合併版) ---
app.whenReady().then(() => {
  console.log('[Main] App is ready, initializing services...');
  // 🔥 新增監聽：初始化請求
  ipcMain.handle('game:init', async () => {
    const config = GameService.getGameConfig();
    return config;
  });

  ipcMain.handle('system:save-project-name', async (_event, newName) => {
    try {
      const specPath = path.join(process.env.APP_ROOT, 'electron/rand-core/config/spec.json');
      let spec: any = {};

      if (fs.existsSync(specPath)) {
        spec = JSON.parse(fs.readFileSync(specPath, 'utf-8'));
      }

      // 更新名稱
      spec.name = newName;

      // 寫回檔案
      fs.writeFileSync(specPath, JSON.stringify(spec, null, 2));
      console.log('[Main] Project renamed to:', newName);

      // 更新視窗標題
      if (win) {
        win.setTitle(newName);
        // 通知前端更新顯示
        win.webContents.send('sys:update-title', newName);
      }

      return { success: true };
    } catch (e: any) {
      console.error('[Main] Rename Error:', e);
      return { success: false, error: e.message };
    }
  });
  // 1. 設定 IPC 監聽
  ipcMain.handle('game:spin', async (_event, spinInfo) => {

    // 簡單的參數轉換
    const betInfo: betInfo = { betlv: spinInfo.betLv, lineBet: spinInfo.lineBet, lineSelect: 25, buyFeatureType: spinInfo.buyFeatureType };
    const sysState: SysInfo = {
      targetRTP: spinInfo.targetRTP,
      targetWinLimit: spinInfo.targetWinLimit,
      targetPrizeType: spinInfo.targetPrizeType,
      randMode: spinInfo.randMode
    };
    console.log('[Main] Spin Request', JSON.stringify(betInfo), JSON.stringify(sysState));

    // 呼叫 Service
    const result = GameService.spin(betInfo, sysState);
    return result;
  });

  ipcMain.handle('system:open-file', async (_event, fileName) => {
    try {
      // 1. 定義 xls 根目錄位置
      // 開發模式下，process.cwd() 通常是專案根目錄
      const rootDir = process.cwd();

      // 2. 組合完整路徑 (對應到 xls/config-game/...)
      const filePath = path.join(rootDir, 'xls', 'config-game', fileName);

      console.log('[Main] Opening file:', filePath);

      // 3. 使用系統預設程式開啟 (會喚醒 Excel)
      const error = await shell.openPath(filePath);

      if (error) {
        console.error('[Main] Open Error:', error);
        return { success: false, error };
      }
      return { success: true };
    } catch (e: any) {
      console.error('[Main] System Error:', e);
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('system:get-excel-files', async () => {
    try {
      const rootDir = path.join(process.cwd(), 'xls', 'config-game');

      // 遞迴掃描函式
      const getFilesRecursively = (dir: string, fileList: string[] = []) => {
        const files = fs.readdirSync(dir);
        files.forEach(file => {
          const filePath = path.join(dir, file);
          const stat = fs.statSync(filePath);

          if (stat.isDirectory()) {
            getFilesRecursively(filePath, fileList);
          } else {
            // 只抓 xls 檔
            if (file.endsWith('.xls')) {
              // 轉成相對路徑 (例如: "default/plate_990.xls")
              const relativePath = path.relative(rootDir, filePath);
              // 統一分隔符號為 / (避免 Windows 反斜線問題)
              fileList.push(relativePath.replace(/\\/g, '/'));
            }
          }
        });
        return fileList;
      };

      if (!fs.existsSync(rootDir)) {
        return [];
      }

      const files = getFilesRecursively(rootDir);
      return files.sort(); // 排序一下比較好找
    } catch (e) {
      console.error('[Main] Scan Error:', e);
      return [];
    }
  });

  ipcMain.handle('system:reload', async () => {
    try {
      console.log('[Main] Reloading System...');

      // 1. 執行 Excel 轉檔 (Parser)
      // 預設路徑通常是專案根目錄下的 xls 資料夾，這裡假設你的結構
      const rootDir = process.cwd();
      const xlsDir = path.join(rootDir, 'xls');

      console.log('[Main] Parsing Excel from:', xlsDir);
      ParserService.parse(xlsDir); // 這會重新產生 JSON 到 config 資料夾

      // 2. 重新初始化 GameService (重新讀取 JSON)
      GameService.init();

      console.log('[Main] Reload Complete.');
      const newSpec = loadGameSpec();
      const newTitle = newSpec.name || 'Slot Machine Simulator';

      if (win) win.setTitle(newTitle);

      if (win) win.webContents.send('sys:update-title', newTitle);
      return { success: true };
    } catch (e: any) {
      console.error('[Main] Reload Error:', e);
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('window:minimize-progress', () => {
    if (progressWin) {
      progressWin.minimize();
    }
    return { success: true };
  });

  ipcMain.handle('system:export', async (_event, options = {}) => {
    try {
      // 1. 讀取遊戲名稱 (決定匯出資料夾的名字)
      const { useZip, exportSource } = options;
      const spec = loadGameSpec();
      const exportFolderName = spec.name || 'Slot-Game-Export'; // 預設名稱

      console.log(`[Main] Exporting Game: ${exportFolderName}`, options);

      // 2. 定義來源路徑 (你的 rand-core 位置)
      const sourcePath = app.isPackaged
        ? path.join(process.resourcesPath, 'rand-core')
        : path.join(process.env.APP_ROOT, 'electron/rand-core');

      // 3. 開啟資料夾選擇框
      const result = await dialog.showOpenDialog({
        title: `匯出 ${exportFolderName}`,
        buttonLabel: '匯出至此',
        properties: ['openDirectory', 'createDirectory']
      });

      // 如果使用者按取消
      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, cancelled: true };
      }

      const saveRootDir = result.filePaths[0];
      // 組合最終路徑：使用者選的目錄 + 遊戲名稱
      const destPath = path.join(saveRootDir, exportFolderName);

      // 4. 確保目標乾淨 (如果已存在該資料夾，先刪除)
      if (fse.existsSync(destPath)) {
        console.log('[Main] Target exists, cleaning up...');
        fse.removeSync(destPath);
      }

      console.log(`[Main] Copying from ${sourcePath} to ${destPath}`);

      // 5. 定義過濾規則 (參考你提供的 Regex)
      // 排除：隱藏檔(以.開頭)、parser相關、dev相關、以及 node_modules
      const excludeReg = new RegExp("(.+/[\\.].+)|node_modules|parser|dev|ts-node|package\\.json");

      // 6. 執行複製
      fse.copySync(sourcePath, destPath, {
        filter: (src: string) => {
          // src 是當前要複製的檔案完整路徑
          // 統一轉為 unix style (/) 避免 Windows 反斜線 (\) 造成 regex 誤判
          const normalizedSrc = src.replace(/\\/g, '/');

          if (excludeReg.test(normalizedSrc)) {
            return false;
          }

          // 可以在這裡加 log 來看複製了哪些檔案 (選用)
          // console.log('Copying:', path.basename(src));
          return true;
        }
      });

      if (exportSource) {
        console.log('[Main] Copying Source XLS...');
        const xlsSourcePath = app.isPackaged
          ? path.join(process.resourcesPath, '../xls/config-game') // 假設使用者把 xls 放在 exe 旁邊的 xls 資料夾
          : path.join(process.cwd(), 'xls', 'config-game');
        const xlsDestPath = path.join(destPath, 'config-game-source');

        // 確保來源存在
        if (fse.existsSync(xlsSourcePath)) {
          // 複製整個資料夾，但排除隱藏檔
          fse.copySync(xlsSourcePath, xlsDestPath, {
            filter: (src: string) => !src.includes('/.') && !src.includes('\\.')
          });
        } else {
          console.warn('[Main] Source XLS path not found:', xlsSourcePath);
        }
      }

      if (useZip) {
        console.log('[Main] Zipping Config...');
        const configPath = path.join(destPath, 'config');
        const zipPath = path.join(destPath, 'config.zip');

        if (fse.existsSync(configPath)) {
          const zip = new AdmZip();
          // 將 config 資料夾內的內容加入 zip
          zip.addLocalFolder(configPath);
          // 寫入 zip 檔案
          zip.writeZip(zipPath);

          // (選用) 如果你希望壓縮後刪除原本的 config 資料夾，請打開下面這行：
          // fse.removeSync(configPath); 
        }
      }

      console.log('[Main] Export Success!');

      // 7. 匯出完成後，自動開啟該資料夾，方便使用者查看
      shell.openPath(destPath);

      return { success: true, path: destPath };

    } catch (e: any) {
      console.error('[Main] Export Error:', e);
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('report:get-data', () => {
    return {
      result: reportCache,
      components: reportConfigCache
    };
  });

  ipcMain.handle('game:stop-lightning', async () => {
    if (pool) await pool.terminate(true);
    pool = null;
    // 關閉讀條視窗
    if (progressWin) progressWin.close();
    return { success: true };
  });

  ipcMain.handle('game:lightning', async (_event, rawConfig) => {

    console.log('[Main] Starting Lightning Simulation...', rawConfig);
    createProgressWindow();
    initPool();
    const statConfig = loadStatConfig();
    const totalSpins = rawConfig.simConfig.rounds || 100000;
    const workerCount = 10;
    const spinsPerWorker = Math.floor(totalSpins / workerCount);
    const randCorePath = app.isPackaged
      ? path.join(process.resourcesPath, 'rand-core/index.js')
      : path.join(process.env.APP_ROOT, 'electron/rand-core/index.js');

    const config = GameService.getGameConfig();
    const defineConfig = GameService.getDefineConfig();
    let rate = 1;
    const manager = new StatsManager({
      ...statConfig,
      exitInfo: {
        exitStart: rawConfig.exitInfo.exitStart,
        exitEnd: rawConfig.exitInfo.exitEnd,
        exitMaxWin: rawConfig.exitInfo.exitMaxWin
      }
    });

    manager.init(defineConfig);

    const promises = [];
    const workerProgress = new Array(workerCount).fill(0);

    if (rawConfig.simConfig.buyFeatureType !== undefined) {
      rate = config.buyFeatureInfos[rawConfig.simConfig.buyFeatureType]?.rate || 1;
    }
    for (let i = 0; i < workerCount; i++) {
      const input = {
        workerId: i,
        config: {
          lineCount: rawConfig.simConfig.lineCount,
          spinCount: spinsPerWorker,
          betAmount: rawConfig.simConfig.bets[rawConfig.simConfig.betlv],
          betLevel: rawConfig.simConfig.betlv,
          targetRTP: rawConfig.simConfig.targetRTP,
          buyFeatureType: rawConfig.simConfig.buyFeatureType,
          targetPrizeType: rawConfig.simConfig.targetPrizeType,
          targetWinLimit: rawConfig.simConfig.targetWinLimit,
          randMode: rawConfig.simConfig.randMode || 'default',
          components: statConfig.components,
        },
        chunkSize: spinsPerWorker,
        randCorePath: randCorePath
      };

      const p = pool.exec('runSimulation', [input], {
        on: (payload: any) => {
          if (payload.type === 'progress') {

            // 1. 更新這位 Worker 的進度 (payload.processed 是該 Worker 目前跑的轉數)
            workerProgress[payload.workerId] = payload.processed;

            // 2. 累加所有 Worker 的進度
            const totalDone = workerProgress.reduce((a, b) => a + b, 0);

            // 3. 計算全域百分比 (保留小數點後兩位)
            const globalPercent = Number(((totalDone / totalSpins) * 100).toFixed(2));

            if (progressWin && !progressWin.isDestroyed()) {
              progressWin.webContents.send('sys:sim-progress', {
                percentage: globalPercent,
                totalDone: totalDone,
                totalSpins: totalSpins
              });
            }
          }
        }
      }).then((result: any) => {
        // console.log(`[Main] Worker ${result.workerId} Finished.`);
        manager.merge(result.stats);
        workerProgress[result.workerId] = spinsPerWorker;
      }).catch((err: any) => {
        if (err.message === 'Terminated') {
          console.log(`[Main] Worker ${i} terminated.`);
        } else {
          console.error(`[Main] Worker ${i} error:`, err);
          throw err; // 其他錯誤繼續拋出
        }
      });

      promises.push(p);
    }

    try {
      await Promise.all(promises);
      if (!pool) {
        return { success: false, error: 'Simulation Cancelled by User' };
      }
      const finalReport = manager.getFinalReport(rate, rawConfig.simConfig.targetRTP);

      reportCache = finalReport;
      reportConfigCache = statConfig.components; // 也存設定
      if (progressWin) progressWin.close();

      const rWin = new BrowserWindow({ width: 1200, height: 850, autoHideMenuBar: false, title: `模擬統計 ${totalSpins.toLocaleString()} 轉`, webPreferences: { preload: path.join(__dirname, 'preload.mjs') } });
      if (VITE_DEV_SERVER_URL) {
        const url = VITE_DEV_SERVER_URL.endsWith('/') ? VITE_DEV_SERVER_URL : `${VITE_DEV_SERVER_URL}/`;
        rWin.loadURL(`${url}#report`);
      } else {
        rWin.loadFile(path.join(RENDERER_DIST, 'index.html'), { hash: 'report' });
      }

      return { success: true };

    } catch (e: any) {
      if (e.message === 'Terminated' || !pool) {
        return { success: false, cancelled: true };
      }
      console.error('[Main] Simulation Error:', e);
      return { success: false, error: e.message };
    }
  });
  createWindow();
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (process.env.APP_ROOT) {
      const sessionFile = path.join(process.env.APP_ROOT, '.dev-session');
      if (fs.existsSync(sessionFile)) {
        try {
          fs.unlinkSync(sessionFile);
          console.log('[Main] Session file removed, terminal should exit.');
        } catch (e) {
          console.error('[Main] Failed to remove session file:', e);
        }
      }
    }

    app.quit()
    win = null
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
});