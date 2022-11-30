import { withTestRenderer } from 'react-seq';
import { PaymentPage } from './PaymentPage.js';
import { PaymentSelectionScreen } from './PaymentSelectionScreen.js';
import { PaymentMethodBLIK } from './PaymentMethodBLIK.js';
import { PaymentProcessingScreen } from './PaymentProcessingScreen.js';
import { PaymentErrorScreen } from './PaymentErrorScreen.js';
import { PaymentCompleteScreen } from './PaymentCompleteScreen.js';

test('payment with BLIK', async () => {
  await withTestRenderer(<PaymentPage />, async ({ awaiting, showing, shown, resolve }) => {
    expect(awaiting()).toBe('selection');
    expect(showing()).toBe(PaymentSelectionScreen);
    await resolve({ name: 'BLIK', description: 'Payment using BLIK' });
    expect(awaiting()).toBe('response');
    expect(showing()).toBe(PaymentMethodBLIK);
    await resolve({ number: '123 456' });
    expect(awaiting()).toBe(undefined);
    expect(shown()).toContain(PaymentProcessingScreen);
    expect(showing()).toBe(PaymentCompleteScreen);
  });
});
