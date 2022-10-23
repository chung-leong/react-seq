import { useMemo, useEffect, useState, startTransition } from 'react';
import { sequentialState, useFunctionState } from './sequential-state.js';
import { checkAsyncProps, generateProps } from './progressive.js';

export function useProgressiveState(cb, deps) {
  return useFunctionState(progressiveState, cb, deps);
}

export function progressiveState(cb, setState, setError) {
  return sequentialState(async function* (methods) {
    let usables = {};
    function usable(obj) {
      if (!(obj instanceof Object)) {
        throw new Error('usable() expects an object');
      }
      usables = obj;
    }

    const asyncProps = await cb({ ...methods, usable });
    checkAsyncProps(asyncProps, usables);
    for await (const props of generateProps(asyncProps, usables)) {
      yield props;
    }
  }, setState, setError);
}
