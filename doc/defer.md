# defer(delay, limit = Infinity)



## Providers

* [useSequential](useSequential.md)
* [useProgressive](useProgressive.md)
* [useSequentialState](useSequentialState.md)
* [useProgressiveState](useProgressiveState.md)

## Syntax

```js
function Widget({ id }) {
  return useSequential(async function*({ defer, fallback }) {
    defer(200, 1000);
    fallback(<Spinner />);
    yield <span>Performing A...</span>
    await taskA();
    yield <span>Performing B...</span>
    await taskB();
    yield <span>Performing C...</span>
    await taskC();
    yield <span>Finished</span>
  }, [ id ])
}
```

## Parameters

* `delay` - `<number>` Duration of time between content update (prior to the final)
* `limit` - `<number>` Maximum amount of time to wait for the first item from a generator before resorting to
the [`timeout`](./timeout.md) content or state

## Deferrment Explained

In the example above, delay is set at 200ms. Suppose `taskA` requires 40ms, `taskB` requires 70ms, and
`taskC` requires 50ms as depicted in the timeline below:

```
          20ms      40ms      60ms      80ms      100ms     120ms     140ms     160ms     180ms     200ms
====================================================================================================
^ taskA() starts    ^ taskA() finishes
                    ^ taskB() starts                   ^ taskB() finishes
                                                       ^ taskC() starts         ^ taskC() finishes
                                                                                ^ "Finished"
```

The total execution time is 160ms, which is below 200ms. As such, none of the "Performing..." messages will appears.
The visual appearance of the widget will go directly from a spinner (specified using [`fallback`](./fallback.md))
to "Finished".

Now suppose the delay is lowered to 50ms:

```
          20ms      40ms      60ms      80ms      100ms     120ms     140ms     160ms     180ms     200ms
=========================|========================|========================|========================
^ taskA() starts    ^ taskA() finishes
                    ^ taskB() starts                   ^ taskB() finishes
                                                       ^ taskC() starts         ^ taskC() finishes
                         ^ "Performing B"              ^ "Performing C"         ^ "Finished"
```

At 50ms, `taskA` has already finished. The pending content is "Performing B". That replaces the spinner.

At 100ms, no new content has been received from the generator. Nothings happens.

At 110ms, `taskB` finishes and `taskC` starts. Noting that the previous occasion has gone wasted, the code
elects to immediately show "Performing C".

At 160ms, "Finished" appears as before.

## Deferrment Limit Explained

## Notes



## Examples

* [SWAPI Example](../examples/swapi/README.md)
