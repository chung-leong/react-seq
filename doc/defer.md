# defer(delay)

Specify the time interval between intermediate content updates

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
    yield <span>Performing A...</span>  // intermediate content
    await taskA();
    yield <span>Performing B...</span>  // intermediate content
    await taskB();
    yield <span>Performing C...</span>  // intermediate content
    await taskC();
    yield <span>Finished</span>         // final content
  }, [ id ])
}
```

## Parameters

* `delay` - `<number>` Duration of time in milliseconds

## Deferment Explained

The time required to perform a given asynchronous operation can vary greatly. A fetch, for instance, might require
several seconds when a remote resource is accessed for the first time then only a few milliseconds once it's
present in the browser cache. For the first scenario, we'd want to render an partially complete view of a
component as each resource arrives so a visit does not end up staring at a spinner for a long time. For the second
scenario, we'd want to render only the complete view.

Update deferment gives generated content a small window of opportunity to overwrite those preceding it, thereby
reducing the number of unnecessary updates and associated layout changes.

In the example above, delay is set to 200ms. Suppose `taskA` requires 40ms, `taskB` requires 70ms, and
`taskC` requires 50ms, as depicted in the timeline below:

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

At 50ms, `taskA` has already finished. "Performing A" has been discarded and the pending content is "Performing B".
That replaces the spinner.

At 100ms, no new content has been received from the generator. Nothings happens.

At 110ms, `taskB` finishes and `taskC` starts. Noting that the previous occasion has gone wasted, the code
elects to immediately show "Performing C".

At 160ms, "Finished" appears as before.

## Notes

You can call `defer` while the generator is running. Doing so is useful for looping generators whose initial run
builds the page while subsequent runs only update it with fresh data from the server. For example:

```js
function MovieInfo({ id }) {
  return useSequential(async function*({ fallback, defer, signal }) {
    defer(100);
    for (;;) {
      const film = await fetch(`https://modernmoviessu.ck/films/${id}`, { signal });
      /* ... */
      defer(Infinity);
      // wait an hour
      await delay(1000 * 60 * 60, { signal });
    }
  })
}
```

## Examples

* [SWAPI Example](../examples/swapi/README.md)
