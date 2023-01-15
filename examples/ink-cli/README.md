# Ink CLI Example

On prior occasions I've mentioned how React-seq allows you to program in a manner similiar to writing CLI 
program. In this example, we're going to create an actual CLI program, with the help of 
[Ink](https://github.com/vadimdemedes/ink), a React renderer that targets the terminal. Since CLI programs
often involves time-consuming operations, React-seq complements Ink very nicely.

## Seeing the code in action

Go to the `examples/ink-cli` folder. Run `npm install` then `npm start`. 

![screenshot](./img/screenshot-1.jpg)

To run the script directly without the transpilation step, run `./cli.mjs`.

## Working with JSX

Since Node.js can't run code containing JSX directly, this example comes with a [script](./transpile.mjs) 
that transpile all .jsx files in the working folder to .mjs. It was written in anticipation of being 
reused. It is capable of handling dynamic import (with non-static path as well), something not done in 
this example. Feel free to make use of it in your own project.

## Boostrap code

[`cli.jsx`](./cli.jsx) is the program's entry point. As you can see, it starts with a shebang. The 
bootstrap sequence is pretty simple:

```js
#!/usr/bin/env node
import { useSequential } from 'react-seq';
import { render } from 'ink';
import main from './main.jsx';

function App() {
  return useSequential(main, []);
}

render(<App />);
```

The `App` component is as barebone as can be. All it does is return what 
[`useSequential`](../../doc/useSequential.md) returns. The real actions take place inside the main 
function.

## The main function

[`main.jsx`](./main.jsx) is where the bulk of the program's code is expected to be contained. 
Since this is just a demo, the main function is quite short: 

```js
export default async function* main({ fallback }) {
  fallback(<Text />);
  let phase = 1;
  yield <BusinessPlan phase={phase++} />;
  await delay(3000);
  yield <BusinessPlan phase={phase++} />;
  await delay(3000);
  yield <BusinessPlan phase={phase++} />;
  await delay(3000);
  yield <BusinessPlan phase={phase++} />;
}
```

We aren't actually doing anything here. Just pretending to be busy. In a real app where the `delay` 
calls occur would have large blocks of async code doing useful things. After each stage is 
completed, the UI gets updated to reflect that fact.

Note the use of [`fallback`](../../fallback.md). Ink does not like `<Suspense>` without a 
fallback for some reason. An error would occur if we don't give it that empty text block. A
real-life program that performs lengthy initiation might actually use `fallback` to indicate 
to the user that it's starting up.

## UI components

Our UI simply contains a list of tasks that need to be done:

```js
function BusinessPlan({ phase }) {
  return (
    <>
      <Phase number={1} current={phase}>Stealing underpants</Phase>
      <Phase number={2} current={phase}>???</Phase>
      <Phase number={3} current={phase}>Collecting profits</Phase>
    </>
  );
}

function Phase({ number, current, children }) {
  let status, bold = false;
  if (current === number) {
    status = <Text color="green"><Spinner /></Text>;
    bold = true;
  } else if (current > number) {
    status = <Text color="yellow">{'\u2713'}</Text>;
  } else {
    status = <Text> </Text>;
  }
  return <Text bold={bold}> {status} {children}</Text>;
}
```

A spinner will appear in front of the current task. Tasks already completed are noted by check 
marks. Upcoming tasks are given a space to, well, take up the space.

## Final thoughts

Well, that's it! That wasn't so hard, right? Creating an attractive, professionally-looking 
UI for your CLI program doesn't require that much added effort compared to doing a bunch of 
calls to `console.log`. Your end users will certainly appreciate it.

Be sure to read through the [documentation of Ink](https://github.com/vadimdemedes/ink) if 
you are unfamiliar with it. It's a very powerful framework for CLI development. This 
example has barely scratched the surface. There're numerous components for handling user 
input, like text input and drop-down. With the help of React-seq, using them is arguably 
easier than using `readline`.

Thanks for reading! As always, if you have any question, feel free to ask on the 
[discussion board](https://github.com/chung-leong/react-seq/discussions). Please give the 
project a star if you think it's a worthwhile effort.