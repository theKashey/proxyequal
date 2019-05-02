import buildTrie from 'search-trie';
import {str as crc32_str} from "crc-32";

import ProxyPolyfill from './proxy-polyfill';
import {getCollectionHandlers, shouldInstrument} from "./shouldInstrument";
import {weakMemoizeArray} from "./weakMemoize";
import {EDGE, memoizedBuildTrie} from "./objectTrie";

const hasProxy = typeof Proxy !== 'undefined';
const ProxyConstructor = hasProxy ? Proxy : ProxyPolyfill();

const spreadMarker = '!SPREAD';
const __proxyequal_scanEnd = '__proxyequal_scanEnd';
const spreadActivation = '__proxyequal_spreadActivation';
const objectKeysMarker = '!Keys';

let areSpreadGuardsEnabled = false;
let areSourceMutationsEnabled = false;

let DISABLE_ALL_PROXIES = false;

export const spreadGuardsEnabled = (flag) => (areSpreadGuardsEnabled = flag);
export const sourceMutationsEnabled = (flag) => (areSourceMutationsEnabled = flag);

const ProxyToState = new WeakMap();
const ProxyToFinderPrint = new WeakMap();

const isProxyfied = object => object && typeof object === 'object' ? ProxyToState.has(object) : false;

const deproxify = (object) => object && typeof object === 'object' ? ProxyToState.get(object) : object || object;

export const deepDeproxify = (object) => {
  if (object && typeof object === 'object') {
    let current = object;
    while (ProxyToState.has(current)) {
      current = ProxyToState.get(current)
    }
    return current;
  }
  return object;
};

const getProxyKey = object => object && typeof object === 'object' ? ProxyToFinderPrint.get(object) : {};

const prepareObject = state => {
  if (Object.isFrozen(state)) {
    // unfreeze
    if (Array.isArray(state)) {
      return state.slice(0);
    }
    if (state.constructor.name === 'Object') {
      const clone = Object.assign({}, state);
      Object.setPrototypeOf(clone, Object.getPrototypeOf(state));
      return clone;
    }
  }
  return state;
};

export const PROXY_REST = Symbol('PROXY_REST');
const shouldProxy = type => type === 'object';

function proxyfy(state, report, suffix = '', fingerPrint, ProxyMap, control) {
  if (!state) {
    return state;
  }
  const alreadyProxy = isProxyfied(state);

  if (!alreadyProxy && !shouldInstrument(state)) {
    return state;
  }

  const hasCollectionHandlers = !alreadyProxy && getCollectionHandlers(state);

  const storedValue = ProxyMap.get(state) || {};
  if (storedValue[suffix]) {
    return storedValue[suffix];
  }

  const theBaseObject = alreadyProxy ? state : prepareObject(state);
  const shouldHookOwnKeys = areSpreadGuardsEnabled && !isProxyfied(state);

  const iterable = (key, iterator) => {
    let index = 0;
    const next = () => {
      const nextItem = iterator.next();
      const subKey = key + '.' + index;
      index++;
      return {
        ...nextItem,
        get value() {
          if (nextItem.done && !nextItem.value) {
            return;
          }
          return proxyValue(subKey, nextItem.value)
        }
      };
    };
    return {
      [Symbol.iterator]: () => ({
        next
      }),
      next
    }
  };

  const proxyValue = (key, value) => {
    const thisId = report(suffix, key);
    const type = typeof value;


    if (shouldProxy(type)) {
      return proxyfy(value, control.report, thisId, fingerPrint, ProxyMap, control);
    }

    if (hasCollectionHandlers) {
      switch (key) {
        case 'get':
          return key => proxyValue(key, state.get(key));
        case 'has':
          return key => proxyValue(key, state.has(key));
        case 'keys':
          return () => state.keys();
        case 'values':
          return () => iterable(key, state.values());
        case 'entries':
          return () => iterable(key, state.entries());
        case [Symbol.iterator]:
          return iterable(key, state[Symbol.iterator]);
      }
    }

    return value;
  };

  const hooks = {
    set(target, prop, value) {
      const thisId = report(suffix, prop);
      if (areSourceMutationsEnabled) {
        state[prop] = value;
        return true
      } else {
        /* eslint-disable-next-line */
        console.error(
          'Source object mutations are disabled, but you tried to set',
          value,
          'on key',
          thisId,
          'on',
          state
        );
        return false;
      }
    },

    get(target, prop) {
      if (prop === __proxyequal_scanEnd) {
        report(suffix, spreadMarker, suffix);
        return false;
      }

      const storedValue = state[prop];
      if (DISABLE_ALL_PROXIES) {
        return storedValue;
      }
      if (typeof prop === 'string') {
        return proxyValue(prop, storedValue);
      }

      return storedValue;
    },
  };

  hooks['ownKeys'] = function () {
    const keys = [].concat(
      Object.getOwnPropertyNames(state),
      Object.getOwnPropertySymbols(state),
    );
    if (!DISABLE_ALL_PROXIES) {
      report(suffix, objectKeysMarker, theBaseObject);
      if (shouldHookOwnKeys) {
        report(suffix, spreadActivation, theBaseObject);
        keys.push(__proxyequal_scanEnd);
      }
    }
    return keys;
  };

  const proxy = new ProxyConstructor(theBaseObject, hooks);
  storedValue[suffix] = proxy;
  ProxyMap.set(state, storedValue);
  ProxyToState.set(proxy, state);

  ProxyToFinderPrint.set(proxy, {
    suffix,
    fingerPrint,
    report,
    ProxyMap,
    control
  });
  return proxy;
}

