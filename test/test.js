import { linearize } from '../index.js';

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
