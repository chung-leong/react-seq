import { useState, useEffect } from 'react';
import { useSequentialState, delay } from 'react-seq';

export default function App() {
  return (
    <div>
      <CounterReact />
      <CounterReactSeq />
    </div>
  );
}

function CounterReact() {
  const [ count, setCount ] = useState(0);
	useEffect(() => {
		const timer = setInterval(() => {
      setCount(c => c + 1);
    }, 200);
		return () => {
			clearInterval(timer);
		};
	}, []);
	return <div>{count} tests passed</div>;
}

function CounterReactSeq() {
  const count = useSequentialState(async function*({ initial }) {
    let count = 0;
    initial(count++);
    do {
      await delay(200);
      yield count++;
    } while (true);
  }, []);
	return <div>{count} tests passed</div>;
}