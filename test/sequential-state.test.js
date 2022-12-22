import { expect } from 'chai';
import { createElement, StrictMode } from 'react';
import { withTestRenderer } from './test-renderer.js';
import { withReactDOM } from './dom-renderer.js';
import { createSteps, loopThrough } from './step.js';
import { createErrorBoundary, withSilentConsole, caughtAt } from './error-handling.js';
import { delay } from '../index.js';
import { isAbortError } from '../src/utils.js';

import {
  sequentialState,
  useSequentialState,
} from '../index.js';

describe('#sequentialState()', function() {
  it('should invoke function with new state', async function() {
    await withTestRenderer(async ({ create, toJSON, act }) => {
      const steps = createSteps(), assertions = createSteps(act);
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
      const { initialState, abortManager: am } = sequentialState(createDrinks, setState, setError);
      am.onMount();
      expect(initialState).to.be.undefined;
      await assertions[0].done();
      await steps[1];
      expect(results).to.eql([ 'Whiskey drink' ]);
      await assertions[1].done();
      await steps[2];
      expect(results).to.eql([ 'Whiskey drink', 'Vodka drink' ]);
      await assertions[2].done();
      await steps[3];
      expect(results).to.eql([ 'Whiskey drink', 'Vodka drink', 'Lager drink' ]);
      await assertions[3].done();
      await steps[4];
      expect(results).to.eql([ 'Whiskey drink', 'Vodka drink', 'Lager drink', 'Cider drink' ]);
    });
  })
  it('should invoke function with error when it occurs', async function() {
    await withTestRenderer(async ({ create, toJSON, act }) => {
      const steps = createSteps(), assertions = createSteps(act);
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
      const { initialState, abortManager: am } = sequentialState(createDrinks, setState, setError);
      am.onMount();
      expect(initialState).to.be.undefined;
      await assertions[0].done();
      await steps[1];
      expect(results).to.eql([ 'Whiskey drink' ]);
      await assertions[1].done();
      await steps[2];
      expect(results).to.eql([ 'Whiskey drink', 'Vodka drink' ]);
      await assertions[2].done();
      await steps[3];
      expect(errors[0]).to.be.an('error');
    });
  })
  it('should return the initial state', async function() {
    await withTestRenderer(async ({ create, toJSON, act }) => {
      const steps = createSteps(), assertions = createSteps(act);
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
      const { initialState, abortManager: am } = sequentialState(createDrinks, setState, setError);
      am.onMount();
      expect(initialState).to.equal('Sober');
      for (let i = 0; i <= 4; i++) {
        await assertions[i].done();
      }
      await steps[4];
      expect(results).to.eql([ 'Whiskey drink', 'Vodka drink', 'Lager drink', 'Cider drink' ]);
    });
  })
  it('should allow the deferrment of state update', async function() {
    await withTestRenderer(async ({ create, toJSON, act }) => {
      const steps = createSteps(), assertions = createSteps(act);
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
      const { initialState, abortManager: am } = sequentialState(createDrinks, setState, setError);
      am.onMount();
      await assertions[0].done();
      await steps[1];
      expect(results).to.eql([]);
      await assertions[1].done();
      await steps[2];
      expect(results).to.eql([]);
      await assertions[2].done();
      await steps[3];
      expect(results).to.eql([]);
      await assertions[3].done();
      await steps[4];
      expect(results).to.eql([ 'Cider drink' ]);
    });
  })
  it('should interrupt iteration of generator when abort controller is invoked', async function() {
    await withTestRenderer(async ({ create, toJSON, act }) => {
      const steps = createSteps(), assertions = createSteps(act);
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
      const { abortManager } = sequentialState(createDrinks, setState, setError);
      expect(abortManager).to.be.instanceOf(AbortController);
      abortManager.onMount();
      await assertions[0].done();
      await steps[1];
      expect(results).to.eql([ 'Whiskey drink' ]);
      await assertions[1].done();
      await steps[2];
      expect(results).to.eql([ 'Whiskey drink', 'Vodka drink' ]);
      await assertions[2].done();
      abortManager.abort();
      await assertions[3].done();
      await assertions[4].done();
      await steps[5];
      expect(results).to.eql([ 'Whiskey drink', 'Vodka drink', 'Lager drink' ]);
    });
  })
  it('should create only a single instance of event manager', async function() {
    await withTestRenderer(async ({ create, toJSON, act }) => {
      const steps = createSteps(), assertions = createSteps(act);
      let triggerClick;
      let on1, on2, eventual1, eventual2;
      sequentialState(async function*({ manageEvents }) {
        await assertions[0];
        [ on1, eventual1 ] = manageEvents();
        [ on2, eventual2 ] = manageEvents();
        steps[1].done();
        yield 'Hello';
      });
      await assertions[0].done();
      await steps[1];
      expect(on1).to.not.be.undefined;
      expect(on1).to.equal(on2);
      expect(eventual1).to.not.be.undefined;
      expect(eventual1).to.equal(eventual2);
    });
  })
})

