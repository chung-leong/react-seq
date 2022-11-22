import './css/App.css';
import { useMemo } from 'react';
import { InspectorContext, ConsoleLogger } from 'react-seq';
import { PaymentPage } from './PaymentPage.js'

export default function App() {
  const logger = useMemo(() => new ConsoleLogger(), []);
  return (
    <div className="App">
      <header className="App-header">
        <p>
          Payment Page Example
        </p>
      </header>
      <InspectorContext.Provider value={logger}>
        <PaymentPage />
      </InspectorContext.Provider>
    </div>
  );
}
