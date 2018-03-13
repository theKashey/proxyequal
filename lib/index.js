'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.collectValuables = exports.collectShallows = exports.getProxyKey = exports.isProxyfied = exports.deproxify = exports.get = exports.proxyCompare = exports.proxyState = exports.proxyShallowEqual = exports.proxyShallow = exports.proxyEqual = exports.drainDifference = undefined;

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _searchTrie = require('search-trie');

var _searchTrie2 = _interopRequireDefault(_searchTrie);

var _proxy = require('proxy-polyfill/src/proxy');

var _proxy2 = _interopRequireDefault(_proxy);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

var hasProxy = typeof Proxy !== 'undefined';
var hasSymbol = typeof Symbol !== 'undefined';
var ProxyConstructor = hasProxy ? Proxy : (0, _proxy2.default)();
//const ProxyConstructor = ProxyPolyfill(); // TESTS ONLY!

var __proxyequal_scanStart = '__proxyequal_scanStart';
var __proxyequal_scanEnd = '__proxyequal_scanEnd';

var ProxyToState = new WeakMap();
var ProxyToFinderPrint = new WeakMap();

var isProxyfied = function isProxyfied(object) {
  return object && (typeof object === 'undefined' ? 'undefined' : _typeof(object)) === 'object' ? ProxyToState.has(object) : false;
};

var deproxify = function deproxify(object) {
  return object && (typeof object === 'undefined' ? 'undefined' : _typeof(object)) === 'object' ? ProxyToState.get(object) : object || object;
};

var deepDeproxify = function deepDeproxify(object) {
  if (object && (typeof object === 'undefined' ? 'undefined' : _typeof(object)) === 'object') {
    var current = object;
    while (ProxyToState.has(current)) {
      current = ProxyToState.get(current);
    }
    return current;
  }
  return object;
};

var getProxyKey = function getProxyKey(object) {
  return object && (typeof object === 'undefined' ? 'undefined' : _typeof(object)) === 'object' ? ProxyToFinderPrint.get(object) : {};
};

var prepareObject = function prepareObject(state) {
  return hasProxy ? Object.assign({}, state) : Object.assign({ __proxyequal_scanStart: __proxyequal_scanStart }, state, { __proxyequal_scanEnd: __proxyequal_scanEnd });
};

function proxyfy(state, report) {
  var suffix = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : '';
  var fingerPrint = arguments[3];
  var ProxyMap = arguments[4];

  if (!state) {
    return state;
  }
  var storedValue = ProxyMap.get(state) || {};
  if (storedValue[suffix]) {
    return storedValue[suffix];
  }

  var disableTracking = false;

  var proxy = new ProxyConstructor(Array.isArray(state) || isProxyfied(state) ? state : prepareObject(state), {
    get: function get(target, prop) {
      if (prop === __proxyequal_scanStart) {
        disableTracking = true;
        return;
      }
      if (prop === __proxyequal_scanStart) {
        disableTracking = false;
        return;
      }

      var value = state[prop];
      if (typeof prop === 'string') {
        var thisId = suffix + '.' + prop;
        var type = typeof value === 'undefined' ? 'undefined' : _typeof(value);

        !disableTracking && report(thisId);

        if (type === 'object') {
          return proxyfy(value, report, thisId, fingerPrint, ProxyMap);
        }
      }
      return value;
    },
    ownKeys: function ownKeys() {
      return [__proxyequal_scanStart].concat(_toConsumableArray(Object.getOwnPropertyNames(state)), _toConsumableArray(Object.getOwnPropertySymbols(state)), [__proxyequal_scanEnd]);
    }
  });
  storedValue[suffix] = proxy;
  ProxyMap.set(state, storedValue);
  ProxyToState.set(proxy, state);
  ProxyToFinderPrint.set(proxy, {
    suffix: suffix,
    fingerPrint: fingerPrint
  });
  return proxy;
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
  for (var i = 0; i < locations.length; ++i) {
    var key = locations[i];
    var path = key.split('.');
    var la = deepDeproxify(get(a, path));
    var lb = deepDeproxify(get(b, path));
    if (la !== lb) {
      differs.push([key, 'differs', la, lb]);
      return false;
    }
  }
  return true;
};

var proxyShallowEqual = function proxyShallowEqual(a, b, locations) {
  var checkedPaths = new Map();
  var results = new Map();

  for (var i = 0; i < locations.length; ++i) {
    var key = locations[i];
    var prevKey = key.substr(0, key.lastIndexOf('.'));
    if (checkedPaths.has(prevKey)) {
      checkedPaths.set(key, true);
      continue;
    }

    var path = key.split('.');
    var la = deepDeproxify(get(a, path));
    var lb = deepDeproxify(get(b, path));
    var equal = la === lb;

    results.delete(prevKey);
    results.set(key, equal);
    if (equal) {
      checkedPaths.set(key, true);
    }
  }

  var tails = results.entries();
  var pair = void 0;
  while (pair = tails.next().value) {
    if (!pair[1]) {
      differs.push([pair[0], 'not equal']);
      return false;
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
  var _ProxyMap = arguments[2];

  var affected = [];
  var set = new Set();
  var ProxyMap = _ProxyMap || new WeakMap();

  var onKeyUse = function onKeyUse(key) {
    if (!set.has(key)) {
      set.add(key);
      affected.push(key);
    }
  };
  var createState = function createState(state) {
    return proxyfy(state, onKeyUse, '', fingerPrint, ProxyMap);
  };

  return {
    state: createState(state),
    affected: affected,

    replaceState: function replaceState(state) {
      this.state = createState(state);
      return this;
    },
    reset: function reset() {
      affected.length = 0;
      set.clear();
    }
  };
};

exports.proxyEqual = proxyEqual;
exports.proxyShallow = proxyShallow;
exports.proxyShallowEqual = proxyShallowEqual;
exports.proxyState = proxyState;
exports.proxyCompare = proxyCompare;
exports.get = get;
exports.deproxify = deproxify;
exports.isProxyfied = isProxyfied;
exports.getProxyKey = getProxyKey;
exports.collectShallows = collectShallows;
exports.collectValuables = collectValuables;