describe('#useSequentialState()', function() {
  it('should provide new state to component periodically', async function() {
    await withTestRenderer(async ({ create, toJSON, act }) => {
      const steps = createSteps(), assertions = createSteps(act);
      const results = [];
      function Test() {
        const state = useSequentialState(async function*({ initial }) {
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
      await create(el);
      expect(results).to.eql([ 'Pissing the night away' ]);
      await assertions[0].done();
      await steps[1];
      expect(results).to.eql([ 'Pissing the night away', 'Whiskey drink' ]);
      await assertions[1].done();
      await steps[2];
      expect(results).to.eql([ 'Pissing the night away', 'Whiskey drink', 'Vodka drink' ]);
      await assertions[2].done();
      await steps[3];
      expect(results).to.eql([ 'Pissing the night away', 'Whiskey drink', 'Vodka drink', 'Lager drink' ]);
      await assertions[3].done();
      await steps[4];
      expect(results).to.eql([ 'Pissing the night away', 'Whiskey drink', 'Vodka drink', 'Lager drink', 'Cider drink' ]);
      await assertions[4].done();
      await steps[5];
      expect(results).to.eql([ 'Pissing the night away', 'Whiskey drink', 'Vodka drink', 'Lager drink', 'Cider drink', 'I get knocked down' ]);
    });
  })
  it('should invoke the finally section of a looping generator on unmount', async function() {
    await withTestRenderer(async ({ create, unmount, toJSON, act }) => {
      const steps = createSteps(), assertions = createSteps(act);
      function Test() {
        const state = useSequentialState(async function*({ manageEvents, initial }) {
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
      await create(el);
      expect(toJSON()).to.equal('Whiskey drink');
      await assertions[0].done();
      await unmount();
      await steps[1];
      expect(toJSON()).to.equal(null);
    });
  })
  it('should allow generation of initial state using a function', async function() {
    await withTestRenderer(async ({ create, toJSON, act }) => {
      const steps = createSteps(), assertions = createSteps(act);
      function Test({ }) {
        const state = useSequentialState(async function*({ initial }) {
          initial(() => 'Whiskey drink');
          await assertions[0];
          yield 'Vodka drink';
          steps[1].done();
        }, []);
        return state;
      }
      const el = createElement(Test);
      await create(el);
      expect(toJSON()).to.equal('Whiskey drink');
      await assertions[0].done();
      await steps[1];
      expect(toJSON()).to.equal('Vodka drink');
    });
  })
  it('should immediately throw when dependencies are not given', async function() {
    await withTestRenderer(async ({ create, toJSON }) => {
      function Test() {
        const state = useSequentialState(async function*({}) {
        });
      }
      await withSilentConsole(async () => {
        const el = createElement(Test);
        expect(() => create(el)).to.throw();
      });
    });
  })
  it('should throw any error encountered so it can be caught by error boundary', async function() {
    await withTestRenderer(async ({ create, toJSON, act }) => {
      const steps = createSteps(), assertions = createSteps(act);
      function Test() {
        const state = useSequentialState(async function*({ initial }) {
          initial('Sober');
          await assertions[0];
          yield 'Vodka drink';
          steps[1].done();
          await assertions[1];
          steps[2].throw(new Error('I get knocked down'))
        }, []);
        return state;
      }
      await withSilentConsole(async () => {
        const el = createElement(Test);
        const boundary = createErrorBoundary(el);
        await create(boundary);
        expect(toJSON()).to.equal('Sober');
        await assertions[0].done();
        await steps[1];
        expect(toJSON()).to.equal('Vodka drink');
        await assertions[1].done();
        await steps[2];
        expect(toJSON()).to.equal('ERROR');
        expect(caughtAt(boundary)).to.be.an('error');
      });
    });
  })
  it('should throw if dependecies are not specified', async function() {
    await withTestRenderer(async ({ create, toJSON, act }) => {
      const steps = createSteps(), assertions = createSteps(act);
      function Test() {
        const state = useSequentialState(async function*({ initial }) {
        });
        return state;
      }
      await withSilentConsole(async () => {
        const el = createElement(Test);
        const boundary = createErrorBoundary(el);
        await create(boundary);
        expect(toJSON()).to.equal('ERROR');
        expect(caughtAt(boundary)).to.be.an('error');
      });
    });
  })
  it('should throw when initial is called after an await statement', async function() {
    await withTestRenderer(async ({ create, toJSON, act }) => {
      const steps = createSteps(), assertions = createSteps(act);
      function Test() {
        const state = useSequentialState(async function*({ initial }) {
          await assertions[0];
          setTimeout(() => steps[1].done(), 0);
          initial('Sober');
        }, []);
        return state;
      }
      await withSilentConsole(async () => {
        const el = createElement(Test);
        const boundary = createErrorBoundary(el);
        await create(boundary);
        expect(toJSON()).to.equal(null);
        await assertions[0].done();
        await steps[1];
        expect(toJSON()).to.equal('ERROR');
        expect(caughtAt(boundary)).to.be.an('error');
      });
    });
  })
  it('should silently ignore any fetch abort error', async function() {
    await withTestRenderer(async ({ create, toJSON, act }) => {
      const steps = createSteps(), assertions = createSteps(act);
      function Test() {
        const state = useSequentialState(async function*({ initial }) {
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
      await create(boundary);
      expect(toJSON()).to.equal('Sober');
      await assertions[0].done();
      await steps[1];
      expect(toJSON()).to.equal('Sober');
      expect(caughtAt(boundary)).to.be.undefined;
    });
  })
  it('should give null when value from generator is undefined', async function() {
    await withTestRenderer(async ({ create, toJSON, act }) => {
      const steps = createSteps(), assertions = createSteps(act);
      function Test() {
        const state = useSequentialState(async function*({ initial }) {
          initial('Sober');
          await assertions[0];
          yield undefined;
          steps[1].done();
        }, []);
        return typeof(state);
      }
      const el = createElement(Test);
      await create(el);
      expect(toJSON()).to.equal('string');
      await assertions[0].done();
      await steps[1];
      expect(toJSON()).to.equal('object');
    });
  })
  it('should update state immediately where there is an unused slot', async function() {
    await withTestRenderer(async ({ create, toJSON, act }) => {
      function Test() {
        const state = useSequentialState(async function*({ initial, defer }) {
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
      await create(el);
      expect(toJSON()).to.equal('Sober');
      await delay(45);
      expect(toJSON()).to.equal('Drunk');
    });
  })
  it('should make use of pending state after call to flush', async function() {
    await withTestRenderer(async ({ create, toJSON, act }) => {
      const steps = createSteps(), assertions = createSteps(act);
      const results = [];
      let f;
      function Test() {
        const state = useSequentialState(async function*({ defer, flush }) {
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
      await create(el);
      expect(results).to.eql([ undefined ]);
      await assertions[0].done();
      await steps[1];
      expect(results).to.eql([ undefined ]);
      await assertions[1].done();
      await steps[2];
      expect(results).to.eql([ undefined ]);
      f();
      await delay(5);
      expect(results).to.eql([ undefined, 'Vodka drink' ]);
      await assertions[2].done();
    });
  })
  it('should fulfill promise returned by mount', async function() {
    let promise;
    await withTestRenderer(async ({ create }) => {
      function Test() {
        const state = useSequentialState(async function*({ mount }) {
          promise = mount();
          yield 'Chicken';
        }, []);
        return state;
      }
      const el = createElement(Test);
      await create(el);
      expect(promise).to.be.a('promise');
      await expect(promise).to.eventually.be.fulfilled;
    });
  })
  it('should flush state when awaiting on a promise', async function() {
    await withTestRenderer(async ({ create, update, toJSON, act }) => {
      const steps = createSteps(), assertions = createSteps(act);
      function Test() {
        return useSequentialState(async function*({ defer, initial, manageEvents }) {
          initial('Cow');
          const [ on, eventual ] = manageEvents();
          for (;;) {
            defer(100);
            await assertions[0];
            yield 'Pig';
            steps[1].done();
            await assertions[1];
            yield 'Chicken';
            steps[2].done();
            await assertions[2];
            yield 'Bear';
            steps[3].done();
            await eventual.click.or.keyPress.or.peaceInPalestine;
          }
        }, []);
      }
      const el = createElement(Test);
      await create(el);
      expect(toJSON()).to.eql('Cow');
      await assertions[0].done();
      await steps[1];
      expect(toJSON()).to.eql('Cow');
      await assertions[1].done();
      await steps[2];
      expect(toJSON()).to.eql('Cow');
      await assertions[2].done();
      await steps[3];
      expect(toJSON()).to.eql('Bear');
    });
  })
  it('should disable deferrment after event manager reports an await', async function() {
    await withTestRenderer(async ({ create, update, toJSON, act }) => {
      const steps = createSteps(), assertions = createSteps(act);
      function Test() {
        return useSequentialState(async function*({ defer, initial, manageEvents }) {
          initial('Cow');
          const [ on, eventual ] = manageEvents();
          defer(Infinity);
          await assertions[0];
          yield 'Pig';
          steps[1].done();
          await assertions[1];
          yield 'Chicken';
          steps[2].done();
          await assertions[2];
          yield 'Bear';
          steps[3].done();
          eventual.click.or.keyPress.or.peaceInPalestine.then(() => {});
          await assertions[3];
          yield 'Dingo';
          // resolving the promise means deferrment is turned back on
          on.peaceInPalestine('snow in hell');
          steps[4].done();
          await assertions[4];
          yield 'Rabbit';
          steps[5].done();
          await assertions[5];
          yield 'Donkey';
          steps[6].done();
        }, []);
      }
      const el = createElement(Test);
      await create(el);
      expect(toJSON()).to.eql('Cow');
      await assertions[0].done();
      await steps[1];
      expect(toJSON()).to.eql('Cow');
      await assertions[1].done();
      await steps[2];
      expect(toJSON()).to.eql('Cow');
      await assertions[2].done();
      await steps[3];
      expect(toJSON()).to.eql('Bear');
      await assertions[3].done();
      await steps[4];
      expect(toJSON()).to.eql('Dingo');
      await assertions[4].done();
      await steps[5];
      expect(toJSON()).to.eql('Dingo');
      await assertions[5].done();
      await steps[6];
      expect(toJSON()).to.eql('Donkey');
    });
  })
  it('should stop updating as soon as it unmounts', async function() {
    await withReactDOM(async ({ render, node, act }) => {
      const steps = createSteps(), assertions = createSteps(act);
      const states = [];
      function Test({ cat }) {
        const state = useSequentialState(async function*({ initial, manageEvents }) {
          initial({ animal: 'Cow' });
          const [ on, eventual ] = manageEvents();
          await assertions[0];
          yield { animal: `${cat} #1` };
          steps[1].done();
          await assertions[1];
          yield { animal: `${cat} #2` };
          steps[2].done();
          await assertions[2];
          yield { anima: `${cat} #3` };
          steps[3].done();
        }, [ cat ]);
        return state.animal;
      }
      const el1 = createElement(Test, { cat: 'Phil' });
      await render(createElement(StrictMode, {}, el1));
      expect(node.textContent).to.eql('Cow');
      await assertions[0].done();
      await steps[1];
      expect(node.textContent).to.eql('Phil #1');
      const el2 = createElement(Test, { cat: 'Nick' })
      const promise = render(createElement(StrictMode, {}, el2));
      expect(node.textContent).to.eql('Cow');
      await promise;
      expect(node.textContent).to.eql('Nick #1');
      await assertions[1].done();
      await steps[2];
      expect(node.textContent).to.eql('Nick #2');
    });
  })
  it('should allow manual rejection of promise', async function() {
    await withTestRenderer(async ({ create, update, toJSON, act }) => {
      let r;
      function Test() {
        const state = useSequentialState(async function*({ manageEvents, reject }) {
          r = reject;
          const [ on, eventual ] = manageEvents();
          try {
            await eventual.click.or.keyPress.or.peaceInPalestine;
            yield 'Hello world';
          } catch (err) {
            yield err.message;
          }
        }, []);
        return state;
      }
      const el = createElement(Test);
      await create(el);
      expect(toJSON()).to.equal(null);
      expect(r).to.be.a('function');
      await act(() => r(new Error('This sucks!')));
      expect(toJSON()).to.equal('This sucks!');
    })
  })
})
