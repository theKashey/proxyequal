const dotReplacement = String.fromCharCode(1);
// const symbolReplacement = String.fromCharCode(2);
//
// let escapeRefCount = 0;
// const escapeReference = new WeakMap();

export const unescapeKey = (key) => {
  return key.replace(/\u0001/g, '.');
};

export const escapeKey = (key) => {
  const type = typeof key;
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
  if (type === "number") {
    return key;
  }

  return String(key).replace(/\./g, dotReplacement);
};