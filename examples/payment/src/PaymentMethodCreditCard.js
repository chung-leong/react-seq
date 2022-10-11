import { useCallback, useState } from 'react';

export function PaymentMethodCreditCard({ onSubmit, onCancel }) {
  const [ number, setNumber ] = useState('0123 4567 8901 2345');
  const [ name, setName ] = useState('Biggus Dickus');
  const [ expiration, setExpiration ] = useState('12/2023');

  const onNumberChange = useCallback(evt => setNumber(evt.target.value), []);
  const onNameChange = useCallback(evt => setName(evt.target.value), []);
  const onExpirationChange = useCallback(evt => setExpiration(evt.target.value), []);

  return (
    <div className="payment method creditcard">
      <h2>Credit-Card</h2>
      <label>
        <div>Credit-card number:</div>
        <div><input type="text" value={number} onChange={onNumberChange} /></div>
      </label>
      <label>
        <div>Full name:</div>
        <div><input type="text" value={name} onChange={onNameChange} /></div>
      </label>
      <label>
        <div>Expiration date:</div>
        <div><input type="text" value={expiration} onChange={onExpirationChange} placeholder="MM/YYYY"/></div>
      </label>
      <footer>
        <button onClick={() => onSubmit({ number, name, expiration })}>OK</button>
        {' '}
        <button onClick={() => onCancel()}>Cancel</button>
      </footer>
    </div>
  );
}
