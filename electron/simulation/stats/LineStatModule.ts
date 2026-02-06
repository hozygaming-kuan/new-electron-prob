// electron/simulation/stats/LineStatModule.ts
import { IStatModule } from '../types';

export class LineStatModule implements IStatModule {
  name = 'line';
  private define: any = null;

  private mainStats: any = {};
  private freeStats: any = {};
  private initMainPrize: any = [];
  private initFreePrize: any = [];

  init(define: any) {
    this.define = define;
    // 預先初始化所有可能的連線組合 (5連~2連)
    this.mainStats = {};
    this.freeStats = {};
    this.initStats(this.mainStats);
    this.initStats(this.freeStats);
  }

  private initStats(map: any) {
    const paytable = this.define.paytable;
    for (const sid in paytable) {
      map[sid] = [0, 0, 0, 0, 0, 0];
      map[sid] = [0, 0, 0, 0, 0, 0];
    }
  }

  onSpin(_bet: number, _totalWin: number, rawResult: any, _lineCount: number) {

    const result = rawResult.game;
    if (!result) return;

    const prizeResults = [];

    if (result.prizes.line) {
      const linePrizes = result.prizes.line.prizes || [];
      for (const p of linePrizes) {
        const [_lineId, symbolId, length, _win] = p;
        prizeResults.push([symbolId, length]);
      }
    }

    for (let i = 0; i < prizeResults.length; i++) {
      const pr = prizeResults[i];
      let sid = pr[0];
      let count = pr[1];

      this.mainStats[sid][count]++;
    }

    if (result.free) {
      const free_prizeResults = [];
      for (let i = 0; i < result.free.results.length; i++) {
        const f = result.free.results[i];
        if (f.prizes.line) {
          const prizes = f.prizes.line.prizes;
          for (const p of prizes) {
            const [_lineId, symbolId, length, _win] = p;
            free_prizeResults.push([symbolId, length]);
          }
        }
      }
      for (let ii = 0; ii < free_prizeResults.length; ii++) {
        let pr = free_prizeResults[ii];
        let sid = pr[0];
        let count = pr[1];
        // 出幾次
        this.freeStats[sid][count]++;
      }
    }
  }

  merge(other: any) {
    // 【修改點】加上這個判斷，只有當陣列是空的才建立結構
    if (this.initMainPrize.length === 0) {

      // 按照五連、四連、三連、二連的順序
      for (let i = 5; i > 1; i--) {
        // 收集該連線數的所有符號
        let symbolsForLength = [];
        for (let id in this.define.paytable) {
          let symbol = this.define.paytable[id];
          if (symbol.name) {
            let pay = symbol.times[i];
            if (!pay) continue;
            symbolsForLength.push({ id, symbol, pay });
          }
        }

        // 按照 W/WF > H > L 的順序排序符號
        symbolsForLength.sort((a, b) => {
          const codeA = a.symbol.code;
          const codeB = b.symbol.code;

          // W 或 WF 為最大
          const isWildA = codeA === 'W' || codeA === 'WF';
          const isWildB = codeB === 'W' || codeB === 'WF';
          if (isWildA && !isWildB) return -1;
          if (!isWildA && isWildB) return 1;

          // H 次之
          const isHA = codeA === 'H';
          const isHB = codeB === 'H';
          if (isHA && !isHB && !isWildB) return -1;
          if (!isHA && isHB && !isWildA) return 1;

          // L 再次之
          const isLA = codeA === 'L';
          const isLB = codeB === 'L';
          if (isLA && !isLB && !isWildB && !isHB) return -1;
          if (!isLA && isLB && !isWildA && !isHA) return 1;

          // 其他按字母順序
          return codeA.localeCompare(codeB);
        });

        // 建立 prize 物件
        for (let { id, symbol, pay } of symbolsForLength) {
          let paySq = pay ** 2;
          let prize: any = {};
          prize.name = symbol.code + ' X ' + i;
          prize.pay = pay;
          prize.paySq = paySq;
          prize.totalPay = pay / this.define.line_count;
          prize.count = 0;
          this.initMainPrize.push(prize);

          let fp: any = {};
          fp.name = prize.name;
          fp.pay = prize.pay;
          fp.paySq = prize.paySq;
          fp.totalPay = prize.totalPay;
          fp.count = 0;
          this.initFreePrize.push(fp);
        }
      }
    }

    // --- 初始化結構結束，接著處理數據合併 ---

    if (!other) return;

    other.mainPrizes.forEach((element: any, index: number) => {
      // 加上防呆，確保 index 存在
      if (this.initMainPrize[index] && element.name === this.initMainPrize[index].name) {
        this.initMainPrize[index].count += element.count;
      }
    })

    other.freePrizes.forEach((element: any, index: number) => {
      if (this.initFreePrize[index] && element.name === this.initFreePrize[index].name) {
        this.initFreePrize[index].count += element.count;
      }
    })
  }

