import './css/App.css';
import { useSequential, delay, throwing } from 'react-seq';

export default function App() {
  const form = useSequential(async function*({ manageEvents }) {
    const [ on, eventual ] = manageEvents();
    const cancellationError = new Error('Cancelling');
    const cancel = () => throwing(cancellationError);
    const hashChangeError = new Error('Hash was changeed');
    let step = window.location.hash.substr(1);
    function at(name) {
      step = name;
      if (window.location.hash !== '#' + step) {
        window.location.hash = '#' + step;
      }
    }
    function onHashChange() {
      if (window.location.hash !== '#' + step) {
        on.hashChange(throwing(hashChangeError));
      }
    }
    mount(() => {
      window.addEventListener('hashchange', onHashChange);
      return () => {
        window.removeEventListener('hashchange', onHashChange);
      };
    });
    let finished = false, lastError;
    while (!finished) {
      try {
        switch (step) {
          case 'alfa': {
            at('alfa');
            yield <Alfa onNext={on.click} />;
            await eventual.click.or.hashChange;
          } // fallthrough
          case 'bravo': {
            at('bravo');
            yield <Bravo onPrev={on.click.prev} onNext={on.click.next} />;
            const button = await eventual.click.or.hashChange;
            if (button === 'prev') {
              step = 'alfa';
              continue;
            }
          } // fallthrough
          case 'charlie': {
            at('charlie');
            yield <Charlie onCancel={on.click.apply(cancel)} onNext={on.click} />;
            await eventual.click.or.hashChange;
          } // fallthrough
          case 'delta': {
            at('delta');
            yield <Delta onNext={on.click} />;
            await eventual.click.or.hashChange;
            if (Math.random() > 0.75) {
              throw new Error('Random Error');
            }
            yield <Delta />;
            const transaction = startTransaction();
            try {
              await eventual.hashChange.or(transaction);
            } catch (err) {
              console.log('Cancelling transaction');
              transaction.cancel();
              throw err;
            }
          } // fallthrough
          case 'final': {
            at('final');
            yield <Final />;
            finished = true;
            break;
          }
          case 'error': {
            at('error');
            if (!lastError) {
               lastError = new Error('An error occurred');
            }
            yield <ErrorDisplay error={lastError} onContinue={on.click} />;
            await eventual.click.or.hashChange.for(5).seconds;
            step = 'alfa';
            break;
          }
          default:
            if (step) {
              throw new Error(`Unrecognized step ${step}`);
            }
            step = 'alfa';
        }
      } catch (err) {
        if (err === cancellationError) {
          step = 'alfa';
        } else if (err === hashChangeError) {
          step = window.location.hash.substr(1);
        } else {
          step = 'error';
          lastError = err;
        }
      }
    }
  }, []);
  return (
    <div className="App">
      <header className="App-header">
        <p>
          Switch Loop Example
        </p>
        <div className="form">{form}</div>
      </header>
    </div>
  );
}

function Alfa({ onNext }) {
  return (
    <section>
      <h2>Alfa</h2>
      <div>
        <button onClick={onNext}>Next</button>
      </div>
    </section>
  );
}

function Bravo({ onPrev, onNext }) {
  return (
    <section>
      <h2>Bravo</h2>
      <div>
        <button onClick={onPrev}>Previous</button>
        {' '}
        <button onClick={onNext}>Next</button>
      </div>
    </section>
  );
}

function Charlie({ onCancel, onNext }) {
  return (
    <section>
      <h2>Charlie</h2>
      <div>
        <button onClick={onCancel}>Cancellation</button>
        {' '}
        <button onClick={onNext}>Next</button>
      </div>
    </section>
  );
}

function Delta({ onNext }) {
  return (
    <section>
      <h2>Delta</h2>
      <div>
        <button onClick={onNext} disabled={!onNext}>Next</button>
      </div>
    </section>
  );
}

function Final({ onDone }) {
  return (
    <section>
      <h2>Final</h2>
    </section>
  );
}

function ErrorDisplay({ error, onContinue }) {
  return (
    <section>
      <h2>{error.message}</h2>
      <div>
        <button onClick={onContinue}>Continue</button>
      </div>
    </section>
  );
}

function startTransaction() {
  const abortController = new AbortController();
  const { signal } = abortController;
  const promise = delay(3000, { signal });
  promise.cancel = () => abortController.abort();
  return promise;
}
