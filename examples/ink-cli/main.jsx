import { delay } from 'react-seq';
import { Text } from 'ink';
import InkSpinner from 'ink-spinner';

const Spinner = InkSpinner.default;

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

function BusinessPlan({ phase }) {
  return (
    <>
      <Phase number={1} current={phase}>Steal underpants</Phase>
      <Phase number={2} current={phase}>???</Phase>
      <Phase number={3} current={phase}>Profits</Phase>
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
  return <Text bold={bold}>{status} {children}</Text>;
}