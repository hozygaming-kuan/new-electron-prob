const Parser = require("./parser");

class Plate extends Parser {

  constructor(tableLoader) {
    super();
    this.tableLoader = tableLoader;
  }

  /**
   *
   *
   * @param {Object} config
   * @param {Object} sheets
   * @return {Object} 
   * @memberof Plate
   */
  parser(config, sheets) {

    const result = {};
    result.main = this.parseMainPlate(sheets, config);
    result.feature = this.parseFeature(sheets);
    result.free = this.parseFreePlate(sheets, config);
    this.parsePlateMaxWin(sheets, result);
    // 彩帶 [rid]
    var strips = {};
    // 短彩帶
    var shortStrips = {};

    // 彩帶起始位置籤 [rid]
    var startStrips = {};

    // 彩帶索引查彩帶ID
    var ridMap = {};
    result.ridMap = ridMap;

    // 20條主彩帶
    [sheets.Reel, sheets.Reel2].forEach(sheet => {
      for (var i = 0; i < 10; i++) {
        var rid = sheet[this.util.idx2AZ(i * 15) + 2];
        var x = this.util.idx2AZ(i * 15 + 2);
        // 起始位置
        var x2 = this.util.idx2AZ(i * 15 + 1);
        var reel = [];

        // 開始位置籤數
        var startStrip = [];
        for (var ii = 0; ii < 4096; ii++) {
          var key = x + (ii + 3);
          var code = sheet[key];
          // 當獎圖編號未填此條彩帶結束
          if (code == null) {
            break;
          }
          // 將獎圖代號轉換成ID
          if (config.symbolCodes[code] === null || config.symbolCodes[code] === undefined) {
            throw new Error('獎圖代號轉換錯誤');
          }

          reel.push(config.symbolCodes[code]);

          // 該位置籤數
          var stickCount = sheet[x2 + (ii + 3)];
          if (stickCount && stickCount > 0) {
            startStrip = this.util.appendAry(startStrip, ii, stickCount);
          }
        }
        startStrip = this.util.resizeSticksAry(startStrip);

        if (reel.length == 0)
          continue;

        var reelLen = reel.length;

        // 將彩帶循環多填8位 方便運算
        reel.push(reel[0]);
        reel.push(reel[1]);
        reel.push(reel[2]);
        reel.push(reel[3]);
        reel.push(reel[4]);
        reel.push(reel[5]);
        reel.push(reel[6]);
        reel.push(reel[7]);

        strips[rid] = reel;
        startStrips[rid] = startStrip;
        ridMap[rid] = rid;

        // 短彩帶10隻 長度64
        for (var subIdx = 0; subIdx < 10; subIdx++) {
          var x = this.util.idx2AZ(i * 15 + 3 + subIdx % 5);
          var y = subIdx > 4 ? 68 : 2;
          var srid = sheet[x + y];
          if (srid == null)
            continue;
          var ary = [];
          for (var ii = 0; ii < 64; ii++) {
            var y = subIdx > 4 ? (ii + 69) : (ii + 3);
            var rIdx = sheet[x + y];
            if (rIdx != null) {
              ary.push(rIdx);
            }
          }
          // ADD模式
          var y = subIdx > 4 ? 133 : 67;
          if (sheet[x + y]) {
            var modeStrs = sheet[x + y].split('.');
            var mode = modeStrs[0];
            if (mode == "ADD") {
              // 加幾次
              var addc = modeStrs[1] ? parseInt(modeStrs[1]) : 1;
              var tmp = ary.slice();
              for (var addi = 1; addi < addc; addi++) {
                ary = ary.concat(tmp.slice());
              }
              for (var ri = 0; ri < reelLen; ri++) {
                ary.push(ri);
              }
            }
            // SUB模式
            else if (mode == "SUB") {
              var tmp = {};
              var ignores = {};
              for (var ai = 0; ai < ary.length; ai++) {
                ignores[ary[ai]] = true;
              }
              ary = [];
              for (var ri = 0; ri < reelLen; ri++) {
                if (!ignores[ri]) {
                  ary.push(ri);
                }
              }
            }
          }

          if (ary.length > 0) {
            ridMap[srid] = rid;
            shortStrips[srid] = ary;
          }
        }

        // 中彩帶5隻 長度128
        for (var subIdx = 0; subIdx < 5; subIdx++) {
          var x = this.util.idx2AZ(i * 15 + 3 + subIdx);
          var srid = sheet[x + 134];
          if (srid == null)
            continue;
          var ary = [];
          for (var ii = 0; ii < 128; ii++) {
            var y = 135 + ii;
            var rIdx = sheet[x + y];
            if (rIdx != null) {
              ary.push(rIdx);
            }
          }
          // ADD模式
          if (sheet[x + 263]) {
            var modeStrs = sheet[x + 263].split('.');
            var mode = modeStrs[0];
            var modeArgs = modeStrs[1];
            if (mode == "ADD") {
              // 加幾次
              var addc = modeStrs[1] ? parseInt(modeStrs[1]) : 1;
              var tmp = ary.slice();
              for (var addi = 1; addi < addc; addi++) {
                ary = ary.concat(tmp.slice());
              }
              for (var ri = 0; ri < reelLen; ri++) {
                ary.push(ri);
              }
            }
            // SUB模式
            else if (mode == "SUB") {
              var tmp = {};
              var ignores = {};
              for (var ai = 0; ai < ary.length; ai++) {
                ignores[ary[ai]] = true;
              }
              ary = [];
              for (var ri = 0; ri < reelLen; ri++) {
                if (!ignores[ri]) {
                  ary.push(ri);
                }
              }
            }
          }

          if (ary.length > 0) {
            ridMap[srid] = rid;
            shortStrips[srid] = ary;
          }
        }
      }
    });
    result.strips = strips;
    result.shortStrips = shortStrips;
    result.startStrips = startStrips;
    return result;
  }

