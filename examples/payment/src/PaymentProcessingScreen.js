export function PaymentProcessingScreen({ method }) {
  return (
    <div className="payment complete">
      <h2>{method.description}</h2>
      <p>Please stand by while transaction is being processed.</p>
    </div>
  );
}
