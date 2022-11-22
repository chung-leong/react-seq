import './css/PaymentPage.css';
import { useSequential } from 'react-seq';

export function PaymentPage() {
  return useSequential(async function*({ fallback, manageEvents }) {
    fallback(<PaymentLoading />);

    // load code related to making payments
    const { getPaymentMethods, processPayment } = await import('./payment.js');
    // get the available payment methods
    const methods = await getPaymentMethods();
    // load input forms for the different methods
    const forms = {};
    for (const method of methods) {
      const module = await import(`./PaymentMethod${method.name}.js`);
      forms[method.name] = module[`PaymentMethod${method.name}`];
    }
    const { PaymentSelectionScreen } = await import('./PaymentSelectionScreen.js');

    const [ on, eventual ] = manageEvents();
    let success = false;
    let method = null;
    while (!success) {
      if (!method) {
        yield <PaymentSelectionScreen methods={methods} onSelect={on.selection} />;
        method = await eventual.selection;
      }
      const PaymentMethod = forms[method.name];
      yield <PaymentMethod onSubmit={on.response} onCancel={on.response.cancel} />;
      const { PaymentProcessingScreen } = await import('./PaymentProcessingScreen.js');
      // wait for user to submit the form or hit cancel button
      const response = await eventual.response;
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
        yield <PaymentErrorScreen error={err} onConfirm={on.confirmation} />;
        await eventual.confirmation;
      }
    }
  }, []);
}

function PaymentLoading() {
  return <div className="payment loading">Load...</div>;
}
