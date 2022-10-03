import { useState } from 'react';

export function useHandlers(warning = false) {
  const [ pairs ] = useState(() => {
    const cxt = {
      handlers: {},
      callbacks: {},
      promises: {},
      resolves: {},
      warning,
    };
    return [
      new Proxy(cxt, { get: getHandler, set: setCallback }),
      new Proxy(cxt, { get: getPromise, set: setPromise }),
    ];
  });
  return pairs;
}

function getHandler(cxt, name) {
  let handler = cxt.handlers[name];
  if (!handler) {
    cxt.handlers[name] = handler = (evt) => callHandler(cxt, name, evt);
  }
  return handler;
}

function setCallback(cxt, name, cb) {
  cxt.callbacks[name] = cb;
  return true;
}

async function callHandler(cxt, name, evt) {
  try {
    let triggered = false;
    const cb = cxt.callbacks[name];
    if(cb) {
      await cb(evt);
      triggered = true;
    }
    const resolve = cxt.resolves[name];
    if (resolve) {
      resolve(evt);
      triggered = true;
      delete cxt.promises[name];
      delete cxt.resolves[name];
    }
    if (!triggered) {
      if (callHandler.warning) {
        console.warn(`No action was triggered by handler "${name}"`);
      }
    }
  } catch (err) {
    console.error(err);
  }
}

function getPromise(cxt, name) {
  let promise = cxt.promises[name];
  if (!promise) {
    let resolve;
    cxt.promises[name] = promise = new Promise(r => resolve = r);
    cxt.resolves[name] = resolve;
  }
  return promise;
}

function setPromise(cxt, name, value) {
  throw new Error('Promise is read-only');
}
