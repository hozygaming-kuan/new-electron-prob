
import { GlobalContext, IStatModule, RawResult } from '../types';

export class ScatterStatModule implements IStatModule {
  name = 'scatter';
  private baseScatterCountList: number[] = [0, 0, 0, 0, 0, 0];
  private freeScatterCountList: number[] = [0, 0, 0, 0, 0, 0];

  init(_define: any) {
  }

  onSpin(_bet: number, _totalWin: number, _rawResult: RawResult, _lineCount: number) {

    const game = _rawResult.game;
    const plate = game.plate;
    let scatterCount = 0;
    for (let i = 0; i < plate.reels.length; i++) {
      for (let j = 0; j < plate.reels[i].length; j++) {
        const sym = plate.reels[i][j];
        if (sym === 21) {
          scatterCount++;
        }
      }
    }
    this.baseScatterCountList[scatterCount] += 1;

    if (game.free) {
      for (const free of game.free.results) {
        const plate = free.plate;
        let scatterCount = 0;
        for (let i = 0; i < plate.reels.length; i++) {
          for (let j = 0; j < plate.reels[i].length; j++) {
            const sym = plate.reels[i][j];
            if (sym === 21) {
              scatterCount++;
            }
          }
        }
        this.freeScatterCountList[scatterCount] += 1;
      }
    }
  }

  merge(_otherData: any) {

    const otherBaseList = _otherData.baseScatterCountList;
    const otherFreeList = _otherData.freeScatterCountList;

    for (let i = 0; i < this.baseScatterCountList.length; i++) {
      this.baseScatterCountList[i] += otherBaseList[i] || 0;
    }
    for (let i = 0; i < this.freeScatterCountList.length; i++) {
      this.freeScatterCountList[i] += otherFreeList[i] || 0;
    }
  }

  getData() {
    return {
      baseScatterCountList: this.baseScatterCountList,
      freeScatterCountList: this.freeScatterCountList,
    }
  }

  getResult(_rate: number = 1, _targetRTP: number = 0.965, _globalContext: GlobalContext) {
    return {
      baseScatterCountList: this.baseScatterCountList,
      freeScatterCountList: this.freeScatterCountList,
    };
  }
}
