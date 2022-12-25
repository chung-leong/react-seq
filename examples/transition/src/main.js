import { RouteChangePending } from './App.js';

export async function* main(methods) {
  const { manageRoute, manageEvents, handleError, throw404 } = methods;
  const [ route ] = manageRoute({ screen: 0 });
  const [ on, eventual ] = manageEvents();
  let charlieCount = 1;
  let deltaText = '', onDeltaText = t => deltaText = t;
  for (;;) {
    try {
      if (route.screen === undefined) {
        const { ScreenStart } = await import('./screens/ScreenStart.js');
        yield <ScreenStart onNext={on.alfa} />
        await eventual.alfa;
        route.screen = 'alfa';
      } else if (route.screen === 'alfa') {
        const { ScreenAlfa } = await import('./screens/ScreenAlfa.js');
        yield <ScreenAlfa onNext={on.bravo} />
        await eventual.bravo;
        route.screen = 'bravo';
      } else if (route.screen === 'bravo') {
        const { ScreenBravo } = await import('./screens/ScreenBravo.js');
        yield <ScreenBravo onNext={on.charlie} onSkip={on.delta} />
        const res = await eventual.charlie.or.delta;
        if ('charlie' in res) {
          route.screen = 'charlie';
        } else if ('delta' in res) {
          route.screen = 'delta';
        }
      } else if (route.screen === 'charlie') {
        const { ScreenCharlie, ThirdTimeNotTheCharm } = await import('./screens/ScreenCharlie.js');
        yield <ScreenCharlie count={charlieCount++} onNext={on.delta} />
        try {
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
        const { ScreenDelta } = await import('./screens/ScreenDelta.js');
        yield <ScreenDelta text={deltaText} onText={onDeltaText} onNext={on.echo} />
        try {
          await eventual.echo;
          route.screen = 'echo';
        } catch (err) {
          if (err instanceof RouteChangePending && deltaText.trim().length > 0) {
            yield <ScreenDelta text={deltaText} onDetour={on.proceed} />
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
        const { echo } = await import('./echo.js');
        yield echo(methods);
        route.screen = 'foxtrot';
      } else if (route.screen === 'foxtrot') {
        const { ScreenFoxtrot } = await import('./screens/ScreenFoxtrot.js');
        yield <ScreenFoxtrot onNext={on.alfa} />
        await eventual.alfa.or.detour;
        route.screen = 'alfa';
      } else {
        throw404();
      }
    } catch (err) {
      console.log(err.message);
      yield handleError(err);
    }
  }
}