  /**
   *
   *
   * @param {Object} sheets
   * @memberof Plate
   */
  parseFeature(sheets) { }

  /**
   *
   *
   * @param {Object} sheets
   * @param {Object} config
   * @return {Object} 
   * @memberof Plate
   */
  parseMainPlate(sheets, config) {

    const sheet = sheets.Main;
    const result = {};
    const stripsMode = config.stripsMode ?? 1;
    let s1key = {};
    let s1 = [];
    for (let i = 0; i < 20; i++) {
      let count = sheet['B' + (3 + i)];
      if (count > 0 || count == 'x') {
        s1 = this.util.appendAry(s1, i, count);
        s1key[i] = true;
      }
    }
    s1 = this.util.resizeSticksAry(s1);
    result.s1 = s1;

    // 彩帶籤(20) = 狀態籤[x]
    var s2 = {};
    result.s2 = s2;

    // 彩帶列表 [彩帶籤]
    var c2 = {};
    result.reels = c2;

    // 重抽條件
    result.respin = {};

    for (var i = 0; i < 21; i++) {
      if (i != 20 && !s1key[i])
        continue;
      result.respin[i] = {};
      // 彩帶桶籤數
      var reelsBucketStrips = [];
      // 彩帶桶列表
      var reelsBucket = {};

      for (var ii = 0; ii < 20; ii++) {
        var xidx = 5 + 8 * i;
        let respinidx = 5 + 10 * i;
        var x = this.util.idx2AZ(xidx);

        var count = sheet[x + (3 + ii)];

        if ((!count || count == 0)) {
          continue;
        }
        reelsBucketStrips = this.util.appendAry(reelsBucketStrips, ii, count);

        // 彩帶
        let reels = [];

        // 五輪
        var y = (3 + ii);
        for (var iii = 0; iii < 6; iii++) {
          x = this.util.idx2AZ(xidx + iii + 1);
          var rid = sheet[x + y];
          if (!rid) {
            break;
          }
          if (rid) {
            if (stripsMode == 1) {
              if (iii == 5) {
                var args = rid.toString().split(',');
                reels = reels.concat(args);
              }
              else {
                reels[iii] = rid.toString();
              }
            } else if (stripsMode == 0) {
              rid = rid.toString().replace(/\s+/g, "");
              let ary = rid.split(',');
              if (ary.length == 1) {
                ary = [];
                for (let iiii = 0; iiii < config.window.height; iiii++) {
                  ary[iiii] = rid;
                }
              }
              reels[iii] = ary;
            }
          }
        }
        // 主遊戲重抽
        if (sheets.MainRespin != null) {
          var flag = sheets.MainRespin[this.util.idx2AZ(respinidx - 1) + y];

          if (flag == true || flag == 'true' || flag == 'TRUE' || flag == 1) {
            var max = sheets.MainRespin[this.util.idx2AZ(respinidx + 0) + y];
            var maxProb = sheets.MainRespin[this.util.idx2AZ(respinidx + 1) + y];
            var min = sheets.MainRespin[this.util.idx2AZ(respinidx + 2) + y];
            var minProb = sheets.MainRespin[this.util.idx2AZ(respinidx + 3) + y];
            var comboMin = sheets.MainRespin[this.util.idx2AZ(respinidx + 4) + y];
            var comboMinProb = sheets.MainRespin[this.util.idx2AZ(respinidx + 5) + y];
            var comboMax = sheets.MainRespin[this.util.idx2AZ(respinidx + 6) + y];
            var comboMaxProb = sheets.MainRespin[this.util.idx2AZ(respinidx + 7) + y];
            result.respin[i][ii] = [max, maxProb, min, minProb, comboMin, comboMinProb, comboMax, comboMaxProb];
          }
          else {
            result.respin[i][ii] = null;
          }
        }

        if (reels.length >= 5) {
          reelsBucket[ii] = reels;
        }
      }

      reelsBucketStrips = this.util.resizeSticksAry(reelsBucketStrips);

      if (reelsBucketStrips.length > 0) {
        c2[i] = reelsBucket;
        s2[i] = reelsBucketStrips;
      }
    }

    return result;
  }

