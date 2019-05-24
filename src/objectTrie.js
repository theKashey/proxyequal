import {weakMemoizeArray} from "./weakMemoize";

export const EDGE = 'EDGE';

const buildObjTrie = (lines) => {
  const root = {};
  for (let i = 0; i < lines.length; ++i) {
    const path = lines[i].split('.');
    let node = root;
    const lastIndex = path.length - 1;
    for (let j = 1; j < lastIndex; ++j) {
      const item = path[j];
      if (!node[item] || node[item] === EDGE) {
        node[item] = {};
      }
      node = node[item];
    }
    node[path[lastIndex]] = EDGE;
  }
  return root; // FIXME
};

export const memoizedBuildTrie = weakMemoizeArray(buildObjTrie);