import buildTrie from 'search-trie';
import ProxyPolyfill from './proxy-polyfill';
import {getCollectionHandlers, shouldInstrument} from "./shouldInstrument";

const hasProxy = typeof Proxy !== 'undefined';
const ProxyConstructor = hasProxy ? Proxy : ProxyPolyfill();

const spreadMarker = '!SPREAD';
const __proxyequal_scanEnd = '__proxyequal_scanEnd';
const spreadActivation = '__proxyequal_spreadActivation';
const sourceModification ='__proxyequal_sourceObjectMutations';

let areSpreadGuardsEnabled = true;
let areSourceMutationsEnabled = false;

export const spreadGuardsEnabled = (flag) => (areSpreadGuardsEnabled=flag);
export const sourceMutationsEnabled = (flag) => (areSourceMutationsEnabled=flag);

const ProxyToState = new WeakMap();
const ProxyToFinderPrint = new WeakMap();

const isProxyfied = object => object && typeof object === 'object' ? ProxyToState.has(object) : false;

const deproxify = (object) => object && typeof object === 'object' ? ProxyToState.get(object) : object || object;

const deepDeproxify = (object) => {
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
  // unfreeze
  if (Array.isArray(state)) {
    return state.slice(0);
  }
  if (state.constructor.name === 'Object') {
    const clone = Object.assign({}, state);
    Object.setPrototypeOf(clone, Object.getPrototypeOf(state));
    return clone;
  }
  return state;
};

const shouldProxy = type => type === 'object';


function proxyfy(state, report, suffix = '', fingerPrint, ProxyMap) {
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
    const next = ()  => {
      const nextItem = iterator.next();
      const subKey = key + '.' + index
      index++;
      return {
        ...nextItem,
        get value() {
          if(nextItem.done && !nextItem.value){
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
    const thisId = suffix + '.' + key;
    const type = typeof value;

    report(thisId);

    if (shouldProxy(type)) {
      return proxyfy(value, report, thisId, fingerPrint, ProxyMap)
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
      const thisId = suffix + '.' + prop;
      if(areSourceMutationsEnabled){
        state[prop] = value;
        report(thisId);
        return true
      } else {
        console.error(
          'Source object mutations are disabled, but you tried to change',
          thisId,
          'on',
          state
        );
        return false;
      }
    },

    get(target, prop) {
      if (prop === __proxyequal_scanEnd) {
        report(spreadMarker, suffix);
        return false;
      }

      const storedValue = state[prop];
      if (typeof prop === 'string') {
        return proxyValue(prop, storedValue);
      }

      return storedValue;
    }
  };

  if (shouldHookOwnKeys) {
    hooks['ownKeys'] = function () {
      report(spreadActivation, theBaseObject);
      return [].concat(
        Object.getOwnPropertyNames(state),
        Object.getOwnPropertySymbols(state),
        __proxyequal_scanEnd
      );
    }
  }

  const proxy = new ProxyConstructor(theBaseObject, hooks);
  storedValue[suffix] = proxy;
  ProxyMap.set(state, storedValue);
  ProxyToState.set(proxy, state);
  ProxyToFinderPrint.set(proxy, {
    suffix,
    fingerPrint
  });
  return proxy;
}

const collectValuables = lines => {
  const trie = buildTrie(lines);
  return lines.filter(value => !trie(value + '.'))
};

const collectShallows = lines => {
  const trie = buildTrie(lines);
  return lines.filter(value => trie(value + '.') || !value.lastIndexOf('.'))
};

const get = (target, path) => {
  let result = target;
  for (let i = 1; i < path.length && result; ++i) {
    result = result[path[i]]
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
  for (let i = 0; i < locations.length; ++i) {
    const key = locations[i];
    const path = key.split('.');
    const la = deepDeproxify(get(a, path));
    const lb = deepDeproxify(get(b, path));
    if (la !== lb) {
      differs.push([key, 'differs', la, lb]);
      return false;
    }
  }
  return true;
};

const proxyShallowEqual = (a, b, locations) => {
  const checkedPaths = new Map();
  const results = new Map();

  for (let i = 0; i < locations.length; ++i) {
    const key = locations[i];
    const prevKey = key.substr(0, key.lastIndexOf('.'));
    if (checkedPaths.has(prevKey)) {
      checkedPaths.set(key, true);
      continue;
    }

    const path = key.split('.');
    const la = deepDeproxify(get(a, path));
    const lb = deepDeproxify(get(b, path));
    const equal = la === lb;

    results.delete(prevKey);
    results.set(key, equal);
    if (equal) {
      checkedPaths.set(key, true);
    }
  }

  const tails = results.entries();
  let pair;
  while ((pair = tails.next().value)) {
    if (!pair[1]) {
      differs.push([pair[0], 'not equal']);
      return false;
    }
  }

  return true;
};

const proxyEqual = (a, b, affected) => proxyCompare(a, b, collectValuables(affected));
const proxyShallow = (a, b, affected) => proxyCompare(a, b, collectShallows(affected));

const proxyState = (state, fingerPrint = '', _ProxyMap) => {
  let affected = [];
  let set = new Set();
  let ProxyMap = _ProxyMap || new WeakMap();
  let spreadDetected = false;
  let speadActiveOn = [];
  let sealed = false;

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

  const onKeyUse = (key, location) => {
    if (sealed) {
      return;
    }
    if (key === spreadActivation) {
      addSpreadTest(location);
      speadActiveOn.push(location);
    }
    else if (key === spreadMarker) {
      spreadDetected = spreadDetected || location;
    } else {
      if (!set.has(key)) {
        set.add(key);
        affected.push(key)
      }
    }
  };
  const createState = state => proxyfy(state, onKeyUse, '', fingerPrint, ProxyMap);

  return {
    state: createState(state),
    affected: affected,
    get spreadDetected() {
      return spreadDetected;
    },

    replaceState(state) {
      this.state = createState(state);
      spreadDetected = false;
      this.unseal();
      return this;
    },

    seal() {
      sealed = true;
      removeSpreadTest();
    },

    unseal() {
      sealed = false;
    },

    reset() {
      affected.length = 0;
      spreadDetected = false;
      set.clear();
    }
  }
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
  collectValuables
};