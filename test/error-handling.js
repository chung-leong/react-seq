import sinon from 'sinon';
import { createElement, Component } from 'react';

export async function noConsole(fn) {
  const results = { log: null, error: null, warn: null };
  sinon.stub(console, 'log').callsFake(arg => results.log = arg);
  sinon.stub(console, 'error').callsFake(arg => results.error = arg);
  sinon.stub(console, 'warn').callsFake(arg => results.warn = arg);
  try {
    await fn();
  } finally {
    console.log.restore();
    console.error.restore();
    console.warn.restore();
  }
  return results;
}

export async function noConsoleArray(fn) {
  const results = { log: [], error: [], warn: [] };
  sinon.stub(console, 'log').callsFake(arg => results.log.push(arg));
  sinon.stub(console, 'error').callsFake(arg => results.error.push(arg));
  sinon.stub(console, 'warn').callsFake(arg => results.warn.push(arg));
  try {
    await fn();
  } finally {
    console.log.restore();
    console.error.restore();
    console.warn.restore();
  }
  return results;
}

const errorMap = new WeakMap();

export function createErrorBoundary(children) {
  class ErrorBoundary extends Component {
    constructor(props) {
      super(props);
      this.state = { error: null };
    }
    static getDerivedStateFromError(err) {
      errorMap.set(element, err);
      return { error: err };
    }
    render() {
      const { error } = this.state;
      if (error) {
        return 'ERROR';
      }
      return this.props.children;
    }
  }
  const element = createElement(ErrorBoundary, {}, children);
  return element;
}

export function caughtAt(boundary) {
  return errorMap.get(boundary);
}
