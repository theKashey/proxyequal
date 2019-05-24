/* eslint-disable flowtype/require-valid-file-annotation */
const Benchmark = require('benchmark');
const {proxyShallowEqual, proxyCompare, proxyEqual, deepDeproxify} = require('../');
const {weakMemoizeArray} = require("../lib/weakMemoize");

const suite = new Benchmark.Suite();

const s1 = {
  a: 1,
  b: 2,
  c: 3,
  d: [[
    1, 2, 3
  ]],
  e: {a: {b: {c: 42}}}
};

const s2 = s1;

const s3 = Object.assign({}, s1);

const s4 = Object.assign({}, s1, {
  e: Object.assign({}, s1.e, {b: {c: 42}})
});

const s5 = Object.assign({}, s1, {
  e: Object.assign({}, s1.e, {b: {c: 42}})
});

const left = s1;
const right = s5;

//const locations = [".d", ".d.0", ".d.0.0", ".d.0.1", ".d.0.2"];
 const locations = [".e",".e.a",".e.a.b",".a",'.b'];
// const locations = [".a",".b",".c",".cc",".ccc",".cccc",".aa",".bb"];

const get = (target, path) => {
  let result = target;
  for (let i = 1; i < path.length && result; ++i) {
    const key = path[i];
    result = result[key]
  }
  return result;
};

const EDGE = 'EDGE';

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

const memoizedBuildTrie = weakMemoizeArray(buildObjTrie);

const proxyShallowEqual2 = (a, b, affected) => {
  const root = memoizedBuildTrie(affected);
  const walk = (la, lb, node) => {
    if (la === lb || deepDeproxify(la) === deepDeproxify(lb)) {
      return true;
    }
    if (node === EDGE) {
      return false;
    }
    const items = Object.keys(node);
    for (let i = 0; i < items.length; ++i) {
      const item = items[i];
      if (!walk(
        get(la, ['', item]), // FIXME
        get(lb, ['', item]), // FIXME
        node[item],
      )) {
        return false;
      }
    }
    return true;
  };
  return walk(a, b, root);
};

suite.add('proxyShallowEqual-0', () => {
  proxyShallowEqual(left, right, locations);
});

suite.add('proxyShallowEqual-2', () => {
  proxyShallowEqual2(left, right, locations);
});

suite.add('proxyShallowEqual-3', () => {
  proxyShallowEqual(left, right, locations);
});


suite.on('cycle', e => console.log(String(e.target)));

suite.run({async: true});