const withProxiesDisabled = (fn) => {
  if (DISABLE_ALL_PROXIES) {
    return fn();
  }
  DISABLE_ALL_PROXIES = true;
  try {
    return fn();
  } finally {
    DISABLE_ALL_PROXIES = false;
  }
}

const collectValuables = lines => {
  const values = [];
  for (let i = 0; i < lines.length; ++i) {
    let line = lines[i];
    let index = line.lastIndexOf('.');
    if (index < 0 && values.indexOf(line) < 0) { // no "." and new value
      values.push(line);
      continue;
    }
    while (index >= 0) {
      line = line.slice(0, index);
      if (values.indexOf(line) < 0) {
        values.push(line);
        index = line.lastIndexOf('.');
      } else {
        break; // done that
      }
    }
  }
  return lines.filter(line => values.indexOf(line) < 0);
};

const collectShallows = lines => {
  const trie = buildTrie(lines);
  return lines.filter(value => trie(value + '.') || !value.lastIndexOf('.'))
};

const memoizedCollectValuables = weakMemoizeArray(collectValuables);
const memoizedCollectShallows = weakMemoizeArray(collectShallows);

const get = (target, path) => {
  let result = target;
  for (let i = 1; i < path.length && result; ++i) {
    const key = path[i];
    if (key[0] === '!') {
      if (key === objectKeysMarker) {
        return Object.keys(result).map(crc32_str).reduce((acc, x) => acc ^ x, 0);
      }
    }
    result = result[key]
  }
  return result;
};

let differs = [];

export const drainDifference = () => {
  const d = differs;
  differs = [];
  return d;
};

const proxyCompare = (a, b, locations) => {
  DISABLE_ALL_PROXIES = true;
  const ret = (() => {
    for (let i = 0; i < locations.length; ++i) {
      const key = locations[i];
      const path = key.split('.');
      const la = get(a, path);
      const lb = get(b, path);
      if (la === lb || deepDeproxify(la) === deepDeproxify(lb)) {
        // nope
      } else {
        differs.push([key, 'differs', la, lb]);
        return false;
      }
    }
    return true;
  })();
  DISABLE_ALL_PROXIES = false;
  return ret;
};

const getterHelper = ['',''];

let differ = [];
const walk = (la, lb, node) => {
  if (la === lb || deepDeproxify(la) === deepDeproxify(lb)) {
    return true;
  }
  if (node === EDGE) {
    return false;
  }
  const items = Object.keys(node);
  for (let i = 0; i < items.length; ++i) {
    const item = items[i];
    getterHelper[1]=item;
    if (!walk(
      get(la, getterHelper),
      get(lb, getterHelper),
      node[item],
    )) {
      differ.unshift(item);
      return false;
    }
  }
  return true;
};
const proxyShallowEqual = (a, b, locations) => {
  DISABLE_ALL_PROXIES = true;
  differ = [];
  differs = [];
  const ret = (() => {
    const root = memoizedBuildTrie(locations);
    return walk(a, b, root);
  })();
  DISABLE_ALL_PROXIES = false;
  if(!ret) {
    differ.unshift('');
    differs.push([differ.join('.'), 'not equal']);
  }
  return ret;
};


