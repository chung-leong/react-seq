# defer(delay)

Specify the time interval between content updates

## Providers

* [useSequential](useSequential.md)
* [useProgressive](useProgressive.md)
* [useSequentialState](useSequentialState.md)
* [useProgressiveState](useProgressiveState.md)

## Syntax

```js
function Widget({ id }) {
  return useSequential(async function*({ defer, fallback }) {
    defer(200);
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

* `delay` - `<number>` Duration of time in milliseconds.

## Deferment explained

The time required to perform a given asynchronous operation can vary greatly. A fetch, for instance, might require
several seconds when a remote resource is accessed for the first time then only a few milliseconds once it's
present in the browser cache. For the first scenario, we'd want to render partially complete views of a
component as each resource arrives, so a visitor would not stare too long at a spinner. For the second scenario, we'd
want to render only the complete view.

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

The total execution time is 160ms--well below 200ms. As such, none of the "Performing..." messages will appears.
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

At 110ms, `taskB` finishes and `taskC` starts. Noting that the previous time slot has gone unused, React-seq
elects to immediately show "Performing C".

At 160ms, "Finished" appears as before.

## Notes

By default, contents get rendered immediately upon retrieval (i.e. delay = 0).

Do not use small numbers. The difference between 0 and 1 is huge (no timer vs timer firing 1000 a second)!
Remember, 24 FPS corresponds to a frame time of 42ms.

During server-side rendering ([SSR](./settings.md)), deferment is always infinite. Content updates only occur at
stoppage points--when the generator returns or when it awaits a promise from the [event manager](./manageEvents.md).

When delay = Infinity, awaiting a promise from the event manager causes an automatic [flush](./flush.md).

You might wish to disable progressive rendering after a component has reached a stage of readiness and the
generator is kept active only to update it occasionally with fresh data from the server. The following example uses
the [`useSequentialState`](./useSequentialState.md) hook with a infinite-loop generator to obtain and
maintain up-to-date information about a movie:

```js
function MovieInfo({ id }) {
  const [ info, update ] = useSequentialState(async function*({ defer, initial, manageEvents, signal }) {
    initial({});
    const [ on, eventual ] = manageEvents();
    const result = (info) => [ info, on.updateRequest ];
    for (let i = 0;; i++) {
      defer(i === 0 ? 100 : Infinity);
      try {
        const film = await fetch(`https://modernmoviessu.ck/films/${id}`, { signal });
        yield result({ film });
        const actors = await fetch(`https://modernmoviessu.ck/films/${id}/actors/`, { signal });
        yield result({ film, actors });
        const directors = await fetch(`https://modernmoviessu.ck/films/${id}/directors/`, { signal });
        yield result({ film, actors, directors });
        const producers = await fetch(`https://modernmoviessu.ck/films/${id}/producers/`, { signal });
        yield result({ film, actors, directors, producers });
      } catch (err) {
        // try again later unless it's the first loop
        if (i === 0) {
          throw err;
        }
      } finally {
        // wait for update request or one hour
        await eventual.updateRequest.for(1).hour;
      }
    }
  }, []);
  /* ... */
}
```

During the first loop, `info` will gain more and more properties as the generator function retrieves them. In
subsequent loops, the intermediate states get tossed out. Only the complete data set gets returned. The example
relies on the automatic flushing mechanism mentioned above.

## Examples

* [SWAPI Example](../examples/swapi/README.md)
* [SWAPI Hook Example](../examples/swapi-hook/README.md)
