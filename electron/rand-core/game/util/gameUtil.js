class GameUtil {

  constructor() { }

  static isNil(val) {
    return val === null || val === undefined || val === '' || val == 0;
  }

  static deepClone(object) {
    if (object === null || typeof object !== 'object') {
      return object;
    }

    if (Array.isArray(object)) {
      const cloned = new Array(object.length);
      for (let i = 0; i < object.length; i++) {
        cloned[i] = this.deepClone(object[i]);
      }
      return cloned;
    }

    const cloned = {};
    for (const key in object) {
      if (object.hasOwnProperty(key)) {
        cloned[key] = this.deepClone(object[key]);
      }
    }

    return cloned;
  }

  static randomStr(str) {
    return str[Math.floor(Math.random() * str.length)];
  };
  static randomAry(ary) {
    return ary[Math.floor(Math.random() * ary.length)];
  };

  static getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
  };

  static float(val) {
    return Math.round(val * 100) / 100;
  };

  static shuffle(array) {
    let m = array.length, t, i;
    // While there remain elements to shuffle…
    while (m) {
      // Pick a remaining element…
      i = Math.floor(Math.random() * m--);

      // And swap it with the current element.
      t = array[m];
      array[m] = array[i];
      array[i] = t;
    }
    return array;
  };

  static shuffleLen(array, len) {
    let m = len, t, i;
    // While there remain elements to shuffle…
    while (m) {
      // Pick a remaining element…
      i = Math.floor(Math.random() * m--);

      // And swap it with the current element.
      t = array[m];
      array[m] = array[i];
      array[i] = t;
    }
    return array;
  };

  static shuffleOne(array, index) {
    let t, i;
    i = Math.floor(Math.random() * array.length);
    // And swap it with the current element.
    t = array[index];
    array[index] = array[i];
    array[i] = t;
  };

  static swap(array, i, ii) {
    let tmp = array[i];
    array[i] = array[ii];
    array[ii] = tmp;
  };
}
module.exports = GameUtil;