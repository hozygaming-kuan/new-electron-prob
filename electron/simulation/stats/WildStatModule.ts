
import { GlobalContext, IStatModule, RawResult } from '../types';

export class WildStatModule implements IStatModule {
  name = 'wild';
  private countList: number[] = [1, 2, 3];
  private main: any = {};
  private free: any = {};
  private define: any;
  private lineCount: number = 0;

  init(define: any) {
    this.define = define;
    this.lineCount = this.define.line_count;
    for (const count of this.countList) {
      this.main[count] = {
        'name': `${count}個`,
        'count': 0,
        'win': 0,
      }
      this.free[count] = {
        'name': `${count}個`,
        'count': 0,
        'win': 0,
      }
    }
    this.main['total'] = {
      'name': `ALL`,
      'count': 0,
      'win': 0,
    }
    this.free['total'] = {
      'name': `ALL`,
      'count': 0,
      'win': 0,
    }
  }

  onSpin(_bet: number, _totalWin: number, _rawResult: RawResult, _lineCount: number) {

    const game = _rawResult.game;

    const plate = game.plate;
    const prize = game.prizes;
    const win = prize.win[0] / this.lineCount + prize.win[1];

    let goldWildCount = 0;
    for (let i = 0; i < plate.reels.length; i++) {
      for (let j = 0; j < plate.reels[i].length; j++) {
        const sym = plate.reels[i][j];
        if (sym === 23) {
          goldWildCount++;
        }
      }
    }

    this.main['total'].count++;
    this.main['total'].win += win;

    if (goldWildCount > 0) {
      this.main[goldWildCount].count++;
      this.main[goldWildCount].win += win;
    }

    const free = game.free;
    if (free) {
      const freeResults = free.results;
      for (const res of freeResults) {
        const plate: any = res.plate;
        const prize: any = res.prizes;
        const win = prize.win[0] / this.lineCount + prize.win[1];

        let goldWildCount = 0;
        for (let i = 0; i < plate.reels.length; i++) {
          for (let j = 0; j < plate.reels[i].length; j++) {
            const sym = plate.reels[i][j];
            if (sym === 23) {
              goldWildCount++;
            }
          }
        }

        this.free['total'].count++;
        this.free['total'].win += win;

        if (goldWildCount > 0) {
          this.free[goldWildCount].count++;
          this.free[goldWildCount].win += win;
        }
      }
    }
  }

  merge(_otherData: any) {

    const main = _otherData.main;
    const free = _otherData.free;

    for (const key in main) {
      this.main[key].count += main[key].count;
      this.main[key].win += main[key].win;
    }

    for (const key in free) {
      this.free[key].count += free[key].count;
      this.free[key].win += free[key].win;
    }
  }

  getData() {
    return {
      main: this.main,
      free: this.free,
    }
  }

  getResult(_rate: number = 1, _targetRTP: number = 0.965, globalContext: GlobalContext) {

    for (const key in this.main) {
      // 平均倍數
      this.main[key].avgWin = this.main[key].count > 0 ? this.main[key].win / this.main[key].count : 0;
      // 連線率
      this.main[key].hitRate = globalContext.spinTimes > 0 ? this.main[key].count / globalContext.spinTimes : 0;
      // 幾轉出一次
      this.main[key].freq = this.main[key].count > 0 ? globalContext.spinTimes / this.main[key].count : 0;
      // RTP
      this.main[key].rtp = globalContext.totalBet > 0 ? this.main[key].win * globalContext.bet / globalContext.totalBet : 0;
    }

    for (const key in this.free) {
      // 平均倍數
      this.free[key].avgWin = this.free[key].count > 0 ? this.free[key].win / this.free[key].count : 0;
      // 連線率
      this.free[key].hitRate = globalContext.freeSpinTimes > 0 ? this.free[key].count / globalContext.freeSpinTimes : 0;
      // 幾轉出一次
      this.free[key].freq = this.free[key].count > 0 ? globalContext.freeSpinTimes / this.free[key].count : 0;
      // RTP
      this.free[key].rtp = globalContext.totalBet > 0 ? this.free[key].win * globalContext.bet / globalContext.totalBet : 0;
    }

    return {
      main: this.main,
      free: this.free,
    };
  }
}
