const GameSet = require('../util/gameSetting');
class PlateGenerator {

  /**
   * Creates an instance of PlateGenerator
   * @param {import('../../../type/gameConfigType').Define} define
   * @param {import('../../../../rand-core-lib/utils')} gameUtil 
   * @memberof PlateGenerator 
   */
  constructor(define, gameUtil) {

    this.gameUtil = gameUtil
    this.define = define;
    /** @type {import('../../../type/gameConfigType').High} */
    this.config = undefined;
    /** @type {import('./reels-generator/gameReels')} */
    this.plate = undefined;
  }

  use(config, plate) {

    this.config = config;
    this.plate = plate;
    this.plate.plateConfig = config;
  }

  /** @type {import('../../../type/functionType').randomPlate} */
  randomPlate(plateState, stateIndex) {

    // 取得盤面的彩帶
    const reelsName = this.plate.getReelsName(plateState, stateIndex);
    const plate = this._randomPlate(reelsName, plateState.goldenWildPosition);
    return plate;
  }

  genSingleReel(reelsName) {

    const reels = Array.from({ length: this.define.window.width }, () =>
      Array(this.define.window.height).fill(-1)
    );

    while (true) {
      for (let x = 0; x < this.define.window.width; x++) {
        let rids = reelsName[x];
        for (let y = 0; y < this.define.window.height; y++) {
          // 彩帶編號
          let rid = rids[y];
          // 取得長彩帶編號 (短彩帶指向長彩帶)
          let lrid = this.config.ridMap[rid];
          // 彩帶
          let strip = this.config.strips[lrid];
          // 短彩帶
          let shortStrip = this.config.shortStrips[rid];
          let stopIdx = -1;
          if (shortStrip != null) {
            stopIdx = shortStrip[this.gameUtil.getRandomInt(0, shortStrip.length)];
          }
          // 長彩帶
          else {
            stopIdx = this.gameUtil.getRandomInt(0, strip.length);
          }
          let item = strip[stopIdx];
          reels[x][y] = item;
        }
      }
      let valid = true;
      for (let x = 0; x < reels.length; x++) {
        // 獨立輪不可出單輪出現2顆scatter
        const scatterCount = reels[x].filter(item => item === GameSet.SCATTER).length;
        if (scatterCount > 1) {
          valid = false;
          break;
        }
      }
      if (valid) {
        break;
      }
    }

    return reels;
  }

  genWholeReel(reelsName) {

    const reels = Array.from({ length: this.define.window.width }, () =>
      Array(this.define.window.height).fill(-1)
    );

    let stopIdx = -1;
    for (let i = 0; i < this.define.window.width; i++) {
      // 彩帶編號
      let lrid = reelsName[i];
      let rid = this.config.ridMap[lrid];
      // 彩帶
      let strip = this.config.strips[rid];
      // 短彩帶
      let shortStrip = this.config.shortStrips[lrid];
      if (shortStrip != null) {
        stopIdx = this.gameUtil.randomAry(shortStrip);
      }
      // 長彩帶
      else {
        // 最後8個是解析時遞補的 不抽該位置
        stopIdx = this.gameUtil.getRandomInt(0, strip.length - 8);
      }

      for (let ii = 0; ii < this.define.window.height; ii++) {
        // 盤面
        reels[i][ii] = strip[stopIdx + ii];
      }
    }

    return reels;
  }

  /** @type {import('../../../type/functionType')._randomPlate} */
  _randomPlate(reelNames, goldenWildPosition) {

    const stripsMode = this.define.stripsMode;
    let reels;

    if (stripsMode == 1) {
      reels = this.genWholeReel(reelNames);
    }
    else if (stripsMode == 0) {
      reels = this.genSingleReel(reelNames);
    }

    let featureLv = undefined;

    if (stripsMode == 1) {
      featureLv = reelNames[5] ?? 'L1';
    } else if (stripsMode == 0) {
      featureLv = reelNames[5]?.[0] ?? 'L1';
    }

    if (goldenWildPosition !== undefined) {
      for (const [x, y] of goldenWildPosition) {
        reels[x][y] = GameSet.M_WILD;
      }
    }

    const plate = {
      reels: reels,
    };

    return plate;
  }
}
module.exports = PlateGenerator