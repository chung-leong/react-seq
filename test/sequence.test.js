import { expect } from 'chai';
import { html } from 'htm/react';
import { Suspense } from 'react';
import TestRenderer from 'react-test-renderer';
import { delay } from '../src/utils.js';

import {
  useSequence,
} from '../src/sequence.js';

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
    it('should return a component that uses fallback', async function() {
      const stoppage = createStoppage();
      function Test() {
        const seq = useSequence(20, []);
        return seq(async function *({ fallback }) {
          fallback('Cow');
          yield 'Pig';
          await stoppage;
          yield 'Chicken';
        });
      }
      const testRenderer = TestRenderer.create(html`<${Test} />`);
      expect(testRenderer.toJSON()).to.equal('Cow');
      await delay(30);
      expect(testRenderer.toJSON()).to.equal('Pig');
      stoppage.resolve();
      await delay(30);
      expect(testRenderer.toJSON()).to.equal('Chicken');
    })

  })
})

function createStoppage() {
  let r;
  const promise = new Promise((resolve, reject) => r = [ resolve, reject ]);
  promise.resolve = r[0];
  promise.reject = r[1];
  return promise;
}
