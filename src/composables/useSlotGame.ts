// src/composables/useSlotGame.ts

import { ref, reactive, onMounted, computed } from 'vue';

export interface LogDetail { text: string; type: 'sub' | 'detail'; }
export interface LogEntry { id: number; title: string; details: LogDetail[]; isExpanded: boolean; }

export function useSlotGame() {

  const isSpinning = ref(false);
  const winningCells = ref<Set<string>>(new Set());
  const logs = ref<LogEntry[]>([]);
  let logIdCounter = 0;

  const exportOptions = reactive({
    useZip: false,      // 是否壓縮 config
    exportSource: false // 是否匯出 Excel source
  });

  const stats = reactive({
    totalSpin: 0,
    totalBet: 0,
    totalWin: 0,
    rtp: '0.0%',
    totalCashIn: 10000
  });

  const config = reactive({
    rtpSetting: 0.965,
    maxWin: undefined,
    volatility: 40,
    takeProfit: 100,
    stopLoss: 500,
    rounds: 1000000,
    selectedMode: 'default' as string | number,
    modeType: 'default' as string | number
  });

  const defaultOptions = [
    { label: 'Default', value: 'default', type: 'default' },
    { label: 'Y0 (4000-6000)', value: 0, type: 'yPrize' },
    { label: 'Y1 (2000-4000)', value: 1, type: 'yPrize' },
    { label: 'Y2 (1000-2000)', value: 2, type: 'yPrize' },
    { label: 'Y3 (500-1000)', value: 3, type: 'yPrize' }
  ];

  const modeOptions = ref([...defaultOptions]);

  const roundOptions = [1000, 10000, 100000, 1000_000, 3000_000, 5000_000, 10_000_000, 30_000_000, 50_000_000];
  let line_count = 25;

  const showDetails = ref(true);
  const excelFiles = ref<string[]>([]);
  const selectedExcelFile = ref('');

  // 🔥 主題狀態
  const isDarkMode = ref(true);

  const betLevels = ref<number[]>([]);
  const currentBetIndex = ref(0);
  const currentBetAmount = computed(() => {
    if (betLevels.value.length === 0) return 0;
    return betLevels.value[currentBetIndex.value];
  });

  const formatAmount = (num: number) => {
    return Math.round(num * 10000) / 10000;
  };

  // 🔥 主題切換邏輯
  const toggleTheme = () => {
    isDarkMode.value = !isDarkMode.value;
    updateTheme();
  };

  const updateTheme = () => {
    const theme = isDarkMode.value ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  };

  // --- 歷史盤面系統 ---
  interface GameFrame { label: string; grid: string[][]; win: number; winningLines: number[][]; }
  const spinHistory = ref<GameFrame[]>([]);
  const currentFrameIndex = ref(0);
  const currentGrid = computed(() => spinHistory.value.length === 0 ? [] : spinHistory.value[currentFrameIndex.value].grid);
  const currentWin = computed(() => spinHistory.value.length === 0 ? 0 : spinHistory.value[currentFrameIndex.value].win);
  const dynamicPaylines = ref<number[][]>([]);
  const symbolMap = reactive<Record<number, string>>({});

  const initGame = async () => {
    try {
      // 🔥 初始化主題
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme === 'light') {
        isDarkMode.value = false;
      } else {
        isDarkMode.value = true;
      }
      updateTheme();

      const gameConfig = await window.ipcRenderer.invoke('game:init');
      const files = await window.ipcRenderer.invoke('system:get-excel-files');
      excelFiles.value = files;
      if (files.length > 0) selectedExcelFile.value = files[0];

      if (gameConfig.paylines) {
        dynamicPaylines.value = gameConfig.paylines;
        logs.value.unshift({ id: logIdCounter++, title: `[系統] 已載入機率模型`, details: [], isExpanded: false });
      }
      if (gameConfig.paytable) {
        for (const key in symbolMap) delete symbolMap[Number(key)];
        Object.values(gameConfig.paytable).forEach((symbol: any) => {
          if (symbol.id !== undefined && symbol.name !== undefined) symbolMap[symbol.id] = symbol.name;
        });
      }
      if (gameConfig.buyFeatureInfos) {
        modeOptions.value = [...defaultOptions];
        const features = gameConfig.buyFeatureInfos;
        // 遍歷物件，格式通常是 key: { name, type, rate... }
        Object.keys(features).forEach(key => {
          const item = features[key];
          // 加入選項，顯示名稱和價格倍數
          modeOptions.value.push({
            label: `${item.name}`, // 例如: Free Game (x100)
            value: item.type, // 使用 type 作為 value
            type: 'buyFeature'
          });
        });
      }
      if (gameConfig.lineCount) {
        const lines = gameConfig.lineCount;
        line_count = lines;
        const levels = [];
        for (let i = 1; i <= 10; i++) levels.push(lines * i);
        betLevels.value = levels;
        currentBetIndex.value = 0;
      }
    } catch (e: any) {
      console.error('Init Game Error:', e);
    }
  };

  const switchFrame = (index: number) => {

    if (index < 0 || index >= spinHistory.value.length) return;
    currentFrameIndex.value = index;
    const frame = spinHistory.value[index];
    winningCells.value.clear();
    frame.winningLines.forEach((lineData) => {
      const lineId = lineData[0];
      const count = lineData[2];
      const geometry = dynamicPaylines.value[lineId];
      if (geometry) {
        for (let col = 0; col < count; col++) {
          const row = geometry[col];
          winningCells.value.add(`${col},${row}`);
        }
      }
    });
  };

  const generatePrizeLogs = (prizes: any, logType: 'sub' | 'detail', bet: number): LogDetail[] => {

    const details: LogDetail[] = [];
    if (!prizes) return details;
    if (prizes.line && prizes.line.prizes) {
      prizes.line.prizes.forEach((p: any[]) => {
        const symName = symbolMap[p[1]] || `ID-${p[1]}`;
        const lineWin = formatAmount((p[3] / line_count) * bet);
        details.push({ text: `...... Line ${p[0] + 1}『${symName}』${p[2]}連線 贏:${lineWin}`, type: logType });
      });
    }
    if (prizes.scatter && prizes.scatter.prizes) {
      prizes.scatter.prizes.forEach((p: any[]) => {
        const symName = symbolMap[p[0]] || `ID-${p[0]}`;
        const scWin = formatAmount((p[2] / line_count) * bet);
        details.push({ text: `...... Scatter『${symName}』x${p[1]} 贏:${scWin}`, type: logType });
      });
    }
    if (prizes.ways && prizes.ways.prizes) {
      prizes.ways.prizes.forEach((p: any[]) => {
        const symName = symbolMap[p[0]] || `ID-${p[0]}`;
        const wayWin = formatAmount((p[2] / line_count) * bet);
        details.push({ text: `...... Way『${symName}』x${p[1]} 贏:${wayWin}`, type: logType });
      });
    }
    return details;
  };

  const createSpinInfo = (bet: number) => {

    let targetPrizeType = undefined;
    let buyFeatureType = undefined;
    let randMode = 'default'; // 預設讀取 default.json

    const currentModeOption = modeOptions.value.find(
      opt => opt.value === config.selectedMode && opt.type === config.modeType
    );
    if (currentModeOption) {
      if (currentModeOption.type === 'buyFeature') {
        buyFeatureType = currentModeOption.value;
      } else if (currentModeOption.type === 'yPrize') {
        targetPrizeType = currentModeOption.value;
      } else {
        buyFeatureType = undefined;
        targetPrizeType = undefined;
      }
    }
    const spinInfo = {
      betLv: betLevels.value.indexOf(bet),
      lineBet: bet / line_count,
      buyFeatureType: buyFeatureType,
      targetRTP: config.rtpSetting,
      targetPrizeType: targetPrizeType,
      targetWinLimit: config.maxWin,
      randMode: randMode
    }
    return spinInfo;
  }

  const handleSpin = async () => {

    if (isSpinning.value) return;
    isSpinning.value = true;
    spinHistory.value = [{
      label: '主遊戲',
      // 這裡可以給全 0，或者保留上一局的畫面(currentGrid.value)
      grid: [['0', '0', '0'], ['0', '0', '0'], ['0', '0', '0'], ['0', '0', '0'], ['0', '0', '0']],
      win: 0,
      winningLines: []
    }];
    currentFrameIndex.value = 0;
    winningCells.value.clear();
    const bet = currentBetAmount.value;

    try {

      const spinInfo = createSpinInfo(bet);

      const result = await window.ipcRenderer.invoke('game:spin', spinInfo);

      if (result && result.game) {

        spinHistory.value = [];
        const rawTotalWin = (result.game.totalWin[0] / line_count + result.game.totalWin[1]) * bet;
        const totalRoundWin = formatAmount(rawTotalWin);
        const newLog: LogEntry = { id: logIdCounter++, title: `(${stats.totalSpin + 1}) 押分:${bet}, 贏分: $${totalRoundWin}`, details: [], isExpanded: true };

        const processGameFrame = (label: string, rawReels: number[][], rawWin: number, prizes: any, logType: 'sub' | 'detail', bet: number) => {

          const grid = rawReels.map((col) => col.map(String));
          const visualLines = prizes?.line?.prizes || [];
          const frameWin = formatAmount(rawWin);
          spinHistory.value.push({ label, grid, win: frameWin, winningLines: visualLines });
          newLog.details.push({ text: `[${label}] 贏分: $${frameWin}`, type: 'sub' });
          const detailLogs = generatePrizeLogs(prizes, logType, bet);
          newLog.details.push(...detailLogs);
        };

        if (result.game.plate && result.game.plate.reels) {
          const mainWin = (result.game.mainWin[0] / line_count + result.game.mainWin[1]) * bet;
          processGameFrame('主遊戲', result.game.plate.reels, mainWin, result.game.prizes, 'detail', bet);
        }

        if (result.game.free && result.game.free.results) {
          result.game.free.results.forEach((freeRes: any, idx: number) => {
            const freeWin = (freeRes.prizes?.win[0] / line_count + freeRes.prizes?.win[1]) * bet;
            processGameFrame(`FG-${idx + 1}`, freeRes.plate.reels, freeWin, freeRes.prizes, 'detail', bet);
          });
        }

        logs.value.unshift(newLog);
        if (logs.value.length > 50) logs.value.pop();
        stats.totalWin = formatAmount(stats.totalWin + totalRoundWin);
        stats.totalBet += bet;
        stats.totalSpin += 1;
        if (stats.totalBet > 0) stats.rtp = ((stats.totalWin / stats.totalBet) * 100).toFixed(2) + '%';
        switchFrame(0);
      }
    } catch (error: any) {
      console.error('Spin Error:', error);
      logs.value.unshift({ id: logIdCounter++, title: `[錯誤] ${error.message}`, details: [], isExpanded: false });
    } finally {
      isSpinning.value = false;
    }
  };

  const handleModeChange = (modeValue: string | number, modeType: string | number) => {
    // 1. 設定選取的模式
    config.selectedMode = modeValue;
    config.modeType = modeType;

    // 2. 找出對應的標籤名稱 (為了讓 Log 顯示 User 看得懂的文字)
    const targetMode = modeOptions.value.find(m => m.value === modeValue && m.type === modeType);
    const modeLabel = targetMode ? targetMode.label : modeValue;

    // 3. 寫入 Log
    logs.value.unshift({
      id: Date.now(),
      title: `[系統] 切換模式: ${modeLabel}`,
      details: [],
      isExpanded: false
    });
  };

  const handleReload = async () => {
    if (isSpinning.value) return; // 轉動中不給重載

    // 1. 設定 loading 狀態 (可選)
    isSpinning.value = true;

    try {
      // 2. 呼叫後端
      logs.value.unshift({ id: Date.now(), title: `[系統] 正在重新載入設定 (Reloading)...`, details: [], isExpanded: false });

      const res = await window.ipcRenderer.invoke('system:reload');

      if (res.success) {

        // 清空 Log
        logs.value = [];
        logs.value.push({ id: Date.now(), title: `[系統] 重載完成，狀態已重置`, details: [], isExpanded: false });

        // 重置統計
        stats.totalSpin = 0;
        stats.totalBet = 0;
        stats.totalWin = 0;
        stats.rtp = '0.0%';
        stats.totalCashIn = 10000; // 視需求是否重置餘額

        spinHistory.value = [];
        currentFrameIndex.value = 0;
        winningCells.value.clear();

        await initGame();

      } else {
        logs.value.unshift({ id: Date.now(), title: `[錯誤] 重載失敗: ${res.error}`, details: [], isExpanded: false });
      }

    } catch (e: any) {
      console.error('Reload Error:', e);
    } finally {
      isSpinning.value = false;
    }
  };

  const onLightningClick = async () => { // 改名或整合進 handleLightning
    if (isSpinning.value) return;

    const payload = getLightningConfig();

    // 🔥 前端只負責送出「開始」指令，剩下的視窗管理交給後端
    // 不需要 await 結果，因為後端會自己開視窗
    // 但為了避免重複點擊，可以加個簡單的 flag
    window.ipcRenderer.invoke('game:lightning', payload);
  };

  const getLightningConfig = () => {
    if (isSpinning.value) return;

    const spinInfo = createSpinInfo(currentBetAmount.value);

    const rawPayload = {
      simConfig:{
        rounds: config.rounds,
        targetRTP: spinInfo.targetRTP,
        betlv: spinInfo.betLv,
        lineBet: spinInfo.lineBet,
        buyFeatureType: spinInfo.buyFeatureType,
        targetPrizeType: spinInfo.targetPrizeType,
        targetWinLimit: spinInfo.targetWinLimit,
        randMode: spinInfo.randMode,
        bets: betLevels.value,
        lineCount: line_count,
      },
      exitInfo:{
        exitStart: Number(config.volatility),
        exitEnd: Number(config.takeProfit),
        exitMaxWin: Number(config.stopLoss)
      }
    }

    return JSON.parse(JSON.stringify(rawPayload)); // 深拷貝，確保沒有 reactive 物件被傳到後端
  };

  const openFile = async (fileName: string) => {
    try {
      logs.value.unshift({ id: Date.now(), title: `[系統] 開啟 ${fileName}...`, details: [], isExpanded: false });
      const res = await window.ipcRenderer.invoke('system:open-file', fileName);
      if (!res.success) {
        logs.value.unshift({ id: Date.now() + 1, title: `[錯誤] 無法開啟檔案: ${res.error}`, details: [], isExpanded: false });
      } else {
        logs.value.unshift({ id: Date.now() + 1, title: `[系統] 檔案已開啟: ${fileName}`, details: [], isExpanded: false });
      }
    } catch (e: any) {
      console.error('Open File Error:', e);
    }
  };

  const handleExport = async () => {
    // 防止重複點擊或轉動時匯出
    if (isSpinning.value) return;

    try {
      logs.value.unshift({
        id: Date.now(),
        title: `[系統] 準備匯出遊戲核心 (Exporting)...`,
        details: [],
        isExpanded: false
      });

      // 呼叫後端
      const res = await window.ipcRenderer.invoke('system:export', JSON.parse(JSON.stringify(exportOptions)));

      if (res.success) {
        logs.value.unshift({
          id: Date.now() + 1,
          title: `[系統] 匯出成功！`,
          details: [{ text: `已儲存至: ${res.path}`, type: 'sub' }],
          isExpanded: true
        });
      } else if (res.cancelled) {
        logs.value.unshift({
          id: Date.now() + 1,
          title: `[系統] 取消匯出`,
          details: [],
          isExpanded: false
        });
      } else {
        logs.value.unshift({
          id: Date.now() + 1,
          title: `[錯誤] 匯出失敗: ${res.error}`,
          details: [],
          isExpanded: true
        });
      }
    } catch (e: any) {
      console.error('Export Error:', e);
    }
  };

  onMounted(() => { initGame(); });

  return {
    logs, stats, config, currentGrid, isSpinning, handleSpin, winningCells, currentWin, betLevels, currentBetIndex, currentBetAmount, spinHistory, currentFrameIndex, switchFrame, showDetails, openFile, excelFiles, selectedExcelFile, roundOptions, formatAmount, modeOptions,
    isDarkMode, toggleTheme, handleReload, handleExport, handleModeChange, getLightningConfig, exportOptions, onLightningClick
  };
}