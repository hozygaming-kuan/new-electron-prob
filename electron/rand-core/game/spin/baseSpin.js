/**
 * @this {import('../../core/rand')}
 * @param {import('../../../type/randType').BetInfo} betInfo
 * @param {import('../../../type/randType').SystemState} sysState
 * @param {import('../../../type/randType').SpinInfo} spinInfo
 * @returns {import('../../../type/spinResultType').Game}
 */
module.exports = function (betInfo, sysState, spinInfo) {

  this.plateGenerator.use(this.config, this.baseReelsGenerator);
  this.getPrizeService.use(this.mainPrizes);

  const config = this.config;
  const gameSet = this.gameSet;
  const gameControl = this.gameControl;
  const define = this.define;
  const plateGenerator = this.plateGenerator;
  const prizeService = this.getPrizeService;

  const result = {
    totalWin: [0, 0],
    mainWin: [0, 0],
  };
  let totalWin = 0;
  const plateState = {
    flag: false,
    free: false,
  };
  // 主遊戲開始
  let mainRetry = 0;
  const respinProb = Math.random();

  do {
    let maxWin = false;
    mainRetry++;
    // 主遊戲盤面
    const plate = plateGenerator.randomPlate(plateState);
    const prizes = prizeService.get(plate);
    const mainWin = gameControl.getTotalWin(prizes.win);
    const canEntryFreeSpin = gameControl.checkEntryFreeSpin(plate.reels);
    if (mainWin >= define.maxwin) {
      maxWin = true;
      prizes.maxWin = true;
      prizes.win[0] = define.maxwin * define.line_count;
    }

    result.plate = plate;
    result.prizes = prizes;

    if (plateState.free === true && !canEntryFreeSpin) {
      continue;
    }

    if (mainRetry < define.mainRetryMax) {

      let respinCondition = null;

      if (respinCondition === null && config.main.respin && plateState.s1 !== undefined && plateState.s2 !== undefined) {

        respinCondition = config.main.respin[plateState.s1][plateState.s2]
      }
      if (gameControl.checkRedraw(respinCondition, respinProb, mainWin, prizes)) {
        continue;
      }
    }
    // 完成主遊戲，離開迴圈
    break;
  } while (mainRetry < define.mainRetryMax)

  const { canEntry, goldenCount, normalCount } = gameControl.checkEntryFreeSpin(result.plate.reels);

  if (canEntry === true) {
    const freeError = this.freeSpin(result, goldenCount, normalCount);
    if (freeError === true) return null;
  }
  result.mainWin = result.prizes.win;

  result.totalWin[0] += result.mainWin[0];
  result.totalWin[1] += result.mainWin[1];

  if (result.free) {
    result.totalWin[0] += result.free.win[0];
    result.totalWin[1] += result.free.win[1];
  }

  totalWin = gameControl.getTotalWin(result.totalWin);

  // 檢查單筆贏分是否超過Plate設定的上限
  if (this.config.plateMaxWinFlag === true && this.config.plateMaxWin > 0 && totalWin > this.config.plateMaxWin) {
    // 如果超過上限，返回 null
    return null;
  }

  if (spinInfo.targetType == gameSet.PRIZE_TYPE.NORMAL) {
    // 檢查單筆贏分是否超過系統設定的限紅
    if (sysState.targetWinLimit != undefined && sysState.targetWinLimit > 0 && totalWin > sysState.targetWinLimit) {
      // 如果超過限紅，則返回 null
      return null;
    }
  }
  else {
    // 如果獎項類型是購買特色遊戲
    if (spinInfo.targetType == gameSet.PRIZE_TYPE.BUY_FEATURE) {
      if (!gameControl.isValidBuyFeature(betInfo.buyFeatureType, result)) {
        // 檢查購買特色遊戲的合法性，如果不合法，返回 null
        return null;
      }
    }
    if (totalWin < spinInfo.targetMin || totalWin > spinInfo.targetMax) {
      return null;
    }
  }
  return result;
}