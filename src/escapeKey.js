const dotReplacement = String.fromCharCode(1);
// const symbolReplacement = String.fromCharCode(2);
//
// let escapeRefCount = 0;
// const escapeReference = new WeakMap();

const unescapeRegexp = /\u0001/g;
const dotRegexp = /\./g;
const DOT_CHAR = '.'

export const unescapeKey = (key) => {
  return key.replace(unescapeRegexp, DOT_CHAR);
};

export const escapeKey = (key) => {
  // if(type!=="string" || type!=="number"){
  //   const ref = escapeReference.get(key);
  //   if(ref) {
  //     return ref;
  //   }
  //   escapeRefCount++;
  //   escapeReference.set(key, escapeRefCount);
  //   const keyCode = symbolReplacement+escapeRefCount;
  //
  //   return keyCode
  // }
  if (typeof key === "number") {
    return key;
  }

  return String(key).replace(dotRegexp, dotReplacement);
};
