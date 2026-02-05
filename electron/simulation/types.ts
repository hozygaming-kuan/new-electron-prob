// electron/simulation/types.ts

// 模擬設定
export interface SimulationConfig {
  spinCount: number;
  betAmount: number;
  betLevel: number;
  lines: number;
  buyFeatureType: number;
  targetRTP: number;
  randMode: string;
  targetPrizeType?: number;
  targetWinLimit?: number;
  lineCount: number;
  // 存活率測試參數
  exitInfo?: {
    exitStart: number;  // 初始金額
    exitEnd: number;    // 停損點 (通常是 0)
    exitMaxWin: number; // 停利點
  }
  components?: Array<{ model: string; view: string; args?: any }>;
}

// 分佈區間單元
export interface RangeBucket {
  min: number;
  max: number;
  count: number;
  avg: number; // 顯示用
}

// 統計單元
export interface StatUnit {
  spinCount: number;
  totalBet: number;
  totalWin: number;
  winCount: number;
  maxWin: number;
  distribution: RangeBucket[];
}

// 存活率測試結果
export interface ExitRateResult {
  rate: number;       // 回報率
  players: number;    // 總模擬人數
  winPlayers: number; // 獲利人數
  totalGold: number;  // 機器總獲利
  winSpins: number;   // 獲利場次
}

export interface FullStatReport {
  // 基礎數據
  totalWinList: number[];
  spinTimes: number;
  totalBet: number;
  winTimes: number;
  totalWin: number; // 數值

  // 四種分佈數據 (對應舊版 Secret)
  totalSecret: RangeBucket[];   // All
  mainSecret: RangeBucket[];    // Main Game
  freeSecret: RangeBucket[];    // Free Game (Every Spin)
  freeSumSecret: RangeBucket[]; // Free Game (Total)

  // 次數統計
  mainWinTimes: number;
  freeTimes: number;
  freeSpinTimes: number;
  freeWinTimes: number;

  // 金額統計
  baseWin: number;      // Main Win Amount
  freeSpinWin: number;  // Free Win Amount

  // 存活率與統計指標 (getResult 時計算)
  exitRateTest?: ExitRateResult;
  SD?: number;
  CI_RANGE?: number;
  CI_MAX?: number;
  CI_MIN?: number;
  MaxWin?: number;
  rtp?: string;
}

export interface IStatModule {
  name: string;
  init(define: any): void;
  onSpin(bet: number, totalWin: number, rawResult: any, lineCount: number): void;
  merge(otherData: any): void;
  getResult(rate?: number): any;
  getData(): any;
}

export interface WorkerInput {
  workerId: number;
  config: SimulationConfig;
  chunkSize: number;
  randCorePath: string;
}

export interface WorkerProgress {
  type: 'progress';
  workerId: number;
  processed: number;
  percent: number;
}