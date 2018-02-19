'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.collectValuables = exports.collectShallows = exports.getProxyKey = exports.isProxyfied = exports.deproxify = exports.get = exports.proxyCompare = exports.proxyState = exports.proxyShallow = exports.proxyEqual = exports.drainDifference = undefined;

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _searchTrie = require('search-trie');

var _searchTrie2 = _interopRequireDefault(_searchTrie);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var deproxySymbol = typeof Symbol !== 'undefined' ? Symbol('deproxy') : '__magic__deproxySymbol';
var proxyKeySymbol = typeof Symbol !== 'undefined' ? Symbol('proxyKey') : '__magic__proxyKeySymbol';

function proxyfy(state, report) {
  var suffix = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : '';
  var fingerPrint = arguments[3];

  if (!state) {
    return state;
  }
  return new Proxy(Array.isArray(state) ? state : Object.assign({}, state), {
    get: function get(target, prop) {
      if (prop === deproxySymbol) {
        return target;
      }
      if (prop === proxyKeySymbol) {
        return {
          suffix: suffix,
          fingerPrint: fingerPrint
        };
      }
      var value = Reflect.get(target, prop);
      if (typeof prop === 'string') {
        var thisId = suffix + '.' + prop;
        var type = typeof value === 'undefined' ? 'undefined' : _typeof(value);

        report(thisId);

        if (type === 'object' || type === 'array') {
          return proxyfy(value, report, thisId, fingerPrint);
        }
      }
      return value;
    }
  });
}

var collectValuables = function collectValuables(lines) {
  var trie = (0, _searchTrie2.default)(lines);
  return lines.filter(function (value) {
    return !trie(value + '.');
  });
};

var collectShallows = function collectShallows(lines) {
  var trie = (0, _searchTrie2.default)(lines);
  return lines.filter(function (value) {
    return trie(value + '.') || !value.lastIndexOf('.');
  });
};

var get = function get(target, path) {
  var result = target;
  for (var i = 1; i < path.length && result; ++i) {
    result = result[path[i]];
  }
  return result;
};

var differs = [];

var drainDifference = exports.drainDifference = function drainDifference() {
  var d = differs;
  differs = [];
  return d;
};

var proxyCompare = function proxyCompare(a, b, locations) {
  var _iteratorNormalCompletion = true;
  var _didIteratorError = false;
  var _iteratorError = undefined;

  try {
    for (var _iterator = locations[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
      var key = _step.value;

      var path = key.split('.');
      var la = get(a, path);
      var lb = get(b, path);
      if (la !== lb) {
        differs.push([key, 'differs', la, lb]);
        return false;
      }
    }
  } catch (err) {
    _didIteratorError = true;
    _iteratorError = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion && _iterator.return) {
        _iterator.return();
      }
    } finally {
      if (_didIteratorError) {
        throw _iteratorError;
      }
    }
  }

  return true;
};

var proxyEqual = function proxyEqual(a, b, affected) {
  return proxyCompare(a, b, collectValuables(affected));
};
var proxyShallow = function proxyShallow(a, b, affected) {
  return proxyCompare(a, b, collectShallows(affected));
};

var proxyState = function proxyState(state) {
  var fingerPrint = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';

  var affected = [];
  var set = new Set();
  var newState = proxyfy(state, function (key) {
    if (!set.has(key)) {
      set.add(key);
      affected.push(key);
    }
  }, '', fingerPrint);

  return {
    state: newState,
    affected: affected,
    reset: function reset() {
      affected.length = 0;
      set.clear();
    }
  };
};

var isProxyfied = function isProxyfied(object) {
  return object && (typeof object === 'undefined' ? 'undefined' : _typeof(object)) === 'object' ? Boolean(object[deproxySymbol]) : false;
};

var deproxify = function deproxify(object) {
  if (object && (typeof object === 'undefined' ? 'undefined' : _typeof(object)) === 'object') {
    return object[deproxySymbol] || object;
  }
  return object;
};

var getProxyKey = function getProxyKey(object) {
  return object && (typeof object === 'undefined' ? 'undefined' : _typeof(object)) === 'object' ? object[proxyKeySymbol] : {};
};

exports.proxyEqual = proxyEqual;
exports.proxyShallow = proxyShallow;
exports.proxyState = proxyState;
exports.proxyCompare = proxyCompare;
exports.get = get;
exports.deproxify = deproxify;
exports.isProxyfied = isProxyfied;
exports.getProxyKey = getProxyKey;
exports.collectShallows = collectShallows;
exports.collectValuables = collectValuables;