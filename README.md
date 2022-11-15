# React-seq ![ci](https://img.shields.io/github/workflow/status/chung-leong/react-seq/Node.js%20CI?label=Node.js%20CI&logo=github) ![nycrc config on GitHub](https://img.shields.io/nycrc/chung-leong/react-seq)

React-seq is a light-weight library that helps you take full advantage of async functions and generators while
developing React apps. It provides a set of hooks for managing processes that complete over time, such as loading
of code and data. It's designed for React 18 and above.

## Installation

`
npm install --save-dev react-seq
`

## Basic Usage

`useSequential()` is React-seq's most basic hook. It accepts an async generator function as a parameter and returns a
component that will display the output from the async generator as content:

```js
import { useSequential, delay } from 'react-seq';

function LovelyAnimals({ favorite = 'Chicken' }) {
  return useSequential(async function*({ fallback }) {
    fallback(<span>Cat</span>);
    await delay(1000);
    yield <span>Dog</span>;
    await delay(1000);
    yield <span>Octopus</span>;
    await delay(1000);
    yield <span>Hippopotamus</span>;
    await delay(1000);
    yield <span>Polar bear</span>;
    await delay(1000);
    yield <span>{favorite}</span>;
  }, []);
}
```

## Advantages

## Examples

## ESLint Configuration

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
