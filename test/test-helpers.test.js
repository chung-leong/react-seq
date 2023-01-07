import { expect } from 'chai';
import { createElement } from 'react';
import { useSequential, delay } from '../index.js';
import { withJSDOM } from './dom-renderer.js';
import { withSilentConsole } from './error-handling.js';

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
  it('should rerender a component', async function() {
    function Test({ animal = 'Pig' }) {
      return useSequential(async function*({ fallback }) {
        fallback('Cow');
        yield animal;
      }, []);
    }
    const el = createElement(Test);
    await withTestRenderer(el, async ({ renderer, update }) => {
      expect(renderer.toJSON()).to.equal('Pig');
      const el2 = createElement(Test, { animal: 'Turkey' });
      await update(el2);
      expect(renderer.toJSON()).to.equal('Turkey');
    });
  })
  it('should unmount a component', async function() {
    let m;
    function Test() {
      return useSequential(async function*({ fallback, mount }) {
        fallback('Cow');
        m = mount;
        yield 'Pig';
      }, []);
    }
    const el = createElement(Test);
    await withTestRenderer(el, async ({ renderer, unmount }) => {
      expect(renderer.toJSON()).to.equal('Pig');
      await unmount();
      expect(renderer.toJSON()).to.equal(null);
      const result = await Promise.race([ m(), delay(20, { value: 'timeout' }) ]);
      expect(result).to.equal('timeout');
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
  it('should throw when attempt to resolve an non-existent promise', async function() {
    function Test() {
      return useSequential(async function*({ fallback, manageEvents }) {
        fallback('Cow');
        yield 'Pig';
      }, []);
    }
    const el = createElement(Test);
    await withTestRenderer(el, async ({ renderer, awaiting, resolve }) => {
      expect(renderer.toJSON()).to.equal('Pig');
      expect(awaiting()).to.be.undefined;
      await expect(resolve()).to.eventually.be.rejected;
    });
  })
  it('should throw when attempt to reject an non-existent promise', async function() {
    function Test() {
      return useSequential(async function*({ fallback, manageEvents }) {
        fallback('Cow');
        yield 'Pig';
      }, []);
    }
    const el = createElement(Test);
    await withTestRenderer(el, async ({ renderer, awaiting, reject }) => {
      expect(renderer.toJSON()).to.equal('Pig');
      expect(awaiting()).to.be.undefined;
      await expect(reject(new Error('Doh'))).to.eventually.be.rejected;
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
        const { timeout } = await eventual.click.for(5).seconds;
        if (timeout) {
          yield 'Tortoise';
        } else {
          yield 'Chicken';
        }
      }, []);
    }
    const el = createElement(Test);
    await withTestRenderer(el, async ({ renderer, awaiting, timeout }) => {
      expect(renderer.toJSON()).to.equal('Pig');
      expect(awaiting()).to.equal('click.for(5).seconds');
      await timeout();
      expect(renderer.toJSON()).to.equal('Tortoise');
      expect(awaiting()).to.be.undefined;
    });
  })
  it('should throw when no stoppage point is reached after time limit is reached', async function() {
    function Test() {
      return useSequential(async function*({ fallback, manageEvents }) {
        await delay(1000);
        yield 'Pig';
      }, []);
    }
    const el = createElement(Test);
    const promise = withTestRenderer(el, async () => {}, { timeout: 50 });
    await expect(promise).to.be.eventually.be.rejectedWith('Timeout after 50ms');
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
  it('should throw when timeout is used where no awaiting is occurring', async function() {
    function Test() {
      return useSequential(async function*({ fallback, manageEvents }) {
        fallback('Cow');
        const [ on, eventual ] = manageEvents();
        yield 'Pig';
      }, []);
    }
    const el = createElement(Test);
    await withTestRenderer(el, async ({ renderer, awaiting, timeout }) => {
      expect(renderer.toJSON()).to.equal('Pig');
      expect(awaiting()).to.undefined;
      await expect(timeout()).to.eventually.be.rejected;
    });
  })
  it('should be able to trigger error', async function() {
    function Test() {
      return useSequential(async function*({ fallback, manageEvents }) {
        fallback('Cow');
        const [ on, eventual ] = manageEvents();
        yield 'Pig';
        try {
          await eventual.click;
          yield 'Chicken';
        } catch (err) {
          yield err.message;
        }
      }, []);
    }
    const el = createElement(Test);
    await withTestRenderer(el, async ({ renderer, awaiting, reject }) => {
      expect(renderer.toJSON()).to.equal('Pig');
      expect(awaiting()).to.equal('click');
      await reject(new Error('Chicken shit'));
      expect(renderer.toJSON()).to.equal('Chicken shit');
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
    await withJSDOM(async () => {
      await withReactDOM(el, async ({ node }) => {
        expect(node.textContent).to.equal('Pig');
      });
    });
  })
  it('should rerender a component', async function() {
    function Test({ animal = 'Pig' }) {
      return useSequential(async function*({ fallback }) {
        fallback('Cow');
        yield animal;
      }, []);
    }
    const el = createElement(Test);
    await withJSDOM(async () => {
      await withReactDOM(el, async ({ node, update }) => {
        expect(node.textContent).to.equal('Pig');
        const el2 = createElement(Test, { animal: 'Turkey' });
        await update(el2);
        expect(node.textContent).to.equal('Turkey');
      });
    });
  })
  it('should unmount a component', async function() {
    let m;
    function Test() {
      return useSequential(async function*({ fallback, mount }) {
        fallback('Cow');
        m = mount;
        yield 'Pig';
      }, []);
    }
    const el = createElement(Test);
    await withJSDOM(async () => {
      await withReactDOM(el, async ({ node, unmount }) => {
        expect(node.textContent).to.equal('Pig');
        await unmount();
        expect(node.textContent).to.equal('');
        const result = await Promise.race([ m(), delay(20, { value: 'timeout' }) ]);
        expect(result).to.equal('timeout');
      });
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
    await withJSDOM(async () => {
      await withReactDOM(el, async ({ node, awaiting }) => {
        expect(node.textContent).to.equal('Pig');
        expect(awaiting()).to.equal('click');
      });
    });
  })
  it('should throw when attempt to resolve an non-existent promise', async function() {
    function Test() {
      return useSequential(async function*({ fallback, manageEvents }) {
        fallback('Cow');
        yield 'Pig';
      }, []);
    }
    const el = createElement(Test);
    await withJSDOM(async () => {
      await withReactDOM(el, async ({ node, awaiting, resolve }) => {
        expect(node.textContent).to.equal('Pig');
        expect(awaiting()).to.be.undefined;
        await expect(resolve()).to.eventually.be.rejected;
      });
    });
  })
  it('should throw when attempt to reject an non-existent promise', async function() {
    function Test() {
      return useSequential(async function*({ fallback, manageEvents }) {
        fallback('Cow');
        yield 'Pig';
      }, []);
    }
    const el = createElement(Test);
    await withJSDOM(async () => {
      await withReactDOM(el, async ({ node, awaiting, reject }) => {
        expect(node.textContent).to.equal('Pig');
        expect(awaiting()).to.be.undefined;
        await expect(reject(new Error('Doh'))).to.eventually.be.rejected;
      });
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
    await withJSDOM(async () => {
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
    await withJSDOM(async () => {
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
    });
  })
  it('should see the content being displayed', async function() {
    function Test() {
      return useSequential(async function*({ fallback, manageEvents }) {
        fallback('Cow');
        const [ on, eventual ] = manageEvents();
        yield createElement('span', {}, 'Pig');
        await eventual.click.or.keyPress;
        yield createElement('h3', {}, 'Chicken');
        await delay(20);
        yield createElement('h2', {}, 'Duck');
        await eventual.keyPress.and.selfDestruct.and.endOfWorld;
        yield createElement('span', {}, 'Donkey');
      }, []);
    }
    const el = createElement(Test);
    await withJSDOM(async () => {
      await withReactDOM(el, async ({ node, showing, shown, displaying, displayed, resolve }) => {
        expect(showing()).to.have.equal('span');
        expect(displaying()).to.have.property('type', 'span');
        expect(displaying()).to.have.property('props').that.eql({ children: 'Pig' });
        await resolve();
        expect(showing()).to.have.equal('h2');
        expect(shown()).to.contains('h3');
        expect(displayed()).to.contain.something.that.has.property('type', 'h3');
        await resolve();
        expect(displaying()).to.have.property('props').that.eql({ children: 'Donkey' });
      });
    });
  })
  it('should trigger timeout', async function() {
    function Test() {
      return useSequential(async function*({ fallback, manageEvents }) {
        fallback('Cow');
        const [ on, eventual ] = manageEvents();
        yield 'Pig';
        const { timeout } = await eventual.click.for(5).seconds;
        if (timeout) {
          yield 'Tortoise';
        } else {
          yield 'Chicken';
        }
      }, []);
    }
    const el = createElement(Test);
    await withJSDOM(async () => {
      await withReactDOM(el, async ({ node, awaiting, timeout }) => {
        expect(node.textContent).to.equal('Pig');
        expect(awaiting()).to.equal('click.for(5).seconds');
        await timeout();
        expect(node.textContent).to.equal('Tortoise');
        expect(awaiting()).to.be.undefined;
      });
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
    await withJSDOM(async () => {
      await withReactDOM(el, async ({ node, awaiting, timeout }) => {
        expect(node.textContent).to.equal('Pig');
        expect(awaiting()).to.equal('click');
        await expect(timeout()).to.eventually.be.rejected;
      });
    });
  })
  it('should throw when timeout is used where no awaiting is occurring', async function() {
    function Test() {
      return useSequential(async function*({ fallback, manageEvents }) {
        fallback('Cow');
        const [ on, eventual ] = manageEvents();
        yield 'Pig';
      }, []);
    }
    const el = createElement(Test);
    await withJSDOM(async () => {
      await withReactDOM(el, async ({ node, awaiting, timeout }) => {
        expect(node.textContent).to.equal('Pig');
        expect(awaiting()).to.undefined;
        await expect(timeout()).to.eventually.be.rejected;
      });
    });
  })
  it('should be able to trigger error', async function() {
    function Test() {
      return useSequential(async function*({ fallback, manageEvents }) {
        fallback('Cow');
        const [ on, eventual ] = manageEvents();
        yield 'Pig';
        try {
          await eventual.click;
          yield 'Chicken';
        } catch (err) {
          yield err.message;
        }
      }, []);
    }
    const el = createElement(Test);
    await withJSDOM(async () => {
      await withReactDOM(el, async ({ node, awaiting, reject }) => {
        expect(node.textContent).to.equal('Pig');
        expect(awaiting()).to.equal('click');
        await reject(new Error('Chicken shit'));
        expect(node.textContent).to.equal('Chicken shit');
      });
    });
  })
  it('should allow normal error message through while suppressing act warning', async function() {
    function Test() {
      return useSequential(async function*({ fallback }) {
        fallback('Cow');
        console.error('Rats live on no evil star');
        yield 'Pig';
      }, []);
    }
    const el = createElement(Test);
    const output = {};
    await withSilentConsole(async () => {
      await withJSDOM(async () => {
        await withReactDOM(el, async ({ node, awaiting }) => {
          expect(node.textContent).to.equal('Pig');
          expect(awaiting()).to.be.undefined;
        });
      });
    }, output);
    expect(output.error).to.equal('Rats live on no evil star');
  })
})
