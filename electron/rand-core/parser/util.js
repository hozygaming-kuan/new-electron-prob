var util = {};
module.exports = util;

// 0:A, 25:Z, 26:AA, 27:AB ...
util.idx2AZ = function (i) {
  return (i >= 26 ? util.idx2AZ((i / 26 >> 0) - 1) : '') + 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[i % 26 >> 0];
};

// A:0, B:1 Z:25 AA:26
util.az2Idx = function (val) {
  var base = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', i, j, result = 0;
  for (i = 0, j = val.length - 1; i < val.length; i += 1, j -= 1) {
    result += Math.pow(base.length, j) * (base.indexOf(val[i]) + 1);
  }
  result -= 1;
  return result;
};

// symbol id convert to code
util.s2id = function (s) {
  return 'ABCDEFGHIJWSXYZ'.indexOf(s);
};

// get char * len
util.getStrs = function (str, count) {
  var strs = '';
  for (var i = 0; i < count; i++) {
    strs += str;
  }
  return strs;
};

util.appendAry = function (ary, obj, count) {
  for (var i = 0; i < count; i++)
    ary.push(obj);
  return ary;
};

// minimize sticks
util.resizeSticks = function (sticks) {
  if (sticks == '')
    return sticks;

  var counts = [];
  var count_idx_map = {};
  for (var i in sticks) {
    var stick = sticks[i].toString();
    if (count_idx_map[stick] == null) {
      counts.push(0);
      count_idx_map[stick] = counts.length - 1;
    }
    counts[count_idx_map[stick]]++;
  }

  sticks = '';

  var gcd = util.getGCD.apply(null, counts);
  for (var i in count_idx_map) {
    var stick = i;
    var count = counts[count_idx_map[i]] / gcd;
    sticks += util.getStrs(stick, count);
  }
  return sticks;
};

util.resizeSticksAry = function (sticks) {
  if (sticks.length == 0)
    return sticks;


  var counts = [];
  var names = [];
  for (var i in sticks) {
    var stick = sticks[i];
    var idx = names.indexOf(stick);
    if (idx == -1) {
      idx = counts.length;
      counts[idx] = 0;
      names[idx] = stick;
    }
    counts[idx]++;
  }

  sticks.splice(0, sticks.length);

  var gcd = util.getGCD.apply(null, counts);
  for (var i in names) {
    var name = names[i];
    var count = counts[i] / gcd;
    sticks = util.appendAry(sticks, name, count);
  }
  return sticks;
};

if ('function' !== typeof Array.prototype.reduce) {
  Array.prototype.reduce = function (callback, opt_initialValue) {
    'use strict';
    if (null === this || 'undefined' === typeof this) {
      // At the moment all modern browsers, that support strict mode, have
      // native implementation of Array.prototype.reduce. For instance, IE8
      // does not support strict mode, so this check is actually useless.
      throw new TypeError(
        'Array.prototype.reduce called on null or undefined');
    }
    if ('function' !== typeof callback) {
      throw new TypeError(callback + ' is not a function');
    }
    var index, value,
      length = this.length >>> 0,
      isValueSet = false;
    if (1 < arguments.length) {
      value = opt_initialValue;
      isValueSet = true;
    }
    for (index = 0; length > index; ++index) {
      if (this.hasOwnProperty(index)) {
        if (isValueSet) {
          value = callback(value, this[index], index, this);
        }
        else {
          value = this[index];
          isValueSet = true;
        }
      }
    }
    if (!isValueSet) {
      throw new TypeError('Reduce of empty array with no initial value');
    }
    return value;
  };
};

var gcd = function (a, b) {
  if (b === 0) return a;
  return gcd(b, a % b);
};

// 取最大公因數
util.getGCD = function () {
  var args = Array.prototype.slice.call(arguments);
  return args.reduce(gcd);
};

// 排列組合
util.combination = function (arr, num) {
  var r = [];
  (function f(t, a, n) {
    if (n == 0) return r.push(t);
    for (var i = 0, l = a.length; i <= l - n; i++) {
      f(t.concat(a[i]), a.slice(i + 1), n - 1);
    }
  })([], arr, num);
  return r;
};

util.clone = function (obj) {
  return JSON.parse(JSON.stringify(obj));
};

util.aryEqual = function (a, b) {
  if (Array.isArray(a) == false || Array.isArray(b) == false)
    return false;
  if (a.length != b.length)
    return false;
  var len = a.length;
  for (var i = 0; i < len; i++) {
    if (a[i] != b[i])
      return false;
  }
  return true;
};
