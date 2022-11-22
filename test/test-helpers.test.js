import { expect } from 'chai';
import { createElement } from 'react';
import { useSequential } from '../index.js';

import {
  withTestRenderer,
  withReactDOM,
} from '../test-utils.js';

describe('#withTestRenderer()', function() {
  it('should render a component', async function() {
    function Test() {
      return useSequential(async function*({ fallback }) {
        fallback('Cow');
        yield 'Pig';
      }, []);
    }
    const el = createElement(Test);
    await withTestRenderer(el, async ({ renderer }) => {
      expect(renderer.toJSON()).to.equal('Pig');
    });
  })
  it('should report correct stoppage points', async function() {
    function Test() {
      return useSequential(async function*({ fallback, manageEvents }) {
        fallback('Cow');
        const [ on, eventual ] = manageEvents();
        yield 'Pig';
        await eventual.click;
      }, []);
    }
    const el = createElement(Test);
    await withTestRenderer(el, async ({ renderer, awaiting }) => {
      expect(renderer.toJSON()).to.equal('Pig');
      expect(awaiting()).to.equal('click');
    });
  })
  it('should be able to trigger next steps', async function() {
    function Test() {
      return useSequential(async function*({ fallback, manageEvents }) {
        fallback('Cow');
        const [ on, eventual ] = manageEvents();
        yield 'Pig';
        await eventual.click;
        yield 'Chicken';
        await eventual.keyPress;
        yield 'Donkey';
      }, []);
    }
    const el = createElement(Test);
    await withTestRenderer(el, async ({ renderer, awaiting, resolve }) => {
      expect(renderer.toJSON()).to.equal('Pig');
      expect(awaiting()).to.equal('click');
      await resolve();
      expect(renderer.toJSON()).to.equal('Chicken');
      expect(awaiting()).to.equal('keyPress');
      await resolve();
      expect(renderer.toJSON()).to.equal('Donkey');
      expect(awaiting()).to.be.undefined;
    });
  })
  it('should see multi-promise await', async function() {
    function Test() {
      return useSequential(async function*({ fallback, manageEvents }) {
        fallback('Cow');
        const [ on, eventual ] = manageEvents();
        yield 'Pig';
        await eventual.click.or.keyPress;
        yield 'Chicken';
        await eventual.keyPress.and.selfDestruct.and.endOfWorld;
        yield 'Donkey';
      }, []);
    }
    const el = createElement(Test);
    await withTestRenderer(el, async ({ renderer, awaiting, resolve }) => {
      expect(renderer.toJSON()).to.equal('Pig');
      expect(awaiting()).to.equal('click.or.keyPress');
      await resolve();
      expect(renderer.toJSON()).to.equal('Chicken');
      expect(awaiting()).to.equal('keyPress.and.selfDestruct.and.endOfWorld');
      await resolve();
      expect(renderer.toJSON()).to.equal('Donkey');
      expect(awaiting()).to.be.undefined;
    });
  })
  it('should trigger timeout', async function() {
    function Test() {
      return useSequential(async function*({ fallback, manageEvents }) {
        fallback('Cow');
        const [ on, eventual ] = manageEvents();
        yield 'Pig';
        const result = await eventual.click.for(5).seconds;
        if (result === 'timeout') {
          yield 'Tortoise';
        } else {
          yield 'Chicken';
        }
      }, []);
    }
    const el = createElement(Test);
    await withTestRenderer(el, async ({ renderer, awaiting, timeout }) => {
      expect(renderer.toJSON()).to.equal('Pig');
      expect(awaiting()).to.equal('click');
      await timeout();
      expect(renderer.toJSON()).to.equal('Tortoise');
      expect(awaiting()).to.be.undefined;
    });
  })
  it('should throw when timeout is used where it is not expected', async function() {
    function Test() {
      return useSequential(async function*({ fallback, manageEvents }) {
        fallback('Cow');
        const [ on, eventual ] = manageEvents();
        yield 'Pig';
        await eventual.click;
        yield 'Chicken';
      }, []);
    }
    const el = createElement(Test);
    await withTestRenderer(el, async ({ renderer, awaiting, timeout }) => {
      expect(renderer.toJSON()).to.equal('Pig');
      expect(awaiting()).to.equal('click');
      await expect(timeout()).to.eventually.be.rejected;
    });
  })
})

