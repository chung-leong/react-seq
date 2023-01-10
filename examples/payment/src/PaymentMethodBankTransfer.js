import { useCallback, useState } from 'react';

export default function PaymentMethodBankTransfer({ onSubmit, onCancel }) {
  const [ routingNumber, setRoutingNumber ] = useState('0123456789');
  const [ accountNumber, setAccountNumber ] = useState('0123456789');
  const [ name, setName ] = useState('Incontinentia Buttocks');

  const onRoutingNumberChange = useCallback(evt => setRoutingNumber(evt.target.value), []);
  const onAccountNumberChange = useCallback(evt => setAccountNumber(evt.target.value), []);
  const onNameChange = useCallback(evt => setName(evt.target.value), []);

  return (
    <div className="payment method creditcard">
      <h2>Bank Transfer</h2>
      <label>
        <div>Bank routing number:</div>
        <div><input type="text" value={routingNumber} onChange={onRoutingNumberChange} /></div>
      </label>
      <label>
        <div>Account number:</div>
        <div><input type="text" value={accountNumber} onChange={onAccountNumberChange} /></div>
      </label>
      <label>
        <div>Full name:</div>
        <div><input type="text" value={name} onChange={onNameChange} /></div>
      </label>
      <footer>
        <button onClick={() => onSubmit({ routingNumber, accountNumber, name })}>OK</button>
        {' '}
        <button onClick={onCancel}>Cancel</button>
      </footer>
    </div>
  );
}
