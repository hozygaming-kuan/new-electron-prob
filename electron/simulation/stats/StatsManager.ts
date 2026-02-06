// electron/simulation/stats/StatsManager.ts
import { IStatModule } from '../types';
import { StatModuleRegistry } from './registry';

export class StatsManager {
  private modules: IStatModule[] = [];
  public exitInfo: any;

  constructor(config: any) {
    const BaseClass = StatModuleRegistry['BaseStatModule'];
    const base = new BaseClass();
    if (config.exitInfo) {
      (base as any).setExitInfo(config.exitInfo);
      this.exitInfo = config.exitInfo;
    }
    this.modules.push(base);

    if (config.components && Array.isArray(config.components)) {
      for (const comp of config.components) {
        if (comp.model === 'BaseStatModule') continue;
        const ModuleClass = StatModuleRegistry[comp.model];
        if (ModuleClass) {
          const instance = new ModuleClass(comp.args || {});
          this.modules.push(instance);
        }
      }
    }
  }

  public init(define: any) {
    this.modules.forEach(m => m.init(define));
  }

  // 🔥🔥🔥 核心修改：統一計算，分發數據 🔥🔥🔥
  public onSpin(bet: number, rawResult: any, lineCount: number) {
    // 1. 在這裡統一計算本局總贏分 (Total Win)
    let totalWin = 0;
    const game = rawResult.game;

    if (game) {
      // Main Win
      if (Array.isArray(game.totalWin)) {
        totalWin += (game.totalWin[0] / lineCount + game.totalWin[1]) * bet;
      }
    }

    // 2. 將算好的 bet, totalWin 傳給所有 Module
    this.modules.forEach(m => m.onSpin(bet, totalWin, rawResult, lineCount));
  }

  public merge(fullReport: any) {
    this.modules.forEach(m => {
      if (fullReport[m.name]) {
        m.merge(fullReport[m.name]);
      }
    });
  }

  public getRawData() {
    const raw: any = {};
    this.modules.forEach(m => {
      raw[m.name] = m.getData();
    });
    return raw;
  }

  public getFinalReport(rate?: number, targetRTP: number = 0.965) {
    const report: any = {};

    // 1. 先取得 BaseStatModule 的結果 (它是資料源頭)
    const baseModule = this.modules.find(m => m.name === 'base');
    const baseResult = baseModule ? baseModule.getResult(rate) : {};

    // 準備要傳給其他模組的「全域資訊包」
    const globalContext = {
      spinTimes: baseResult.spinTimes || 1,
      freeSpinTimes: baseResult.freeSpinTimes,
      totalBet: baseResult.totalBet || 0,
      bet: baseResult.bet
    };

    // 2. 遍歷所有模組，並把 globalContext 傳進去
    this.modules.forEach(m => {
      // 🔥 關鍵：把 globalContext 傳進去讓模組自己算
      report[m.name] = m.getResult(rate, targetRTP, globalContext);
    });

    return report;
  }
}