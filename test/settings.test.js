import { expect } from 'chai';

import {
  setting,
  settings,
} from '../index.js';
import {
  defaultSettings,
} from '../src/settings.js';

describe('#setting()', function() {
  before(function() {
    settings(defaultSettings);
  });
  it('should throw when the setting is unknown', function() {
    expect(() => setting('cow')).to.throw();
  })
  it('should return false for "ssr" by default', function() {
    expect(setting('ssr')).to.be.false;
  })
  it('should return 3000 for "ssr_timeout" by default', function() {
    expect(setting('ssr_timeout')).to.equal(3000);
  })
  it('should return null for "ssr_timeout_handler" by default', function() {
    expect(setting('ssr_timeout_handler')).to.be.null;
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
  it('should throw when ssr_timeout is being set to a string', function() {
    expect(() => settings({ ssr_timeout: 'cow' })).to.throw();
  })
  it('should throw when ssr_timeout_handler is being set to a string', function() {
    expect(() => settings({ ssr_timeout_handler: 'cow' })).to.throw();
  })
  it('should accept settings hook', function() {
    try {
      let set = false;
      settings(() => {
        return (set) ? { ssr: 'server' } : undefined;
      });
      expect(setting('ssr')).to.be.false;
      set = true;
      expect(setting('ssr')).to.equal('server');
    } finally {
      settings({ ssr: false });
    }
  })
})
