const GameReels = require("./gameReels");
class FreeReelsGenerator extends GameReels {

  /**
   * Creates an instance of FreeReelsGenerator.
   * @param {import('../../../../../rand-core-lib/utils')} gameUtil
   * @memberof FreeReelsGenerator
   */
  constructor(gameUtil) {
    super(gameUtil);
  }

  /** @type {import('../../../../type/functionType').getReelsName} */
  getReelsName(plateState, stateIndex) {

    let sheet = this.config.free;
    let s1 = 0;
    let s2 = 0;
    // 取得彩帶編號
    if (!plateState.flag) {
      s1 = this.gameUtil.randomAry(sheet.s1[stateIndex]);
      s2 = this.gameUtil.randomAry(sheet.s2[s1]);
      plateState.s1 = s1;
      plateState.s2 = s2;
      plateState.flag = true;
    }
    else {
      s1 = plateState.s1;
      s2 = plateState.s2;
    }
    // 五輪分別對應的滾輪名稱
    const reelNames = sheet.reels[s1][s2];

    return reelNames;
  }
}
module.exports = FreeReelsGenerator