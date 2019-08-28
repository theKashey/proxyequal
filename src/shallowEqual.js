import {proxyCompare} from "./proxyEqual";
import {resetDiffers} from "./differs";
import {weakMemoizeArray} from "./weakMemoize";
import buildTrie from "search-trie";

export const collectShallows = lines => {
  const trie = buildTrie(lines);
  return lines.filter(value => trie(value + '.') || !value.lastIndexOf('.'))
};


const memoizedCollectShallows = weakMemoizeArray(collectShallows);

export const proxyShallow = (a, b, affected) => {
  resetDiffers();
  return proxyCompare(a, b, memoizedCollectShallows(affected));
};
