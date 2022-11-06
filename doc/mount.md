# mount([fn])

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
      // delay abort on unmount by 1 second
      return ({ keepFor }) => keepFor(1000);
    });
  }, [ id ]);
}
```

```js
function Widget({ id }) {
  return useSequential(async function*({ mount }) {
    await mount();
    /* ... */
  }, [ id ]);
}
```

## Parameters

* `fn` - `<Function>` Function to be called. It can return an optional clean-up function. This clean-up function will
receive an object containing methods for controlling when the generator will be terminated.
* `return` `<Promise>` A promise that will be fulfilled when the component is mounted

## Control Methods

* `keep()` - Prevent abort from happening
* `keepFor(delay)` - Delay abort by specified number of milliseconds
* `keepUntil(promise)` - Delay abort until the supplied promise is fulfilled

Remounting of the component will cancel a deferred abort. The default behavior is to abort on the next tick. You don't
need to use any of the `keep` functions if you unmount and immediately remount a component.

## Notes

Must be called prior to any `yield` or `await` statement when used with an argument.

`mount` expects a regular, synchronous function. Use [`meanwhile`](./meanwhile.md) If you need to perform
asynchronous operations. Example:

```js
  mount(() => {
    const init = meanwhile(async () => {
      /* ... */
    });
    return () => {
      meanwhile(async () => {
        // make sure initialization is done prior to clean-up
        await init;   
        /* ... */
      });
    }
  })
```
