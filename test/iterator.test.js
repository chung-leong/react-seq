import { expect } from 'chai';
import { delay } from '../index.js';

import {
  extendDelay,
  TimedIterator,
} from '../src/iterator.js';

describe('#extendDelay()', function() {
  it ('should set the delay multiplier and addend', function() {
    extendDelay(10, 200);
    const iterator = new TimedIterator();
    iterator.setDelay(3);
    expect(iterator.delay).to.equal((3 + 200) * 10);
    extendDelay();
  })
})
