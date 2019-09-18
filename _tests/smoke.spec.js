import {expect} from 'chai';

import {
  proxyState,
  proxyShallow,
  proxyShallowEqual,
  proxyEqual,
  drainDifference,
  deproxify,
  isProxyfied,
  getProxyKey,
  spreadGuardsEnabled,
  sourceMutationsEnabled,
  proxyObjectRest,
  proxyArrayRest, isKnownObject
} from '../src';
import {unescapeKey} from "../src/escapeKey";

describe('proxy', () => {
  it('arrays', () => {
    const A1 = [0, 1, 2, 3];
    const A2 = [0, 1, 2, 3];
    const A3 = A1.map(a => a)
    const A4 = A1.map(a => a * 2)

    const trapped = proxyState(A1);

    expect(trapped.affected).to.be.deep.equal([]);

    expect(proxyShallow(A1, A2, trapped.affected)).to.be.true;

    expect(proxyEqual(A1, A2, trapped.affected)).to.be.true;
    expect(proxyEqual(A1, A3, trapped.affected)).to.be.true;
    expect(proxyEqual(A1, A4, trapped.affected)).to.be.true;


    trapped.state[0];// += 0;
    trapped.state[0];// += 0;

    expect(trapped.affected).to.be.deep.equal(['.0']);

    expect(proxyEqual(A1, A2, trapped.affected)).to.be.true;
    expect(proxyEqual(A1, A3, trapped.affected)).to.be.true;
    expect(proxyEqual(A1, A4, trapped.affected)).to.be.true;

    trapped.state[1];// += 0;

    expect(trapped.affected).to.be.deep.equal(['.0', '.1']);

    expect(proxyEqual(A1, A2, trapped.affected)).to.be.true;
    expect(proxyEqual(A1, A3, trapped.affected)).to.be.true;
    expect(proxyEqual(A1, A4, trapped.affected)).to.be.false;

    expect(drainDifference()).to.be.deep.equal([['.1', 'differs', 1, 2]]);

    trapped.seal();
    trapped.state[2];// += 0;
    expect(trapped.affected).to.be.deep.equal(['.0', '.1']);
    trapped.unseal();

    trapped.state[3];// += 0;
    expect(trapped.affected).to.be.deep.equal(['.0', '.1', '.3']);
  });

  it('objects', () => {
    const A1 = {
      key1: 1,
      key2: {
        array: [1, 2, 4]
      },
      key3: null
    };
    const A2 = {
      key1: 1,
      key2: 2
    };
    const A3 = Object.assign({}, A1, {
      key1: 2,
    });
    const A4 = {
      key1: 1,
      key2: {
        array: [1, 2, 4]
      }
    };

    const trapped = proxyState(A1);
    expect(trapped.affected).to.be.deep.equal([]);

    expect(proxyShallow(A1, A2, trapped.affected)).to.be.true;
    expect(proxyShallow(A1, A3, trapped.affected)).to.be.true;

    trapped.state.key1;// += 0;
    trapped.state.key1;// += 0;
    expect(trapped.affected).to.be.deep.equal(['.key1']);

    expect(proxyEqual(A1, A2, trapped.affected)).to.be.true;
    expect(proxyEqual(A1, A3, trapped.affected)).to.be.false;
    expect(drainDifference()).to.be.deep.equal([['.key1', 'differs', 1, 2]]);

    trapped.reset();
    expect(trapped.affected).to.be.deep.equal([]);
    trapped.state.key2.array[0];// += 0;
    expect(trapped.affected).to.be.deep.equal(['.key2', '.key2.array', '.key2.array.0']);

    expect(proxyEqual(A1, A2, trapped.affected)).to.be.false;
    expect(drainDifference()).to.be.deep.equal([['.key2.array.0', 'differs', 1, undefined]]);

    expect(proxyEqual(A1, A3, trapped.affected)).to.be.true;
    expect(proxyEqual(A1, A4, trapped.affected)).to.be.true;

    expect(proxyShallow(A1, A3, trapped.affected)).to.be.true;
    expect(proxyShallow(A1, A4, trapped.affected)).to.be.false;
    expect(drainDifference()).to.be.deep.equal([['.key2', 'differs', A1.key2, A4.key2]]);
  });

  it('handle empty case', () => {
    const A = {
      a: undefined
    };
    expect(proxyState(A).state.a).to.be.equal(undefined);
    expect(proxyState(undefined).state).to.be.equal(undefined);
  });

  it('plain shallowEqual', () => {
    const A1 = {
      key1: 1,
      key2: {
        array: [1, 2, 4]
      },
      key3: null
    };
    const A2 = {
      key1: 1,
      key2: 2
    };
    const A3 = Object.assign({}, A1, {
      key1: 2,
    });
    const A4 = {
      key1: 1,
      key2: A1.key2
    };

    const trapped = proxyState(A1);
    expect(trapped.affected).to.be.deep.equal([]);

    expect(proxyShallowEqual(A1, A2, trapped.affected)).to.be.true;
    expect(proxyShallowEqual(A1, A3, trapped.affected)).to.be.true;

    trapped.state.key1;// += 0;
    trapped.state.key1;/// += 0;
    expect(trapped.affected).to.be.deep.equal(['.key1']);

    expect(proxyShallowEqual(A1, A2, trapped.affected)).to.be.true;
    expect(proxyShallowEqual(A1, A3, trapped.affected)).to.be.false;
    expect(drainDifference()).to.be.deep.equal([['.key1', 'not equal']]);

    trapped.reset();
    expect(trapped.affected).to.be.deep.equal([]);
    trapped.state.key2.array[0];// += 0;
    expect(trapped.affected).to.be.deep.equal(['.key2', '.key2.array', '.key2.array.0']);

    expect(proxyShallowEqual(A1, A2, trapped.affected)).to.be.false;
    expect(drainDifference()).to.be.deep.equal([['.key2.array.0', 'not equal']]);

    expect(proxyShallowEqual(A1, A4, trapped.affected)).to.be.true;
  });

  it('falseNested shallowEqual', () => {
    const A1 = {
      a: 1,
      aa: 1
    };
    const A2 = {
      a: 1,
      aa: 2
    };

    const trapped = proxyState(A1);
    expect(trapped.state.a).to.be.equal(trapped.state.aa);

    expect(proxyShallowEqual(A1, A2, trapped.affected)).to.be.false;
  });

  it('nested shallowEqual', () => {
    const A1 = {
      key1: 1,
      key2: {
        array: [1, 2, 4]
      },
      key3: null
    };
    const A2 = {
      key1: 1,
      key2: {
        array: A1.key2.array
      }
    };

    const trapped1 = proxyState(A1);
    const trapped2 = proxyState(trapped1.state);

    trapped2.state.key1;// += 0;
    expect(trapped1.affected).to.be.deep.equal(['.key1']);
    expect(trapped2.affected).to.be.deep.equal(['.key1']);

    expect(proxyShallowEqual(A1, A2, trapped1.affected)).to.be.true;
    trapped2.state.key1;// += 1;
    expect(proxyShallowEqual(trapped2.state, A2, trapped1.affected)).to.be.true;
    A1.key1 += 1;
    expect(proxyShallowEqual(trapped2.state, A2, trapped1.affected)).to.be.false;
    expect(drainDifference()).to.be.deep.equal([['.key1', 'not equal']]);

    trapped1.reset();
    trapped2.reset();
    trapped2.state.key2.array[0];// += 0;
    expect(trapped1.affected).to.be.deep.equal(['.key2', '.key2.array', '.key2.array.0']);

    expect(proxyShallowEqual(trapped2.state, A2, trapped1.affected)).to.be.true;
  });

  it('can proxy via proxy', () => {
    const A = {
      b: {
        c: {
          d: 1
        }
      }
    };
    const p1 = proxyState(A);
    const p2 = proxyState(p1.state.b);

    expect(proxyEqual(p1.state, A, ['.b'])).to.be.true;
    expect(proxyEqual(p1.state.b, A.b, ['.c'])).to.be.true;

    expect(proxyEqual(p2.state, A.b, ['.c'])).to.be.true;
  });

  it('track proxy via proxy', () => {
    const A = {
      root: {
        b: {
          a: 1,
          b: true,
          c: {
            d: 1,
            e: 14
          }
        }
      }
    };
    const p0 = proxyState(A);
    const p1 = proxyState(p0.state.root);
    const p2 = proxyState(p1.state.b);
    p2.state.c.d;//++;

    expect(p1.affected).to.be.deep.equal(['.b', '.b.c', '.b.c.d']);
    expect(p2.affected).to.be.deep.equal(['.c', '.c.d']);
    p2.state.a;//++;

    expect(p1.affected).to.be.deep.equal(['.b', '.b.c', '.b.c.d', '.b.a']);
    expect(p2.affected).to.be.deep.equal(['.c', '.c.d', '.a']);

    expect(proxyEqual(p2.state, A.root.b, ['.c.e'])).to.be.true;

    expect(p1.affected).to.be.deep.equal(['.b', '.b.c', '.b.c.d', '.b.a']);
    expect(p2.affected).to.be.deep.equal(['.c', '.c.d', '.a']);

    expect(p0.affected).to.be.deep.equal(['.root', '.root.b', '.root.b.c', '.root.b.c.d', '.root.b.a']);
  });

  it('shallow equal test', () => {
    const C = {c: 1};
    const A1 = {
      b: C
    };
    const A2 = {
      b: C
    };

    expect(proxyState(A1).state.b).not.to.equal(proxyState(A2).state.b);

    const p1 = proxyState(A1);
    const s1 = p1.state;
    const p2 = p1.replaceState(A2);
    const s2 = p2.state;

    expect(s1.b).to.equal(s2.b);
  });

  it('handles freezed objects', () => {
    const O1 = {
      a: 1,
      b: 2,
      c: {d: 4}
    };
    const O2 = Object.freeze(O1);

    const trapped = proxyState(O2);
    const state = trapped.state;
    const read = state.a + state.b + state.c.d;
    expect(read).to.be.equal(7);
    expect(trapped.affected).to.be.deep.equal(['.a', '.b', '.c', '.c.d']);
  });

  it('handles prototype chain', () => {
    const o1 = {
      a1: 1
    };
    const o2 = {
      a2: 2
    };
    Object.setPrototypeOf(o2, o1);
    expect(Object.getPrototypeOf(o2)).to.be.equal(o1);
    expect(o1.isPrototypeOf(o2)).to.be.true;
    const trapped = proxyState(o2);
    expect(o1.isPrototypeOf(trapped.state)).to.be.true;
  });

  it('handles dots in names', () => {
    const o1 = {
      'test.object.1': 1
    };
    const o2 = {
      'test.object.2': 2
    };
    const trapped = proxyState(o1);
    expect(trapped.state['test.object.1']).to.be.equal(1);
    expect(trapped.affected).not.to.be.deep.equal(['.test.object.1']);
    expect(unescapeKey(trapped.affected[0])).to.be.equal('.test.object.1');
    expect(proxyEqual(o1, o2, trapped.affected)).to.be.equal(false);
  });

  it('detect self', () => {
    const A = {a: 1};
    const B = proxyState(A).state;
    const C = deproxify(B);

    expect(isProxyfied(A)).to.be.false;
    expect(isProxyfied(B)).to.be.true;
    expect(isProxyfied(C)).to.be.false;
    expect(C).to.be.equal(A);
  });

  describe('affected optimizations', () => {
    it('affected should be immutable', () => {
      const A = {a: 1, b: 2, c: 3};
      const p = proxyState(A);
      expect(p.state.a).to.be.equal(1);
      const a1 = p.affected;
      expect(a1).to.be.deep.equal(['.a']);
      expect(p.state.b).to.be.equal(2);
      expect(a1).to.be.deep.equal(['.a', '.b']);
      p.reset();
      expect(p.state.c).to.be.equal(3);
      const a2 = p.affected;
      expect(a1).to.be.deep.equal(['.a', '.b']);
      expect(a2).to.be.deep.equal(['.c']);
    });

    it('should reuse affected', () => {
      const A = {a: 1, b: 2, c: 3};
      const p = proxyState(A);
      expect(p.state.a).to.be.equal(1);
      expect(p.state.b).to.be.equal(2);
      const a1 = p.affected;
      expect(a1).to.be.deep.equal(['.a', '.b']);
      p.reset();
      expect(p.state.a).to.be.equal(1);
      expect(p.affected).not.to.be.equal(a1);
      expect(p.state.b).to.be.equal(2);
      expect(p.affected).to.be.equal(a1);
      expect(p.state.c).to.be.equal(3);
      expect(p.affected).not.to.be.equal(a1);
    })
  });

  describe('spread guards', () => {
    beforeEach(() => spreadGuardsEnabled(true));
    afterEach(() => spreadGuardsEnabled(true));

    it('should return proxy name', () => {
      const A = {a: {b: {c: 1}}};
      const P0 = proxyState(A, 'key1');
      const P = P0.state;
      expect(deproxify(P.a.b)).to.be.deep.equal({c: 1})
      expect(P0.spreadDetected).to.be.false;
      expect(P.a.b).to.be.deep.equal({c: 1, __proxyequal_scanEnd: false})
      expect(P0.spreadDetected).to.be.equal(".a.b");
      expect(getProxyKey(P.a).fingerPrint).to.be.equal('key1');
      expect(getProxyKey(P.a).suffix).to.be.equal('.a');
      expect(getProxyKey(P.a.b).suffix).to.be.equal('.a.b');
      expect(getProxyKey(P.a.b.c).suffix).to.be.equal(undefined);
    });

    it('should properly handle seal command', () => {
      const A = {a: {b: {c: 1}}};
      const P0 = proxyState(A, 'key1');
      const P = P0.state;
      expect(deproxify(P.a.b)).to.be.deep.equal({c: 1})
      expect(P0.spreadDetected).to.be.false;
      expect(P.a.b).to.be.deep.equal({c: 1, __proxyequal_scanEnd: false})
      P0.seal();
      expect(P.a.b).to.be.deep.equal({c: 1});
      expect(P0.spreadDetected).to.be.equal(".a.b");
    });

    it('stand spread operator(actually - not)', () => {
      const A = {a: 1, b: 2, c: 3};
      const f2 = state => state.b;
      const f1 = (state) => f2(Object.assign({}, state));

      const P = proxyState(A);
      expect(f1(P.state)).to.be.equal(2);
      expect(P.spreadDetected).to.be.equal("");
      expect(P.affected).to.be.deep.equal(['.!Keys', '.a', '.b', '.c']);
    });

    it('stand rest operator(actually - not)', () => {
      const A = {a: 1, b: 2, c: 3};
      const f2 = state => state.b;
      const f1 = ({a, ...state}) => f2(state);

      var P = proxyState(A);
      expect(f1(P.state)).to.be.equal(2);
      expect(P.spreadDetected).to.be.equal("");
      expect(P.affected).to.be.deep.equal(['.a', '.!Keys', '.b', '.c']);
    });
  });

  describe('types', () => {
    it('should handle date', () => {
      const A = {d: new Date()};
      const p = proxyState(A);
      const B = p.state;
      expect(B.d.getDate()).to.be.equal((new Date()).getDate())
      expect(p.affected).to.be.deep.equal(['.d'])
    })

    it('should handle Promise', () => {
      const A = {d: Promise.resolve()};
      const p = proxyState(A);
      const B = p.state;
      const result = B.d.then(() => true);
      expect(p.affected).to.be.deep.equal(['.d'])
      return result;
    })

    it('should handle Map.get', () => {
      const A = {d: new Map([[1, 2]])};
      const p = proxyState(A);
      const B = p.state;
      expect(B.d.get(1)).to.be.equal(2);
      expect(p.affected).to.be.deep.equal(['.d', '.d.get', '.d.1']);
    })

    it('should handle Map.keys', () => {
      const A = {d: new Map([['key', 'value']])};
      const p = proxyState(A);
      const B = p.state;
      expect([...B.d.keys()]).to.be.deep.equal([...A.d.keys()]);
      expect(p.affected).to.be.deep.equal(['.d', '.d.keys']);
    })

    it('should handle Map.values', () => {
      const A = {d: new Map([[1, 2]])};
      const p = proxyState(A);
      const B = p.state;
      expect([...B.d.values()]).to.be.deep.equal([...A.d.values()]);
      expect(p.affected).to.be.deep.equal(['.d', '.d.values', '.d.values.0']);
    })

    it('should handle Map.entries', () => {
      spreadGuardsEnabled(false);
      const A = {d: new Map([[1, {sub1: 1, sub2: 2}]])};
      const p = proxyState(A);
      const B = p.state;

      expect(B.d.entries().next().value[1].sub2).to.be.equal(2);
      expect(p.affected).to.be.deep.equal([
        '.d',
        '.d.entries',
        ".d.entries.0",
        ".d.entries.0.1",
        ".d.entries.0.1.sub2",
      ]);

      expect([...B.d.entries()]).to.be.deep.equal([...A.d.entries()]);
      expect(p.affected).to.be.deep.equal([
        ".d",
        ".d.entries",
        ".d.entries.0",
        ".d.entries.0.1",
        ".d.entries.0.1.sub2",
        ".d.entries.0.length",
        ".d.entries.0.0",
        ".d.entries.0.1.!Keys",
        ".d.entries.0.1.sub1",
      ]);

      spreadGuardsEnabled(true);
    })
  });

  it('should remember objects', () => {
    const a = {};
    expect(isKnownObject(null)).to.be.equal(false);
    expect(isKnownObject('')).to.be.equal(false);
    expect(isKnownObject(a)).to.be.equal(false);
    proxyState(a);
    expect(isKnownObject(a)).to.be.equal(true);
  });

  describe('set', () => {
    it('should not let you set value', () => {
      const A = {a: 1, b: 2};
      const p = proxyState(A);
      const B = p.state;

      expect(() => B.a = 2).to.throw();
      expect(A.a).to.be.equal(1);
      expect(B.a).to.be.equal(1);
    });

    it('should not let you set value', () => {
      const A = {a: 1, b: 2};
      const p = proxyState(A);
      const B = p.state;

      sourceMutationsEnabled(true);
      expect(() => B.a = 2).not.to.throw();

      expect(A.a).to.be.equal(2);
      expect(B.a).to.be.equal(2);

      sourceMutationsEnabled(false);
      expect(() => B.a = 3).to.throw();
    });
  });

  describe('edge cases', () => {
    it('object rest', () => {
      const state1 = {
        a: 1,
        b: 2,
        c: 3,
      };

      const p1 = proxyState(state1);
      const [a, rest] = proxyObjectRest(p1.state, ['a']);
      expect(p1.affected).to.be.deep.equal(['.a']);

      Object.keys(rest).forEach(x => rest[x]);

      expect(p1.affected).to.be.deep.equal(['.a', '.!Keys', '.b', '.c']);
    });

    it('array rest', () => {
      const state1 = [1, 2, 3];

      const p0 = proxyState(state1);
      p0.state.forEach(x => x);

      expect(p0.affected).to.be.deep.equal(['.forEach', '.length', '.0', '.1', '.2']);

      const p1 = proxyState(state1);
      const [a, rest] = proxyArrayRest(p1.state, 1);
      expect(p1.affected).to.be.deep.equal(['.length', '.0']);

      rest.forEach(x => x);

      expect(p1.affected).to.be.deep.equal(['.length', '.0', '.forEach', '.1', '.2']);
    });

    // https://github.com/theKashey/memoize-state/issues/26
    it('keys and values', () => {
      const act = (s) => Object.values(s.items).map(x => x.text);

      const state1 = {
        items: {
          1: {text: "foo"}
        }
      };

      const p1 = proxyState(state1);
      act(p1.state);
      expect(p1.affected).to.be.deep.equal([
        ".items",
        ".items.!Keys",
        ".items.1",
        ".items.1.text",
      ]);

      const state2 = {
        items: {
          ...state1.items,
          2: {text: "bar"}
        }
      };

      const p2 = proxyState(state2);
      act(p2.state);
      expect(p2.affected).to.be.deep.equal([
        ".items",
        ".items.!Keys",
        ".items.1",
        ".items.2",
        ".items.1.text",
        ".items.2.text",
      ]);

      const state3 = {
        ...state1
      };

      expect(proxyEqual(state1, state3, p1.affected)).to.be.true;
      expect(proxyEqual(state1, state2, p1.affected)).to.be.false;
    })
  })
});
