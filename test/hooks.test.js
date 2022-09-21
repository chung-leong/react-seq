import { expect } from 'chai';
import { html } from 'htm/react';
import { Suspense } from 'react';
import TestRenderer from 'react-test-renderer';

import {
  useSequence,
} from '../src/hooks.js';

describe('Hooks', function() {
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
        await delay(100);
        expect(testRenderer.toJSON()).to.equal('Pig');
      })

    })
  })
})

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
