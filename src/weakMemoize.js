export const weakMemoizeArray = fn => {
  return arg => fn(arg); // for benchmark

  let cache = new WeakMap();
  return arg => {
    if (cache.has(arg)) {
      const old = cache.get(arg);
      if (old.length === arg.length) {
        return old.value;
      }
    }
    const ret = fn(arg);
    cache.set(arg, {
      value: ret,
      length: arg.length
    });
    return ret
  }
}
