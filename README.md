# React-seq ![ci](https://img.shields.io/github/workflow/status/chung-leong/react-seq/Node.js%20CI?label=Node.js%20CI&logo=github) ![nycrc config on GitHub](https://img.shields.io/nycrc/chung-leong/react-seq)

React-seq is a light-weight library that helps you take full advantage of async functions and generators while
developing React apps. It provides a set of hooks for managing processes that complete over time, such as loading
of code and data. It's designed for React 18 and above.

## Installation

`
npm install --save-dev react-seq
`

## Basic usage

```js
import { useSequential } from 'react-seq';

function ProductPage({ productId }) {
  return useSequential(async function*({ fallback }) {
    fallback(<div class="spinner"/>);
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

## Progressive rendering

## State hooks

## Event management

## API reference

* [Hooks and other functions](./API.md)
* [Server-side rendering](./server/README.md)
* [Client-side SSR support](./client/README.md)

## List of examples

* [Payment form](./examples/payment/README.md) <sup>`useSequential`</sup>
* [Switch loop](./examples/switch-loop/README.md) <sup>`useSequential`</sup>
* [Star Wars API](./examples/swapi/README.md) <sup>`useProgressive`</sup>
* [Word Press](./examples/wordpress.md) <sup>`useProgressive`</sup>
* [Star Wars API (server-side rendering)](./examples/swapi-ssr/README.md) <sup>`useProgressive`</sup>
* [Nobel Prize API](./examples/nobel/README.md) <sup>`useSequentialState`</sup>
* [Star Wars API (alternate implementation)](./examples/swapi-hook/README.md) <sup>`useSequentialState`</sup>
* [Media capture](./examples/media-cap/README.md) <sup>`useSequentialState`</sup>

## ESLint configuration

Add the following rule to your ESLint settings to enable the linting of React-seq hooks:

```js
"eslintConfig": {
  "rules": {
    /* ... */
    "react-hooks/exhaustive-deps": [
      "warn",
      {
        "additionalHooks": "use(Progressive(State)?|Sequential(State)?)"
      }
    ]
  }
}
```

You will find the `eslintConfig` section in your project's `package.json` if it was created using **Create React App**.
