import './css/PaymentPage.css';
import { useSequence } from 'react-seq';

export function PaymentPage() {
  const seq = useSequence({}, []);
  return seq(async function*({ fallback, manageEvents }) {
    fallback(<PaymentLoading />);

    const [ on, eventual ] = manageEvents();
    // load code related to making payments
    const { getPaymentMethods, processPayment } = await import('./payment.js');
    // get the available payment methods
    const methods = await getPaymentMethods();
    // load input forms for the different methods
    const modules = {};
    for (const method of methods) {
      modules[method.name] = await import(`./PaymentMethod${method.name}.js`);
    }
    const { PaymentSelectionScreen } = await import('./PaymentSelectionScreen.js');

    let success = false;
    let method = null;
    while(!success) {
      if (!method) {
        yield <PaymentSelectionScreen methods={methods} onSelect={on.selection()} />;
        method = await eventual.selection;
      }
      const PaymentMethod = modules[method.name][`PaymentMethod${method.name}`];
      yield <PaymentMethod onSubmit={on.submission()} onCancel={on.cancellation('cancel')} />;
      const { PaymentProcessingScreen } = await import('./PaymentProcessingScreen.js');
      // wait for user to submit the form or hit cancel button
      const response = await eventual.submission.or.cancellation;
      if (response === 'cancel') {
        // go back to selection screen
        method = null;
        continue;
      }
      yield <PaymentProcessingScreen method={method} />;
      try {
        const payment = await processPayment(method, response);
        const { PaymentCompleteScreen } = await import('./PaymentCompleteScreen.js');
        yield <PaymentCompleteScreen payment={payment} />;
        success = true;
      } catch (err) {
        const { PaymentErrorScreen } = await import('./PaymentErrorScreen.js');
        yield <PaymentErrorScreen error={err} onConfirm={on.confirmation()} />;
        await eventual.confirmation;
      }
    }
  });
}

function PaymentLoading() {
  return <div className="payment loading">Load...</div>;
}
