const gameSet = require('./gameSetting');
const gameUtil = require('./gameUtil');
class GameControl {

  constructor(define) {
    this.define = define;
  }

  isValidBuyFeature(buyFeatureType, result) {

    if (buyFeatureType == gameSet.PRIZE_TYPE.PVP) {
      if (typeof result.free !== 'undefined' && result.free.results.length === 10) {
        return true;
      } else {
        return false;
      }
    }
    return result.free !== undefined && buyFeatureType == gameSet.PRIZE_TYPE.BUY_FEATURE;
  };

  checkRedraw(respinCondition, respinProb, mainWin, prizes) {

    if (respinCondition !== null) {
      // 幾倍以上重抽
      const max = respinCondition[0];
      const maxProb = respinCondition[1];
      if (maxProb != null && respinProb < maxProb && mainWin > max) {
        return true;
      }
      // 幾倍以下重抽
      const min = respinCondition[2];
      const minProb = respinCondition[3];
      if (minProb != null && respinProb < minProb && mainWin < min) {
        return true;
      }
      // 幾線重抽
      const lineCount = respinCondition[4];
      const lineCountProb = respinCondition[5];
      // 幾連重抽
      const length = respinCondition[6];
      const lengthProb = respinCondition[7];

      if (prizes.line) {
        const linePrizes = prizes.line.prizes;
        if (lineCountProb != null && respinProb < lineCountProb) {
          // 正數表示最多幾線，負數表示至少幾線
          if (lineCount > 0) {
            if (linePrizes.length > lineCount) {
              return true;
            }
          }
          else if (lineCount < 0) {
            if (linePrizes.length < Math.abs(lineCount)) {
              return true;
            }
          }
        }
        if (lengthProb != null && respinProb < lengthProb) {
          let maxLength = 0;
          for (const prize of linePrizes) {
            if (prize[2] > maxLength) {
              maxLength = prize[2];
            }
          }
          // 正數表示最多幾連，負數表示至少幾連
          if (length > 0) {
            if (maxLength > length) {
              return true;
            }
          }
          else if (length < 0) {
            if (maxLength < Math.abs(length)) {
              return true;
            }
          }
        }
      }
    }

    return false;
  }

  getTotalWin(win) {

    return gameUtil.float((win[0] / this.define.line_count) + win[1]);
  }

  countTargetSymbolCount(reels, targetSymbol) {

    let symbolCount = 0;
    for (const reel of reels) {
      symbolCount += reel.filter(symbol => symbol === targetSymbol).length;
    }

    return symbolCount;
  }


  /**
   * 檢查2,3,4輪是否都有WILD
   *
   * @param {number[][]} reels
   * @return {{canEntry: boolean, goldenCount: number, normalCount: number}} 
   * @memberof GameControl
   */
  checkEntryFreeSpin(reels) {

    let golden = 0;
    let normal = 0;
    const r2 = reels[1];
    const r3 = reels[2];
    const r4 = reels[3];

    golden += r2.filter(item => item === gameSet.WILD_GOLDEN).length;
    golden += r3.filter(item => item === gameSet.WILD_GOLDEN).length;
    golden += r4.filter(item => item === gameSet.WILD_GOLDEN).length;

    normal += r2.filter(item => item === gameSet.WILD).length;
    normal += r3.filter(item => item === gameSet.WILD).length;
    normal += r4.filter(item => item === gameSet.WILD).length;

    if (normal + golden >= 3) {
      return { canEntry: true, goldenCount: golden, normalCount: normal };
    }

    return { canEntry: false, goldenCount: golden, normalCount: normal };
  }
}
module.exports = GameControl