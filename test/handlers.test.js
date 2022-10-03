import { expect } from 'chai';
import { html } from 'htm/react';
import TestRenderer from 'react-test-renderer';
import { delay } from '../src/utils.js';

import {
  useHandlers,
} from '../src/handlers.js';

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
