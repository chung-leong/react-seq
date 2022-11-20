import { expect } from 'chai';
import { withSilentConsole } from './error-handling.js';
import { EventManager } from '../src/event-manager.js';
import { withTestRenderer } from './test-renderer.js';
import { createElement } from 'react';
import { createSteps } from './step.js';
import { createErrorBoundary } from './error-handling.js';
import { delay, throwing, important, useSequential, useSequentialState } from '../index.js';

import {
  Inspector,
  InspectorContext,
  PromiseLogger,
  ConsoleLogger,
} from '../index.js';

describe('#Inspector', function() {
  it('should call onEvent', async function() {
    let event;
    class TestPromiseLogger extends Inspector {
      onEvent(evt) {
        event = evt;
      }
    }
    const inspector = new TestPromiseLogger();
    inspector.dispatch({ type: 'resolve' });
    expect(event).to.have.property('type', 'resolve');
  })
})

describe('#PromiseLogger', function() {
  it('should yield a promise that is fulfilled when a matching event shows up', async function() {
    const inspector = new PromiseLogger();
    const promise = inspector.event(evt => evt.type === 'update');
    inspector.dispatch({ type: 'resolve' });
    const result1 = await Promise.race([ promise, delay(20, { value: 'timeout' }) ]);
    expect(result1).to.equal('timeout');
    inspector.dispatch({ type: 'update' });
    const result2 = await Promise.race([ promise, delay(20, { value: 'timeout' }) ]);
    expect(result2).to.have.property('type', 'update');
  })
  it('should allow use of an object as the predicate', async function() {
    const inspector = new PromiseLogger();
    const promise = inspector.event({ type: 'update' });
    inspector.dispatch({ type: 'resolve' });
    const result1 = await Promise.race([ promise, delay(20, { value: 'timeout' }) ]);
    expect(result1).to.equal('timeout');
    inspector.dispatch({ type: 'update' });
    const result2 = await Promise.race([ promise, delay(20, { value: 'timeout' }) ]);
    expect(result2).to.have.property('type', 'update');
  })
  it('should reject with error from predicate function', async function() {
    const inspector = new PromiseLogger();
    const promise = inspector.event(evt => { throw new Error('Error') });
    inspector.dispatch({ type: 'resolve' });
    await expect(promise).to.eventually.be.rejected;
  })
  it('should match every event use when oldEvents called no parameter', async function() {
     const inspector = new PromiseLogger();
     inspector.dispatch({ type: 'resolve' });
     inspector.dispatch({ type: 'update' });
     inspector.dispatch({ type: 'explode' });
     const list = inspector.oldEvents();
     expect(list.map(e => e.type)).to.eql([ 'resolve', 'update', 'explode' ]);
   })
  it('should throw when event is given invalid argument', function() {
    const inspector = new PromiseLogger();
    expect(() => inspector.event(5)).to.throw();
  })
  it('should ignore old events when newEvent is called', async function() {
    const inspector = new PromiseLogger();
    inspector.dispatch({ type: 'update' });
    const promise = inspector.newEvent(evt => evt.type === 'update');
    const result = await Promise.race([ promise, delay(20, { value: 'timeout' }) ]);
    expect(result).to.equal('timeout');
  })
  it('should return old events when oldEvents is called', async function() {
    const inspector = new PromiseLogger();
    inspector.dispatch({ type: 'update' });
    inspector.dispatch({ type: 'await' });
    inspector.dispatch({ type: 'update' });
    inspector.dispatch({ type: 'await' });
    const result = inspector.oldEvents({ type: 'update' });
    expect(result).to.have.lengthOf(2);
    expect(result.map(e => e.type)).to.eql([ 'update', 'update' ]);
  })
  it('should dump errors encountered in onEvent to console', async function() {
    const console = {};
    await withSilentConsole(async () => {
      class TestPromiseLogger extends PromiseLogger {
        onEvent(evt) {
          throw new Error('error');
        }
      }
      const inspector = new TestPromiseLogger();
      inspector.dispatch({ type: 'resolve' });
    }, console);
    expect(console.error).to.be.an('error');
  })
  it('should quit waiting for event after some time', async function() {
    const inspector = new PromiseLogger();
    const promise = inspector.event({ type: 'await' }, 10);
    await expect(promise).to.eventually.be.rejected;
  })
  it('should receive notification from event manage when an await occurs', async function() {
    const inspector = new PromiseLogger();
    const { on, eventual } = new EventManager({ inspector });
    await eventual.click.for(10).milliseconds;
    const evt = await inspector.event({ type: 'await' }, 100);
    expect(evt).to.have.property('type', 'await');
  })
  it('should receive notification from event manage when awaiting multiple events', async function() {
    const inspector = new PromiseLogger();
    const { on, eventual } = new EventManager({ inspector });
    await eventual.click.or.keyPress.for(10).milliseconds;
    const list = inspector.oldEvents({ type: 'await' });
    expect(list).to.have.lengthOf(1);
    expect(list[0].promise).to.have.property('name', 'click.or.keyPress');
  })
  it('should receive notification from event manage when awaiting external promise', async function() {
    const inspector = new PromiseLogger();
    const { on, eventual } = new EventManager({ inspector });
    const promise = Promise.resolve();
    await eventual(promise).for(10).milliseconds;
    const list = inspector.oldEvents({ type: 'await' });
    expect(list).to.have.lengthOf(1);
    expect(list[0].promise).to.have.property('name', '<promise>');
  })
  it('should receive notification from event manage when an handler is called', async function() {
    const inspector = new PromiseLogger();
    const { on, eventual } = new EventManager({ inspector });
    on.click('hello');
    setTimeout(async () => {
      try {
        await eventual.click;
      } catch (err) {
      }
    }, 10);
    setTimeout(() => {
      on.click(throwing('Bad'));
    }, 20);
    const evt1 = await inspector.event({ type: 'fulfill' }, 100);
    const evt2 = await inspector.event({ type: 'reject' }, 100);
    expect(evt1).to.eql({ type: 'fulfill', name: 'click', value: 'hello', handled: false });
    expect(evt2).to.have.property('handled', true);
  })
  it('should be able to trigger fulfillment of promise', async function() {
    const inspector = new PromiseLogger();
    const { on, eventual } = new EventManager({ inspector });
    const promise = eventual.click;
    promise.then(() => {});
    const evt = await inspector.event({ type: 'await' }, 100);
    evt.promise.resolve('Hello');
    const result = await promise;
    expect(result).to.equal('Hello');
    expect(evt.promise).to.have.property('name', 'click')
  })
  it('should be able to trigger rejection of promise', async function() {
    const inspector = new PromiseLogger();
    const { on, eventual } = new EventManager({ inspector });
    const promise = eventual.click;
    // this is done mostly for code coverage purpose as await doesn't call catch()
    let error;
    promise.catch((err) => {
      error = err;
    });
    setTimeout(async () => await promise, 0);
    const evt = await inspector.newEvent({ type: 'await' }, 100);
    evt.promise.reject(new Error('Error'));
    await expect(promise).to.eventually.be.rejected;
    expect(error).to.be.an('error');
    expect(evt.promise).to.have.property('name', 'click');
  })
  it('should pick up content update events from useSequential', async function() {
    await withTestRenderer(async ({ create, toJSON, act }) => {
      const inspector = new PromiseLogger();
      const { oldEvents } = inspector;
      const steps = createSteps(), assertions = createSteps(act);
      function Test() {
        return useSequential(async function*({ fallback }) {
          fallback('Cow');
          await assertions[0];
          yield 'Pig';
          steps[1].done();
          await assertions[1];
          yield 'Chicken';
          steps[2].done();
          await assertions[2];
          yield 'Monkey';
          steps[3].done();
        }, []);
      }
      const el = createElement(Test);
      const cp = createElement(InspectorContext.Provider, { value: inspector }, el);
      await create(cp);
      await assertions[0].done();
      await steps[1];
      expect(oldEvents({ type: 'content' })).to.have.lengthOf(1);
      expect(toJSON()).to.equal('Pig');
      await assertions[1].done();
      await steps[2];
      expect(toJSON()).to.equal('Chicken');
      expect(oldEvents({ type: 'content' })).to.have.lengthOf(2);
      await assertions[2].done();
      await steps[3];
      expect(toJSON()).to.equal('Monkey');
      expect(oldEvents({ type: 'content' })).to.have.lengthOf(3);
    });
  })
  it('should pick up timeout events from useSequential', async function() {
    await withTestRenderer(async ({ create, toJSON, act }) => {
      const inspector = new PromiseLogger();
      const { oldEvent } = inspector;
      const steps = createSteps(), assertions = createSteps(act);
      function Test() {
        return useSequential(async function*({ fallback, timeout }) {
          fallback('Cow');
          timeout(20, async () => 'Tortoise');
          await assertions[0];
          yield 'Pig';
        }, []);
      }
      const el = createElement(Test);
      const cp = createElement(InspectorContext.Provider, { value: inspector }, el);
      await create(cp);
      await delay(30);
      expect(oldEvent({ type: 'timeout' })).to.have.property('content', 'Tortoise');
      expect(toJSON()).to.equal('Tortoise');
    });
  })
  it('should pick up error events from useSequential', async function() {
    await withTestRenderer(async ({ create, toJSON, act }) => {
      await withSilentConsole(async () => {
        const inspector = new PromiseLogger();
        const { oldEvents } = inspector;
        const steps = createSteps(), assertions = createSteps(act);
        function Test() {
          return useSequential(async function*({ fallback }) {
            fallback('Cow');
            await assertions[0];
            yield 'Pig';
            steps[1].done();
            await assertions[1];
            yield 'Chicken';
            steps[2].done();
          }, []);
        }
        const el = createElement(Test);
        const cp = createElement(InspectorContext.Provider, { value: inspector }, el);
        const boundary = createErrorBoundary(cp);
        await create(boundary);
        expect(toJSON()).to.equal('Cow');
        await assertions[0].done();
        await steps[1];
        expect(toJSON()).to.equal('Pig');
        await assertions[1].fail(new Error('ERROR'))
        await delay(0);
        expect(oldEvents({ type: 'error' })).to.have.lengthOf(1);
      });
    });
  })
  it('should pick up abort event from useSequential', async function() {
    await withTestRenderer(async ({ create, unmount, toJSON, act }) => {
      const inspector = new PromiseLogger();
      const { oldEvents } = inspector;
      const steps = createSteps(), assertions = createSteps(act);
      function Test() {
        return useSequential(async function*({ fallback }) {
          fallback('Cow');
          await assertions[0];
          yield 'Pig';
          steps[1].done();
        }, []);
      }
      const el = createElement(Test);
      const cp = createElement(InspectorContext.Provider, { value: inspector }, el);
      await create(cp);
      await unmount();
      expect(oldEvents({ type: 'abort' })).to.have.lengthOf(1);
    });
  })
  it('should pick up content update events from useSequentialState', async function() {
    await withTestRenderer(async ({ create, toJSON, act }) => {
      const inspector = new PromiseLogger();
      const { oldEvents } = inspector;
      const steps = createSteps(), assertions = createSteps(act);
      function Test() {
        const state = useSequentialState(async function*({ initial }) {
          initial('Cow');
          await assertions[0];
          yield 'Pig';
          steps[1].done();
          await assertions[1];
          yield 'Chicken';
          steps[2].done();
          await assertions[2];
          yield 'Monkey';
          steps[3].done();
        }, []);
        return state;
      }
      const el = createElement(Test);
      const cp = createElement(InspectorContext.Provider, { value: inspector }, el);
      await create(cp);
      expect(oldEvents({ type: 'state' })).to.have.lengthOf(1);
      await assertions[0].done();
      await steps[1];
      expect(oldEvents({ type: 'state' })).to.have.lengthOf(2);
      expect(toJSON()).to.equal('Pig');
      await assertions[1].done();
      await steps[2];
      expect(toJSON()).to.equal('Chicken');
      expect(oldEvents({ type: 'state' })).to.have.lengthOf(3);
      await assertions[2].done();
      await steps[3];
      expect(toJSON()).to.equal('Monkey');
      expect(oldEvents({ type: 'state' })).to.have.lengthOf(4);
      const results = oldEvents().map(e => e.state);
      expect(results).to.eql([ 'Cow', 'Pig', 'Chicken', 'Monkey' ]);
    });
  })
  it('should pick up error events from useSequentialState', async function() {
    await withTestRenderer(async ({ create, toJSON, act }) => {
      await withSilentConsole(async () => {
        const inspector = new PromiseLogger();
        const { oldEvents } = inspector;
        const steps = createSteps(), assertions = createSteps(act);
        function Test() {
          const state = useSequentialState(async function*({ initial }) {
            initial('Cow');
            await assertions[0];
            yield 'Pig';
            steps[1].done();
            await assertions[1];
            yield 'Chicken';
            steps[2].done();
          }, []);
          return state;
        }
        const el = createElement(Test);
        const cp = createElement(InspectorContext.Provider, { value: inspector }, el);
        const boundary = createErrorBoundary(cp);
        await create(boundary);
        await assertions[0].done();
        await steps[1];
        await assertions[1].fail(new Error('ERROR'))
        expect(oldEvents({ type: 'error' })).to.have.lengthOf(1);
      });
    });
  })
  it('should pick up abort event from useSequentialState', async function() {
    await withTestRenderer(async ({ create, unmount, toJSON, act }) => {
      const inspector = new PromiseLogger();
      const steps = createSteps(), assertions = createSteps(act);
      function Test() {
        const state = useSequentialState(async function*({ initial }) {
          initial('Cow');
          await assertions[0];
          yield 'Pig';
          steps[1].done();
        }, []);
        return state;
      }
      const el = createElement(Test);
      const cp = createElement(InspectorContext.Provider, { value: inspector }, el);
      await create(cp);
      await unmount();
      expect(inspector.oldEvents({ type: 'abort' })).to.have.lengthOf(1);
    });
  })
})

