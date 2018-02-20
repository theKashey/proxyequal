import buildTrie from 'search-trie';

const deproxySymbol = typeof Symbol !== 'undefined' ? Symbol('deproxy') : '__magic__deproxySymbol';
const proxyKeySymbol = typeof Symbol !== 'undefined' ? Symbol('proxyKey') : '__magic__proxyKeySymbol';

const isProxyfied = object =>
  object && typeof object === 'object' ? Boolean(object[deproxySymbol]) : false;

const deproxify = (object) => {
  if (object && typeof object === 'object') {
    return object[deproxySymbol] || object;
  }
  return object;
};

const getProxyKey = object => object && typeof object === 'object' ? object[proxyKeySymbol] : {};

function proxyfy(state, report, suffix = '', fingerPrint, ProxyMap) {
  if (!state) {
    return state;
  }
  const storedValue = ProxyMap.get(state) || {};
  if (storedValue[suffix]) {
    return storedValue[suffix];
  }

  const proxy = new Proxy(Array.isArray(state) ? state : Object.assign({}, state), {
    get(target, prop) {
      if (prop === deproxySymbol) {
        return deproxify(state);
      }
      if (prop === proxyKeySymbol) {
        return {
          suffix,
          fingerPrint
        };
      }
      const value = Reflect.get(target, prop);
      if (typeof prop === 'string') {
        const thisId = suffix + '.' + prop;
        const type = typeof value;

        report(thisId);

        if (type === 'object') {
          return proxyfy(value, report, thisId, fingerPrint, ProxyMap)
        }
      }
      return value;
    }
  });
  storedValue[suffix] = proxy;
  ProxyMap.set(state, storedValue);
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
  for (const key of locations) {
    const path = key.split('.');
    const la = deproxify(get(a, path));
    const lb = deproxify(get(b, path));
    if (la !== lb) {
      differs.push([key, 'differs', la, lb]);
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

  const onKeyUse = key => {
    if (!set.has(key)) {
      set.add(key);
      affected.push(key)
    }
  };
  const createState = state => proxyfy(state, onKeyUse, '', fingerPrint, ProxyMap);

  return {
    state: createState(state),
    affected: affected,

    replaceState(state) {
      this.state = createState(state);
      return this;
    },

    reset() {
      affected.length = 0;
      set.clear();
    }
  }
};

export {
  proxyEqual,
  proxyShallow,
  proxyState,
  proxyCompare,

  get,
  deproxify,
  isProxyfied,
  getProxyKey,

  collectShallows,
  collectValuables
};