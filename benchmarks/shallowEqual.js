/* eslint-disable flowtype/require-valid-file-annotation */
const Benchmark = require('benchmark');
const {proxyShallowEqual, proxyCompare, proxyEqual} = require('../');

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

// const locations = [".d", ".d.0", ".d.0.0", ".d.0.1", ".d.0.2"];
// const locations = [".e",".e.a",".e.a.b",".a",'.b'];
const locations = [".a",".b",".c",".cc",".ccc",".cccc",".aa",".bb"];

proxyCompare(left, right, locations);
proxyEqual(left, right, locations);
proxyShallowEqual(left, right, locations);

suite.add('proxyCompare', () => {
  proxyCompare(left, right, locations);
});

suite.add('proxyEqual', () => {
  proxyEqual(left, right, locations);
});

suite.add('proxyShallowEqual', () => {
  proxyShallowEqual(left, right, locations);
});


suite.on('cycle', e => console.log(String(e.target)));

suite.run({async: true});
