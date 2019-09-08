import {
  proxyEqual,
  proxyShallowEqual,
  proxyState,
  proxyCompare,

  get,
  deproxify,
  isProxyfied,
  isKnownObject,
  getProxyKey,

  collectValuables,

  withProxiesDisabled,

  spreadGuardsEnabled,
  sourceMutationsEnabled,

} from './proxyEqual';

import {collectShallows, proxyShallow} from './shallowEqual';

import {proxyObjectRest, proxyArrayRest} from './utils';

import {drainDifference} from './differs'

export {
  proxyEqual,
  proxyShallow,
  proxyShallowEqual,
  proxyState,
  proxyCompare,

  get,
  deproxify,
  isProxyfied,
  isKnownObject,
  getProxyKey,

  collectShallows,
  collectValuables,

  proxyObjectRest,
  proxyArrayRest,

  withProxiesDisabled,

  spreadGuardsEnabled,
  sourceMutationsEnabled,

  drainDifference,
};