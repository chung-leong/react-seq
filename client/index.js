import ReactDOM from 'react-dom/client';
import { delay } from '../src/utils.js';
import { extendDelay, limitTimeout } from '../src/iterator.js';

export function hydrateRoot(container, element, options = {}) {
  const {
    timeout = Infinity,
    ...hyprateOpts
  } = options;
  const delayBefore = extendDelay(Infinity);
  const timeoutBefore = limitTimeout(timeout);
  const root = ReactDOM.hydrateRoot(container, element, hyprateOpts);
  extendDelay(Infinity);
  limitTimeout(timeout);
  return root;
}

export function hasSuspended(root) {
  function check(node) {
    if (node.memoizedState && 'dehydrated' in node.memoizedState) {
      return true;
    }
    for (let c = node.child; c; c = c.sibling) {
      if (check(c)) {
        return true;
      }
    }
    return false;
  }
  return check(root._internalRoot.current);
}
