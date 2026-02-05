// folder structure:
// └── config-game
//      ├── define.xls              (共用)
//      ├── plate.xls               (一般)
//      ├── mainPrize               (指定派彩)
//      |   └── {times}.xls         (倍數)
//      └── itemPrize               (購買免費遊戲)
//          └── {type}/{times}.xls (倍數)

const path = require("path");
// 🔥 修改 1：換成 xlsx (SheetJS)，它對中文支援最好
const XLS = require('xlsx');
const fs = require('fs');
const plateParse = require('./game/parser-plate');
const defineParse = require('./game/parser-define');
const tableLoader = require('./tableLoader');
const hasher = require('folder-hash');
class ParserService {

  constructor() {
    this.util = require('./util');
    this.saveDir = path.join(__dirname, "../config/");
    this.tableLoader = new tableLoader(this.util);
    this.plateParse = new plateParse(this.tableLoader);
    this.defineParse = new defineParse();
    this.randMode = [];
    this.CONFIG_TYPE = {
      DEFAULT: 0,
      MAINPRIZE: 2,
      ITEM: 3
    };
  }

  parse(xlsRoot = path.join(__dirname, '../../../xls')) {

    const gameXlsPath = path.join(xlsRoot, 'config-game');
    const defineSheets = this.loadXls(path.join(gameXlsPath, 'define.xls'));

    const defineConfig = this.defineParse.parser(defineSheets);
    this.randMode = defineConfig.randMode;

    const plateConfig = {
      default: {},
    };
    const mainPrizes = [];
    const itemPrizes = {};
    const items = {};

    for (const key of this.randMode) {
      if (!plateConfig[key]) {
        plateConfig[key] = {};
      }
    }

    let plateInfos = this.findFilesAndConvertSync(`${gameXlsPath}/default`, 'plate_');
    plateConfig.default.high = this.loadPlate(`${gameXlsPath}/default`, '/' + plateInfos[0].fileName, defineConfig);
    plateConfig.default.high.rtp = plateInfos[0].decimalValue;
    plateConfig.default.high.name = plateInfos[0].fileName;
    plateConfig.default.high.type = this.CONFIG_TYPE.DEFAULT;
    plateConfig.default.high.randMode = 'default';

    if (plateInfos[1] !== undefined) {
      plateConfig.default.low = this.loadPlate(`${gameXlsPath}/default`, '/' + plateInfos[1].fileName, defineConfig);
      plateConfig.default.low.rtp = plateInfos[1].decimalValue;
      plateConfig.default.low.name = plateInfos[1].fileName;
      plateConfig.default.low.type = this.CONFIG_TYPE.DEFAULT;
      plateConfig.default.low.randMode = 'default';
    }

    for (const key of this.randMode) {
      if (fs.existsSync(path.join(gameXlsPath, key))) {
        let plateInfos = this.findFilesAndConvertSync(`${gameXlsPath}/${key}`, 'plate_');
        plateConfig[key].high = this.loadPlate(`${gameXlsPath}/${key}`, '/' + plateInfos[0].fileName, defineConfig);
        plateConfig[key].high.rtp = plateInfos[0].decimalValue;
        plateConfig[key].high.name = plateInfos[0].fileName;
        plateConfig[key].high.type = this.CONFIG_TYPE.DEFAULT;
        plateConfig[key].high.randMode = key;

        if (plateInfos[1] !== undefined) {
          plateConfig[key].low = this.loadPlate(`${gameXlsPath}/${key}`, '/' + plateInfos[1].fileName, defineConfig);
          plateConfig[key].low.rtp = plateInfos[1].decimalValue;
          plateConfig[key].low.name = plateInfos[1].fileName;
          plateConfig[key].low.type = this.CONFIG_TYPE.DEFAULT;
          plateConfig[key].low.randMode = key;
        }
      }
    }

    if (fs.existsSync(path.join(gameXlsPath, 'mainPrize'))) {
      fs.readdirSync(path.join(gameXlsPath, `mainPrize/`)).forEach(file => {
        let conf = this.loadPlate(gameXlsPath, `/mainPrize/${file}`, defineConfig);
        if (!conf) {
          return;
        }
        let score = file.split(".")[0];
        conf.name = "mp_" + score;
        conf.type = this.CONFIG_TYPE.MAINPRIZE;
        conf.id = 0;
        let mp = {
          'score': score,
          'config': conf
        };
        mainPrizes.push(mp);
      });

      mainPrizes.sort(function (a, b) {
        return b.score - a.score;
      });

      for (let i = 0; i < mainPrizes.length; i++) {
        mainPrizes[i].config.id = i;
      }
    }

    if (fs.existsSync(path.join(gameXlsPath, 'itemPrize'))) {
      fs.readdirSync(path.join(gameXlsPath, 'itemPrize')).forEach(folder => {
        let p = gameXlsPath + '/itemPrize/' + folder;
        if (fs.lstatSync(p).isDirectory()) {
          let items = [];
          fs.readdirSync(p).forEach(file => {
            let conf = this.loadPlate(gameXlsPath, '/itemPrize/' + folder + '/' + file, defineConfig);
            if (!conf)
              return;
            let score = file.split(".")[0];
            conf.name = "item_" + score;
            conf.type = this.CONFIG_TYPE.ITEM;
            items.push({
              'score': score,
              'config': conf
            });
          });
          if (items.length > 0) {
            items.sort(function (a, b) {
              return b.score - a.score;
            });
            for (let i = 0; i < items.length; i++) {
              items[i].config.id = folder + i;
            }
            itemPrizes[folder] = items;
          }
        }
      });
    }

    if (fs.existsSync(path.join(gameXlsPath, 'item.xls'))) {
      let itemConf = this.loadXls(path.join(gameXlsPath, 'item.xls'));
      for (let i = 0; i < 3; i++) {
        let y = i + 3;
        let type = itemConf.List["A" + y];

        if (type !== undefined) {
          let name = itemConf.List["B" + y];
          // 價格
          let rate = itemConf.List["C" + y];
          // 遊戲次數
          let count = itemConf.List["D" + y];

          let sticks = {};
          sticks.high = [];
          this.util.appendAry(sticks.high, 0, itemConf.List["E" + y]);
          this.util.appendAry(sticks.high, 1, itemConf.List["I" + y]);
          this.util.appendAry(sticks.high, 2, itemConf.List["M" + y]);
          this.util.resizeSticksAry(sticks.high);

          sticks.low = [];
          this.util.appendAry(sticks.low, 0, itemConf.List["F" + y]);
          this.util.appendAry(sticks.low, 1, itemConf.List["J" + y]);
          this.util.appendAry(sticks.low, 2, itemConf.List["N" + y]);
          this.util.resizeSticksAry(sticks.low);

          // 防呆 防止主牌沒設定
          if (itemPrizes[type] != null) {
            items[type] = {
              'type': type,
              'name': name,
              'rate': rate,
              'count': count,
              'states': [
                { 'min': itemConf.List["G" + y], 'max': itemConf.List["H" + y] },
                { 'min': itemConf.List["K" + y], 'max': itemConf.List["L" + y] },
                { 'min': itemConf.List["O" + y], 'max': itemConf.List["P" + y] }
              ],
              'stateSticks': sticks
            };
          }
          else {
            console.log("item no set", "type:", type);
          }
        }
      }
    }

    // 清理舊的 JSON 檔案（保留 spec.json）
    try {
      const files = fs.readdirSync(this.saveDir);
      files.forEach(file => {
        if (file.endsWith('.json') && file !== 'spec.json') {
          fs.unlinkSync(path.join(this.saveDir, file));
          console.log(`Delete: ${file}`);
        }
      });
    } catch (err) {
      console.error('Error:', err);
    }

    // 寫入設定檔

    for (const key in plateConfig) {
      fs.writeFileSync(this.saveDir + `${key}.json`, JSON.stringify(plateConfig[key]));
    }

    fs.writeFileSync(this.saveDir + 'define.json', JSON.stringify(defineConfig));
    if (Object.keys(items).length > 0) {
      fs.writeFileSync(this.saveDir + 'items.json', JSON.stringify(items));
    }
    if (Object.keys(itemPrizes).length > 0) {
      fs.writeFileSync(this.saveDir + 'itemPrize.json', JSON.stringify(itemPrizes));
    }
    if (Object.keys(mainPrizes).length > 0) {
      fs.writeFileSync(this.saveDir + 'mainPrize.json', JSON.stringify(mainPrizes));
    }

    let options = {
      excludes: ['.DS_Store', 'hash.txt'],
      match: { basename: true, path: true }
    };
    const distPath = this.saveDir;
    hasher.hashElement(distPath, options).then(function (hash) {
      console.log(hash.toString());
      fs.writeFileSync(distPath + "/hash.txt", hash.hash);
    });
  }

