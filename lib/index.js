'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.collectValuables = exports.collectShallows = exports.proxyCompare = exports.proxyState = exports.proxyShallow = exports.proxyEqual = exports.drainDifference = undefined;

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _searchTrie = require('search-trie');

var _searchTrie2 = _interopRequireDefault(_searchTrie);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function proxyfy(state, report) {
  var suffix = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : '';

  return new Proxy(state, {
    get: function get(target, prop) {
      var value = Reflect.get(target, prop);
      if (typeof prop === 'string') {
        var thisId = suffix + '.' + prop;
        var type = typeof value === 'undefined' ? 'undefined' : _typeof(value);

        report(thisId);

        if (type === 'object' || type === 'array') {
          return proxyfy(value, report, thisId);
        }

        return value;
      }
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
  var affected = [];
  var set = new Set();
  var newState = proxyfy(state, function (key) {
    if (!set.has(key)) {
      set.add(key);
      affected.push(key);
    }
  });

  return {
    state: newState,
    affected: affected,
    reset: function reset() {
      affected.length = 0;
      set.clear();
    }
  };
};

exports.proxyEqual = proxyEqual;
exports.proxyShallow = proxyShallow;
exports.proxyState = proxyState;
exports.proxyCompare = proxyCompare;
exports.collectShallows = collectShallows;
exports.collectValuables = collectValuables;