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
  it('should not trigger abort when callback calls keep', async function() {
    const manager = new AbortManager();
    const { signal } = manager;
    manager.setEffect(() => ({ keep }) => keep());
    manager.onMount();
    manager.onUnmount();
    const promise = new Promise(resolve => signal.addEventListener('abort', resolve, { once: true }));
    const result = await Promise.race([ promise, delay(30, { value: 'timeout' }) ]);
    expect(result).to.equal('timeout');
  })
  it('should delay abort when callback calls keepFor', async function() {
    const manager = new AbortManager();
    const { signal } = manager;
    manager.setEffect(() => ({ keepFor }) => keepFor(50));
    manager.onMount();
    manager.onUnmount();
    const promise = new Promise(resolve => signal.addEventListener('abort', resolve, { once: true }));
    const result1 = await Promise.race([ promise, delay(30, { value: 'timeout' }) ]);
    expect(result1).to.equal('timeout');
    const result2 = await Promise.race([ promise, delay(30, { value: 'timeout' }) ]);
    expect(result2).to.not.equal('timeout');
  })
  it('should delay abort until promise is filfilled when callback calls keepUntil', async function() {
    const steps = createSteps();
    const manager = new AbortManager();
    const { signal } = manager;
    manager.setEffect(() => ({ keepUntil }) => keepUntil(steps[0]));
    manager.onMount();
    manager.onUnmount();
    const promise = new Promise(resolve => signal.addEventListener('abort', resolve, { once: true }));
    const result1 = await Promise.race([ promise, delay(20, { value: 'timeout' }) ]);
    expect(result1).to.equal('timeout');
    steps[0].done();
    const result2 = await Promise.race([ promise, delay(20, { value: 'timeout' }) ]);
    expect(result2).to.not.equal('timeout');
  })
  it('should throw when callback calls both keepUntil and keep', async function() {
    const steps = createSteps();
    const manager = new AbortManager();
    const { signal } = manager;
    manager.setEffect(() => ({ keepUntil, keep }) => {
      keepUntil(steps[0]);
      keep();
    });
    manager.onMount();
    expect(() => manager.onUnmount()).to.throw();
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
