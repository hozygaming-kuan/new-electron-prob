// electron/simulation/worker.ts
import workerpool from 'workerpool';
import { createRequire } from 'module';
import { WorkerInput, WorkerProgress } from './types';
// 🔥 引用 Manager，而不是 Module
import { StatsManager } from './stats/StatsManager';

const require = createRequire(import.meta.url);

const runSimulation = (input: WorkerInput): any => {

  const { config, randCorePath, chunkSize, workerId } = input;
  const statsManager = new StatsManager({
    ...config,
    exitInfo: input.config.exitInfo
  });

  // 2. 初始化 Core
  let randInstance: any = null;
  let define: any = null;
  try {
    const RandCore = require(randCorePath);
    const core = RandCore();
    if (!core || !core.rand) throw new Error("Core Init Failed");
    randInstance = core.rand;
    define = randInstance.define;
  } catch (e: any) {
    throw new Error(`[Worker ${workerId}] Core Init Failed: ${e.message}`);
  }

  // 3. 準備參數
  const betInfo = {
    betlv: config.betLevel,
    lineBet: config.betAmount / config.lineCount, // 假設
    lineSelect: config.lineCount,
    buyFeatureType: config.buyFeatureType
  };
  const sysState = {
    targetRTP: config.targetRTP,
    randMode: config.randMode,
    targetPrizeType: config.targetPrizeType,
    targetWinLimit: config.targetWinLimit
  };

  const progressStep = Math.max(Math.floor(chunkSize / 20), 1000);
  statsManager.init(define);
  // 4. 開始迴圈
  for (let i = 0; i < chunkSize; i++) {
    try {
      const result = randInstance.getSpinResult(betInfo, sysState, {}, {});

      // 🔥 關鍵：只呼叫 Manager，不涉及邏輯
      statsManager.onSpin(config.betAmount, result, config.lineCount);

      // 回報進度
      if ((i + 1) % progressStep === 0) {
        workerpool.workerEmit({
          type: 'progress',
          workerId,
          processed: i + 1,
          percent: ((i + 1) / chunkSize) * 100
        } as WorkerProgress);
      }

    } catch (e) {
      if (i === 0) console.error(`[Worker ${workerId}] Spin Error:`, e);
    }
  }

  // 5. 回傳 Raw Data
  return {
    type: 'result',
    workerId,
    // 使用 getRawData 取得所有模組的資料
    stats: statsManager.getRawData()
  };
};

workerpool.worker({
  runSimulation
});