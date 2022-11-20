import { expect } from 'chai';

import {
  setting,
  settings,
} from '../index.js';

describe('#setting()', function() {
  it('should throw when the setting is unknown', function() {
    expect(() => setting('cow')).to.throw();
  })
  it('should return false for "ssr" by default', function() {
    expect(setting('ssr')).to.be.false;
  })
  it('should return 3000 for "ssr_time_limit" by default', function() {
    expect(setting('ssr_time_limit')).to.equal(3000);
  })
  it('should return NaN for "strict_mode_clean_up" by default', function() {
    expect(setting('strict_mode_clean_up')).to.be.NaN;
  })
})

describe('#settings()', function() {
  it('should throw when argument is not an object', function() {
    expect(() => settings(5)).to.throw();
  })
  it('should throw when it encounters an unknown setting', function() {
    expect(() => settings({ a: 1 })).to.throw();
  })
  it('should throw when ssr is being set to an unknown value', function() {
    expect(() => settings({ ssr: 'cow' })).to.throw();
  })
  it('should throw when ssr_time_limit is being set to a string', function() {
    expect(() => settings({ ssr_time_limit: 'cow' })).to.throw();
  })
  it('should throw when ssr_time_limit is being set to a boolean', function() {
    expect(() => settings({ strict_mode_clean_up: true })).to.throw();
  })
})
