class GetPrizeService {

  constructor(gameUtil) {
    /** @type {import('./module/prize')[]} */
    this.prizeInstances = [];
    /** @type {import('../util/gameUtil')} */
    this.gameUtil = gameUtil;
  }

  /**
   *
   *
   * @param {import('./module/prize')[]} prizeInstances
   * @memberof GetPrizeService
   */
  use(prizeInstances) {

    this.prizeInstances = prizeInstances;
  }

  get(plate) {

    const prizes = {
      win: [0, 0]
    };

    for (const prizeInstance of this.prizeInstances) {
      const prize = prizeInstance.get(plate);
      if (prize === null) {
        continue;
      }
      if (prize.win[0] !== 0 || prize.win[1] !== 0) {
        prizes[prizeInstance.key] = prize;
        prizes.win[0] += this.gameUtil.float(prize.win[0]);
        prizes.win[1] += this.gameUtil.float(prize.win[1]);
      }
    }

    return prizes;
  }
}
module.exports = GetPrizeService;