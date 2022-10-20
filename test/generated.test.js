import { expect } from 'chai';
import { createElement, Suspense, Component } from 'react';
import { create, act } from 'react-test-renderer';
import { delay } from '../index.js';

import {
  generatedState,
  useGeneratedState,
} from '../index.js';

describe('#generatedState()', function() {
  it('should invoke function with new state', async function() {
    const create = async function*() {
      await delay(10);
      yield 'Whiskey drink';
      await delay(10);
      yield 'Vodka drink';
      await delay(10);
      yield 'Lager drink';
      await delay(10);
      yield 'Cider drink';
    };
    const results = [];
    const setState = value => results.push(value);
    let error;
    const setError = err => error = err;
    const { initialState } = generatedState(create, setState, setError);
    await delay(25);
    expect(results).to.eql([ 'Whiskey drink', 'Vodka drink' ]);
    await delay(50);
    expect(results).to.eql([ 'Whiskey drink', 'Vodka drink', 'Lager drink', 'Cider drink' ]);
  })
  it('should invoke function with error when it occurs', async function() {
    const create = async function*() {
      await delay(10);
      yield 'Whiskey drink';
      await delay(10);
      yield 'Vodka drink';
      await delay(10);
      throw new Error('I get knocked down');
      yield 'Lager drink';
      await delay(10);
      yield 'Cider drink';
    };
    const results = [];
    const setState = value => results.push(value);
    let error;
    const setError = err => error = err;
    const { initialState } = generatedState(create, setState, setError);
    await delay(50);
    expect(error).to.be.an('error');
  })
  it('should return the initial state', async function() {
    const create = async function*({ initial }) {
      initial('Sober');
      await delay(10);
      yield 'Whiskey drink';
      await delay(10);
      yield 'Vodka drink';
      await delay(10);
      yield 'Lager drink';
      await delay(10);
      yield 'Cider drink';
    };
    const results = [];
    const setState = value => results.push(value);
    let error;
    const setError = err => error = err;
    const { initialState } = generatedState(create, setState, setError);
    expect(initialState).to.equal('Sober');
  })
  it('should allow the deferrment of state update', async function() {
    const create = async function*({ defer }) {
      defer(500);
      await delay(10);
      yield 'Whiskey drink';
      await delay(10);
      yield 'Vodka drink';
      await delay(10);
      yield 'Lager drink';
      await delay(10);
      yield 'Cider drink';
    };
    const results = [];
    const setState = value => results.push(value);
    let error;
    const setError = err => error = err;
    const { initialState } = generatedState(create, setState, setError);
    await delay(50);
    expect(results).to.eql([ 'Cider drink' ]);
  })
  it('should interrupt iteration of generator when abort controller is invoked', async function() {
    let finalized = false;
    const create = async function*() {
      try {
        await delay(10);
        yield 'Whiskey drink';
        await delay(10);
        yield 'Vodka drink';
        await delay(10);
        yield 'Lager drink';
        await delay(10);
        yield 'Cider drink';
      } finally {
        finalized = true;
      }
    };
    const results = [];
    const setState = value => results.push(value);
    let error;
    const setError = err => error = err;
    const { abortController } = generatedState(create, setState, setError);
    await delay(30);
    abortController.abort();
    expect(results).to.eql([ 'Whiskey drink', 'Vodka drink' ]);
    await delay(30);
    expect(results).to.eql([ 'Whiskey drink', 'Vodka drink' ]);
    expect(finalized).to.be.true;
  })
})
describe('#useGeneratedState()', function() {
  it('should invoke the finally section of a looping generator on unmount', async function() {
    let finalized = false;
    function Test() {
      const [ state, on ] = useGeneratedState(async function*({ manageEvents, initial }) {
        initial('Whiskey drink');
        const [ on, eventual ] = manageEvents();
        try {
          for (;;) {
            yield 'Vodka drink';
            await eventual.knockDown;
          }
        } finally {
          finalized = true;
        }
      }, []);
      return state;
    }
    const testRenderer = create(createElement(Test));
    expect(testRenderer.toJSON()).to.equal('Whiskey drink');
    testRenderer.unmount();
    await delay(10);
    expect(finalized).to.be.true;
  })
})
