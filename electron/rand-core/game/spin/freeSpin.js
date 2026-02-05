/**
 * @this {import('../../core/rand')}
 * @param {import('../../../type/spinResultType').Game} gameResult 
 * @returns {boolean}
 */
module.exports = function (gameResult, goldenCount, normalCount) {

  let stateIndex = 0;
  if (goldenCount === 3 && normalCount === 0) {
    stateIndex = 3;
  }
  else if (goldenCount === 2 && normalCount === 1) {
    stateIndex = 2;
  }
  else if (goldenCount === 1 && normalCount === 2) {
    stateIndex = 1
  }
  else if (goldenCount === 0 && normalCount === 3) {
    stateIndex = 0;
  }
  let goldenWildPosition = [];

  if (goldenCount > 0) {
    const reels = gameResult.plate.reels;
    for (let x = 0; x < reels.length; x++) {
      for (let y = 0; y < reels[x].length; y++) {
        if (reels[x][y] === this.gameSet.M_WILD) {
          goldenWildPosition.push([x, y]);
        }
      }
    }
  }
  const F_RETRY_MAX = 100;
  const mainWin = this.gameControl.getTotalWin(gameResult.totalWin);
  let freeCount = this.define.freeSpinAndRetriggerTimes;

  this.plateGenerator.use(this.config, this.freeReelsGenerator);
  this.getPrizeService.use(this.freePrizes);
  let maxWin;
  const reSpinCondition = this.config.free.freeState[stateIndex];
  const multipleMap = this.config.free.multipleRangeMap;
  const rangeIndex = this.gameUtil.randomAry(reSpinCondition);

  const { min, minChance, max, maxChance } = multipleMap[rangeIndex];
  const minProb = Math.random();
  const maxProb = Math.random();

  let fTotalWin = 0;
  let totalRetry = 0;
  let fRetry = 0;
  let freePlus = [freeCount];

  let result = {
    win: [0, 0],
    times: freeCount,
    results: [],
  };

  // 每局
  runLoop: do {
    let reTry = 0;
    maxWin = false;
    let fCount = freePlus.shift();
    let fResults = [];
    let fPlusCount = 0;
    let plateState = {
      flag: false,
      goldenWildPosition: goldenWildPosition,
    };

    // 每次
    while (fCount > 0) {
      reTry++;
      maxWin = false;
      const respinProb = Math.random();
      let fTotalCount = fResults.length + result.results.length + fCount;
      fTotalCount += freePlus.length * freeCount;
      let fResult = {
        win: [0, 0],
        plate: {},
        prizes: {},
      };

      const plate = this.plateGenerator.randomPlate(plateState, rangeIndex);
      const prizes = this.getPrizeService.get(plate);

      const downWin = this.gameControl.getTotalWin(prizes.win);

      if (downWin + mainWin + fTotalWin >= this.define.maxwin) {
        prizes.win[0] = (this.define.maxwin - mainWin - fTotalWin) * this.define.line_count;
        prizes.maxWin = true;
        maxWin = true;
      }

      if (reTry < this.define.freeRetryMax) {

        let respinCondition = null;

        if (respinCondition === null && this.config.free.respin && plateState.s1 !== undefined && plateState.s2 !== undefined) {

          respinCondition = this.config.free.respin[plateState.s1][plateState.s2]
        }
        if (this.gameControl.checkRedraw(respinCondition, respinProb, mainWin, prizes)) {
          continue;
        }
      }

      // 計算特殊物件 (scatter)
      let canRetrigger = this.gameControl.checkEntryFreeSpin(plate.reels);

      fResult.plate = plate;
      fResult.prizes = prizes;

      fPlusCount = canRetrigger ? this.define.freegame.retriggerTimes : 0;

      // fPlusCount = 0
      if (fPlusCount > 0) {
        if (fRetry < F_RETRY_MAX) {
          // 免費遊戲次數超過上限時重抽
          if (fTotalCount >= this.define.freegame.max) {
            fRetry++;
            continue;
          }
        }
        fResult.free = fPlusCount;
        freePlus.push(fPlusCount);
      }

      fResults.push(fResult);

      plateState = {
        flag: false,
      }

      // 計算當前spin的贏分
      const thisFreeSpinWin = this.gameControl.getTotalWin(prizes.win);
      fTotalWin += thisFreeSpinWin;
      if (maxWin) {
        fCount = 0;
        freePlus.length = 0;
      }
      fCount--;
    }
    result.results = result.results.concat(fResults);

    if (freePlus.length == 0 && totalRetry < 500) {
      const canRespin = totalRetry < 500 * 0.9;
      if (!canRespin) {
        return true;
      }
      let retry = false;
      // 總贏分幾倍以上、幾倍以下重抽
      if ((fTotalWin > max && maxChance > maxProb) || (fTotalWin < min && minChance > minProb)) {
        retry = true;
      }
      if (retry === true) {
        totalRetry++;
        fTotalWin = 0;
        result.results = [];
        result.win[0] = 0;
        result.win[1] = 0;
        freePlus = [freeCount];
        continue runLoop;
      }
    }
  } while (freePlus.length > 0);
  gameResult.free = result;
  return false;
};