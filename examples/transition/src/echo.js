export async function* echo(methods) {
  const { manageRoute, manageEvents, throw404, replacing } = methods;
  const [ route ] = manageRoute({ screen: 1 });
  const [ on, eventual ] = manageEvents();
  for (;;) {
    try {
      if (route.screen === undefined) {
        replacing(() => route.screen = '1');
      } else if (route.screen === '1') {
        const { ScreenEcho1 } = await import('./screens/ScreenEcho1.js');
        yield <ScreenEcho1 onNext={on.next} />
        await eventual.next.or.detour;
        route.screen = '2';
      } else if (route.screen === '2') {
        const { ScreenEcho2 } = await import('./screens/ScreenEcho2.js');
        yield <ScreenEcho2 onNext={on.next} />
        await eventual.next.or.detour;
        route.screen = '3';
      } else if (route.screen === '3') {
        const { ScreenEcho3 } = await import('./screens/ScreenEcho3.js');
        yield <ScreenEcho3 onNext={on.next} />
        await eventual.next.or.detour;
        route.screen = '4';
      } else if (route.screen === '4') {
        const { ScreenEcho4 } = await import('./screens/ScreenEcho4.js');
        yield <ScreenEcho4 onNext={on.next} />
        await eventual.next.or.detour;
        delete route.screen;
        return;
      } else {
        throw404();
      }
    } catch (err) {
      throw err;
    }
  }
}
