const { baseSpin, freeSpin } = require('../game/spin');
const { BaseReelsGenerator, FreeReelsGenerator } = require('../game/plate/reels-generator');
const path = require('path');
class Rand {

  /**
   * Creates an instance of Rand.
   * @param {any} gameConfigMap
   * @param {import('../../../rand-core-lib/')} randCoreLib
   * @memberof Rand
   */
  constructor(gameConfigMap, randCoreLib) {

    //--------------------設定檔區塊-------------------------//
    this.spec = require('../config/spec.json');
    /** @type {Map<string, any>} 遊戲設定檔 */
    this.gameConfigMap = gameConfigMap;
    /** @type {import('../../type/gameConfigType').Define} 遊戲定義檔 */
    this.define = this.gameConfigMap.get('define');
    /** @type {import('../../type/gameConfigType').High} Plate 設定檔*/
    this.config = undefined
    /** @type {import('../../type/gameConfigType').High} 默認Plate設定檔 */
    this.currentDefault = undefined;
    this.randCoreControl = randCoreLib.rand_core_control;
    this.calculate = randCoreLib.calculate;
    this.randModeSet = new Set(this.define.randMode);

    //--------------------遊戲服務模組區塊-------------------------//
    this.gameSet = require('../game/util/gameSetting'); // 遊戲設定
    this.gameUtil = randCoreLib.utils; // 工具模組
    this.gameControl = new (require('../game/util/gameControl'))(this.define); // 遊戲控制模組
    this.baseReelsGenerator = new BaseReelsGenerator(this.gameUtil); // 抽主遊戲盤面模組
    this.freeReelsGenerator = new FreeReelsGenerator(this.gameUtil);
    this.plateGenerator = new (require('../game/plate/plateGenerator'))(this.define, this.gameUtil); // 抽盤面服務
    this.getPrizeService = new (require('../game/prize/getPrizeService'))(this.gameUtil); // 算分服務
    /** @type {import('../game/spin/baseSpin')} baseSpin */
    this.baseSpin = baseSpin.bind(this);
    /** @type {import('../game/spin/freeSpin')} freeSpin */
    this.freeSpin = freeSpin.bind(this);
    /** @type {import('../game/prize/prize')[]} 算分模組介面 */
    this.freePrizes = [];
    /** @type {import('../game/prize/prize')[]} 算分模組介面 */
    this.mainPrizes = [];
    this.init();
  }

  init() {
    for (const key in this.spec.mainPrizes) {
      const prizeModPath = this.spec.mainPrizes[key];
      const prizeClass = require(path.join(__dirname, '../game/prize', prizeModPath));
      const prizeInstance = new prizeClass(this.define, key, this.gameUtil);
      this.mainPrizes.push(prizeInstance);
    }
    for (const key in this.spec.freePrizes) {
      const prizeModPath = this.spec.freePrizes[key];
      const prizeClass = require(path.join(__dirname, '../game/prize', prizeModPath));
      const prizeInstance = new prizeClass(this.define, key, this.gameUtil);
      this.freePrizes.push(prizeInstance);
    }
  }

  updateConfigMap(gameConfigMap) {
    this.gameConfigMap = gameConfigMap;
  }

  /** @type {import('../../type/functionType').getSpinResult} */
  getSpinResult(betInfo, sysState, playerArgs) {

    const spinInfo = {
      targetType: this.gameSet.PRIZE_TYPE.NORMAL,
      isPVP: false,
      targetTotal: 0,
      targetMax: 0,
      targetMin: 0
    };

    this.randCoreControl.checkInfo(betInfo, sysState);
    this.randCoreControl.updateSpinInfo(betInfo, sysState, spinInfo, this.gameConfigMap, this.randModeSet, this.define);
    this.currentDefault = this.randCoreControl.chooseProbabilityTable(sysState, this.gameConfigMap, this.randModeSet);

    let spinResult = null;

    for (let reSpinCount = 0; reSpinCount < this.gameSet.RESPIN_MAX; reSpinCount++) {

      const canRespin = reSpinCount < this.gameSet.RESPIN_MAX * 0.9;
      // 當重抽次數過多時改為自然機率
      if (!canRespin) {
        spinInfo.targetType = this.gameSet.PRIZE_TYPE.NORMAL;
        spinInfo.isPVP = false;
        spinInfo.targetTotal = 0;
        spinInfo.targetMax = 0;
        spinInfo.targetMin = 0;
      }
      // 更新機率表
      const config = this.randCoreControl.updateProbabilityTable(betInfo, sysState, spinInfo, this.randModeSet, this.gameConfigMap);
      if (config === undefined) {
        this.config = this.currentDefault;
      } else {
        this.config = config;
      }
      spinResult = this._getSpinResult(betInfo, sysState, spinInfo, playerArgs);
      if (spinResult !== null) {
        break;
      }
    }
    if (spinResult === null) {
      throw new Error('spinResult is null');
    }
    return spinResult;
  }

  /** @type {import('../../type/functionType')._getSpinResult} */
  _getSpinResult(betInfo, sysState, spinInfo, playerArgs) {
    
    // 主遊戲
    const result = this.baseSpin(betInfo, sysState, spinInfo);
    if (result === null) {
      return null;
    };

    const spinResult = {
      game: result,
      isBuyFeature: spinInfo.targetType == this.gameSet.PRIZE_TYPE.BUY_FEATURE,
      isPrize: spinInfo.targetType == this.gameSet.PRIZE_TYPE.SPECIFIED,
      isPVP: spinInfo.isPVP,
    };

    return spinResult;
  }
}
module.exports = Rand;