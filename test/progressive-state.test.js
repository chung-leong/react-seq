import { expect } from 'chai';
import { createElement, useMemo } from 'react';
import { create } from 'react-test-renderer';
import { createSteps } from './step.js';
import { createErrorBoundary, noConsole, caughtAt } from './error-handling.js';
import { delay } from '../index.js';

import {
  progressiveState,
  useProgressiveState,
} from '../index.js';

describe('#progressiveState', function() {
  it('should obtain the state progressively', async function() {
    const steps = createSteps(), assertions = createSteps();
    const createDrinks = async function*() {
      await assertions[0];
      yield 'Whiskey drink';
      steps[1].done();
      await assertions[1];
      yield 'Vodka drink';
      steps[2].done();
      await assertions[2];
      yield 'Lager drink';
      steps[3].done();
      await assertions[3];
      yield 'Cider drink';
      steps[4].done();
    };
    let state, error;
    const setState = value => state = value;
    const setError = err => error = err;
    const { initialState } = progressiveState(async ({ usable, initial }) => {
      usable(2);
      initial({ drinks: [], sober: true });
      return { drinks: createDrinks(), sober: false };
    }, setState, setError);
    state = initialState;
    expect(state).to.eql({ drinks: [], sober: true });
    assertions[0].done();
    await steps[1];
    expect(state).to.eql({ drinks: [], sober: true });
    assertions[1].done();
    await steps[2];
    expect(state).to.eql({ drinks: [ 'Whiskey drink', 'Vodka drink' ], sober: false });
    assertions[2].done();
    await steps[3];
    expect(state).to.eql({ drinks: [ 'Whiskey drink', 'Vodka drink', 'Lager drink' ], sober: false });
    assertions[3].done();
    await steps[4];
    expect(state).to.eql({ drinks: [ 'Whiskey drink', 'Vodka drink', 'Lager drink', 'Cider drink' ], sober: false });
  })
})

describe('#useProgressiveState', function() {
  it('should return a progressively changing state', async function() {
    const steps = createSteps(), assertions = createSteps();
    const createDrinks = async function*() {
      await assertions[0];
      yield 'Whiskey drink';
      steps[1].done();
      await assertions[1];
      yield 'Vodka drink';
      steps[2].done();
      await assertions[2];
      yield 'Lager drink';
      steps[3].done();
      await assertions[3];
      yield 'Cider drink';
      steps[4].done();
    };
    let state, on;
    function Test() {
      const cb = async ({ usable, initial }) => {
        usable(2);
        initial({ drinks: [], sober: true });
        return { drinks: createDrinks(), sober: false };
      };
      [ state, on ] = useProgressiveState(cb, []);
      const { drinks, sober } = state;
      return (sober) ? ':-(' : '8-)';
    }
    const el = createElement(Test);
    const renderer = create(el);
    expect(renderer.toJSON()).to.equal(':-(');
    expect(state).to.eql({ drinks: [], sober: true });
    assertions[0].done();
    await steps[1];
    expect(state).to.eql({ drinks: [], sober: true });
    assertions[1].done();
    await steps[2];
    expect(renderer.toJSON()).to.equal('8-)');
    expect(state).to.eql({ drinks: [ 'Whiskey drink', 'Vodka drink' ], sober: false });
    assertions[2].done();
    await steps[3];
    expect(state).to.eql({ drinks: [ 'Whiskey drink', 'Vodka drink', 'Lager drink' ], sober: false });
    assertions[3].done();
    await steps[4];
    expect(state).to.eql({ drinks: [ 'Whiskey drink', 'Vodka drink', 'Lager drink', 'Cider drink' ], sober: false });
  })
  it('should allowing usability to be set for specific prop', async function() {
    const steps = createSteps(), assertions = createSteps();
    const createDrinks = async function*() {
      await assertions[0];
      yield 'Whiskey drink';
      steps[1].done();
      await assertions[1];
      yield 'Vodka drink';
      steps[2].done();
      await assertions[2];
      yield 'Lager drink';
      steps[3].done();
      await assertions[3];
      yield 'Cider drink';
      steps[4].done();
    };
    let state;
    function Test() {
      [ state ] = useProgressiveState(async ({ usable, initial }) => {
        usable({ drinks: 2 });
        initial({ drinks: [], sober: true });
        return { drinks: createDrinks(), sober: false };
      }, []);
      const { drinks, sober } = state;
      return (sober) ? ':-(' : '8-)';
    }
    const el = createElement(Test);
    const renderer = create(el);
    expect(renderer.toJSON()).to.equal(':-(');
    expect(state).to.eql({ drinks: [], sober: true });
    assertions[0].done();
    await steps[1];
    expect(state).to.eql({ drinks: [], sober: true });
    assertions[1].done();
    await steps[2];
    expect(renderer.toJSON()).to.equal('8-)');
    expect(state).to.eql({ drinks: [ 'Whiskey drink', 'Vodka drink' ], sober: false });
    assertions[2].done();
    await steps[3];
    expect(state).to.eql({ drinks: [ 'Whiskey drink', 'Vodka drink', 'Lager drink' ], sober: false });
    assertions[3].done();
    await steps[4];
    expect(state).to.eql({ drinks: [ 'Whiskey drink', 'Vodka drink', 'Lager drink', 'Cider drink' ], sober: false });
  })
  it('should throw when usability is of the incorrect type', async function() {
    function Test() {
      const [ state ] = useProgressiveState(async ({ usable }) => {
        usable('drinks', 2);
        return {};
      }, []);
      // without the following lines the call above would get optimized out
      const { drinks, sober } = state;
      return (sober) ? ':-(' : '8-)';
    }
    await noConsole(async () => {
      const el = createElement(Test);
      const boundary = createErrorBoundary(el);
      const renderer = create(boundary);
      await delay(10);
      expect(caughtAt(boundary)).to.be.an('error');
    });
  })
});
