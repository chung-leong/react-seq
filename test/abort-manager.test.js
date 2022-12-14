import { expect } from 'chai';
import { delay } from '../index.js';
import { createSteps } from './step.js';

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
  it('should fulfill mounted promise when after onMount is called', async function() {
    const manager = new AbortManager();
    const { signal } = manager;
    const promise = manager.mounted;
    manager.onMount();
    const result = await Promise.race([ promise, delay(20, { value: 'timeout' }) ]);
    expect(result).to.not.equal('timeout');
  })
  it('should not fulfill mounted promise when onUnmount is immediate called after onMount', async function() {
    const manager = new AbortManager();
    const { signal } = manager;
    const promise = manager.mounted;
    manager.onMount();
    manager.onUnmount();
    manager.onMount();
    manager.onUnmount();
    const result = await Promise.race([ promise, delay(20, { value: 'timeout' }) ]);
    expect(result).to.equal('timeout');
  })
  it('should invoke effect function', async function() {
    const manager = new AbortManager();
    let called = false, cleanedUp = false;
    manager.setEffect(() => {
      called = true;
      return () => cleanedUp = true;
    });
    manager.onMount();
    manager.onUnmount();
    expect(called).to.be.true;
    expect(cleanedUp).to.be.true;
  })
})