describe('#ConsoleLogger', function() {
  it('should handle content update events', async function() {
    await withTestRenderer(async ({ create, act }) => {
      const console = {};
      await withSilentConsole(async () => {
        const inspector = new ConsoleLogger();
        const steps = createSteps(), assertions = createSteps(act);
        function Test() {
          return useSequential(async function*({ fallback }) {
            fallback('Cow');
            await assertions[0];
            yield 'Pig';
            steps[1].done();
          }, []);
        }
        const el = createElement(Test);
        const cp = createElement(InspectorContext.Provider, { value: inspector }, el);
        await create(cp);
        await assertions[0].done();
        await steps[1];
        inspector.stop();
      }, console);
      expect(console.log).to.include('Content update');
    });
  })
  it('should handle state update events', async function() {
    await withTestRenderer(async ({ create, act }) => {
      const console = {};
      await withSilentConsole(async () => {
        const inspector = new ConsoleLogger();
        const steps = createSteps(), assertions = createSteps(act);
        function Test() {
          const state = useSequentialState(async function*({ initial }) {
            initial('Cow');
            await assertions[0];
            yield 'Pig';
            steps[1].done();
          }, []);
        }
        const el = createElement(Test);
        const cp = createElement(InspectorContext.Provider, { value: inspector }, el);
        await create(cp);
        inspector.stop();
      }, console);
      expect(console.log).to.include('State update');
    });
  })
  it('should handle timeout events', async function() {
    await withTestRenderer(async ({ create, act }) => {
      const console = { log: [] };
      await withSilentConsole(async () => {
        const inspector = new ConsoleLogger();
        const steps = createSteps(), assertions = createSteps(act);
        function Test() {
          return useSequential(async function*({ fallback, timeout }) {
            fallback('Cow');
            timeout(20, async () => 'Tortoise');
            await assertions[0];
            yield 'Pig';
          }, []);
        }
        const el = createElement(Test);
        const cp = createElement(InspectorContext.Provider, { value: inspector }, el);
        await create(cp);
        await delay(30);
        inspector.stop();
      }, console);
      expect(console.log[0]).to.include('Timeout');
      expect(console.log[1]).to.include('Content update');
    });
  })
  it('should handle error events', async function() {
    await withTestRenderer(async ({ create, act }) => {
      const console = {};
      await withSilentConsole(async () => {
        const inspector = new ConsoleLogger();
        const steps = createSteps(), assertions = createSteps(act);
        function Test() {
          const state = useSequentialState(async function*({ initial }) {
            initial('Cow');
            await assertions[0];
            yield 'Pig';
            steps[1].done();
            await assertions[1];
            yield 'Chicken';
            steps[2].done();
          }, []);
          return state;
        }
        const el = createElement(Test);
        const cp = createElement(InspectorContext.Provider, { value: inspector }, el);
        const boundary = createErrorBoundary(cp);
        await create(boundary);
        await assertions[0].done();
        await steps[1];
        await assertions[1].fail(new Error('ERROR'))
        inspector.stop();
      }, console);
      expect(console.log).to.include('Error');
    });
  })
  it('should handle abort event', async function() {
    await withTestRenderer(async ({ create, unmount, act }) => {
      const console = {};
      await withSilentConsole(async () => {
        const inspector = new ConsoleLogger();
        const steps = createSteps(), assertions = createSteps(act);
        function Test() {
          const state = useSequentialState(async function*({ initial }) {
            initial('Cow');
            await assertions[0];
            yield 'Pig';
            steps[1].done();
          }, []);
          return state;
        }
        const el = createElement(Test);
        const cp = createElement(InspectorContext.Provider, { value: inspector }, el);
        await create(cp);
        await unmount();
        inspector.stop();
      }, console);
      expect(console.log).to.include('aborted');
    });
  })
  it('should handle promise await events', async function() {
    await withTestRenderer(async ({ create, act }) => {
      const console = {};
      await withSilentConsole(async () => {
        const inspector = new ConsoleLogger();
        const steps = createSteps(), assertions = createSteps(act);
        function Test() {
          return useSequential(async function*({ fallback, manageEvents }) {
            fallback('Cow');
            const [ on, eventual ] = manageEvents();
            await eventual.click.or(assertions[0]);
            yield 'Pig';
            steps[1].done();
          }, []);
        }
        const el = createElement(Test);
        const cp = createElement(InspectorContext.Provider, { value: inspector }, el);
        await create(cp);
        inspector.stop();
      }, console);
      expect(console.log).to.include('Awaiting');
    });
  })
  it('should handle fulfillment events with no listener', async function() {
    await withTestRenderer(async ({ create, act }) => {
      const console = {};
      await withSilentConsole(async () => {
        const inspector = new ConsoleLogger();
        const steps = createSteps(), assertions = createSteps(act);
        function Test() {
          return useSequential(async function*({ fallback, manageEvents }) {
            fallback('Cow');
            const [ on, eventual ] = manageEvents();
            on.click('Hello');
            await assertions[0];
            yield 'Pig';
            steps[1].done();
          }, []);
        }
        const el = createElement(Test);
        const cp = createElement(InspectorContext.Provider, { value: inspector }, el);
        await create(cp);
        inspector.stop();
      }, console);
      expect(console.log).to.include('Fulfillment');
      expect(console.log).to.include('no one cared');
    });
  })
  it('should handle fulfillment events with important value', async function() {
    await withTestRenderer(async ({ create, act }) => {
      const console = {};
      await withSilentConsole(async () => {
        const inspector = new ConsoleLogger();
        const steps = createSteps(), assertions = createSteps(act);
        function Test() {
          return useSequential(async function*({ fallback, manageEvents }) {
            fallback('Cow');
            const [ on, eventual ] = manageEvents();
            on.click(important('Hello'));
            await assertions[0];
            yield 'Pig';
            steps[1].done();
          }, []);
        }
        const el = createElement(Test);
        const cp = createElement(InspectorContext.Provider, { value: inspector }, el);
        await create(cp);
        inspector.stop();
      }, console);
      expect(console.log).to.include('Fulfillment');
      expect(console.log).to.not.include('no one cared');
    });
  })
  it('should handle rejection events with no listener', async function() {
    await withTestRenderer(async ({ create, act }) => {
      const console = {};
      await withSilentConsole(async () => {
        const inspector = new ConsoleLogger();
        const steps = createSteps(), assertions = createSteps(act);
        function Test() {
          return useSequential(async function*({ fallback, manageEvents }) {
            fallback('Cow');
            const [ on, eventual ] = manageEvents();
            on.click(throwing('Hello'));
            await assertions[0];
            yield 'Pig';
            steps[1].done();
          }, []);
        }
        const el = createElement(Test);
        const cp = createElement(InspectorContext.Provider, { value: inspector }, el);
        await create(cp);
        inspector.stop();
      }, console);
      expect(console.log).to.include('Rejection');
      expect(console.log).to.include('no one cared');
    });
  })
  it('should handle rejection events with important error', async function() {
    await withTestRenderer(async ({ create, act }) => {
      const console = {};
      await withSilentConsole(async () => {
        const inspector = new ConsoleLogger();
        const steps = createSteps(), assertions = createSteps(act);
        function Test() {
          return useSequential(async function*({ fallback, manageEvents }) {
            fallback('Cow');
            const [ on, eventual ] = manageEvents();
            on.click(throwing(important('Hello')));
            await assertions[0];
            yield 'Pig';
            steps[1].done();
          }, []);
        }
        const el = createElement(Test);
        const cp = createElement(InspectorContext.Provider, { value: inspector }, el);
        await create(cp);
        inspector.stop();
      }, console);
      expect(console.log).to.include('Rejection');
      expect(console.log).to.not.include('no one cared');
    });
  })
  it('should handle unrecognized events', async function() {
    const console = {};
    await withSilentConsole(async () => {
      const inspector = new ConsoleLogger();
      inspector.dispatch({ type: 'dingo' });
      inspector.stop();
    }, console);
    expect(console.log).to.include('Unknown');
  })
})
