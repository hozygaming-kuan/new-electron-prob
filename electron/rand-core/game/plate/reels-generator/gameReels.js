class GameReels {

  constructor(gameUtil) {
    /** @type {import('../../../../type/gameConfigType').Define} */
    this.define;
    /** @type {import('../../../../type/gameConfigType').High} */
    this.config;
    /** @type {import('../../../../../rand-core-lib/utils')} gameUtil */
    this.gameUtil = gameUtil;
  }

  /** @type {import('../../../../type/functionType').getReelsName} */
  getReelsName() {

    throw new Error('Method getReelsName() must be implemented');
  }

  /**
   * @param {import('../../../../type/gameConfigType').High} config
   */
  set plateConfig(config) {

    this.config = config;
  }
}
module.exports = GameReels