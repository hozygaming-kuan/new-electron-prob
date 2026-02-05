class TableLoader {
  constructor(util) {
    this.util = util;
  }
  /* --------------------------------- private -------------------------------- */
  _generateSticks(array) {
    const result = [];
    for (let index = 0; index < array.length; index++) {
      this.util.appendAry(result, index, array[index]);
    }
    this.util.resizeSticksAry(result);
    return result;
  }
  _loadRows(sheet, columnIndexAZ, rowStartIndex, rowStopIndex, isWeightAble) {
    let result = [];
    for (let row_index = rowStartIndex; row_index <= rowStopIndex; row_index++) {
      const coord = columnIndexAZ + row_index;
      const data = sheet[coord];
      if (data !== undefined) {
        result.push(data);
      }
    }
    if (isWeightAble === true) {
      result = this._generateSticks(result);
    }
    return result;
  }
  _loadData(sheet, StartString, StopString, isWeightAble, returnAsArray) {
    const result = returnAsArray ? [] : {};
    const [columnStartString, rowStartIndex] = StartString.split('-');
    const columnStartIndex = this.util.az2Idx(columnStartString);
    const [columnStopString, rowStopIndex] = StopString.split('-');
    const columnStopIndex = this.util.az2Idx(columnStopString);

    if (returnAsArray === false) {
      for (let column_index = columnStartIndex, index = 0; column_index <= columnStopIndex; column_index++, index++) {
        const columnIndexAZ = this.util.idx2AZ(column_index);
        const data = this._loadRows(sheet, columnIndexAZ, parseInt(rowStartIndex), parseInt(rowStopIndex), isWeightAble);
        result[`${index}`] = data;
      }
    }
    else {
      for (let column_index = columnStartIndex; column_index <= columnStopIndex; column_index++) {
        const columnIndexAZ = this.util.idx2AZ(column_index);
        const coord = columnIndexAZ + rowStartIndex;
        result.push(sheet[coord]);
      }
    }

    return result;
  }
  /* --------------------------------- public --------------------------------- */
  loadValues(sheet, StartString, StopString) {
    return this._loadData(sheet, StartString, StopString, false, false);
  }
  loadSticks(sheet, StartString, StopString) {
    return this._loadData(sheet, StartString, StopString, true, false);
  }
  loadLevels(sheet, StartString, StopString) {
    return this._loadData(sheet, StartString, StopString, false, true);
  }
}
module.exports = TableLoader;