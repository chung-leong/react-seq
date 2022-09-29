import { expect } from 'chai';
import { html } from 'htm/react';
import { Suspense } from 'react';
import TestRenderer from 'react-test-renderer';

import {
  useHandlers,
  useSequence,
} from '../src/hooks.js';

describe('Hooks', function() {
  describe('#useHandlers()', function() {
    it('should return two proxies, one yielding functions, the other promises', async function() {
      let handler1, handler2;
      let promise1, promise2;
      function Test() {
        const [ on, events ] = useHandlers();
        handler1 = on.click;
        handler2 = on.change;
        promise1 = events.click;
        promise2 = events.change;
        return 'Hello';
      }
      const testRenderer = TestRenderer.create(html`<${Test} />`);
      expect(handler1).to.be.a('function');
      expect(handler2).to.be.a('function');
      expect(promise1).to.be.a('promise');
      expect(promise2).to.be.a('promise');
      handler1('hello');
      const text = await promise1;
      expect(text).to.equal('hello');
      const timeout = await Promise.race([ promise2, delay(20) ]);
      expect(timeout).to.be.undefined;
    })
    it('should yield promises than fulfill after callbacks are done', async function() {
      let handler;
      let promise;
      const animals = [];
      function Test() {
        const [ on, events ] = useHandlers();
        handler = on.click;
        promise = events.click;
        on.click = async () => {
          animals.push('dog');
          await delay(20);
        };
        return 'Hello';
      }
      const testRenderer = TestRenderer.create(html`<${Test} />`);
      promise.then(() => animals.push('cat'));
      handler();
      await delay(10)
      expect(animals).to.eql([ 'dog' ]);
      await promise;
      expect(animals).to.eql([ 'dog', 'cat' ]);
    })
    it('should yield a new promise after previous one has resolved', async function() {
      let promise1, promise2;
      const animals = [];
      function Test() {
        const [ on, events ] = useHandlers();
        promise1 = events.click;
        setTimeout(() => {
          on.click();
          promise2 = events.click;
          setTimeout(() => {
            on.click();
          }, 10);
        }, 10);
        return 'Hello';
      }
      const testRenderer = TestRenderer.create(html`<${Test} />`);
      await promise1;
      await promise2;
      expect(promise1).to.be.a('promise');
      expect(promise2).to.be.a('promise');
      expect(promise2).to.not.equal(promise1);
    })
  })
  describe('#useSequence()', function() {
    it('should return a function', function() {
      let f;
      function Test() {
        f = useSequence();
        return 'Hello';
      }
      const testRenderer = TestRenderer.create(html`<${Test} />`);
      expect(f).to.be.instanceOf(Function);
      expect(f.context).to.be.instanceOf(Object);
      expect(testRenderer.toJSON()).to.equal('Hello');
    })
    describe('seq()', function() {
      it('should return a component that uses the first item from the generator as its content', async function() {
        function Test() {
          const seq = useSequence();
          return seq(async function *() {
            yield 'Pig';
          });
        }
        const testRenderer = TestRenderer.create(html`<${Suspense} fallback="Cow"><${Test} /></<${Suspense}}`);
        expect(testRenderer.toJSON()).to.equal('Cow');
        await delay(10);
        expect(testRenderer.toJSON()).to.equal('Pig');
      })
      it('should return a component that defers rendering', async function() {
        const stoppage = createStoppage();
        function Test() {
          const seq = useSequence(50);
          return seq(async function *() {
            yield 'Pig';
            await stoppage;
            yield 'Chicken';
          });
        }
        const testRenderer = TestRenderer.create(html`<${Suspense} fallback="Cow"><${Test} /></<${Suspense}}`);
        expect(testRenderer.toJSON()).to.equal('Cow');
        await delay(30);
        expect(testRenderer.toJSON()).to.equal('Cow');
        stoppage.resolve();
        await delay(10);
        expect(testRenderer.toJSON()).to.equal('Chicken');
      })
      it('should return a component that displays new contents intermittently', async function() {
        const stoppage = createStoppage();
        function Test() {
          const seq = useSequence(50);
          return seq(async function *() {
            yield 'Pig';
            await delay(70);
            yield 'Duck';
            await stoppage;
            yield 'Chicken';
          });
        }
        const testRenderer = TestRenderer.create(html`<${Suspense} fallback="Cow"><${Test} /></<${Suspense}}`);
        expect(testRenderer.toJSON()).to.equal('Cow');
        await delay(30);
        expect(testRenderer.toJSON()).to.equal('Cow');
        await delay(30);
        expect(testRenderer.toJSON()).to.equal('Pig');
        await delay(50);
        expect(testRenderer.toJSON()).to.equal('Duck');
        stoppage.resolve();
        await delay(10);
        expect(testRenderer.toJSON()).to.equal('Chicken');
      })
      it('should return a component that eventually shows the final item from the generator', async function() {
        const stoppage = createStoppage();
        function Test() {
          const seq = useSequence(20);
          return seq(async function *() {
            yield 'Pig';
            await stoppage;
            yield 'Chicken';
          });
        }
        const testRenderer = TestRenderer.create(html`<${Suspense} fallback="Cow"><${Test} /></<${Suspense}}`);
        expect(testRenderer.toJSON()).to.equal('Cow');
        await delay(30);
        expect(testRenderer.toJSON()).to.equal('Pig');
        stoppage.resolve();
        await delay(30);
        expect(testRenderer.toJSON()).to.equal('Chicken');
      })
    })
  })
})

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function createStoppage() {
  let r;
  const promise = new Promise((resolve, reject) => r = [ resolve, reject ]);
  promise.resolve = r[0];
  promise.reject = r[1];
  return promise;
}
