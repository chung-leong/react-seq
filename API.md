# API

## Hooks

* [useSequential](#useSequential)
* [useProgressive](#useProgressive)
* [useSequentialState](#useSequentialState)
* [useProgressiveState](#useProgressiveState)

## Non-hook functions

* [sequence](#sequence)
* [progressive](#progressive)
* [sequentialState](#sequentialState)

## Configuration functions

* [defer](#defer) <sup>`useSequential`, `useProgressive`, `useSequentialState`, `useProgressiveState`</sup>
* [fallback](#fallback) <sup>`useSequential`, `useProgressive`</sup>
* [timeout](#timeout) <sup>`useSequential`, `useProgressive`, `useSequentialState`, `useProgressiveState`</sup>
* [suspend](#suspend) <sup>`useSequential`, `useProgressive`</sup>
* [manageEvents](#manageEvents) <sup>`useSequential`, `useProgressive`, `useSequentialState`, `useProgressiveState`</sup>
* [type](#type) <sup>`useProgressive`</sup>
* [element](#element) <sup>`useProgressive`</sup>
* [usable](#usable) <sup>`useProgressive`, `useProgressiveState`</sup>
* [initial](#initial) <sup>`useSequentialState`, `useProgressiveState`</sup>

## Global configuration functions

* [extendDeferment](#extendDeferment)
* [limitDeferment](#limitDeferment)

## Prop generation functions

* [generateProps](#generateProps)
* [generateNext](#generateNext)

## Utility functions

* [delay](#delay)
* [preload](#preload)

## useSequential(cb, deps)<a name="useSequential"></a>

### Syntax

```js
function ProductPage({ productId }) {
  return useSequential(async function*({ defer, fallback }) {
    fallback(<Spinner/>);
    defer(100);
    const product = await fetchProduct(productId);
    const { ProductDescription } = await import('./ProductDescription.js');
    yield (
      <div>
        <ProductDescription product={product}/>
      </div>
    );
    const related = await fetchRelatedProducts(product);
    const { ProductCarousel } = await import('./ProductCarousel.js');
    yield (
      <div>
        <ProductDescription product={product}/>
        <ProductCarousel products={related}/>
      </div>
    );
    /* ... */
  }, [ productId ]);
}
```

### Parameters

* `cb` - `<AsyncGeneratorFunction>`
* `deps` - `<any[]>`
* `return` `<Element>`

## useProgressive(cb, deps)

### Syntax

```js
function ProductPage({ productId }) {
  return useProgressive(async ({ type, defer, fallback }) => {
    type(ProductPageUI);
    fallback(<Spinner/>);
    defer(100);
    const product = await fetchProduct(productId);
    const relatedProducts = fetchRelatedProducts(product);
    return { product, relatedProducts }
  }, [ productId ]);
}

function ProductPageUI(product, relatedProducts = []) {
  /* ... */
}
```

### Parameters

* `cb` - `<AsyncFunction>`
* `deps` - `<any[]>`
* `return` `<Element>`

### Examples

```js
function ProductPage({ productId }) {
  return useProgressive(async ({ type, defer, fallback }) => {
    fallback(<Spinner/>);
    defer(100);
    const product = await fetchProduct(productId);
    const relatedProducts = fetchRelatedProducts(product);
    switch (product.type) {
      case 'toy':
        type(await import('./ProductPageUIToy.js'));
        break;
      case 'computer':
        type(await import('./ProductPageUIComputer.js'));
        break;
      case 'lingerie':
        type(await import('./ProductPageUILingerie.js'));
        break;
      default:
        type(ProductPageUI);
        break;
    }
    return { product, relatedProducts }
  }, [ productId ]);
}
```

## useSequentialState(cb, deps)

### Syntax

```js
function ProductPage({ productId }) {
  const [ state, on ] = useSequentialState(async ({ defer, initial }) => {
    initial({});
    defer(100);
    const product = await fetchProduct(productId);
    yield { product };
    const related = await fetchRelatedProducts(product);
    yield { product, related };
    /* ... */
  }, [ productId ]);
  const { product, related } = state;
  /* ... */
}
```

### Parameters

* `cb` - `<AsyncFunction>`
* `deps` - `<any[]>`
* `return` `[ state, on, eventual ]`

## sequence(cb)

### Syntax

```js
function useSequential(cb, deps) {
  return useMemo(() => sequence(cb), deps);
}
```

### Parameters

* `cb` - `<AsyncGeneratorFunction>`
* `return` `<Element>`

## progressive(cb)

### Syntax

```js
function useProgressive(cb, deps) {
  return useMemo(() => progressive(cb), deps);
}
```

## sequentialState(cb, setState, setError)


### Syntax

```js
function useSequentialState(cb, deps) {
  const { initialState, abortController, on, eventual } = useMemo(() => {
    return sequentialState(cb, state => setState(state), err => setError(err));
  }, deps);
  const [ state, setState ] = useState(initialState);
  const [ error, setError ] = useState();
  useEffect(() => {
    setState(initialState);
    setError();
    return () => abortController.abort();
  }, [ initialState, abortController ]);
  if (error) {
    throw error;
  }
  return [ state, on, eventual ];
}
```

### Parameters

* `cb` - `<AsyncFunction>`
* `setState` - `<Function>`
* `setError` - `<Function>`
* `return` `{ initialState, abortController, on, eventual }`

## defer(delay, limit = Infinity)<a name="defer"></a>

### Syntax

```js
function Widget({ id }) {
  return useSequential(async function*({ defer }) {
    defer(100, 1000);
    yield <span>Performing A...</span>
    await taskA();
    yield <span>Performing B...</span>
    await taskB();
    yield <span>Performing C...</span>
    await taskC();
    yield <span>Finish</span>
  }, [ id ])
}
```

### Parameters

* `delay` - `<number>`
* `limit` - `<number>`

## fallback(element)<a name="fallback"></a>

### Syntax

```js
function Widget({ id }) {
  return useSequential(async function*({ fallback }) {
    fallback(<span>Initializing...</span>);
    const { taskA, taskB, taskC } = await import('./task.js');
    yield <span>Performing A...</span>
    await taskA();
    yield <span>Performing B...</span>
    await taskB();
    yield <span>Performing C...</span>
    await taskC();
    yield <span>Finish</span>
  }, [ id ])
}
```

### Parameters

* `element` - `<Element>` or `<Function>`

## timeout(element)<a name="timeout"></a>

### Syntax

```js
function Widget({ id }) {
  return useSequential(async function*({ defer, timeout }) {
    defer(100, 1000);
    timeout(<span>Please be patient</span>);
    yield <span>Performing A...</span>
    await taskA();
    yield <span>Performing B...</span>
    await taskB();
    yield <span>Performing C...</span>
    await taskC();
    yield <span>Finish</span>
  }, [ id ])
}
```

### Parameters

* `element` - `<Element>` or `<AsyncFunction>`

## suspend(key = undefined)<a name="suspend"></a>

### Syntax

```js
const DialogBox = React.lazy(() => import('./dialogbox.js'));

function Widget({ id }) {
  const form = useSequential(async function*({ suspend }) {
    suspend();
    /* ... */
  }, [ id ]);
  const elementB =
  return (
    <Suspense fallback={<Spinner/>}>
      <DialogBox>{form}</DialogBox>
    </Suspense>
  );
}
```

### Parameters

* `key` - `<String>`

## manageEvents(options = {})<a name="manageEvents"></a>

### Syntax

```js
```

### Parameters

* `options` - `{ warning = false }`

## type(type)<a name="type"></a>

### Syntax

```js
```

### Parameters

* `type` - `<Function>` or `<Class>`

## element(fn)<a name="element"></a>

### Syntax

```js
```

### Parameters

* `fn` - `<Function>`

## usable(obj)<a name="usable"></a>

### Syntax

```js
```

### Parameters

* `obj` - `<Object>`

## initial(state)<a name="initial"></a>

### Syntax

```js
```

### Parameters

* `state` - `<any>`

## extendDeferment(multiplier)<a name="extendDeferment"></a>

### Syntax

```js
```

### Parameters

* `multiplier` - `<number>`

## limitDeferment(limit)<a name="limitDeferment"></a>

### Syntax

```js
```

### Parameters

* `limit` - `<number>`

## generateProps(asyncProps, usables)<a name="generateProps"></a>

### Syntax

```js
```

### Parameters

* `asyncProps` - `<Object>`
* `usables` - `<Object>`

## generateNext(source)<a name="generateNext"></a>

### Syntax

```js
```

### Parameters

* `source` - `<Promise>` or `<AsyncGenerator>` or `<Generator>`

## delay(ms)<a name="delay"></a>

### Syntax

```js
```

### Parameters

* `ms` - `<number>`

## preload(fn)<a name="preload"></a>

### Syntax

```js
```

### Parameters

* `fn` - `<AsyncFunction>`
