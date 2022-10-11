import { useCallback, useState } from 'react';

export function PaymentMethodBLIK({ onSubmit, onCancel }) {
  const [ number, setNumber ] = useState('012 456');

  const onNumberChange = useCallback(evt => setNumber(evt.target.value), []);

  return (
    <div className="payment method creditcard">
      <h2>BLIK</h2>
      <label>
        <div>BLIK number:</div>
        <div><input type="text" value={number} onChange={onNumberChange} /></div>
      </label>
      <footer>
        <button onClick={() => onSubmit({ number })}>OK</button>
        {' '}
        <button onClick={() => onCancel()}>Cancel</button>
      </footer>
    </div>
  );
}
