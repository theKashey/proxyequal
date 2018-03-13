import buildTrie from 'search-trie';
import ProxyPolyfill from 'proxy-polyfill/src/proxy';

const hasProxy = typeof Proxy !== 'undefined';
const hasSymbol = typeof Symbol !== 'undefined';
const ProxyConstructor = hasProxy ? Proxy : ProxyPolyfill();
//const ProxyConstructor = ProxyPolyfill(); // TESTS ONLY!

const spreadMarker = '!SPREAD';
const __proxyequal_scanEnd = '__proxyequal_scanEnd';

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
  const unfreezed = Object.assign({}, state);
  return unfreezed;
}


function proxyfy(state, report, suffix = '', fingerPrint, ProxyMap) {
  if (!state) {
    return state;
  }
  const storedValue = ProxyMap.get(state) || {};
  if (storedValue[suffix]) {
    return storedValue[suffix];
  }

  const theBaseObject = (Array.isArray(state) || isProxyfied(state)) ? state : prepareObject(state);

  const proxy = new ProxyConstructor(theBaseObject, {
    get(target, prop) {
      if (prop === __proxyequal_scanEnd) {
        report(spreadMarker);
        if (process.env.NODE_ENV !== 'production') {
          console.warn('spread operation detected on', state);
        }
        return false;
      }

      const storedValue = state[prop];
      if (typeof prop === 'string') {
        const thisId = suffix + '.' + prop;
        const type = typeof storedValue;

        report(thisId);

        if (type === 'object') {
          return proxyfy(storedValue, report, thisId, fingerPrint, ProxyMap)
        }
      }
      return storedValue;
    },
    ownKeys() {
      Object.defineProperty(theBaseObject, __proxyequal_scanEnd, {
        value: 'this is secure guard',
        configurable: true,
        enumerable: true,
      });
      return [
        ...Object.getOwnPropertyNames(state), ...Object.getOwnPropertySymbols(state),
        __proxyequal_scanEnd
      ]
    }
  });
  storedValue[suffix] = proxy;
  ProxyMap.set(state, storedValue);
  ProxyToState.set(proxy, state);
  ProxyToFinderPrint.set(proxy, {
    suffix,
    fingerPrint
  })
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

  const onKeyUse = key => {
    if (key === spreadMarker) {
      spreadDetected = true;
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
      return this;
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