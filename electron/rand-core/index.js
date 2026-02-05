const path = require('path');
const fs = require('fs');

// 熱更新檢查間隔 (s)
const RELOAD_INTERVAL = 30;

const getTimestamp = function () {
  let dateTime = Date.now();
  let timestamp = Math.floor(dateTime / 1000);
  return timestamp;
};

/**
 * RandTheme Constractor
 */
class RandTheme {
  constructor(randCoreLib) {
    this.hash = '';
    this.logPrefix = "[RAND]";

    // 熱更新參數
    this.waitReload = false;
    this.hashChecking = false;
    this.reloadEnable = true;

    // 機率
    this.randPath = path.resolve(__dirname, 'core', 'rand.js');
    this.gameConfigRootPath = path.resolve(__dirname, 'config');
    this.gameHashPath = path.resolve(this.gameConfigRootPath, 'hash.txt');
    this.gameSpecPath = path.resolve(this.gameConfigRootPath, 'spec.json');

    this.allSettingPath = this.getAllJsonPaths(this.gameConfigRootPath);
    this.configMap = new Map();

    try {
      const gameHash = fs.readFileSync(this.gameHashPath, 'utf8');
      this.hash = gameHash;
      this.lastCheckReload = getTimestamp();
    }
    catch (err) {
      console.error(err);
      this.reloadEnable = false;
    }
    this.newRand(randCoreLib);
  }

  getAllJsonPaths(dir, { absolute = true, includeSymlinks = false } = {}) {

    const names = fs.readdirSync(dir, { withFileTypes: true });
    const list = names
      .filter(e => e.isFile() || (includeSymlinks && e.isSymbolicLink()))
      .filter(e => path.extname(e.name).toLowerCase() === '.json')
      .map(e => absolute ? path.join(dir, e.name) : e.name);

    return list;
  }

  initConfigMap() {

    this.configMap.clear();
    for (const _path of this.allSettingPath) {
      const context = fs.readFileSync(_path, 'utf-8');
      const configName = _path.split(path.sep).pop().split('.')[0];
      if (!['default', 'define', 'items', 'free-round-items'].includes(configName)) {
        continue;
      }
      this.configMap.set(configName, JSON.parse(context));
    }
  }

  newRand(randCoreLib) {
    try {
      // 機率模組
      delete require.cache[require.resolve(this.randPath)];
      const Rand = require(this.randPath);
      this.spec = require(this.gameSpecPath);
      this.initConfigMap();
      if (!randCoreLib) {
        randCoreLib = require('../../rand-core-lib');
      }
      // 生成新的機率模組
      /** @type {import('./core/rand')} */
      this.rand = new Rand(this.configMap, randCoreLib);
      const buyFeatureInfos = {};

      if (this.configMap.has('items') && Object.keys(this.configMap.get('items')).length > 0) {
        const itemsConfig = this.configMap.get('items');
        Object.keys(itemsConfig).forEach(function (key) {
          let value = itemsConfig[key];
          buyFeatureInfos[value.type] = {
            name: value.name,
            type: value.type,
            rate: value.rate,
            total: value.count,
          };
        });
      }
      this.gameInfo = {
        lineCount: this.configMap.get('define').line_count,
        buyFeatureInfos: buyFeatureInfos,
        randMode: this.spec.randMode,
      };
    }
    catch (e) {
      console.error(e);
      throw e;
    }
  }
  /**
   * 取得遊戲資料
   *
   */
  getInfo() {
    return this.gameInfo;
  }

  /**
   * 取得機台狀態
   * @param  {Number[]}    押分
   * @return {Object}    機台狀態
   */
  createState(bets) {
    return {};
  }

  /**
   * 取得Spin結果
   * @param {import('../type/randSystem').BetInfo} betInfo
   * @param {import('../type/randSystem').SysState} sysState
   * @param {Object} macBuffer 
   * @param {{playerState:any,playerAction:{Index:number}}} playerArgs
   * @returns
   */
  getSpinResult(betInfo, sysState, macBuffer, playerArgs) {
    try {
      // 熱更新
      if (this.waitReload == true) {
        this.newRand();
        this.waitReload = false;
        console.log('update success HASH:' + this.hash);
      }
      // 檢查熱更新
      if (this.reloadEnable == true) {
        const now = getTimestamp();
        const deltaTime = now - this.lastCheckReload;
        if (deltaTime > RELOAD_INTERVAL && this.hashChecking == false) {
          this.hashChecking = true;
          const self = this;
          fs.readFile(this.gameHashPath, 'utf8', function (error, newHash) {
            if (error == null) {
              if (self.hash != newHash) {
                // 等待熱更新
                console.log('update waiting... HASH:' + newHash);
                self.hash = newHash;
                self.waitReload = true;
              }
            }
            self.hashChecking = false;
            self.lastCheckReload = getTimestamp();
          });
        }
      };

      if (betInfo.buyFeatureType !== undefined && !this.configMap.has('itemPrize')) {
        this.setAndUpdateMap('itemPrize', 'itemPrize');
      }

      if (betInfo.buyFeatureType !== undefined && !this.configMap.has('free-round-itemPrize') && sysState.randMode === 'free-round') {
        this.setAndUpdateMap('free-round-itemPrize', 'free-round-itemPrize');
      }

      if (sysState.targetPrizeType !== undefined && !this.configMap.has('mainPrize')) {
        this.setAndUpdateMap('mainPrize', 'mainPrize');
      }

      if (sysState.randMode !== undefined && !this.configMap.has(sysState.randMode)) {
        this.setAndUpdateMap(sysState.randMode, sysState.randMode);
      }

      const spinResult = this.rand.getSpinResult(betInfo, sysState, playerArgs);
      // console.log(JSON.stringify(spinResult));
      
      return spinResult;
    }
    catch (error) {
      console.error(error);
      throw error;
    }
  }

  setAndUpdateMap(keyName, fileName) {
    const setting = this.getConfig(fileName);
    this.configMap.set(keyName, setting);
    this.rand.updateConfigMap(this.configMap);
  }

  getConfig(fileName) {

    const wholePath = `${this.gameConfigRootPath}/${fileName}.json`;

    if (fs.existsSync(wholePath) === false) {
      console.warn('Config file not found: ' + wholePath);
      return {};
    }
    const context = fs.readFileSync(wholePath, 'utf-8');
    return JSON.parse(context);
  }

  /**
   * 刪除玩家狀態
   *
   * @param {Object} playerState
   * @memberof RandTheme
   */
  deletePlayerState(playerState) {

    if (playerState && playerState.gameStatus) {
      delete playerState.gameStatus;
    }
  }
}

module.exports = function (randCoreLib) {
  try {
    return new RandTheme(randCoreLib);
  }
  catch (e) {
    console.error(e);
    return null;
  }
};
