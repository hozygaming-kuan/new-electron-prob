import { app } from 'electron';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

// 建立 require 環境
const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
class GameService {
  private slotRand: any = null;
  public config: any = null; // 改成 public 方便外部讀取

  constructor() {
    this.init();
  }

  getGameConfig() {
    if (!this.config) {
      return { error: "Config not loaded" };
    }

    let coreInfo: any = {};
    if (this.slotRand && typeof this.slotRand.getInfo === 'function') {
      coreInfo = this.slotRand.getInfo();
    }

    // 我們只回傳前端需要的資訊，不需要把整個龐大的 config 丟過去
    return {
      paylines: this.config.paylines || [], // 這是關鍵！從 xls/json 讀來的
      lineCount: this.config.line_count,
      window: this.config.window, // 盤面大小 (5x3)
      paytable: this.config.paytable, // (選用) 如果你想在前端顯示賠率表
      buyFeatureInfos: coreInfo.buyFeatureInfos || {}
    };
  }

  getDefineConfig() {
    
    return this.slotRand.configMap.get('define');
  }

  init() {
    console.log('[GameService] Initializing...');
    const libraryPath = path.resolve(__dirname, '../electron/rand-core/index.js')

    console.log('[GameService] Target Core Path:', libraryPath);

    try {
      // 嘗試載入模組
      const RandCore = require(libraryPath);

      // 嘗試實例化
      const randInstance = RandCore();

      if (randInstance) {
        this.slotRand = randInstance;
        this.config = this.slotRand.rand?.define || {};
        console.log('[GameService] Core Loaded Successfully!');
        console.log('[GameService] Line Count:', this.config.line_count || 'Unknown');
      } else {
        console.error('[GameService] RandCore() returned null/undefined');
      }

    } catch (e: any) {
      console.error('[GameService] CRITICAL ERROR:', e.message);
      // 印出 Stack Trace 方便除錯
      console.error(e.stack);
    }
  }

  spin(betInfo: any, sysState: any) {
    if (!this.slotRand) {
      console.error('[GameService] Spin failed: Core not initialized');
      return { error: "Core not initialized" };
    }

    try {
      const result = this.slotRand.getSpinResult(betInfo, sysState, {}, {});
      console.log(JSON.stringify(result));
      
      return result;
    } catch (e: any) {
      console.error('[GameService] Spin Logic Error:', e);
      return { error: e.message };
    }
  }
}

export default new GameService();