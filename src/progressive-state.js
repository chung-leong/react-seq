import { useMemo, useEffect, useState, startTransition } from 'react';
import { sequentialState, useFunctionState } from './sequential-state.js';
import { checkAsyncProps, generateProps } from './progressive.js';

export function useProgressiveState(cb, deps) {
  return useFunctionState(progressiveState, cb, deps);
}

export function progressiveState(cb, setState, setError) {
  return sequentialState(async function* (methods) {
    let usableDefault = false;
    let usables = {};
    function usable(arg) {
      if (arg instanceof Object) {
        Object.assign(usables, arg);
      } else if (typeof(arg) === 'number' || typeof(arg) === 'function') {
        usableDefault = arg;
      } else {
        throw new Error('usable() expects a number, a function, or an object');
      }
    }

    const asyncProps = await cb({ ...methods, usable });
    checkAsyncProps(asyncProps, usables, usableDefault);
    for await (const props of generateProps(asyncProps, usables)) {
      yield props;
    }
  }, setState, setError);
}