import { expect } from 'chai';

import {
  setting,
  settings,
  ssr,
  csr,
} from '../index.js';

describe('#setting()', function() {
  it('should return false for "ssr" by default', function() {
    expect(setting('ssr')).to.be.false;
  })
  it('should return 3000 for "ssr_time_limit" by default', function() {
    expect(setting('ssr_time_limit')).to.equal(3000);
  })
  it('should return false for "strict_mode_clean_up" by default', function() {
    expect(setting('strict_mode_clean_up')).to.be.false;
  })
})
