import { expect } from 'chai';
import { html } from 'htm/react';
import { Suspense, Component } from 'react';
import { create, act } from 'react-test-renderer';
import { renderToPipeableStream } from 'react-dom/server';
import MemoryStream from 'memorystream';
import { createWriteStream } from 'fs';
import { delay } from '../index.js';
import 'mocha-skip-if';

import {
  useSequence,
  extendDelay,
} from '../index.js';

describe('#useSequence()', function() {
  it('should return a function', function() {
    let f;
    function Test() {
      f = useSequence();
      return 'Hello';
    }
    const testRenderer = create(html`<${Test} />`);
    expect(f).to.be.instanceOf(Function);
    expect(testRenderer.toJSON()).to.equal('Hello');
  })
  it('should return a component that uses the first item from the generator as its content', async function() {
    function Test() {
      const seq = useSequence();
      return seq(async function*({ fallback }) {
        fallback('Cow');
        yield 'Pig';
      });
    }
    const testRenderer = create(html`<${Test} />`);
    expect(testRenderer.toJSON()).to.equal('Cow');
    await delay(10);
    expect(testRenderer.toJSON()).to.equal('Pig');
  })
  it('should return a component that defers rendering', async function() {
    const stoppage = createStoppage();
    function Test() {
      const seq = useSequence({ delay: 50 });
      return seq(async function*({ fallback }) {
        fallback('Cow');
        yield 'Pig';
        await stoppage;
        yield 'Chicken';
      });
    }
    const testRenderer = create(html`<${Test} />`);
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
    function Test() {
      const seq = useSequence({ delay: 50 });
      return seq(async function*() {
        yield 'Pig';
        await delay(70);
        yield 'Duck';
        await stoppage;
        yield 'Chicken';
      });
    }
    const testRenderer = create(html`<${Test} />`);
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
    function Test() {
      const seq = useSequence({ delay: 20 });
      return seq(async function*({ fallback }) {
        fallback('Cow');
        yield 'Pig';
        await stoppage;
        yield 'Chicken';
      });
    }
    const testRenderer = create(html`<${Test} />`);
    expect(testRenderer.toJSON()).to.equal('Cow');
    await delay(30);
    expect(testRenderer.toJSON()).to.equal('Pig');
    stoppage.resolve();
    await delay(30);
    expect(testRenderer.toJSON()).to.equal('Chicken');
  })
  it('should return a component that uses fallback', async function() {
    const stoppage = createStoppage();
    function Test() {
      const seq = useSequence({ delay: 20 });
      return seq(async function*({ fallback }) {
        fallback('Cow');
        yield 'Pig';
        await stoppage;
        yield 'Chicken';
      });
    }
    const testRenderer = create(html`<${Test} />`);
    expect(testRenderer.toJSON()).to.equal('Cow');
    await delay(30);
    expect(testRenderer.toJSON()).to.equal('Pig');
    stoppage.resolve();
    await delay(30);
    expect(testRenderer.toJSON()).to.equal('Chicken');
  })
  it('should recreate generator when dependencies change', async function() {
    const cats = [];
    const iterations = [];
    function Test({ cat }) {
      const seq = useSequence({ delay: 20 }, [ cat ]);
      return seq(async function*({ fallback, iteration }) {
        fallback('Cow');
        delay(10);
        yield 'Pig';
        delay(10);
        yield cat;
        cats.push(cat);
        iterations.push(iteration);
      });
    }
    const testRenderer = create(html`<${Test} cat="Rocky" />`);
    await delay(30);
    expect(testRenderer.toJSON()).to.equal('Rocky');
    act(() => {
      testRenderer.update(html`<${Test} cat="Barbie" />`);
    });
    expect(testRenderer.toJSON()).to.equal('Cow');
    await delay(30);
    expect(testRenderer.toJSON()).to.equal('Barbie');
    expect(cats).to.eql([ 'Rocky', 'Barbie' ]);
    expect(iterations).to.eql([ 0, 1 ]);
  })
  it('should recreate generator when dependencies are not specified', async function() {
    const cats = [];
    const iterations = [];
    function Test({ cat }) {
      const seq = useSequence({ delay: 20 });
      return seq(async function*({ fallback, iteration }) {
        fallback('Cow');
        delay(10);
        yield 'Pig';
        delay(10);
        yield cat;
        cats.push(cat);
        iterations.push(iteration);
      });
    }
    const testRenderer = create(html`<${Test} cat="Rocky" />`);
    await delay(30);
    expect(testRenderer.toJSON()).to.equal('Rocky');
    act(() => {
      testRenderer.update(html`<${Test} cat="Barbie" />`);
    });
    expect(testRenderer.toJSON()).to.equal('Cow');
    await delay(30);
    expect(testRenderer.toJSON()).to.equal('Barbie');
    expect(cats).to.eql([ 'Rocky', 'Barbie' ]);
    expect(iterations).to.eql([ 0, 1 ]);
  })
  it('should allow management of events using promises', async function() {
    let triggerClick;
    function Test({ cat, dog }) {
      const seq = useSequence({}, [ cat ]);
      return seq(async function*({ fallback, manageEvents }) {
        const [ on, eventual ] = manageEvents();
        triggerClick = on.click();
        fallback('Cow');
        yield 'Pig';
        await eventual.click;
        yield 'Chicken';
        await eventual.click;
        yield cat;
      });
    }
    const testRenderer = create(html`<${Test} cat="Rocky" />`);
    await delay(10);
    expect(testRenderer.toJSON()).to.equal('Pig');
    triggerClick();
    await delay(0);
    expect(testRenderer.toJSON()).to.equal('Chicken');
    triggerClick();
    await delay(0);
    expect(testRenderer.toJSON()).to.equal('Rocky');
  })
  it('should not recreate generator when dependencies has not changed', async function() {
    const cats = [];
    const iterations = [];
    function Test({ cat, dog }) {
      const seq = useSequence({ delay: 20 }, [ cat ]);
      return seq(async function*({ fallback, iteration }) {
        fallback('Cow');
        delay(10);
        yield 'Pig';
        delay(10);
        yield cat;
        cats.push(cat);
        iterations.push(iteration);
      });
    }
    const testRenderer = create(html`<${Test} cat="Rocky" dog="Dingo" />`);
    await delay(30);
    expect(testRenderer.toJSON()).to.equal('Rocky');
    act(() => {
      testRenderer.update(html`<${Test} cat="Rocky" dog="Pi" />`);
    });
    await delay(30);
    expect(cats).to.eql([ 'Rocky' ]);
    expect(iterations).to.eql([ 0 ]);
  })
  it('should terminate iteration when dependencies change mid-cycle', async function() {
    const stoppage = createStoppage();
    const cats = [];
    const iterations = [];
    const finalizations = [];
    function Test({ cat }) {
      const seq = useSequence({ delay: 20 });
      return seq(async function*({ fallback, iteration }) {
        fallback('Cow');
        try {
          delay(10);
          yield 'Pig';
          await stoppage;
          yield cat;
          cats.push(cat);
          iterations.push(iteration);
        } finally {
          finalizations.push(cat);
        }
      });
    }
    const testRenderer = create(html`<${Test} cat="Rocky" />`);
    await delay(30);
    expect(testRenderer.toJSON()).to.equal('Pig');
    act(() => {
      testRenderer.update(html`<${Test} cat="Barbie" />`);
    });
    expect(testRenderer.toJSON()).to.equal('Cow');
    stoppage.resolve();
    await delay(20);
    expect(testRenderer.toJSON()).to.equal('Barbie');
    expect(cats).to.eql([ 'Barbie' ]);
    expect(iterations).to.eql([ 0 ]);
    expect(finalizations).to.eql([ 'Rocky', 'Barbie' ]);
  })
  it('should terminate iteration when component is unmounted mid-cycle', async function() {
    const stoppage = createStoppage();
    const cats = [];
    const iterations = [];
    const finalizations = [];
    function Test({ cat }) {
      const seq = useSequence({ delay: 20 });
      return seq(async function*({ fallback, iteration }) {
        fallback('Cow');
        try {
          delay(10);
          yield 'Pig';
          await stoppage;
          yield cat;
          cats.push(cat);
          iterations.push(iteration);
        } finally {
          finalizations.push(cat);
        }
      });
    }
    const testRenderer = create(html`<${Test} cat="Rocky" />`);
    await delay(30);
    expect(testRenderer.toJSON()).to.equal('Pig');
    act(() => {
      testRenderer.update(null);
    });
    stoppage.resolve();
    await delay(10);
    expect(testRenderer.toJSON()).to.equal(null);
    expect(cats).to.eql([]);
    expect(iterations).to.eql([]);
    expect(finalizations).to.eql([ 'Rocky' ]);
  })
  it('should cause all event promises to reject on unmount', async function() {
    const cats = [];
    const finalizations = [];
    function Test({ cat }) {
      const seq = useSequence({}, [ cat ]);
      return seq(async function*({ fallback, manageEvents }) {
        fallback('Cow');
        try {
          const [ on, eventual ] = manageEvents();
          yield 'Pig';
          await eventual.click.or.keypress;
          yield 'Chicken';
          await eventual.click;
          yield cat;
          cats.push(cat);
        } finally {
          finalizations.push(cat);
        }
      });
    }
    const testRenderer = create(html`<${Test} cat="Rocky" />`);
    await delay(10);
    expect(testRenderer.toJSON()).to.equal('Pig');
    await delay(30);
    act(() => {
      testRenderer.update(null);
    });
    await delay(0);
    expect(testRenderer.toJSON()).to.equal(null);
    expect(cats).to.eql([]);
    expect(finalizations).to.eql([ 'Rocky' ]);
  })
  it('should cause all event promises to reject on prop change', async function() {
    const cats = [];
    const finalizations = [];
    let triggerClick, triggerKeyPress;
    function Test({ cat }) {
      const seq = useSequence({}, [ cat ]);
      return seq(async function*({ fallback, manageEvents }) {
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
      });
    }
    const testRenderer = create(html`<${Test} cat="Rocky" />`);
    await delay(10);
    expect(testRenderer.toJSON()).to.equal('Pig');
    await delay(30);
    act(() => {
      testRenderer.update(html`<${Test} cat="Barbie" />`);
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
  it('should trigger error boundary', async function() {
    function Test({ cat }) {
      const seq = useSequence({}, [ cat ]);
      return seq(async function*({ fallback }) {
        fallbak('Cow');
        await delay(10);
        yield html`<div>${cat}</div>`;
      });
    }
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
          return html`<h1>${error.message}</h1>`;
        }
        return this.props.children;
      }
    }
    const errorFn = console.error;
    try {
      console.error = () => {};
      const testRenderer = create(html`<${ErrorBoundary}><${Test} cat="Rocky" /></ErrorBoundary>`);
      await delay(10);
      expect(error).to.be.an('error');
    } finally {
      console.error = errorFn;
    }
  })
  it('should trigger error boundary after a yield', async function() {
    function Test({ cat }) {
      const seq = useSequence({}, [ cat ]);
      return seq(async function*({ fallback }) {
        fallback('Cow');
        await delay(10);
        yield html`<div>Pig</div>`;
        await dely(10);
        yield html`<div>${cat}</div>`;
      });
    }
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
          return html`<h1>${error.message}</h1>`;
        }
        return this.props.children;
      }
    }
    const errorFn = console.error;
    try {
      console.error = () => {};
      const testRenderer = create(html`<${ErrorBoundary}><${Test} cat="Rocky" /></ErrorBoundary>`);
      await delay(10);
      expect(error).to.be.an('error');
    } finally {
      console.error = errorFn;
    }
  })
  it('should render correctly to a stream', async function() {
    function Test({ cat }) {
      const seq = useSequence({ delay: 100 }, [ cat ]);
      return seq(async function*({ fallback }) {
        fallback(html`<div>Cow</div>`);
        await delay(10);
        yield html`<div>Pig</div>`;
        await delay(10);
        yield html`<div>Chicken</div>`;
        await delay(10);
        yield html`<div>${cat}</div>`;
      });
    }
    const element = html`<${Test} cat="Rocky" />`;
    const stream = await new Promise((resolve, reject) => {
      const stream = renderToPipeableStream(element, {
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
      function Test({ cat }) {
        const seq = useSequence({}, [ cat ]);
        return seq(async function*({ fallback }) {
          fallback(html`<div>Cow</div>`);
          await delay(0);
          yield html`<div>Pig</div>`;
          await delay(10);
          yield html`<div>Chicken</div>`;
          await delay(10);
          yield html`<div>${cat}</div>`;
        });
      }
      const element = html`<${Test} cat="Rocky"/>`;
      const stream = await new Promise((resolve, reject) => {
        const stream = renderToPipeableStream(element, {
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

describe('#extendDelay()', function() {
  it('should expand the rendering delay', async function() {
    function Test() {
      const seq = useSequence({ delay: 10 });
      return seq(async function*() {
        yield 'Pig';
        await delay(20);
        yield 'Duck';
        await delay(20);
        yield 'Chicken';
      });
    }
    extendDelay(10);
    const testRenderer = create(html`<${Test} />`);
    expect(testRenderer.toJSON()).to.equal(null);
    await delay(30);
    expect(testRenderer.toJSON()).to.equal(null);
    await delay(30);
    expect(testRenderer.toJSON()).to.equal('Chicken');
  })
  it('should extend the rendering delay by specific amount', async function() {
    function Test() {
      const seq = useSequence({ delay: 0 });
      return seq(async function*() {
        yield 'Pig';
        await delay(20);
        yield 'Duck';
        await delay(20);
        yield 'Chicken';
      });
    }
    extendDelay(1, 10);
    const testRenderer = create(html`<${Test} />`);
    expect(testRenderer.toJSON()).to.equal(null);
    await delay(15);
    expect(testRenderer.toJSON()).to.equal('Pig');
    await delay(20);
    expect(testRenderer.toJSON()).to.equal('Duck');
    await delay(30);
    expect(testRenderer.toJSON()).to.equal('Chicken');
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
  await new Promise(resolve => memStream.on('finish', resolve));
  stream.abort();
  const data = memStream.read(Infinity);
  const string = data.toString();
  memStream.destroy();
  return string;
}
