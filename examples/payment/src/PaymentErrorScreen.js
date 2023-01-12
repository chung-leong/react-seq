export default function PaymentErrorScreen({ error, onRetry }) {
  return (
    <div className="payment error">
      <h2>Payment Failed</h2>
      <p>{error.message}</p>
      <footer>
        <button onClick={onRetry}>Try Again</button>
      </footer>
    </div>
  );
}
