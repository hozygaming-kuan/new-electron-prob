const Prize = require('./prize');
const GameSet = require('../../util/gameSetting');
class Line extends Prize {

  /**
   * Creates an instance of Line.
   * @memberof Line
   */
  constructor(define, key, gameUtil) {
    super(define, key, gameUtil);
    this.height = this.define.window.height;
  }
  get(plate, isFree) {

    const globalMultiplier = isFree === true ? 3 : 1;
    const reels = plate.reels;

    // 兌獎線定義
    const paylines = this.define.paylines;
    const result = {
      'win': [0, 0],
      'prizes': [],
    };

    // 檢查每條兌獎線
    for (let lineIndex = 0; lineIndex < paylines.length; lineIndex++) {
      const line = paylines[lineIndex];
      const lineResult = this.checkLine(reels, line, lineIndex, globalMultiplier);

      if (lineResult.win > 0) {
        const { win, symbol, count, lineIdx } = lineResult;
        result.win[0] += lineResult.win;
        result.prizes.push([lineIdx, symbol, count, win, 0]);
      }
    }

    return result;
  }

  /**
   * 檢查單條兌獎線
   * @param {Array} reels - 盤面數據 5x3
   * @param {Array} line - 兌獎線定義 [row, row, row, row, row]
   * @param {number} lineIndex - 線的索引
   * @returns {Object} 中獎結果
   */
  checkLine(reels, line, lineIndex, globalMultiplier) {
    const symbols = [];

    // 根據兌獎線取得符號序列
    for (let reel = 0; reel < 5; reel++) {
      const row = line[reel];
      const symbol = reels[reel][row];
      symbols.push(symbol);
    }

    // 檢查連續相同符號（從左到右）
    let count = 1;
    let winSymbol = symbols[0];

    // 檢查是否全為 WILD
    const allWild = symbols.every(symbol =>
      symbol === GameSet.WILD || symbol === GameSet.M
    );

    // 如果不是全 WILD，且第一個符號是 WILD，找下一個非 WILD 符號作為主要符號
    if (!allWild && (winSymbol === GameSet.WILD || winSymbol === GameSet.M_WILD)) {
      for (let i = 1; i < symbols.length; i++) {
        if (symbols[i] !== GameSet.WILD && symbols[i] !== GameSet.M_WILD) {
          winSymbol = symbols[i];
          break;
        }
      }
    }

    for (let i = 1; i < symbols.length; i++) {
      if (this.equal(winSymbol, symbols[i])) {
        count++;
      } else {
        break;
      }
    }

    // 檢查是否達到最小中獎數量
    let win = this.calculateWin(winSymbol, count);

    if (win > 0) {
      let mWildMultiplier = 1; // 這是這條線 M_WILD 貢獻的倍率

      // 計算 M_WILD 的倍率 (1, 2, 4, 8...)
      for (let i = 0; i < count; i++) {
        if (symbols[i] === GameSet.M_WILD) {
          mWildMultiplier *= 2;
        }
      }

      let finalMultiplier = 0;

      if (mWildMultiplier === 1) {
        finalMultiplier = globalMultiplier;
      } else {
        finalMultiplier = mWildMultiplier + globalMultiplier;
      }

      win = win * finalMultiplier;

      return {
        win: win,
        symbol: winSymbol,
        count: count,
        lineIdx: lineIndex,
        multiplier: finalMultiplier
      };
    }

    return { win: 0 };
  }

  /**
   * 計算中獎金額
   * @param {number} symbol - 中獎符號
   * @param {number} count - 連續數量
   * @returns {number} 中獎金額
   */
  calculateWin(symbol, count) {
    const paytable = this.define.paytable;
    const win = paytable[symbol]?.times?.[count] || 0;

    return win;
  }

  equal(symbolA, symbolB) {
    return symbolA === symbolB ||
      (symbolB === GameSet.WILD || symbolB === GameSet.M_WILD) ||
      (symbolA === GameSet.WILD || symbolA === GameSet.M_WILD);
  }
}

module.exports = Line