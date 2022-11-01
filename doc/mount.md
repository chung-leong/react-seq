# mount(fn)

Provide a callback function that is invoked when the component mounts or when dependencies of the hook change

## Providers

* [useSequential](useSequential.md)
* [useProgressive](useProgressive.md)
* [useSequentialState](useSequentialState.md)
* [useProgressiveState](useProgressiveState.md)

## Syntax

```js
function Widget({ id }) {
  return useSequential(async function*({ mount }) {
    mount(() => {
      window.addEventListener('hashchange', onHashChange);
      return () => {
        window.removeEventListener('hashchange', onHashChange);
      };
    });
  }, [ id ]);
}
```

```js
function Widget({ id }) {
  return useSequential(async function*({ mount }) {
    mount(() => {
      return (evt) => {
        evt.preventDefault();
      };
    });
  }, [ id ]);
}
```

## Parameters

* `fn` - `<Function>` Function to be called. It can return an optional clean-up function. This clean-up function will
receive an object containing the method `preventDefault`. Calling it stops the default action of shutting down the
async generator.

## Notes

Must be called prior to any `yield` or `await` statement.
