import './css/main.css';

export default async function* main(state, methods) {
  const { manageRoute, manageEvents, transition, wrap, throw404, isDetour } = methods;
  const [ route ] = manageRoute({ screen: 0 });
  const [ on, eventual ] = manageEvents();
  const { to } = transition;
  wrap(children => (
    <div className="main">
      <div className="top-bar"><a href="/">Start</a></div>
      <div className="content">{children}</div>
    </div>
  ));
  for (;;) {
    try {
      if (route.screen === undefined) {
        const { default: ScreenStart } = await import('./screens/ScreenStart.js');
        yield to(<ScreenStart onNext={on.alfa} />);
        await eventual.alfa;
        route.screen = 'alfa';
      } else if (route.screen === 'alfa') {
        const { default: ScreenAlfa } = await import('./screens/ScreenAlfa.js');
        yield to(<ScreenAlfa onNext={on.bravo} />);
        await eventual.bravo;
        route.screen = 'bravo';
      } else if (route.screen === 'bravo') {
        const { default: ScreenBravo } = await import('./screens/ScreenBravo.js');
        yield to(<ScreenBravo onNext={on.charlie} onSkip={on.delta} />);
        const res = await eventual.charlie.or.delta;
        if ('charlie' in res) {
          route.screen = 'charlie';
        } else if ('delta' in res) {
          route.screen = 'delta';
        }
      } else if (route.screen === 'charlie') {
        const { default: ScreenCharlie, ThirdTimeNotTheCharm } = await import('./screens/ScreenCharlie.js');
        try {
          state.count ??= 1;
          yield to(<ScreenCharlie count={state.count++} onNext={on.delta} />);
          await eventual.delta;
          route.screen = 'delta';
        } catch (err) {
          if (err instanceof ThirdTimeNotTheCharm) {
            continue;
          } else {
            throw err;
          }
        }
      } else if (route.screen === 'delta') {
        const { default: ScreenDelta } = await import('./screens/ScreenDelta.js');
        try {
          state.text ??= '';
          yield to(<ScreenDelta text={state.text} onText={t => state.text = t} onNext={on.echo} />);
          await eventual.echo;
          route.screen = 'echo';
        } catch (err) {
          if (isDetour(err) && state.text.trim().length > 0) {
            yield to(<ScreenDelta text={state.text} onDetour={on.proceed} />);
            const { proceed } = await eventual.proceed;
            if (proceed) {
              throw err;
            } else {
              err.prevent();
            }
          } else {
            throw err;
          }
        }
      } else if (route.screen === 'echo') {
        const { default: echo } = await import('./echo.js');
        state.echo ??= {};
        yield echo(state.echo, methods);
        route.screen = 'foxtrot';
      } else if (route.screen === 'foxtrot') {
        const { default: ScreenFoxtrot } = await import('./screens/ScreenFoxtrot.js');
        yield to(<ScreenFoxtrot onNext={on.alfa} />);
        await eventual.alfa;
        route.screen = 'alfa';
      } else {
        throw404();
      }
    } catch (err) {
      if (isDetour(err)) {
        await err.proceed();
      } else {
        yield <ScreenError error={err} onConfirm={on.confirm} />;
        await eventual.confirm;
      }
    }
  }
}

function ScreenError({ error }) {
  return <div className="Screen ScreenError">{error.message}</div>;
}
