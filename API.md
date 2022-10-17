# API

## Hooks

* useSequence
* useProgressive
* useGeneratedState

## Non-hook functions

* sequence
* progressive
* generatedState

## Configuration functions

* [defer](#defer) <sup>`useSequence, useProgressive, useGeneratedState`</sup>
* [fallback](#fallback) <sup>`useSequence, useProgressive`</sup>
* [backup](#backup) <sup>`useSequence, useProgressive`</sup>
* [suspend](#suspend) <sup>`useSequence, useProgressive`</sup>
* [manageEvents](#manageEvents) <sup>`useSequence, useProgressive, useGeneratedState`</sup>
* [type](#type) <sup>`useProgressive`</sup>
* [element](#element) <sup>`useProgressive`</sup>
* [usable](#usable) <sup>`useProgressive`</sup>
* [initial](#initial) <sup>`useGeneratedState`</sup>

## Global configuration functions

* extendDeferment
* limitDeferment

## Prop generation functions

* generateProps
* generateNext

## Utility functions

* delay
* preload
* when

## useSequence(cb, deps)

### Syntax

```js
function ProductPage({ productId }) {
  return useSequence(async function*({ defer, fallback }) {
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

## useGeneratedState(cb, deps)

### Syntax

```js
function ProductPage({ productId }) {
  const [ state, on ] = useGeneratedState(async ({ defer, initial }) => {
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
function useSequence(cb, deps) {
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

## generatedState(cb, setState, setError)


### Syntax

```js
function useGeneratedState(cb, deps) {
  const { initialState, abortController, on, eventual } = useMemo(() => {
    return generatedState(cb, state => setState(state), err => setError(err));
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
