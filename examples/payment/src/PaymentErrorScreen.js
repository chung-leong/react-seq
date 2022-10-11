export function PaymentErrorScreen({ error, onConfirm }) {
  return (
    <div className="payment error">
      <h2>Payment Failed</h2>
      <p>{error.message}</p>
      <footer>
        <button onClick={onConfirm}>Try Again</button>
      </footer>
    </div>
  );
}
