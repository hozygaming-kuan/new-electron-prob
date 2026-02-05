// electron/simulation/stats/StatsManager.ts
import { IStatModule } from '../types';
import { StatModuleRegistry } from './registry';

export class StatsManager {
  private modules: IStatModule[] = [];
  public exitInfo: any;

  constructor(config: any) {
    // ... (初始化邏輯保持不變，載入 BaseStatModule 等) ...
    // 這裡省略重複代碼，請保留原本的 constructor 邏輯
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

  public getFinalReport(rate?: number) {
    const report: any = {};
    this.modules.forEach(m => {
      report[m.name] = m.getResult(rate);
    });
    return report;
  }
}