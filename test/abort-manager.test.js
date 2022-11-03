import { expect } from 'chai';
import { delay } from '../index.js';

import {
  AbortManager,
} from '../src/abort-manager.js';

describe('#AbortManager', function() {
  it('should trigger abort when onUnmount is called', async function() {
    const manager = new AbortManager();
    const { signal } = manager;
    manager.onUnmount();
    const promise = new Promise(resolve => signal.addEventListener('abort', resolve, { once: true }));
    const result = await Promise.race([ promise, delay(20, { value: 'timeout' }) ]);
    expect(result).to.have.property('type', 'abort');
  })
  it('should not abort when onUnmount and onMount are called in the same tick', async function() {
    const manager = new AbortManager();
    const { signal } = manager;
    manager.onUnmount();
    manager.onMount();
    const promise = new Promise(resolve => signal.addEventListener('abort', resolve, { once: true }));
    const result = await Promise.race([ promise, delay(20, { value: 'timeout' }) ]);
    expect(result).to.equal('timeout');
  })
  it('should trigger abort when onUnmount is the last call', async function() {
    const manager = new AbortManager();
    const { signal } = manager;
    manager.onUnmount();
    manager.onMount();
    manager.onUnmount();
    manager.onMount();
    manager.onUnmount();
    const promise = new Promise(resolve => signal.addEventListener('abort', resolve, { once: true }));
    const result = await Promise.race([ promise, delay(20, { value: 'timeout' }) ]);
    expect(result).to.have.property('type', 'abort');
  })
  it('should not trigger abort when callback calls preventDefault', async function() {
    const manager = new AbortManager();
    const { signal } = manager;
    manager.onMount();
    manager.setEffect(() => {
      return (evt) => evt.preventDefault();
    });
    manager.onUnmount();
    const promise = new Promise(resolve => signal.addEventListener('abort', resolve, { once: true }));
    const result = await Promise.race([ promise, delay(50, { value: 'timeout' }) ]);
    expect(result).to.not.equal('timeout');
  })
  it('should cancel timeout when onMount is called', async function() {
    const manager = new AbortManager();
    const { signal } = manager;
    manager.setTimeout(25);
    await delay(10);
    manager.onMount();
    const promise = new Promise(resolve => signal.addEventListener('abort', resolve, { once: true }));
    const result = await Promise.race([ promise, delay(30, { value: 'timeout' }) ]);
    expect(result).to.equal('timeout');
  })
})
