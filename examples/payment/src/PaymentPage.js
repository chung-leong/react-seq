import './css/PaymentPage.css';
import { useSequential } from 'react-seq';

export default function PaymentPage() {
  return useSequential(async function*({ fallback, manageEvents }) {
    fallback(<PaymentLoading />);

    // load code related to making payments
    const { getPaymentMethods, processPayment } = await import('./payment.js');
    // get the available payment methods
    const methods = await getPaymentMethods();
    // load input forms for the different methods
    const forms = {};
    for (const method of methods) {
      forms[method.name] = await import(`./PaymentMethod${method.name}.js`);
    }
    const { default: PaymentSelectionScreen } = await import('./PaymentSelectionScreen.js');

    const [ on, eventual ] = manageEvents();
    let success = false;
    let method = null;
    while (!success) {
      if (!method) {
        yield <PaymentSelectionScreen methods={methods} onSelect={on.selection} />;
        const { selection } = await eventual.selection;
        method = selection;
      }
      const PaymentMethod = forms[method.name].default;
      yield <PaymentMethod onSubmit={on.submission} onCancel={on.cancellation} />;
      const { default: PaymentProcessingScreen } = await import('./PaymentProcessingScreen.js');
      // wait for user to submit the form or hit cancel button
      const { submission } = await eventual.submission.or.cancellation;
      if (!submission) {
        // go back to selection screen
        method = null;
        continue;
      }
      yield <PaymentProcessingScreen method={method} />;
      try {
        const payment = await processPayment(method, submission);
        const { default: PaymentCompleteScreen } = await import('./PaymentCompleteScreen.js');
        yield <PaymentCompleteScreen payment={payment} />;
        success = true;
      } catch (err) {
        const { default: PaymentErrorScreen } = await import('./PaymentErrorScreen.js');
        yield <PaymentErrorScreen error={err} onConfirm={on.confirmation} />;
        await eventual.confirmation;
      }
    }
  }, []);
}

function PaymentLoading() {
  return <div className="payment loading">Load...</div>;
}
