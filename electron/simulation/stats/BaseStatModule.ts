// electron/simulation/stats/BaseStatModule.ts
import { IStatModule, FullStatReport, RangeBucket } from '../types';

const GAPS = [0, 0.01, 0.25, 0.5, 1, 2, 3, 5, 6, 8, 10, 15, 20, 30, 50, 100, 200, 300, 500, 1000, 2000, 3000, 4000, 5000, 10000, 99999999];

export class BaseStatModule implements IStatModule {
  name = 'base';
  private data: FullStatReport;
  private gaps = GAPS;
  private exitInfo = { exitStart: 1000, exitEnd: 0, exitMaxWin: 2000 };

  constructor() {
    this.data = this.createEmptyData();
  }

  public setExitInfo(info: any) {
    if (info) this.exitInfo = { ...this.exitInfo, ...info };
  }

  public init(_define: any) { }

  // 🔥 這裡的 totalWin 是 Manager 算好傳進來的
  onSpin(bet: number, totalWin: number, rawResult: any, lineCount: number) {
    const result = rawResult.game;
    if (!result) return;

    if (totalWin > 0) this.data.winTimes++;
    // 1. 基礎數據累加 (對應舊版 onSpin 開頭)
    this.data.spinTimes++;
    this.data.totalBet += bet;
    this.data.totalWin += totalWin; // Manager 算好的值 (已經是金額)

    // 2. 統計 Total Secret & WinList (對應 #countTotalMultiplierRange)
    // 舊版是存入列表並計算區間
    this.data.totalWinList.push(totalWin);
    this.countRange(this.data.totalSecret, totalWin, bet);

    // 3. 統計 Main (對應 #countBaseMultiplierRange & #countTotalWinAndHitRate)
    let mainWin = 0;
    if (Array.isArray(result.mainWin)) {
      mainWin = (result.mainWin[0] / lineCount + result.mainWin[1]) * bet;
    }
    this.data.baseWin += mainWin;
    if (mainWin > 0) this.data.mainWinTimes++;
    this.countRange(this.data.mainSecret, mainWin, bet);

    // 4. 統計 Free (對應 if (result.free))
    if (result.free) {
      const freeResult = result.free;

      if (freeResult.results) {
        // 對應 #countFreeTimesAndFreeSpinTimes
        // 注意：舊版 freeTimes 是指觸發次數，這裡假設 result.free 存在即觸發
        // 如果要更精確，可能要判斷 isTriggered
        if (freeResult.times > 0 || freeResult.results.length > 0) {
          this.data.freeTimes++;
        }
        this.data.freeSpinTimes += freeResult.results.length;

        // 對應 #countFreeMultiplierRange (整場 Free Game 總分)
        let fWin = 0;
        if (Array.isArray(freeResult.win)) {
          fWin = (freeResult.win[0] / lineCount + freeResult.win[1]) * bet;
        }
        this.data.freeSpinWin += fWin;
        this.countRange(this.data.freeSumSecret, fWin, bet);

        // 對應 #countEveryFreeSpinMultiplierRange (每一轉)
        freeResult.results.forEach((res: any) => {
          let singleWin = 0;
          if (res.prizes && Array.isArray(res.prizes.win)) {
            singleWin = (res.prizes.win[0] / lineCount + res.prizes.win[1]) * bet;
          }
          if (singleWin > 0) this.data.freeWinTimes++;
          this.countRange(this.data.freeSecret, singleWin, bet);
        });
      }
    }
  }

  // 對應舊版 countRange 邏輯
  private countRange(secretArray: RangeBucket[], val: number, bet: number) {
    const multiplier = bet > 0 ? val / bet : 0;
    for (let i = 0; i < secretArray.length; i++) {
      if (multiplier >= secretArray[i].min && multiplier < secretArray[i].max) {
        secretArray[i].count++;
        break;
      }
    }
  }

  // --- Merge ---
  merge(other: FullStatReport) {
    this.data.winTimes += other.winTimes;
    this.data.spinTimes += other.spinTimes;
    this.data.totalBet += other.totalBet;
    this.data.totalWin += other.totalWin;
    this.data.mainWinTimes += other.mainWinTimes;
    this.data.freeTimes += other.freeTimes;
    this.data.freeSpinTimes += other.freeSpinTimes;
    this.data.freeWinTimes += other.freeWinTimes;
    this.data.baseWin += other.baseWin;
    this.data.freeSpinWin += other.freeSpinWin;

    // 使用迴圈 Push 避免卡死
    if (other.totalWinList && other.totalWinList.length > 0) {
      for (let i = 0; i < other.totalWinList.length; i++) {
        this.data.totalWinList.push(other.totalWinList[i]);
      }
    }

    this.mergeSecret(this.data.totalSecret, other.totalSecret);
    this.mergeSecret(this.data.mainSecret, other.mainSecret);
    this.mergeSecret(this.data.freeSecret, other.freeSecret);
    this.mergeSecret(this.data.freeSumSecret, other.freeSumSecret);
  }

  private mergeSecret(target: RangeBucket[], source: RangeBucket[]) {
    for (let i = 0; i < target.length; i++) {
      target[i].count += source[i].count;
    }
  }

