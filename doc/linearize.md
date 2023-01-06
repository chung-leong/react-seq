# linearize(generator)

Flatten an async generator

## Syntax

```js
  for await (const item of linearize(generator)) {
    /* ... */
  }
```

## Notes

Any error uncaught by a child generator will be thrown again in the parent generator. Thus the following code:

```js
import { linearize } from 'react-seq';

async function* alfa() {
  try {
    yield bravo();
  } catch(err) {
    console.log(`ALFA: ${err.message}`);
    throw err;
  }
}
async function* bravo() {
  try {
    yield charlie();
  } catch(err) {
    console.log(`BRAVO: ${err.message}`);
    throw err;
  }
}
async function* charlie() {
  try {
    yield delta();
  } catch(err) {
    console.log(`CHARLIE: ${err.message}`);
    throw err;
  }
}
async function* delta() {
  try {
    for (let i = 1; i <= 5; i++) {
      if (i === 3) {
        throw new Error('Third time is not the charm!');
      }
      yield i;
    }
  } catch (err) {
    console.log(`DELTA: ${err.message}`);
    throw err;
  }
}

(async () => {
  try {
    for await (const item of linearize(alfa())) {
      console.log(item);
    }
  } catch (err) {
    console.log(`THE END: ${err.message}`);
  }
})();
```

Will produce the following output:

```
1
2
DELTA: Third time is not the charm!
CHARLIE: Third time is not the charm!
BRAVO: Third time is not the charm!
ALFA: Third time is not the charm!
THE END: Third time is not the charm!
```

Basically, `linearize` makes async generator functions behave like regular functions when it comes to error
propagation.
