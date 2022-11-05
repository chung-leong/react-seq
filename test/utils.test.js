import { expect } from 'chai';
import sinon from 'sinon';
import { noConsole } from './error-handling.js';
import { EventManager } from '../src/event-manager.js';

import {
  delay,
  meanwhile,
  stasi,
  Abort,
} from '../index.js';
import {
  isAbortError,
  isPromise,
  isSyncGenerator,
  isAsyncGenerator,
} from '../src/utils.js';

describe('#delay()', function() {
  it('should return a promise that is fulfilled after a delay', async function() {
    const promise = delay(20);
    expect(promise).to.be.a('promise');
    await promise;
  })
  it('should resolve to specified value after a delay', async function() {
    const promise = delay(20, { value: 5 });
    expect(promise).to.be.a('promise');
    const value = await promise;
    expect(value).to.equal(5);
  })
  it('should fail with Abort when abort controller fires', async function() {
    const abortController = new AbortController();
    const { signal } = abortController;
    let error;
    try {
      setTimeout(() => abortController.abort(), 10);
      await delay(5000, { signal });
    } catch (err) {
      error = err;
    }
    expect(error).to.be.instanceOf(Abort);
  })
  it('should fail immediately when signal is already on', async function() {
    // can't use AbortSignal.abort() as it's missing from the implementation
    const abortController = new AbortController();
    const { signal } = abortController;
    abortController.abort();
    let error;
    try {
      await delay(20, { signal });
    } catch (err) {
      error = err;
    }
    expect(error).to.be.instanceOf(Abort);
  })
  it('should remove listener on signal timeout fires', async function() {
    const abortController = new AbortController();
    const { signal } = abortController;
    const spy = sinon.spy(signal, 'removeEventListener');
    let error;
    try {
      await delay(20, { signal });
    } catch (err) {
      error = err;
    }
    expect(error).to.be.undefined;
    expect(spy.called).to.be.true;
  })
})

describe('#meanwhile()', function() {
  it('should run the function given to it', function() {
    let ran = false;
    meanwhile(async () => {
      ran = true;
    });
    expect(ran).to.be.true;
  })
  it('should do nothing when no function is given', async function() {
    const { error } = await noConsole(() => {
      meanwhile();
    });
    expect(error).to.be.null;
  })
  it('should output errors to console', async function() {
    const { error } = await noConsole(async () => {
      await meanwhile(async () => {
        throw new Error('Rats live on no evil star');
      });
    });
    expect(error).to.be.an('error').with.property('message', 'Rats live on no evil star');
  })
})

describe('#stasi()', function() {
  it('should create a generator that yield data from another generator', async function() {
    async function* generate() {
      for (let i = 1; i <= 5; i++) {
        await delay(5)
        yield i;
      }
    };
    const target = generate();
    const agent = stasi(target);
    const list1 = await getListRecursive(target);
    const list2 = await getListRecursive(agent);
    expect(list1).to.eql([ 1, 2, 3, 4, 5 ]);
    expect(list2).to.eql(list1);
  })
  it('should stop tapping when an error is encountered', async function() {
    async function* generate() {
      for (let i = 1; i <= 5; i++) {
        await delay(5)
        if (i === 3) {
          throw new Error('Thou hast reached the number three');
        }
        yield i;
      }
    };
    const target = generate();
    const agent = stasi(target);
    const list1 = [];
    let error;
    try {
      for await (const value of target) {
        list1.push(value);
      }
    } catch (err) {
      error = err;
    }
    const list2 = [];
    for await (const value of agent) {
      list2.push(value);
    }
    expect(error).to.be.an('error');
    expect(list1).to.eql([ 1, 2 ]);
    expect(list2).to.eql(list1);
  })
  it('should create generators that can be read concurrently with the target generator', async function() {
    async function* generate() {
      for (let i = 1; i <= 5; i++) {
        await delay(5)
        yield i;
      }
    };
    const target = generate();
    const agentA = stasi(target);
    const agentB = stasi(target);
    const list = [];
    const sources = [ target, agentA, agentB ];
    for (;;) {
      const results = await Promise.all(sources.map(g => g.next()));
      if (results.every(r => r.done)) {
        break;
      }
      list.push(results.map(r => r.value));
    }
    expect(list).to.eql([
      [ 1, 1, 1 ],
      [ 2, 2, 2 ],
      [ 3, 3, 3 ],
      [ 4, 4, 4 ],
      [ 5, 5, 5 ],
    ]);
  })
  it('should work recursively', async function() {
    async function* generate() {
      for (let i = 1; i <= 5; i++) {
        await delay(5)
        yield (i % 2) ? a(1, 2, 3, 4) : g('Hello', 'world', a(456, 123));
      }
    };
    const target = generate();
    const agentA = stasi(target);
    const agentB = stasi(target);
    const listA = await getListRecursive(agentA);
    const list = await getListRecursive(target);
    const listB = await getListRecursive(agentB);
    expect(listA).to.eql(list);
    expect(listB).to.eql(list);
  });
  it('should produce the same result when called on a stasi generator', async function() {
    async function* generate() {
      for (let i = 1; i <= 5; i++) {
        await delay(5)
        yield (i % 2) ? a(1, 2, 3, 4) : g('Hello', 'world', a(456, 123));
      }
    };
    const target = generate();
    const agentA = stasi(target);
    const agentB = stasi(agentA);
    const listA = await getListRecursive(agentA);
    const list = await getListRecursive(target);
    const listB = await getListRecursive(agentB);
    expect(listA).to.eql(list);
    expect(listB).to.eql(list);
  });
})

describe('#isAbortError()', function() {
  it('should return true if error object is caused by aborting a fetch operation', async function() {
    const abortController = new AbortController();
    const { signal } = abortController;
    let error;
    try {
      setTimeout(() => abortController.abort(), 0);
      const res = await fetch('http://google.com', { signal });
    } catch (err) {
      error = err;
    }
    expect(isAbortError(error)).to.be.true;
  })
})

describe('#isPromise()', function() {
  it('should not mistakenly identify a handler from the event manager as a promise', function() {
    const em = new EventManager({});
    expect(isPromise(em.on.click)).to.be.false;
  })
});

describe('#isSyncGenerator()', function() {
  it('should not mistakenly identify a handler from the event manager as a sync generator', function() {
    const em = new EventManager({});
    expect(isSyncGenerator(em.on.click)).to.be.false;
  })
});

describe('#isAsyncGenerator()', function() {
  it('should not mistakenly identify a handler from the event manager as a async generator', function() {
    const em = new EventManager({});
    expect(isAsyncGenerator(em.on.click)).to.be.false;
  });
});

async function getListRecursive(gen) {
  if (isSyncGenerator(gen)) {
    const list = [];
    for (const v of gen) {
      list.push(await getListRecursive(v));
    }
    return list;
  } else if (isAsyncGenerator(gen)) {
    const list = [];
    for await (const v of gen) {
      list.push(await getListRecursive(v));
    }
    return list;
  } else {
    return gen;
  }
}

function* g(...values) {
  for (const value of values) {
    yield value;
  }
}

async function* a(...values) {
  for (const value of values) {
    yield value;
  }
}
