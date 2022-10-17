# React-seq

React-seq is a library that lets you take advantage of async function and generators while developing React apps.

## Basic Usage

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
        "additionalHooks": "use(Progressive|Sequence|GeneratedState)"
      }
    ]
  }
}
```

You will find the `eslintConfig` section in your project's `package.json` if it was created using **Create React App**.
