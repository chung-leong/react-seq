# React-seq ![ci](https://img.shields.io/github/actions/workflow/status/chung-leong/react-seq/node.js.yml?branch=main&label=Node.js%20CI&logo=github) ![nycrc config on GitHub](https://img.shields.io/nycrc/chung-leong/react-seq)

React-seq is a light-weight library that helps you take full advantage of async functions and generators while
developing React apps. It provides a set of hooks for managing processes that complete over time, such as loading
of code and data. It's designed for React 18 and above.

## Installation

```sh
npm install --save-dev react-seq
```

## Hooks

* [`useSequential`](./doc/useSequential.md) - Returns the last element outputted by an async generator function.
* [`useProgressive`](./doc/useProgressive.md) - Returns an element filled with data from multiple async sources.
* [`useSequentialState`](./doc/useSequentialState.md) - Return the last value outputted by an async generator function.
* [`useProgressiveState`](./doc/useProgressiveState.md) - Return an object whose properties are drawn from async sources.

## Usage scenarios

* [Loading of remote data](#loading-of-remote-data)
* [Dynamic page loading and navigation](#dynamic-page-loading-and-navigation)
* [Page transition](#page-transition)
* [Authentication and authorization](#authentication-and-authorization)
* [Management of complex state](#management-of-complex-state)

## Other topics

* [Handling errors asynchronously](#handling-errors-asynchronously)
* [Server-side rendering](#server-side-rendering)
* [Unit testing](#unit-testing)
* [ESLint configuration](#eslint-configuration)
* [Jest configuration](#jest-configuration)

## API reference

* [Hooks and other functions](./index.md)
* [Server-side rendering](./server/index.md)
* [Client-side SSR support](./client/index.md)
* [Test utilities](./test-utils/index.md)

## List of examples

* [Payment form](./examples/payment/README.md) <sup>`useSequential`</sup>
* [Star Wars API](./examples/swapi/README.md) <sup>`useProgressive`</sup>
* [Word Press](./examples/wordpress.md) <sup>`useProgressive`</sup>
* [Nobel Prize API](./examples/nobel/README.md) <sup>`useSequentialState`</sup>
* [Star Wars API (alternate implementation)](./examples/swapi-hook/README.md) <sup>`useSequentialState`</sup> <sup>`useProgressiveState`</sup>
* [Word Press (React Native)](./examples/wordpress-react-native.md) <sup>`useProgressive`</sup>
* [Star Wars API (server-side rendering)](./examples/swapi-ssr/README.md) <sup>`useProgressive`</sup>
* [NPM Search](./examples/npm-input/README.md) <sup>`useSequentialState`</sup> <sup>`useProgressiveState`</sup>
* [Media capture](./examples/media-cap/README.md) <sup>`useSequentialState`</sup>
* [Transition](./examples/transition/README.md) <sup>`useSequential`</sup>

## Loading of remote data

## Dynamic page loading and navigation

## Page transition

## Authentication and authorization

## Management of complex state

## Handling errors asynchronously

## Server-side rendering

## Unit testing

## ESLint configuration

Add "react-seq" to your ESLint settings to enable the linting of React-seq hooks:

```json
  "eslintConfig": {
    "extends": [
      "react-app",
      "react-app/jest",
      "react-seq"
    ]
  },
```

You will find the `eslintConfig` section in your project's `package.json` if it was created using **Create React App**.

## Jest configuration

Add the following to your project's `package.json` so Jest would transpile the library:

```json
  "jest": {
    "transformIgnorePatterns": [
      "!node_modules/react-seq/"
    ]
  },
```
