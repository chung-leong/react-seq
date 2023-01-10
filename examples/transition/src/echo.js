export default async function* echo(state, methods) {
  const { manageRoute, manageEvents, throw404, transition, replacing } = methods;
  const [ route ] = manageRoute({ screen: 1 });
  const [ on, eventual ] = manageEvents();
  const { to } = transition;
  for (;;) {
    try {
      if (route.screen === undefined) {
        replacing(() => route.screen = '1');
      } else if (route.screen === '1') {
        const { default: ScreenEcho1 } = await import('./screens/ScreenEcho1.js');
        yield to(<ScreenEcho1 onNext={on.next} />);
        await eventual.next;
        route.screen = '2';
      } else if (route.screen === '2') {
        const { default: ScreenEcho2 } = await import('./screens/ScreenEcho2.js');
        yield to(<ScreenEcho2 onNext={on.next} />);
        await eventual.next;
        route.screen = '3';
      } else if (route.screen === '3') {
        const { default: ScreenEcho3 } = await import('./screens/ScreenEcho3.js');
        yield to(<ScreenEcho3 onNext={on.next} />);
        await eventual.next;
        route.screen = '4';
      } else if (route.screen === '4') {
        const { default: ScreenEcho4 } = await import('./screens/ScreenEcho4.js');
        yield to(<ScreenEcho4 onNext={on.next} />);
        await eventual.next;
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
