/* eslint-disable flowtype/require-valid-file-annotation */
const Benchmark = require('benchmark');
const {proxyShallowEqual, proxyCompare, proxyEqual} = require('../');

const suite = new Benchmark.Suite();

const ab1 = [".e", ".c", ".e.a", ".e.a.b", ".a", '.b', ".e.a.c"];
const ab2 = [".e", ".ee", ".eee", ".e.a.b", ".a", ".a.a.a", ".eee.e", ".eee.ee", ".eee.eee", ".eee.e.e"];

const RFACTOR = 1;

const a1 = Array(RFACTOR).fill(ab1).reduce((acc, i) => [...acc, ...i], []);
const a2 = Array(RFACTOR).fill(ab2).reduce((acc, i) => [...acc, ...i], []);

const a3 = [
  '.eee',
  '.eee.eee',
  '.eee.ee',
  '.ee',
  '.e',
  '.e.a.b',
  '.a',
  '.a.a.a',
  '.eee.e',
  '.eee.e.e'
];

function theNextDot(a, b, start) {
  for (let i = start; ; ++i) {
    const ac = a.charCodeAt(i);
    const bc = b.charCodeAt(i);
    if (!ac && !bc) return 0;
    if (ac && !bc) return;
    if (!ac && bc) return -1;
    if (ac !== bc) {
      if (ac === '.') {
        return -1;
      }
      if (bc === '.') {
        return 1;
      }
    }
  }
  return 0;
}

const kSort = (a, b) => {
  const r = (function () {
    const al = a.length;
    const bl = b.length;

    const d = 1; //Math.abs(al - bl);

    if (al < bl) {
      return b[al] === '.' && b.indexOf(a) === 0 ? -1 : dSort(a, b);
    }
    if (al > bl) {
      return a[bl] === '.' && a.indexOf(b) === 0 ? 1 : dSort(a, b);
    }
    return 0;
  })();
  console.log(a, b, r);
  return r;
};

const dSort = (a, b) => {
  console.log(a, b);
  for (let i = 0; ; ++i) {
    const ac = a.charCodeAt(i);
    const bc = b.charCodeAt(i);
    if (!ac && !bc) return 0;
    if (ac && !bc) return 1;
    if (!ac && bc) return -1;
    if (ac > bc) return 1;
    if (ac < bc) return -1;
  }
};

function ksort(a) {
  return [...a].sort(kSort)
}

function dsort(a) {
  return [...a].sort(dSort)
}

// console.log(a1);
// console.log(ksort(a1));
// console.log(dsort(a1));
// console.log('---');
//console.log(a2);
console.log(ksort(a3));
// console.log(dsort(a2));

return;

suite.add('kash-sort a1', () => {
  ksort(a1)
});

suite.add('dai-sort a1', () => {
  dsort(a1)
});

suite.add('kash-sort a2', () => {
  ksort(a2)
});

suite.add('dai-sort a2', () => {
  dsort(a2)
});


suite.on('cycle', e => console.log(String(e.target)));

suite.run({async: true});
