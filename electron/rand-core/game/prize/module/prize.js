class Prize {
  constructor(define, key, gameUtil) {
    /** @type {import('../../../../type/gameConfigType').Define} */
    this.define = define;
    /** @type {string} */
    this.key = key;
    /** @type {import('../../../../../rand-core-lib/utils')} */
    this.gameUtil = gameUtil;
  }
  get() {

    throw new Error('Method get() must be implemented');
    
  }
}
module.exports = Prize