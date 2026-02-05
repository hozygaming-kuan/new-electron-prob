const Parser = require("./parser");
const payLines = require('./paylines.json');
class Define extends Parser {

  constructor() {
    super();
  }

  /**
   *
   *
   * @param {Object} sheets
   * @return {Object} 
   * @memberof Define
   */
  parser(sheets) {

    const config = {};

    // 押注線數
    config.line_count = parseInt(sheets.Define["V2"]);
    // maxwin
    config.maxwin = parseInt(sheets.Define["V5"]);
    // 獎圖倍數 11個 Sheet[AB~AI, 3~14]
    config.paytable = {};
    // 代號轉編號 (彩帶用)
    config.symbolCodes = {};
    // 流水號轉編號 (籤桶用)
    config.symbolIDs = {};
    config.randMode = [];
    config.randModeCond = {};
    for (let i = 0; i < 50; i++) {
      let val = sheets.RandMode["D" + (7 + i)];
      if (!val) break;
      config.randMode.push(val.toLowerCase());
    }

    for (let i = 0; i < 10; i++) {
      const key = sheets.RandMode["F" + (i + 7)];
      if (!key) break;
      config.randModeCond[key] = {
        maxBetCount: sheets.RandMode["E" + (i + 7)],
        fallBackMode: sheets.RandMode["G" + (i + 7)] === 'default' ? undefined : sheets.RandMode["G" + (i + 7)],
      };
    }

    config.maxWinChangeProb = sheets.Define['P12'];
    config.maxWinChangeLastN = sheets.Define['P13'];
    config.stripsMode = sheets.Define['AA7'];
    for (let i = 0; i < 20; i++) {
      let symbol = {};
      symbol.id = sheets.Define["A" + (i + 3)];
      if (symbol.id == null)
        continue;
      symbol.code = sheets.Define["B" + (i + 3)];
      symbol.name = sheets.Define["C" + (i + 3)];
      symbol.times = [0];
      for (let ii = 1; ii < 6; ii++) {
        let val = sheets.Define[this.util.idx2AZ(2 + ii) + (i + 3)];
        symbol.times[ii] = val ? val : 0;
      }
      config.paytable[symbol.id] = symbol;
      config.symbolCodes[symbol.code] = symbol.id;
      config.symbolIDs[i] = symbol.id;
    }

    // 視窗大小, 5x3 or 5x4
    config.window = {};
    config.window.width = 5;
    config.window.height = sheets.Define["AA3"];
    config.window.count = config.window.width * config.window.height;

    // 派彩線數
    config.two_way = sheets.Define["AA5"] == 1;
    config.two_way_free = sheets.Define["AA6"] == 1;
    let payline_count = sheets.Define["AA4"];

    // 派彩線表, 當派彩線數線=X時代表路路通
    if (payline_count != 'X') {
      config.paylines = payLines.paylines;
    }
    config.freeSpinAndRetriggerTimes = sheets.Define["P9"];

    // 主遊戲重抽次數上限
    config.mainRetryMax = sheets.Define["S7"];
    config.freeRetryMax = sheets.Define["S10"];
    // freeGame
    config.freegame = {
      payout: [0],
      max: 0,
      freeMultiplier: 0,
    };
    for (let i = 3; i < 50; i++) {
      const payout = sheets.Define["P" + i];
      if (payout === undefined || payout === null || payout === '') {
        break;
      }
      config.freegame.payout.push(payout);
    }

    if (sheets.Define["T2"]) {
      config.freegame.max = sheets.Define["T2"];
    }

    if (sheets.Define['T3']) {
      config.freegame.freeMultiplier = sheets.Define['T3'];
    }

    // Y水池門檻
    var buffer = {
      y: []
    };
    // Y1 ~ Y4
    for (var i = 0; i < 4; i++) {
      buffer.y[i] = {
        th: [],
        strips: []
      };

      var x1 = this.util.idx2AZ(i * 5 + 1);
      var x2 = this.util.idx2AZ(i * 5 + 2);

      for (var ii = 0; ii < 10; ii++) {
        var y = ii + 5;
        var threshold = sheets.Buffer[x1 + y];
        var stickCount = sheets.Buffer[x2 + y];
        if (threshold && stickCount) {
          this.util.appendAry(buffer.y[i].strips, buffer.y[i].th.length, stickCount);
          buffer.y[i].th.push(Number(threshold));
        }
      }
      this.util.resizeSticksAry(buffer.y[i].strips);
    }
    // 上下限
    buffer.overMax = sheets.Buffer["AA4"] ? Number(sheets.Buffer["AA4"]) : 0;
    buffer.remainMax = sheets.Buffer["AA5"] ? Number(sheets.Buffer["AA5"]) : 0;
    buffer.remainMaxPercent = sheets.Buffer["AA6"] ? Number(sheets.Buffer["AA6"]) : 0;
    config.buffer = buffer;

    this.parseFeature(config, sheets);

    return config;
  }

  /**
   *
   *
   * @param {Object} config
   * @param {Object} sheets
   * @memberof Define
   */
  parseFeature(config, sheets) { }
}
module.exports = Define