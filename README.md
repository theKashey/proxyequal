proxyequal
=====
[![CircleCI status](https://img.shields.io/circleci/project/github/theKashey/proxyequal/master.svg?style=flat-square)](https://circleci.com/gh/theKashey/proxyequal/tree/master)
[![Greenkeeper badge](https://badges.greenkeeper.io/theKashey/proxyequal.svg)](https://greenkeeper.io/)

Shallow equal is a good thing, but it compares thing you dont need

Proxy equal - "MobX"-like solution, which will "magically" compare only used keys.

Just 150 lines long. 100% test coverage.

[![NPM](https://nodei.co/npm/proxyequal.png?downloads=true&stars=true)](https://nodei.co/npm/proxyequal/) 

## Usage
* Wrap an object with `proxyState`
* Run some computations using providing proxyObject.
proxyState returns object with shape 
  * state - a double of provided state, with _tracking_ enabled
  * affected - list of used keys in a state.
  * seal - disables tracking
  * unseal - enabled tracking
  * replaceState(newState) - replaces top level state, maintaing rest of data.
  * reset - resets tracked keys
   

* `proxy` will collect all referenced or used keys
* `proxyEqual` will compare all used "endpoint" keys of 2 objects
* `proxyShallow` will comparent all used __NON__ "endpoint" keys of 2 objects.

The difference between proxyEqual and proxyShallow is in _expectations_.
* proxyShallow is similar to `shallowEqual`, it compares the top level objects. Might be they are still the same.
* proxyEqual working on variable-value level, performing (very) deep comparison of objects. 

## When to use proxyequal
When you have a big state, for example redux state, but some function (redux selector, or mapStateToProps)
uses just a small subset.

Here proxyequal can shine, detecting the only used branches, and comparing only the used keys.

## Example
```js
import {proxyState, proxyEqual, proxyShallow} from 'proxyequal';

// wrap the original state
const trapped = proxyState(state);

// use provided one in computations
mapStateToProps(trapped.state);

// first shallow compare
proxyShallow(state, newState, trapped.affected);

// next - deep compare
proxyEqual(state, newState, trapped.affected);
```
### Dont forget to disable
```js
const trapped = proxyState(state);
// do something
workWith(trapped.state);

trapped.seal();

// now tracking is disabled

trapped.unseal();
// and enabled
```

## Speed

Uses `ES6 Proxy` underneath to detect used branches(as `MobX`), and `search-trie` to filter out keys for shallow or equal compare.

So - it is lighting fast.

## Limitations

Unfortunately, due to Proxy wrappers all `objects` will be enique each run.
```js
 shallowEqual(proxyState(A), proxyState(A)) === false
```
There is a undocumented way to solve it, used internally in [memoize-state](https://github.com/theKashey/memoize-state) library.
Once it will be proven to work stable - we will expose it.

## Compatibility

__NOT__ compatible with __IE11__. One need to provide a proxy polyfill to make this work.
See https://github.com/GoogleChrome/proxy-polyfill

# Licence
MIT