  /**
   *
   *
   * @param {Object} sheets
   * @memberof Plate
   */
  parseFreePlate(sheets, config) {

    const stripsMode = config.stripsMode ?? 1;

    const freeState = {
      '0': [],
      '1': [],
      '2': [],
      '3': [],
    };
    const multipleRangeMap = {};
    let sheet = sheets.Free;
    let result = {};

    for (let x = 0; x < 4; x++) {
      const idx2AZ = this.util.idx2AZ(x + 1);
      for (let y = 0; y < 5; y++) {
        const z = y + 28;
        freeState[x] = this.util.appendAry(freeState[x], y, sheet[idx2AZ + z]);
      }
      freeState[x] = this.util.resizeSticksAry(freeState[x]);
    }
  
    for (let i = 0; i < 5; i++) {
      const y = i + 28;
      multipleRangeMap[i] = {
        min: Number(sheet[`F${y}`]),
        minChance: Number(sheet[`G${y}`]),
        max: Number(sheet[`H${y}`]),
        maxChance: Number(sheet[`I${y}`]),
      }
    }

    result.freeState = freeState;
    result.multipleRangeMap = multipleRangeMap;

    let s1key = {};
    result.s1 = [];
    result.respin = {};
    // 狀態籤 (20x5)
    for (let ii = 0; ii < 5; ii++) {
      let s1 = [];
      let x = this.util.idx2AZ(1 + ii);
      for (let i = 0; i < 20; i++) {
        let count = sheet[x + (3 + i)];
        if (count > 0) {
          s1 = this.util.appendAry(s1, i, count);
          s1key[i] = true;
        }
      }
      s1 = this.util.resizeSticksAry(s1);
      result.s1.push(s1);
    }

    // 彩帶籤(20) = 狀態籤[x]
    let s2 = {};
    result.s2 = s2;

    // 彩帶列表 [彩帶籤]
    let c2 = {};
    result.reels = c2;

    // 橫的21個狀態 (最後一個是強開ReTrigger)
    for (let i = 0; i < 21; i++) {
      if (i != 20 && !s1key[i])
        continue;
      // 彩帶桶籤數
      result.respin[i] = {};
      let reelsBucketStrips = [];
      // 彩帶桶列表
      let reelsBucket = {};

      for (let ii = 0; ii < 20; ii++) {
        let xidx = 11 + 8 * i;
        let respinidx = 5 + 10 * i;
        let x = this.util.idx2AZ(xidx);
        let y = (3 + ii);
        let count = sheet[x + y];

        if ((!count || count == 0))
          continue;
        reelsBucketStrips = this.util.appendAry(reelsBucketStrips, ii, count);

        // 彩帶
        let reels = [];

        // 五輪
        for (let iii = 0; iii < 6; iii++) {
          x = this.util.idx2AZ(xidx + iii + 1);
          let rid = sheet[x + y];
          if (!rid) {
            break;
          }
          if (rid) {
            if (stripsMode == 1) {
              if (iii == 5) {
                var args = rid.toString().split(',');
                reels = reels.concat(args);
              }
              else {
                reels[iii] = rid.toString();
              }
            } else if (stripsMode == 0) {
              rid = rid.toString().replace(/\s+/g, "");
              let ary = rid.split(',');
              if (ary.length == 1) {
                ary = [];
                for (let iiii = 0; iiii < config.window.height; iiii++) {
                  ary[iiii] = rid;
                }
              }
              reels[iii] = ary;
            }
          }
        }

        // 免費遊戲重抽
        if (sheets.FreeRespin != null) {
          let flag = sheets.FreeRespin[this.util.idx2AZ(respinidx - 1) + y];
          if (flag == true || flag == 'true' || flag == 'TRUE' || flag == 1) {
            let max = sheets.FreeRespin[this.util.idx2AZ(respinidx) + y];
            let maxProb = sheets.FreeRespin[this.util.idx2AZ(respinidx + 1) + y];
            let min = sheets.FreeRespin[this.util.idx2AZ(respinidx + 2) + y];
            let minProb = sheets.FreeRespin[this.util.idx2AZ(respinidx + 3) + y];
            let minCombo = sheets.FreeRespin[this.util.idx2AZ(respinidx + 4) + y];
            let minComboProb = sheets.FreeRespin[this.util.idx2AZ(respinidx + 5) + y];
            let maxCombo = sheets.FreeRespin[this.util.idx2AZ(respinidx + 6) + y];
            let maxComboProb = sheets.FreeRespin[this.util.idx2AZ(respinidx + 7) + y];
            result.respin[i][ii] = [max, maxProb, min, minProb, minCombo, minComboProb, maxCombo, maxComboProb];
          }
          else {
            result.respin[i][ii] = null;
          }
        }

        if (reels.length >= 5) {
          reelsBucket[ii] = reels;
        }
      }

      reelsBucketStrips = this.util.resizeSticksAry(reelsBucketStrips);

      if (reelsBucketStrips.length > 0) {
        c2[i] = reelsBucket;
        s2[i] = reelsBucketStrips;
      }
    };
    return result;
  }

  parsePlateMaxWin(sheets, config) {

    const maxWin = sheets.MaxWin['B3'];
    const maxWinFlag = sheets.MaxWin['C3'] === 'TRUE' || sheets.MaxWin['C3'] === true || sheets.MaxWin['C3'] === 'true';
    config.plateMaxWin = maxWin;
    config.plateMaxWinFlag = maxWinFlag;
  }
}
module.exports = Plate