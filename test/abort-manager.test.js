import { expect } from 'chai';
import { delay } from '../index.js';

import {
  AbortManager,
} from '../src/abort-manager.js';

describe('#AbortManager', function() {
  it('should trigger abort when schedule is called', async function() {
    const manager = new AbortManager();
    const { signal } = manager;
    manager.schedule();
    const promise = new Promise(resolve => signal.addEventListener('abort', resolve, { once: true }));
    const result = await Promise.race([ promise, delay(20, { value: 'timeout' }) ]);
    expect(result).to.have.property('type', 'abort');
  })
  it('should not abort when schedule and unschedule are called in the same tick', async function() {
    const manager = new AbortManager();
    const { signal } = manager;
    manager.schedule();
    manager.unschedule();
    const promise = new Promise(resolve => signal.addEventListener('abort', resolve, { once: true }));
    const result = await Promise.race([ promise, delay(20, { value: 'timeout' }) ]);
    expect(result).to.equal('timeout');
  })
  it('should trigger abort when schedule is the last call', async function() {
    const manager = new AbortManager();
    const { signal } = manager;
    manager.schedule();
    manager.unschedule();
    manager.schedule();
    manager.unschedule();
    manager.schedule();
    const promise = new Promise(resolve => signal.addEventListener('abort', resolve, { once: true }));
    const result = await Promise.race([ promise, delay(20, { value: 'timeout' }) ]);
    expect(result).to.have.property('type', 'abort');
  })
  it('should disavow when unschedule is called', async function() {
    const manager = new AbortManager();
    const { signal } = manager;
    const promise = manager.disavow();
    setTimeout(() => manager.unschedule(), 10);
    const result = await Promise.race([ promise, delay(50, { value: 'timeout' }) ]);
    expect(result).to.not.equal('timeout');
  })
  it('should disavow when unschedule the last call', async function() {
    const manager = new AbortManager();
    const { signal } = manager;
    const promise = manager.disavow();
    setTimeout(() => {
      manager.unschedule();
      manager.schedule();
      manager.unschedule();
    }, 10);
    const result = await Promise.race([ promise, delay(50, { value: 'timeout' }) ]);
    expect(result).to.not.equal('timeout');
  })
  it('should reject disavowal when unschedule and schedule are called in succession', async function() {
    const manager = new AbortManager();
    const { signal } = manager;
    const promise = manager.disavow();
    setTimeout(() => {
      manager.unschedule();
      manager.schedule();
    }, 10);
    await expect(promise).to.eventually.be.rejected;
  })
  it('should reject disavowal after some time has passed', async function() {
    const manager = new AbortManager();
    const { signal } = manager;
    const promise = manager.disavow(25);
    await expect(promise).to.eventually.be.rejected;
  })
})
