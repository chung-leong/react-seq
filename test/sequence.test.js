import { expect } from 'chai';
import { createElement, Suspense, Component } from 'react';
import { create, act } from 'react-test-renderer';
import { renderToPipeableStream } from 'react-dom/server';
import MemoryStream from 'memorystream';
import { createWriteStream } from 'fs';
import { delay } from '../index.js';

import {
  sequence,
  useSequence,
  extendDeferment,
} from '../index.js';

describe('#sequence()', function() {
  it('should return a Suspense element', function() {
    const el = sequence(async function*({ fallback }) {
      fallback('Cow');
      await delay(10);
      yield 'Pig';
    });
    expect(el).to.have.property('type', Suspense);
  })
  it('should return a component that uses the first item from the generator as its content', async function() {
    function Test() {
      const seq = useSequence();
      return seq();
    }
    const el = sequence(async function*({ fallback }) {
      fallback('Cow');
      yield 'Pig';
    });
    const testRenderer = create(el);
    expect(testRenderer.toJSON()).to.equal('Cow');
    await delay(10);
    expect(testRenderer.toJSON()).to.equal('Pig');
  })
  it('should return a component that defers rendering', async function() {
    const stoppage = createStoppage();
    const el = sequence(async function*({ fallback, defer }) {
      fallback('Cow');
      defer(50);
      yield 'Pig';
      await stoppage;
      yield 'Chicken';
    });
    const testRenderer = create(el);
    expect(testRenderer.toJSON()).to.equal('Cow');
    await delay(30);
    expect(testRenderer.toJSON()).to.equal('Cow');
    await delay(30);
    expect(testRenderer.toJSON()).to.equal('Pig');
    stoppage.resolve();
    await delay(10);
    expect(testRenderer.toJSON()).to.equal('Chicken');
  })
  it('should return a component that displays new contents intermittently', async function() {
    const stoppage = createStoppage();
    const el = sequence(async function*({ defer }) {
      defer(50);
      yield 'Pig';
      await delay(70);
      yield 'Duck';
      await stoppage;
      yield 'Chicken';
    });
    const testRenderer = create(el);
    expect(testRenderer.toJSON()).to.equal(null);
    await delay(30);
    expect(testRenderer.toJSON()).to.equal(null);
    await delay(30);
    expect(testRenderer.toJSON()).to.equal('Pig');
    await delay(50);
    expect(testRenderer.toJSON()).to.equal('Duck');
    stoppage.resolve();
    await delay(10);
    expect(testRenderer.toJSON()).to.equal('Chicken');
  })
  it('should return a component that eventually shows the final item from the generator', async function() {
    const stoppage = createStoppage();
    const el = sequence(async function*({ fallback, defer }) {
      fallback('Cow');
      defer(20);
      yield 'Pig';
      await stoppage;
      yield 'Chicken';
    });
    const testRenderer = create(el);
    expect(testRenderer.toJSON()).to.equal('Cow');
    await delay(30);
    expect(testRenderer.toJSON()).to.equal('Pig');
    stoppage.resolve();
    await delay(30);
    expect(testRenderer.toJSON()).to.equal('Chicken');
  })
  it('should return a component that uses fallback', async function() {
    const stoppage = createStoppage();
    const el = sequence(async function*({ fallback, defer }) {
      fallback('Cow');
      defer(20);
      yield 'Pig';
      await stoppage;
      yield 'Chicken';
    });
    const testRenderer = create(el);
    expect(testRenderer.toJSON()).to.equal('Cow');
    await delay(30);
    expect(testRenderer.toJSON()).to.equal('Pig');
    stoppage.resolve();
    await delay(30);
    expect(testRenderer.toJSON()).to.equal('Chicken');
  })
  it('should allow management of events using promises', async function() {
    let triggerClick;
    const el = sequence(async function*({ fallback, manageEvents }) {
      const [ on, eventual ] = manageEvents();
      triggerClick = on.click();
      fallback('Cow');
      yield 'Pig';
      await eventual.click;
      yield 'Chicken';
      await eventual.click;
      yield 'Rocky';
    });
    const testRenderer = create(el);
    await delay(10);
    expect(testRenderer.toJSON()).to.equal('Pig');
    triggerClick();
    await delay(0);
    expect(testRenderer.toJSON()).to.equal('Chicken');
    triggerClick();
    await delay(0);
    expect(testRenderer.toJSON()).to.equal('Rocky');
  })
  it('should terminate iteration when component is unmounted mid-cycle', async function() {
    const stoppage = createStoppage();
    const cats = [];
    const finalizations = [];
    const el = sequence(async function*({ fallback }) {
      fallback('Cow');
      try {
        await delay(10);
        yield 'Pig';
        await stoppage;
        yield 'Chicken';
        await delay(10);
        yield 'Rocky';
        cats.push('Rocky');
      } finally {
        finalizations.push('Rocky');
      }
    });
    const testRenderer = create(el);
    await delay(30);
    expect(testRenderer.toJSON()).to.equal('Pig');
    act(() => {
      testRenderer.update(null);
    });
    stoppage.resolve();
    await delay(10);
    expect(testRenderer.toJSON()).to.equal(null);
    expect(cats).to.eql([]);
    expect(finalizations).to.eql([ 'Rocky' ]);
  })
  it('should cause all event promises to reject on unmount', async function() {
    const cats = [];
    const finalizations = [];
    const el = sequence(async function*({ fallback, manageEvents }) {
      fallback('Cow');
      try {
        const [ on, eventual ] = manageEvents();
        yield 'Pig';
        await eventual.click.or.keypress;
        yield 'Chicken';
        await eventual.click;
        yield 'Rocky';
        cats.push('Rocky');
      } finally {
        finalizations.push('Rocky');
      }
    });
    const testRenderer = create(el);
    await delay(10);
    expect(testRenderer.toJSON()).to.equal('Pig');
    await delay(30);
    act(() => {
      testRenderer.update(null);
    });
    await delay(20);
    expect(testRenderer.toJSON()).to.equal(null);
    expect(cats).to.eql([]);
    expect(finalizations).to.eql([ 'Rocky' ]);
  })
  it('should allow creation of a suspending component', async function() {
    const el = sequence(async function*({ suspend }) {
      suspend('unique-id');
      yield 'Pig';
      await delay(30);
      yield 'Chicken';
    });
    const testRenderer = create(createElement(Suspense, { fallback: 'Cow' }, el));
    expect(testRenderer.toJSON()).to.equal('Cow');
    await delay(10);
    expect(testRenderer.toJSON()).to.equal('Pig');
    await delay(30);
  })
  it('should trigger error boundary', async function() {
    let error;
    class ErrorBoundary extends Component {
      constructor(props) {
        super(props);
        this.state = { error: null };
      }
      static getDerivedStateFromError(err) {
        error = err;
        return { error: err };
      }
      render() {
        const { error } = this.state;
        if (error) {
          return createElement('h1', {}, error.message);
        }
        return this.props.children;
      }
    }
    const el = sequence(async function*({ fallback }) {
      fallbak('Cow');
      await delay(10);
      yield createElement('div', {}, cat);
    });
    const errorFn = console.error;
    try {
      console.error = () => {};
      const testRenderer = create(createElement(ErrorBoundary, {}, el));
      await delay(10);
      expect(error).to.be.an('error');
    } finally {
      console.error = errorFn;
    }
  })
  it('should trigger error boundary after a yield', async function() {
    let error;
    class ErrorBoundary extends Component {
      constructor(props) {
        super(props);
        this.state = { error: null };
      }
      static getDerivedStateFromError(err) {
        return { error: err };
      }
      componentDidCatch(err) {
        error = err;
      }
      render() {
        const { error } = this.state;
        if (error) {
          return createElement('h1', {}, error.message);
        }
        return this.props.children;
      }
    }
    const el = sequence(async function*({ fallback }) {
      fallback('Cow');
      await delay(10);
      yield createElement('div', {}, 'Pig');
      await dely(10);
      yield createElement('div', {}, cat);
    });
    const errorFn = console.error;
    try {
      console.error = () => {};
      const testRenderer = create(createElement(ErrorBoundary, {}, el));
      await delay(30);
      expect(error).to.be.an('error');
    } finally {
      console.error = errorFn;
    }
  })
  it('should use delay multiplier', async function() {
    extendDeferment(10);
    const el = sequence(async function*({ defer }) {
      defer(10);
      yield 'Pig';
      await delay(20);
      yield 'Duck';
      await delay(20);
      yield 'Chicken';
    })
    extendDeferment(1);
    const testRenderer = create(el);
    expect(testRenderer.toJSON()).to.equal(null);
    await delay(30);
    expect(testRenderer.toJSON()).to.equal(null);
    await delay(30);
    expect(testRenderer.toJSON()).to.equal('Chicken');
  })
  it('should render correctly to a stream', async function() {
    const el = sequence(async function*({ fallback, defer }) {
      fallback(createElement('div', {}, 'Cow'));
      defer(100);
      await delay(10);
      yield createElement('div', {}, 'Pig');
      await delay(10);
      yield createElement('div', {}, 'Chicken');
      await delay(10);
      yield createElement('div', {}, 'Rocky');
    });
    const stream = await new Promise((resolve, reject) => {
      const stream = renderToPipeableStream(el, {
        onShellError: reject,
        onError: reject,
        onAllReady: () => resolve(stream),
      });
    });
    const text = await readStream(stream);
    expect(text).to.contain('<div>Rocky</div>')
  })
  skip.if(!global.gc).
  it('should not leak memory', async function() {
    this.timeout(5000);
    async function step() {
      const el = sequence(async function*({ fallback }) {
        fallback(createElement('div', {}, 'Cow'));
        await delay(0);
        yield createElement('div', {}, 'Pig');
        await delay(10);
        yield createElement('div', {}, 'Chicken');
        await delay(10);
        yield createElement('div', {}, 'Rocky');
      });
      const stream = await new Promise((resolve, reject) => {
        const stream = renderToPipeableStream(el, {
          onShellError: reject,
          onError: reject,
          onAllReady: () => resolve(stream),
        });
      });
      const outStream = createWriteStream('/dev/null');
      stream.pipe(outStream);
      await new Promise(resolve => outStream.on('finish', resolve));
    }
    async function test() {
      for (let i = 0; i < 500; i++) {
        await step();
      }
    }

    // establish base-line memory usage first
    await test();
    // perform garbage collection
    gc();
    const before = process.memoryUsage().heapUsed;
    await test();
    // a bit of time for timer to finish
    await delay(500);
    // perform initiate garbage collection again
    gc();
    const after = process.memoryUsage().heapUsed;
    const diff = Math.round((after - before) / 1024);
    expect(diff).to.not.be.above(0);
  })
})