  loadXls(path) {
    let xls = undefined;
    try {
      // 🔥 修改 2：xlsx 預設就會自動處理編碼，不用擔心亂碼
      xls = XLS.readFile(path, {});
    }
    catch (e) {
      console.log("loadXls", path, e);
    }
    const result = {};
    for (let i in xls.Sheets) {
      result[i] = {};
      const sheet = xls.Sheets[i];
      for (let ii in sheet) {
        // 🔥 修改 3：過濾掉 xlsx 產生的 metadata (以 ! 開頭的屬性，如 !ref, !margins)
        // 這樣可以避免 undefined 的錯誤
        if (ii[0] === '!') continue;

        // xlsx 的資料結構是 { v: 'value', t: 'type' }，所以取 .v
        if (sheet[ii] && sheet[ii].v !== undefined && sheet[ii].v !== '')
          result[i][ii] = sheet[ii].v;
      }
    }
    return result;
  }

  loadPlate(gameXlsPath, path, defineConfig) {

    if (!/.*\/\w+\.xls$/.test(path)) {
      console.log("invalid path", path);
      return null;
    }

    const sheets = this.loadXls(gameXlsPath + path);
    const plateConfig = this.plateParse.parser(defineConfig, sheets);

    return plateConfig;
  }

  findFilesAndConvertSync(directoryPath, prefix) {

    const regex = new RegExp(`${prefix}(\\d+)\\.xls$`);
    let result = [];
    try {
      const files = fs.readdirSync(directoryPath);
      files.forEach((file) => {
        const match = file.match(regex);
        if (match) {
          const n = match[1];
          const decimalValue = (parseFloat(n) / 1000).toFixed(3);
          const fileName = file;
          result.push({ fileName, decimalValue });
        }
      });
    }
    catch (err) {
      console.error('Unable to scan directory:', err);
    }
    // 按 decimalValue 降序排序
    result.sort((a, b) => b.decimalValue - a.decimalValue);
    return result;
  }
}
module.exports = new ParserService();