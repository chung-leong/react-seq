import { DetourPending } from './App.js';
import { delay } from 'react-seq';
import { removing } from 'array-router';
import './css/main.css';

export async function* main(methods) {
  const { fallback, manageRoute, manageEvents, handleError, throw404 } = methods;
  const [ route ] = manageRoute({
    screen: {
      $: 0,
      ...removing
    }
  });
  const [ on, eventual ] = manageEvents();
  fallback(<Loading />);
  let deltaText = '';
  for (;;) {
    try {
      if (route.screen === undefined) {
        const { ScreenStart } = await import('./screens/ScreenStart.js');
        yield <ScreenStart onNext={on.alfa} />
        await eventual.alfa.or.detour;
        route.screen = 'alfa';
      } else if (route.screen === 'alfa') {
        const { ScreenAlfa } = await import('./screens/ScreenAlfa.js');
        yield <ScreenAlfa onNext={on.bravo} />
        await eventual.bravo.or.detour;
        route.screen = 'bravo';
      } else if (route.screen === 'bravo') {
        const { ScreenBravo } = await import('./screens/ScreenBravo.js');
        yield <ScreenBravo onNext={on.charlie} onSkip={on.delta} />
        const res = await eventual.charlie.or.delta.or.detour;
        if ('charlie' in res) {
          route.screen = 'charlie';
        } else if ('delta' in res) {
          route.screen = 'delta';
        }
      } else if (route.screen === 'charlie') {
        const { ScreenCharlie } = await import('./screens/ScreenCharlie.js');
        yield <ScreenCharlie onNext={on.delta} />
        await eventual.delta;
        route.screen = 'delta';
      } else if (route.screen === 'delta') {
        const { ScreenDelta } = await import('./screens/ScreenDelta.js');
        yield <ScreenDelta text={deltaText} onText={t => deltaText = t} onNext={on.echo} />
        try {
          await eventual.echo.or.detour;
          route.screen = 'echo';
        } catch (err) {
          if (err instanceof DetourPending && deltaText.trim().length > 0) {
            yield <ScreenDelta text={deltaText} onDetour={on.proceed} />
            const { proceed } = await eventual.proceed;
            if (proceed) {
              throw err;
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

function Loading() {
  return (
    <div className="Loading">
      <div className="spinner" />
    </div>
  );
}
