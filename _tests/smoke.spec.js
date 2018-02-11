import {expect} from 'chai';

import {proxyState, proxyShallow, proxyEqual, drainDifference} from '../src/index';

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


    trapped.state[0] += 0;
    trapped.state[0] += 0;

    expect(trapped.affected).to.be.deep.equal(['.0']);

    expect(proxyEqual(A1, A2, trapped.affected)).to.be.true;
    expect(proxyEqual(A1, A3, trapped.affected)).to.be.true;
    expect(proxyEqual(A1, A4, trapped.affected)).to.be.true;

    trapped.state[1] += 0;

    expect(trapped.affected).to.be.deep.equal(['.0', '.1']);

    expect(proxyEqual(A1, A2, trapped.affected)).to.be.true;
    expect(proxyEqual(A1, A3, trapped.affected)).to.be.true;
    expect(proxyEqual(A1, A4, trapped.affected)).to.be.false;

    expect(drainDifference()).to.be.deep.equal([['.1', 'differs', 1, 2]]);
  });

  it('objects', () => {
    const A1 = {
      key1: 1,
      key2: {
        array: [1, 2, 4]
      }
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

    trapped.state.key1 += 0;
    trapped.state.key1 += 0;
    expect(trapped.affected).to.be.deep.equal(['.key1']);

    expect(proxyEqual(A1, A2, trapped.affected)).to.be.true;
    expect(proxyEqual(A1, A3, trapped.affected)).to.be.false;
    expect(drainDifference()).to.be.deep.equal([['.key1', 'differs', 1, 2]]);

    trapped.reset();
    expect(trapped.affected).to.be.deep.equal([]);
    trapped.state.key2.array[0] += 0;
    expect(trapped.affected).to.be.deep.equal(['.key2', '.key2.array', '.key2.array.0']);

    expect(proxyEqual(A1, A2, trapped.affected)).to.be.false;
    expect(drainDifference()).to.be.deep.equal([['.key2.array.0', 'differs', 1, undefined]]);

    expect(proxyEqual(A1, A3, trapped.affected)).to.be.true;
    expect(proxyEqual(A1, A4, trapped.affected)).to.be.true;

    expect(proxyShallow(A1, A3, trapped.affected)).to.be.true;
    expect(proxyShallow(A1, A4, trapped.affected)).to.be.false;
    expect(drainDifference()).to.be.deep.equal([['.key2', 'differs', A1.key2, A4.key2]]);
  });
});
