import { useMemo, useEffect, useState, startTransition } from 'react';
import { sequentialState, useFunctionState } from './sequential-state.js';
import { findUsableProps, generateProps } from './progressive.js';

export function useProgressiveState(cb, deps) {
  return useFunctionState(progressiveState, cb, deps);
}

export function progressiveState(cb, setState, setError) {
  return sequentialState(async function* (methods) {
    let usables;
    function usable(obj) {
      if (!(obj instanceof Object)) {
        throw new Error('usable() expects an object');
      }
      usables = obj;
    }

    const asyncProps = await cb({ ...methods, usable });
    if (!(asyncProps instanceof Object)) {
      throw new Error('Callback function did not return an object');
    }
    if (!usables) {
      usables = findUsableProps(elementFn || elementType);
    }
    if (process.env.NODE_ENV === 'development') {
      for (const name of Object.keys(usables)) {
        if (!(name in asyncProps)) {
          console.warn(`The prop "${name}" is given a usability criteria but is absent from the object returned`);
        }
      }
    }
    for await (const props of generateProps(asyncProps, usables)) {
      yield props;
    }
  }, setState, setError);
}
