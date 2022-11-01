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
  it('should preclude that it will abort when onMount is called', async function() {
    const manager = new AbortManager();
    const { signal } = manager;
    const promise = manager.preclusion;
    setTimeout(() => manager.onMount(), 10);
    const result = await Promise.race([ promise, delay(50, { value: 'timeout' }) ]);
    expect(result).to.not.equal('timeout');
  })
  it('should preclude that it will abort when onMount/onUnmount occur in succession, ending with an onMount', async function() {
    const manager = new AbortManager();
    const { signal } = manager;
    const promise = manager.preclusion;
    setTimeout(() => {
      manager.onMount();
      manager.onUnmount();
      manager.onMount();
    }, 10);
    const result = await Promise.race([ promise, delay(50, { value: 'timeout' }) ]);
    expect(result).to.not.equal('timeout');
  })
  it('should reject abort preclusion when onMount and onUnmount are called in succession', async function() {
    const manager = new AbortManager();
    const { signal } = manager;
    const promise = manager.preclusion;
    setTimeout(() => {
      manager.onMount();
      manager.onUnmount();
    }, 10);
    await expect(promise).to.eventually.be.rejected;
  })
  it('should reject abort preclusion after some time has passed', async function() {
    const manager = new AbortManager();
    const { signal } = manager;
    const promise = manager.preclusion;
    manager.timeout(25);
    await expect(promise).to.eventually.be.rejected;
  })
})
