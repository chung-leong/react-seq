import { create, act } from 'react-test-renderer';

export function createTestRenderer(el) {
  let renderer;
  act(() => renderer = create(el));
  return renderer;
}

export function updateTestRenderer(renderer, el) {
  act(() => renderer.update(el));
}

export function unmountTestRenderer(renderer) {
  act(() => renderer.unmount());
}
