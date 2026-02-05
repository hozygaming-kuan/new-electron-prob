class Parser {

  constructor() {
    this.util = require('../util');
  }

  parser() {

    throw new Error('Method parser() must be implemented');
  };

  parseFeature() {

    throw new Error('Method parseFeature() must be implemented');
  };

  loadTableSticky(colRange, rowRange, obj, featureSheet) {
    // 解析 colRange
    const [colStartCell, colEndCell] = colRange.split('-');
    const colStartMatch = colStartCell.match(/^([A-Z]+)(\d+)$/i);
    const colEndMatch = colEndCell.match(/^([A-Z]+)(\d+)$/i);
    const colStartAZ = colStartMatch[1];
    const colStartNum = parseInt(colStartMatch[2], 10);
    const colEndAZ = colEndMatch[1];

    const colStart = this.util.az2Idx(colStartAZ);
    const colEnd = this.util.az2Idx(colEndAZ);

    // 解析 rowRange
    const [rowStartCell, rowEndCell] = rowRange.split('-');
    const rowStartMatch = rowStartCell.match(/^([A-Z]+)(\d+)$/i);
    const rowEndMatch = rowEndCell.match(/^([A-Z]+)(\d+)$/i);
    const rowKey = rowStartMatch[1];
    const rowStartNum = parseInt(rowStartMatch[2], 10);
    const rowEndNum = parseInt(rowEndMatch[2], 10);

    for (let i = colStart; i <= colEnd; i++) {
      const colAZ = this.util.idx2AZ(i);
      obj[featureSheet[`${colAZ}${colStartNum}`]] = [];
      for (let x = rowStartNum; x <= rowEndNum; x++) {
        this.util.appendAry(
          obj[featureSheet[`${colAZ}${colStartNum}`]],
          featureSheet[`${rowKey}${x}`],
          featureSheet[`${colAZ}${x}`]
        );
      }
      obj[featureSheet[`${colAZ}${colStartNum}`]] = this.util.resizeSticksAry(obj[featureSheet[`${colAZ}${colStartNum}`]]);
    }
  }

  loadTableValue(colRange, rowRange, obj, featureSheet) {
    // 解析 colRange
    const [colStartCell, colEndCell] = colRange.split('-');
    const colStartMatch = colStartCell.match(/^([A-Z]+)(\d+)$/i);
    const colEndMatch = colEndCell.match(/^([A-Z]+)(\d+)$/i);
    const colStartAZ = colStartMatch[1];
    const colStartNum = parseInt(colStartMatch[2], 10);
    const colEndAZ = colEndMatch[1];

    const colStart = this.util.az2Idx(colStartAZ);
    const colEnd = this.util.az2Idx(colEndAZ);

    // 解析 rowRange
    const [rowStartCell, rowEndCell] = rowRange.split('-');
    const rowStartMatch = rowStartCell.match(/^([A-Z]+)(\d+)$/i);
    const rowEndMatch = rowEndCell.match(/^([A-Z]+)(\d+)$/i);
    const rowKey = rowStartMatch[1];
    const rowStartNum = parseInt(rowStartMatch[2], 10);
    const rowEndNum = parseInt(rowEndMatch[2], 10);

    for (let i = colStart; i <= colEnd; i++) {
      const colAZ = this.util.idx2AZ(i);
      obj[featureSheet[`${colAZ}${colStartNum}`]] = {};
      for (let x = rowStartNum; x <= rowEndNum; x++) {
        obj[featureSheet[`${colAZ}${colStartNum}`]][featureSheet[`${rowKey}${x}`]] = featureSheet[`${colAZ}${x}`];
      }
    }
  }
}
module.exports = Parser