  // 這是 Worker 傳回給 Main Process 的數據
  getData() {

    let mainPrizes = [];
    let freePrizes = [];

    // 按照五連、四連、三連、二連的順序
    for (let i = 5; i > 1; i--) {
      // 收集該連線數的所有符號
      let symbolsForLength = [];
      for (let id in this.define.paytable) {
        let symbol = this.define.paytable[id];
        if (symbol.name) {
          let pay = symbol.times[i];
          if (!pay) continue;
          symbolsForLength.push({ id, symbol, pay });
        }
      }

      // 按照 W/WF > H > L 的順序排序符號
      symbolsForLength.sort((a, b) => {
        const codeA = a.symbol.code;
        const codeB = b.symbol.code;

        // W 或 WF 為最大
        const isWildA = codeA === 'W' || codeA === 'WF';
        const isWildB = codeB === 'W' || codeB === 'WF';
        if (isWildA && !isWildB) return -1;
        if (!isWildA && isWildB) return 1;

        // H 次之
        const isHA = codeA === 'H';
        const isHB = codeB === 'H';
        if (isHA && !isHB && !isWildB) return -1;
        if (!isHA && isHB && !isWildA) return 1;

        // L 再次之
        const isLA = codeA === 'L';
        const isLB = codeB === 'L';
        if (isLA && !isLB && !isWildB && !isHB) return -1;
        if (!isLA && isLB && !isWildA && !isHA) return 1;

        // 其他按字母順序
        return codeA.localeCompare(codeB);
      });

      // 建立 prize 物件
      for (let { id, symbol, pay } of symbolsForLength) {
        let paySq = pay ** 2;
        let prize: any = {};
        prize.name = symbol.code + ' X ' + i;
        prize.pay = pay;
        prize.paySq = paySq;
        prize.totalPay = pay / this.define.line_count;
        prize.count = this.mainStats[id][i];
        mainPrizes.push(prize);

        let fp: any = {};
        fp.name = prize.name;
        fp.pay = prize.pay;
        fp.paySq = prize.paySq;
        fp.totalPay = prize.totalPay;
        fp.count = this.freeStats[id][i];
        freePrizes.push(fp);
      }
    }

    return {
      'mainPrizes': mainPrizes,
      'freePrizes': freePrizes,
      'title': '連線統計'
    };
  }

  getResult(_rate: number = 1, _targetRTP: number = 0.965, globalContext: any = {}) {
    
    const { spinTimes, freeSpinTimes, bet, totalBet } = globalContext;

    for (let main of this.initMainPrize) {
      // 幾轉出一次
      
      main.hitRate = spinTimes / main.count;
      // 出現機率 % 數
      main.rate = main.count / spinTimes;
      main.rtp = ((main.count * main.pay) / this.define.line_count) * bet / totalBet;
      main.var = main.paySq * main.rate - (main.pay * main.rate) ** 2;
    }

    for (let free of this.initFreePrize) {
      // 幾轉出一次
      free.hitRate = freeSpinTimes / free.count;
      // 出現機率 % 數
      free.rate = free.count / freeSpinTimes;
      free.rtp = ((free.count * free.pay) / this.define.line_count) * bet / totalBet;
      free.var = free.paySq * free.rate - (free.pay * free.rate) ** 2;
    }
    
    return {
      'mainPrizes': this.initMainPrize,
      'freePrizes': this.initFreePrize,
      'title': '連線統計'
    };
  }
}