const proxyEqual = (a, b, affected) => {
  differs = [];
  return proxyCompare(a, b, memoizedCollectValuables(affected));
};
const proxyShallow = (a, b, affected) => {
  differs = [];
  return proxyCompare(a, b, memoizedCollectShallows(affected));
};

const proxyState = (state, fingerPrint = '', _ProxyMap) => {
  let lastAffected = null;
  let affected = [];
  let affectedEqualToLast = true;

  let set = new Set();
  let ProxyMap = _ProxyMap || new WeakMap();
  let spreadDetected = false;
  let speadActiveOn = [];
  let sealed = 0;

  const addSpreadTest = (location) => {
    Object.defineProperty(location, __proxyequal_scanEnd, {
      value: 'this is secure guard',
      configurable: true,
      enumerable: true,
    });
  };
  const removeSpreadTest = () => {
    speadActiveOn.forEach(target =>
      Object.defineProperty(target, __proxyequal_scanEnd, {
        value: 'here was spread guard',
        configurable: true,
        enumerable: false,
      })
    );
    speadActiveOn = [];
  };

  const onKeyUse = (suffix, keyName, location) => {
    const key = suffix + '.' + keyName;
    if (!sealed) {
      if (keyName === spreadActivation) {
        addSpreadTest(location);
        speadActiveOn.push(location);
      } else if (keyName === spreadMarker) {
        spreadDetected = spreadDetected || location;
      } else {
        if (!set.has(key)) {
          set.add(key);
          affected.push(key);
          if (lastAffected) {
            const position = affected.length - 1;
            if (lastAffected[position] !== affected[position]) {
              affectedEqualToLast = false;
            }
          }
        }
      }
    }
    return key;
  };

  const shouldUseLastAffected = () => (
    lastAffected && affectedEqualToLast && lastAffected.length === affected.length
  );

  const control = {
    get affected() {
      return shouldUseLastAffected() ? lastAffected : affected;
    },
    get spreadDetected() {
      return spreadDetected;
    },

    replaceState(state) {
      this.state = createState(state);
      spreadDetected = false;
      this.unseal();
      sealed = 0;
      return this;
    },

    seal() {
      sealed++;
      removeSpreadTest();
    },

    unseal() {
      sealed--;
    },

    reset() {
      if (!shouldUseLastAffected()) {
        lastAffected = affected;
      }
      affectedEqualToLast = true;
      affected = [];
      spreadDetected = false;
      sealed = 0;
      set.clear();
    },

    report: onKeyUse,
  };

  const createState = state => proxyfy(state, onKeyUse, '', fingerPrint, ProxyMap, control);
  control.state = createState(state);

  return control;
};

const proxyObjectRest = (state, excludingKeys) => {
  const {
    suffix,
    fingerPrint,
    report,
    ProxyMap,
    control
  } = getProxyKey(state);

  const results = [];
  const excludeMap = {};
  excludingKeys.forEach((k) => {
    results.push(state[k])
    excludeMap[k] = true;
  });

  control.seal();
  const rest = {};
  Object.keys(state).forEach((k) => {
    if (!excludeMap[k]) {
      rest[k] = state[k];
    }
  });
  control.unseal();

  return [
    ...results,
    proxyfy(rest, report, suffix, fingerPrint, ProxyMap, control),
  ]
};

const proxyArrayRest = (state, fromIndex) => {
  const {
    suffix,
    fingerPrint,
    report,
    ProxyMap,
    control
  } = getProxyKey(state);

  const results = [];
  const rest = [];
  let l = state.length;
  let i;
  for (i = 0; i < l && i < fromIndex; ++i) {
    results.push(state[i]);
  }

  control.seal();
  for (; i < l; ++i) {
    rest.push(state[i]);
  }
  control.unseal();

  const prefixedReport = (prefix, key) => {
    if (key === String(+key)) {
      report(prefix, +key + fromIndex)
    } else {
      report(prefix, key);
    }
  }

  return [
    ...results,
    proxyfy(rest, prefixedReport, suffix, fingerPrint, ProxyMap, control),
  ];
};

export {
  proxyEqual,
  proxyShallow,
  proxyShallowEqual,
  proxyState,
  proxyCompare,

  get,
  deproxify,
  isProxyfied,
  getProxyKey,

  collectShallows,
  collectValuables,

  proxyObjectRest,
  proxyArrayRest,

  withProxiesDisabled,
};