describe('#useSequence()', function() {
  it('should recreate element when dependencies change', async function() {
    const cats = [];
    function Test({ cat }) {
      return useSequence(async function*({ fallback, defer }) {
        fallback('Cow');
        defer(20);
        await delay(10);
        yield 'Pig';
        await delay(10);
        yield cat;
        cats.push(cat);
      }, [ cat ]);
    }
    const testRenderer = create(createElement(Test, { cat: 'Rocky' }));
    await delay(30);
    expect(testRenderer.toJSON()).to.equal('Rocky');
    act(() => {
      testRenderer.update(createElement(Test, { cat: 'Barbie' }));
    });
    expect(testRenderer.toJSON()).to.equal('Cow');
    await delay(30);
    expect(testRenderer.toJSON()).to.equal('Barbie');
    expect(cats).to.eql([ 'Rocky', 'Barbie' ]);
  })
  it('should recreate generator when dependencies are not specified', async function() {
    const cats = [];
    function Test({ cat }) {
      return useSequence(async function*({ fallback, defer }) {
        fallback('Cow');
        defer(20);
        await delay(10);
        yield 'Pig';
        await delay(10);
        yield cat;
        cats.push(cat);
      });
    }
    const testRenderer = create(createElement(Test, { cat: 'Rocky' }));
    await delay(30);
    expect(testRenderer.toJSON()).to.equal('Rocky');
    act(() => {
      testRenderer.update(createElement(Test, { cat: 'Barbie' }));
    });
    expect(testRenderer.toJSON()).to.equal('Cow');
    await delay(30);
    expect(testRenderer.toJSON()).to.equal('Barbie');
    expect(cats).to.eql([ 'Rocky', 'Barbie' ]);
  })
  it('should not recreate generator when dependencies has not changed', async function() {
    const cats = [];
    function Test({ cat, dog }) {
      return useSequence(async function*({ fallback, defer }) {
        fallback('Cow');
        defer(20);
        await delay(10);
        yield 'Pig';
        await delay(10);
        yield cat;
        cats.push(cat);
      }, [ cat ]);
    }
    const testRenderer = create(createElement(Test, { cat: 'Rocky', dog: 'Dingo' }));
    await delay(30);
    expect(testRenderer.toJSON()).to.equal('Rocky');
    act(() => {
      testRenderer.update(createElement(Test, { cat: 'Rocky', dog: 'Pi' }));
    });
    await delay(30);
    expect(cats).to.eql([ 'Rocky' ]);
  })
  it('should terminate iteration when dependencies change mid-cycle', async function() {
    const stoppage = createStoppage();
    const cats = [];
    const finalizations = [];
    function Test({ cat }) {
      return useSequence(async function*({ fallback, defer }) {
        fallback('Cow');
        defer(20);
        try {
          await delay(10);
          yield 'Pig';
          await stoppage;
          yield 'Chicken';
          await delay(20);
          yield cat;
          await delay(30);
          yield 'Evil';
          cats.push(cat);
        } finally {
          finalizations.push(cat);
        }
      });
    }
    const testRenderer = create(createElement(Test, { cat: 'Rocky' }));
    await delay(40);
    expect(testRenderer.toJSON()).to.equal('Pig');
    act(() => {
      testRenderer.update(createElement(Test, { cat: 'Barbie' }));
    });
    await delay(10);
    expect(testRenderer.toJSON()).to.equal('Cow');
    stoppage.resolve();
    await delay(40);
    expect(testRenderer.toJSON()).to.equal('Barbie');
    await delay(40);
    expect(cats).to.eql([ 'Barbie' ]);
    expect(finalizations).to.eql([ 'Rocky', 'Barbie' ]);
  })
  it('should cause all event promises to reject on prop change', async function() {
    const cats = [];
    const finalizations = [];
    let triggerClick, triggerKeyPress;
    function Test({ cat }) {
      return useSequence(async function*({ fallback, manageEvents }) {
        fallback('Cow');
        try {
          const [ on, eventual ] = manageEvents();
          triggerClick = on.click();
          triggerKeyPress = on.keypress();
          yield 'Pig';
          await eventual.click.and.keypress;
          yield 'Chicken';
          await eventual.click;
          yield cat;
          cats.push(cat);
        } finally {
          finalizations.push(cat);
        }
      }, [ cat ]);
    }
    const testRenderer = create(createElement(Test, { cat: 'Rocky' }));
    await delay(10);
    expect(testRenderer.toJSON()).to.equal('Pig');
    await delay(30);
    act(() => {
      testRenderer.update(createElement(Test, { cat: 'Barbie' }));
    });
    await delay(0);
    expect(cats).to.eql([]);
    expect(finalizations).to.eql([ 'Rocky' ]);
    triggerClick();
    await delay(0);
    expect(testRenderer.toJSON()).to.equal('Pig');
    triggerKeyPress();
    await delay(0);
    expect(testRenderer.toJSON()).to.equal('Chicken');
    triggerClick();
    await delay(0);

    expect(testRenderer.toJSON()).to.equal('Barbie');
    expect(cats).to.eql([ 'Barbie' ]);
    expect(finalizations).to.eql([ 'Rocky', 'Barbie' ]);
  })
})

function createStoppage(delay = 500) {
  let r;
  const promise = new Promise((resolve, reject) => r = [ resolve, reject ]);
  promise.resolve = r[0];
  promise.reject = r[1];
  // prevent failed test from stalling the test script
  setTimeout(() => { promise.reject(new Error(`Timeout`)); }, delay);
  return promise;
}

async function readStream(stream) {
  const memStream = new MemoryStream;
  stream.pipe(memStream);
  await new Promise(resolve => memStream.once('finish', resolve));
  const data = memStream.read(Infinity);
  const string = data.toString();
  memStream.destroy();
  return string;
}

process.on('warning', function() {
  console.log('ERROR');
});
