proxyequal
=====
[![CircleCI status](https://img.shields.io/circleci/project/github/theKashey/proxyequal/master.svg?style=flat-square)](https://circleci.com/gh/theKashey/proxyequal/tree/master)
[![Greenkeeper badge](https://badges.greenkeeper.io/theKashey/proxyequal.svg)](https://greenkeeper.io/)

Shallow equal is a good thing, but it compares thing you don't need.

Proxy equal - "MobX"-like solution, which will "magically" compare only used keys.

[![NPM](https://nodei.co/npm/proxyequal.png?downloads=true&stars=true)](https://nodei.co/npm/proxyequal/) 

## Usage
* Wrap an object with `proxyState`
* Run some computations using providing proxyObject.
proxyState returns object with shape 
  * state - a double of provided state, with _tracking_ enabled
  * affected - list of used keys in a state.
  * seal - disables tracking
  * unseal - enabled tracking
  * replaceState(newState) - replaces top level state, maintaining rest of data.
  * reset - resets tracked keys
   

* `proxy` will collect all referenced or used keys
* `proxyEqual` will compare all used "endpoint" keys of 2 objects
* `proxyShallow` will compare all used __NON__ "endpoint" keys of 2 objects.

The difference between proxyEqual and proxyShallow is in _expectations_.
* proxyShallow is similar to `shallowEqual`, it compares the top level objects. Might be they are still the same.
* proxyEqual working on variable-value level, performing (very) deep comparison of objects. 

## Extra API
- `spreadGuardsEnabled(boolean=[true])` - controls spread guards, or all-keys-enumeration, which makes proxyEqual ineffective.
- `sourceMutationsEnabled(boolean=[false])` - controls set behavior. By default proxied state is frozen.

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
### Don't forget to disable
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

Unfortunately, due to Proxy wrappers all `objects` will be unique each run.
```js
 shallowEqual(proxyState(A), proxyState(A)) === false
```
There is a undocumented way to solve it, used internally in [memoize-state](https://github.com/theKashey/memoize-state) library.
Once it will be proven to work stable - we will expose it.

## Compatibility

Requires [`Proxy`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy) support, so the [proxy-polyfill](https://github.com/GoogleChrome/proxy-polyfill) is included in the common bundle for Internet Explorer 11. How this works may change in future, see [issue #15 "ProxyPolyfill is unconditionally imported"](https://github.com/theKashey/proxyequal/issues/15) for details.

# Licence
MIT