describe('#withReactDOM()', function() {
  it('should render a component', async function() {
    function Test() {
      return useSequential(async function*({ fallback }) {
        fallback('Cow');
        yield 'Pig';
      }, []);
    }
    const el = createElement(Test);
    await withReactDOM(el, async ({ node }) => {
      expect(node.textContent).to.equal('Pig');
    });
  })
  it('should report correct stoppage points', async function() {
    function Test() {
      return useSequential(async function*({ fallback, manageEvents }) {
        fallback('Cow');
        const [ on, eventual ] = manageEvents();
        yield 'Pig';
        await eventual.click;
      }, []);
    }
    const el = createElement(Test);
    await withReactDOM(el, async ({ node, awaiting }) => {
      expect(node.textContent).to.equal('Pig');
      expect(awaiting()).to.equal('click');
    });
  })
  it('should be able to trigger next steps', async function() {
    function Test() {
      return useSequential(async function*({ fallback, manageEvents }) {
        fallback('Cow');
        const [ on, eventual ] = manageEvents();
        yield 'Pig';
        await eventual.click;
        yield 'Chicken';
        await eventual.keyPress;
        yield 'Donkey';
      }, []);
    }
    const el = createElement(Test);
    await withReactDOM(el, async ({ node, awaiting, resolve }) => {
      expect(node.textContent).to.equal('Pig');
      expect(awaiting()).to.equal('click');
      await resolve();
      //expect(node.textContent).to.equal('Chicken');
      expect(awaiting()).to.equal('keyPress');
      await resolve();
      expect(node.textContent).to.equal('Donkey');
      expect(awaiting()).to.be.undefined;
    });
  })
  it('should see multi-promise await', async function() {
    function Test() {
      return useSequential(async function*({ fallback, manageEvents }) {
        fallback('Cow');
        const [ on, eventual ] = manageEvents();
        yield 'Pig';
        await eventual.click.or.keyPress;
        yield 'Chicken';
        await eventual.keyPress.and.selfDestruct.and.endOfWorld;
        yield 'Donkey';
      }, []);
    }
    const el = createElement(Test);
    await withReactDOM(el, async ({ node, awaiting, resolve }) => {
      expect(node.textContent).to.equal('Pig');
      expect(awaiting()).to.equal('click.or.keyPress');
      await resolve();
      expect(node.textContent).to.equal('Chicken');
      expect(awaiting()).to.equal('keyPress.and.selfDestruct.and.endOfWorld');
      await resolve();
      expect(node.textContent).to.equal('Donkey');
      expect(awaiting()).to.be.undefined;
    });
  })
  it('should trigger timeout', async function() {
    function Test() {
      return useSequential(async function*({ fallback, manageEvents }) {
        fallback('Cow');
        const [ on, eventual ] = manageEvents();
        yield 'Pig';
        const result = await eventual.click.for(5).seconds;
        if (result === 'timeout') {
          yield 'Tortoise';
        } else {
          yield 'Chicken';
        }
      }, []);
    }
    const el = createElement(Test);
    await withReactDOM(el, async ({ node, awaiting, timeout }) => {
      expect(node.textContent).to.equal('Pig');
      expect(awaiting()).to.equal('click');
      await timeout();
      expect(node.textContent).to.equal('Tortoise');
      expect(awaiting()).to.be.undefined;
    });
  })
  it('should throw when timeout is used where it is not expected', async function() {
    function Test() {
      return useSequential(async function*({ fallback, manageEvents }) {
        fallback('Cow');
        const [ on, eventual ] = manageEvents();
        yield 'Pig';
        await eventual.click;
        yield 'Chicken';
      }, []);
    }
    const el = createElement(Test);
    await withReactDOM(el, async ({ node, awaiting, timeout }) => {
      expect(node.textContent).to.equal('Pig');
      expect(awaiting()).to.equal('click');
      await expect(timeout()).to.eventually.be.rejected;
    });
  })
})
