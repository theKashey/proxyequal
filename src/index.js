import buildTrie from 'search-trie';

const deproxySymbol = typeof Symbol !== 'undefined' ? Symbol('deproxy') : '__magic__deproxySymbol';

function proxyfy(state, report, suffix = '') {
  if (!state) {
    return state;
  }
  return new Proxy(Array.isArray(state) ? state : Object.assign({}, state), {
    get(target, prop) {
      if (prop === deproxySymbol) {
        return target;
      }
      const value = Reflect.get(target, prop);
      if (typeof prop === 'string') {
        const thisId = suffix + '.' + prop;
        const type = typeof value;

        report(thisId);

        if (type === 'object' || type === 'array') {
          return proxyfy(value, report, thisId)
        }
      }
      return value;
    }
  })
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
    const la = get(a, path);
    const lb = get(b, path);
    if (la !== lb) {
      differs.push([key, 'differs', la, lb]);
      return false;
    }
  }
  return true;
};

const proxyEqual = (a, b, affected) => proxyCompare(a, b, collectValuables(affected));
const proxyShallow = (a, b, affected) => proxyCompare(a, b, collectShallows(affected));

const proxyState = (state) => {
  let affected = [];
  let set = new Set();
  const newState = proxyfy(state, key => {
    if (!set.has(key)) {
      set.add(key);
      affected.push(key)
    }
  });

  return {
    state: newState,
    affected: affected,
    reset: () => {
      affected.length = 0;
      set.clear();
    }
  }
};

const isProxyfied = object =>
  object && typeof object === 'object' ? Boolean(object[deproxySymbol]) : false;

const deproxify = (object) => {
  if (object && typeof object === 'object') {
    return object[deproxySymbol] || object;
  }
  return object;
}

export {
  proxyEqual,
  proxyShallow,
  proxyState,
  proxyCompare,

  get,
  deproxify,
  isProxyfied,

  collectShallows,
  collectValuables
};