import { expect } from 'chai';
import { createElement } from 'react';
import { createTestRenderer } from './test-renderer.js';
import { createSteps, loopThrough } from './step.js';
import { createErrorBoundary, noConsole, caughtAt } from './error-handling.js';
import { delay } from '../index.js';
import { isAbortError } from '../src/utils.js';

import {
  sequentialState,
  useSequentialState,
} from '../index.js';

describe('#sequentialState()', function() {
  it('should invoke function with new state', async function() {
    const steps = createSteps(), assertions = createSteps();
    const createDrinks = async function*() {
      await assertions[0];
      yield 'Whiskey drink';
      steps[1].done();
      await assertions[1];
      yield 'Vodka drink';
      steps[2].done();
      await assertions[2];
      yield 'Lager drink';
      steps[3].done();
      await assertions[3];
      yield 'Cider drink';
      steps[4].done();
    };
    const results = [], errors = [];
    const setState = value => results.push(value);
    const setError = err => errors.push(err);
    const { initialState } = sequentialState(createDrinks, setState, setError);
    expect(initialState).to.be.undefined;
    assertions[0].done();
    await steps[1];
    expect(results).to.eql([ 'Whiskey drink' ]);
    assertions[1].done();
    await steps[2];
    expect(results).to.eql([ 'Whiskey drink', 'Vodka drink' ]);
    assertions[2].done();
    await steps[3];
    expect(results).to.eql([ 'Whiskey drink', 'Vodka drink', 'Lager drink' ]);
    assertions[3].done();
    await steps[4];
    expect(results).to.eql([ 'Whiskey drink', 'Vodka drink', 'Lager drink', 'Cider drink' ]);
  })
  it('should invoke function with error when it occurs', async function() {
    const steps = createSteps(), assertions = createSteps();
    const createDrinks = async function*() {
      await assertions[0];
      yield 'Whiskey drink';
      steps[1].done();
      await assertions[1];
      yield 'Vodka drink';
      steps[2].done();
      await assertions[2];
      steps[3].throw(new Error('I get knocked down'));
    };
    const results = [], errors = [];
    const setState = value => results.push(value);
    const setError = err => errors.push(err);
    const { initialState } = sequentialState(createDrinks, setState, setError);
    expect(initialState).to.be.undefined;
    assertions[0].done();
    await steps[1];
    expect(results).to.eql([ 'Whiskey drink' ]);
    assertions[1].done();
    await steps[2];
    expect(results).to.eql([ 'Whiskey drink', 'Vodka drink' ]);
    assertions[2].done();
    await steps[3];
    expect(errors[0]).to.be.an('error');
  })
  it('should return the initial state', async function() {
    const steps = createSteps(), assertions = createSteps();
    const createDrinks = async function*({ initial }) {
      initial('Sober');
      await assertions[0];
      yield 'Whiskey drink';
      steps[1].done();
      await assertions[1];
      yield 'Vodka drink';
      steps[2].done();
      await assertions[2];
      yield 'Lager drink';
      steps[3].done();
      await assertions[3];
      yield 'Cider drink';
      steps[4].done();
    };
    const results = [], errors = [];
    const setState = value => results.push(value);
    const setError = err => errors.push(err);
    const { initialState } = sequentialState(createDrinks, setState, setError);
    expect(initialState).to.equal('Sober');
    for (let i = 0; i <= 4; i++) {
      assertions[i].done();
    }
    await steps[4];
    expect(results).to.eql([ 'Whiskey drink', 'Vodka drink', 'Lager drink', 'Cider drink' ]);
  })
  it('should allow the deferrment of state update', async function() {
    const steps = createSteps(), assertions = createSteps();
    const createDrinks = async function*({ defer }) {
      defer(20);
      await assertions[0];
      yield 'Whiskey drink';
      steps[1].done();
      await assertions[1];
      yield 'Vodka drink';
      steps[2].done();
      await assertions[2];
      yield 'Lager drink';
      steps[3].done();
      await assertions[3];
      yield 'Cider drink';
      steps[4].done();
    };
    const results = [], errors = [];
    const setState = value => results.push(value);
    const setError = err => errors.push(err);
    const { initialState } = sequentialState(createDrinks, setState, setError);
    assertions[0].done();
    await steps[1];
    expect(results).to.eql([]);
    assertions[1].done();
    await steps[2];
    expect(results).to.eql([]);
    assertions[2].done();
    await steps[3];
    expect(results).to.eql([]);
    assertions[3].done();
    await steps[4];
    expect(results).to.eql([ 'Cider drink' ]);
  })
  it('should interrupt iteration of generator when abort controller is invoked', async function() {
    const steps = createSteps(), assertions = createSteps();
    const createDrinks = async function*() {
      try {
        await assertions[0];
        yield 'Whiskey drink';
        steps[1].done();
        await assertions[1];
        yield 'Vodka drink';
        steps[2].done();
        await assertions[2];
        yield 'Lager drink';
        steps[3].done();
        await assertions[3];
        yield 'Cider drink';
        steps[4].done();
      } finally {
        steps[5].done();
      }
    };
    const results = [];
    const setState = value => results.push(value);
    let error;
    const setError = err => error = err;
    const { abortController } = sequentialState(createDrinks, setState, setError);
    expect(abortController).to.be.instanceOf(AbortController);
    assertions[0].done();
    await steps[1];
    expect(results).to.eql([ 'Whiskey drink' ]);
    assertions[1].done();
    await steps[2];
    expect(results).to.eql([ 'Whiskey drink', 'Vodka drink' ]);
    assertions[2].done();
    abortController.abort();
    await delay(0);
    assertions[3].done();
    assertions[4].done();
    await steps[5];
    expect(results).to.eql([ 'Whiskey drink', 'Vodka drink' ]);
  })
})
describe('#useSequentialState()', function() {
  it('should provide new state to component periodically', async function() {
    const steps = createSteps(), assertions = createSteps();
    const results = [];
    function Test() {
      const [ state, on ] = useSequentialState(async function*({ initial }) {
        initial('Pissing the night away');
        try {
          await assertions[0];
          yield 'Whiskey drink';
          steps[1].done();
          await assertions[1];
          yield 'Vodka drink';
          steps[2].done();
          await assertions[2];
          yield 'Lager drink';
          steps[3].done();
          await assertions[3];
          yield 'Cider drink';
          steps[4].done();
        } finally {
          await assertions[4];
          yield 'I get knocked down';
          steps[5].done();
        }
      }, []);
      results.push(state);
      return state;
    }
    const el = createElement(Test);
    const renderer = createTestRenderer(el);
    expect(results).to.eql([ 'Pissing the night away' ]);
    assertions[0].done();
    await steps[1];
    expect(results).to.eql([ 'Pissing the night away', 'Whiskey drink' ]);
    assertions[1].done();
    await steps[2];
    expect(results).to.eql([ 'Pissing the night away', 'Whiskey drink', 'Vodka drink' ]);
    assertions[2].done();
    await steps[3];
    expect(results).to.eql([ 'Pissing the night away', 'Whiskey drink', 'Vodka drink', 'Lager drink' ]);
    assertions[3].done();
    await steps[4];
    assertions[4].done();
    expect(results).to.eql([ 'Pissing the night away', 'Whiskey drink', 'Vodka drink', 'Lager drink', 'Cider drink' ]);
    await steps[5];
    expect(results).to.eql([ 'Pissing the night away', 'Whiskey drink', 'Vodka drink', 'Lager drink', 'Cider drink', 'I get knocked down' ]);
  })
  it('should invoke the finally section of a looping generator on unmount', async function() {
    const steps = createSteps(), assertions = createSteps();
    function Test() {
      const [ state, on ] = useSequentialState(async function*({ manageEvents, initial }) {
        initial('Whiskey drink');
        const [ on, eventual ] = manageEvents();
        try {
          for (;;) {
            await assertions[0];
            yield 'Vodka drink';
            await eventual.knockDown;
          }
        } finally {
          steps[1].done();
        }
      }, []);
      return state;
    }
    const el = createElement(Test);
    const renderer = createTestRenderer(el);
    expect(renderer.toJSON()).to.equal('Whiskey drink');
    assertions[0].done();
    renderer.unmount();
    await steps[1];
    expect(renderer.toJSON()).to.equal(null);
  })
  it('should allow generation of initial state using a function', async function() {
    const steps = createSteps(), assertions = createSteps();
    function Test({ }) {
      const [ state, on ] = useSequentialState(async function*({ initial }) {
        initial(() => 'Whiskey drink');
        await assertions[0];
        yield 'Vodka drink';
        steps[1].done();
      }, []);
      return state;
    }
    const el = createElement(Test);
    const renderer = createTestRenderer(el);
    expect(renderer.toJSON()).to.equal('Whiskey drink');
    assertions[0].done();
    await steps[1];
    expect(renderer.toJSON()).to.equal('Vodka drink');
  })
  it('should immediately throw when dependencies are not given', async function() {
    function Test() {
      const [ state, on ] = useSequentialState(async function*({}) {
      });
    }
    await noConsole(async () => {
      const el = createElement(Test);
      expect(() => createTestRenderer(el)).to.throw();
    });
  })
  it('should throw any error encountered so it can be caught by error boundary', async function() {
    const steps = createSteps(), assertions = createSteps();
    function Test() {
      const [ state, on ] = useSequentialState(async function*({ initial }) {
        initial('Sober');
        await assertions[0];
        yield 'Vodka drink';
        steps[1].done();
        await assertions[1];
        steps[2].throw(new Error('I get knocked down'))
      }, []);
      return state;
    }
    await noConsole(async () => {
      const el = createElement(Test);
      const boundary = createErrorBoundary(el);
      const renderer = createTestRenderer(boundary);
      expect(renderer.toJSON()).to.equal('Sober');
      assertions[0].done();
      await steps[1];
      expect(renderer.toJSON()).to.equal('Vodka drink');
      assertions[1].done();
      await delay(5);
      expect(renderer.toJSON()).to.equal('ERROR');
      expect(caughtAt(boundary)).to.be.an('error');
    })
  })
  it('should throw when initial is called after an await statement', async function() {
    const steps = createSteps(), assertions = createSteps();
    function Test() {
      const [ state, on ] = useSequentialState(async function*({ initial }) {
        await assertions[0];
        initial('Sober');
      }, []);
      return state;
    }
    await noConsole(async () => {
      const el = createElement(Test);
      const boundary = createErrorBoundary(el);
      const renderer = createTestRenderer(boundary);
      expect(renderer.toJSON()).to.equal(null);
      assertions[0].done();
      await delay(5);
      expect(renderer.toJSON()).to.equal('ERROR');
      expect(caughtAt(boundary)).to.be.an('error');
    })
  })
  it('should silently ignore any fetch abort error', async function() {
    const steps = createSteps(), assertions = createSteps();
    function Test() {
      const [ state, on ] = useSequentialState(async function*({ initial }) {
        initial('Sober');
        await assertions[0];
        const abortController = new AbortController();
        const { signal } = abortController;
        abortController.abort();
        try {
          await fetch('https://asddsd.asdasd.sd', { signal });
        } catch (err) {
          expect(isAbortError(err)).to.be.true;
          steps[1].throw(err);
        }
      }, []);
      return state;
    }
    const el = createElement(Test);
    const boundary = createErrorBoundary(el);
    const renderer = createTestRenderer(boundary);
    expect(renderer.toJSON()).to.equal('Sober');
    assertions[0].done();
    await steps[1];
    expect(renderer.toJSON()).to.equal('Sober');
    expect(caughtAt(boundary)).to.be.undefined;
  })
  it('should give null when value from generator is undefined', async function() {
    const steps = createSteps(), assertions = createSteps();
    function Test() {
      const [ state, on ] = useSequentialState(async function*({ initial }) {
        initial('Sober');
        await assertions[0];
        yield undefined;
        steps[1].done();
      }, []);
      return typeof(state);
    }
    const el = createElement(Test);
    const renderer = createTestRenderer(el);
    expect(renderer.toJSON()).to.equal('string');
    assertions[0].done();
    await steps[1];
    for (let i = 0; i < 10; i++) {
      await delay(0);
    }
    expect(renderer.toJSON()).to.equal('object');
  })
  it('should update state immediately where there is an unused slot', async function() {
    function Test() {
      const [ state, on ] = useSequentialState(async function*({ initial, defer }) {
        initial('Sober');
        defer(30);
        await delay(40);  // interruption
        yield 'Drunk';    // 40ms
        await delay(20);
        yield 'Wasted';   // 60ms

      }, []);
      return state;
    }
    const el = createElement(Test);
    const renderer = createTestRenderer(el);
    expect(renderer.toJSON()).to.equal('Sober');
    await delay(45);
    expect(renderer.toJSON()).to.equal('Drunk');
  })
  it('should make use of pending state after call to flush', async function() {
    const steps = createSteps(), assertions = createSteps();
    const results = [];
    let f;
    function Test() {
      const [ state, on ] = useSequentialState(async function*({ defer, flush }) {
        f = flush;
        defer(Infinity);
        await assertions[0];
        yield 'Whiskey drink';
        steps[1].done();
        await assertions[1];
        yield 'Vodka drink';
        steps[2].done();
        await assertions[2];
        yield 'Lager drink';
        steps[3].done();
        await assertions[3];
        yield 'Cider drink';
        steps[4].done();
      }, []);
      results.push(state);
      return state;
    }
    const el = createElement(Test);
    const renderer = createTestRenderer(el);
    expect(results).to.eql([ undefined ]);
    assertions[0].done();
    await steps[1];
    expect(results).to.eql([ undefined ]);
    assertions[1].done();
    await steps[2];
    expect(results).to.eql([ undefined ]);
    f();
    await delay(5);
    expect(results).to.eql([ undefined, 'Vodka drink' ]);
    assertions[2].done();

  })
})