  getData() { return this.data; }

  // --- Get Result (對應 getEndReport) ---
  getResult(rate?: number, targetRTP: number = 0.965) {

    const { totalWinList, spinTimes, totalBet, totalWin } = this.data;
    const multiplier = rate || 1;
    // 1. MaxWin & RTP
    let max = 0;

    const countSD = function (totalWinList: number[], targetRTP: number, bet: number) {
      let sum = 0;
      for (let i = 0; i < totalWinList.length; i++) {
        const win = totalWinList[i] / bet;
        sum += Math.pow((win / (rate as number)) - targetRTP, 2);
      }

      return Math.sqrt(sum / spinTimes);
    }

    for (let w of totalWinList) { if (w > max) max = w; }

    const realTotalBet = totalBet * multiplier;
    const finalRTP = realTotalBet > 0 ? totalWin / realTotalBet : 0;

    const avgBaseBet = spinTimes > 0 ? totalBet / spinTimes : 1;
    const avgRealBet = avgBaseBet * multiplier;

    const SD = countSD(totalWinList, targetRTP, avgBaseBet);
    const CI_RANGE = 1.96 * SD / Math.sqrt(spinTimes)

    const CI_MAX = finalRTP + CI_RANGE;
    const CI_MIN = finalRTP - CI_RANGE;

    // 3. Exit Rate
    const exitResult = this.countExitRate(totalWinList, rate || 1, avgBaseBet);

    // 4. Format Secret (Avg & Reverse)
    const formatSecret = (secret: RangeBucket[], denominator: number) => {
      const copy = secret.map(s => ({ ...s }));
      // 舊版邏輯：反轉陣列
      copy.reverse();
      // 計算平均
      copy.forEach((item) => {
        item.avg = (item.count > 0 && denominator > 0) ? denominator / item.count : 0;
      });
      return copy;
    };

    return {
      // Raw Data
      bet: avgRealBet, // 平均注額
      totalBet: realTotalBet,
      totalWin,
      spinTimes,
      winTimes: this.data.winTimes,
      mainWinTimes: this.data.mainWinTimes,
      mainWin: this.data.baseWin,
      freeWin: this.data.freeSpinWin,
      freeTimes: this.data.freeTimes,
      freeSpinTimes: this.data.freeSpinTimes,
      freeWinTimes: this.data.freeWinTimes,

      // Secrets
      totalSecret: formatSecret(this.data.totalSecret, spinTimes),
      mainSecret: formatSecret(this.data.mainSecret, spinTimes),
      freeSecret: formatSecret(this.data.freeSecret, this.data.freeSpinTimes),
      freeSumSecret: formatSecret(this.data.freeSumSecret, this.data.freeTimes),

      // Analysis
      exitRateTest: exitResult,
      SD: SD,
      CI_RANGE: CI_RANGE,
      CI_MAX: CI_MAX,
      CI_MIN: CI_MIN,
      MaxWin: max,
      rtp: finalRTP
    };
  }

  private countExitRate(winList: number[], rate: number, bet: number = 1) {

    const { exitStart, exitEnd, exitMaxWin } = this.exitInfo;
    let botGold = exitStart * rate;
    let botTotalGold = 0;
    let botCount = 0;
    let exitWinCount = 0;
    let botWinSpin = 0;
    let botSpin = 0;

    const len = winList.length;
    for (let i = 0; i < len; i++) {
      botSpin++;
      const win = winList[i] / bet;

      if (win >= (exitMaxWin * rate)) {
        botGold -= (1 * rate); // 扣除成本 (舊邏輯)
      } else {
        botGold += win - (1 * rate);
      }

      if (botGold < (1 * rate) || (botGold >= exitEnd * rate && exitEnd > 0)) { // 這裡依照你的需求調整
        if (botGold >= (exitStart * rate)) {
          exitWinCount++;
          botWinSpin += botSpin;
        }
        botTotalGold += botGold;
        botCount++;
        botGold = exitStart * rate;
        botSpin = 0;
      }
    }

    return {
      rate: botTotalGold / botCount / exitStart,
      players: botCount,
      winPlayers: exitWinCount,
      totalGold: botTotalGold,
      winSpins: botWinSpin
    };
  }

  private createEmptyData(): FullStatReport {
    return {
      totalWinList: [],
      spinTimes: 0, totalBet: 0, totalWin: 0, winTimes: 0,
      totalSecret: this.createSecret(),
      mainSecret: this.createSecret(),
      freeSecret: this.createSecret(),
      freeSumSecret: this.createSecret(),
      mainWinTimes: 0, freeTimes: 0, freeSpinTimes: 0, freeWinTimes: 0,
      baseWin: 0, freeSpinWin: 0
    };
  }

  private createSecret(): RangeBucket[] {
    const secret: RangeBucket[] = [];
    for (let i = 0; i < this.gaps.length - 1; i++) {
      secret.push({
        min: this.gaps[i],
        max: this.gaps[i + 1],
        count: 0,
        avg: 0
      });
    }
    return secret;
  }
}