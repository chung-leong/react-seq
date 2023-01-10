export default function PaymentSelectionScreen({ methods, onSelect }) {
  return (
    <div className="payment selection">
      <h2>Select a Payment Method</h2>
      <ul className="methods">
        {methods.map(m => <li key={m.name} onClick={() => onSelect(m)}>{m.description}</li>)}
      </ul>
    </div>
  );
}
