// copy-paste from https://github.com/nx-js/observer-util/blob/master/src/builtIns/index.js

// built-in object can not be wrapped by Proxies, or, to be clear - unfreezed
// their methods expect the object instance as the 'this' instead of the Proxy wrapper
// complex objects are wrapped with a Proxy of instrumented methods
// which switch the proxy to the raw object and to add reactive wiring
const collectionHandlers = {
  get: true,
  has: true,
  forEach: true,
  keys: true,
  values: true,
  entries: true,
  size: true,
  [Symbol.iterator]: true
};

const handlers = new Map([
  [Map, collectionHandlers],
  [Set, collectionHandlers],
  [WeakMap, collectionHandlers],
  [WeakSet, collectionHandlers],
  [Object, false],
  [Array, false],
  [Int8Array, false],
  [Uint8Array, false],
  [Uint8ClampedArray, false],
  [Int16Array, false],
  [Uint16Array, false],
  [Int32Array, false],
  [Uint32Array, false],
  [Float32Array, false],
  [Float64Array, false]
]);


// eslint-disable-next-line
const globalObj = typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : typeof window !== 'undefined' ? window : {};

export function shouldInstrument({constructor}) {
  const isBuiltIn = (
    typeof constructor === 'function' &&
    constructor.name in globalObj &&
    globalObj[constructor.name] === constructor
  );
  return !isBuiltIn || handlers.has(constructor);
}

export const getCollectionHandlers = ({constructor}) => (
  handlers.get(constructor)
)