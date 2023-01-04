import { withTestRenderer } from 'react-seq/test-utils';
import { PaymentPage } from './PaymentPage.js';
import { PaymentSelectionScreen } from './PaymentSelectionScreen.js';
import { PaymentMethodBLIK } from './PaymentMethodBLIK.js';
import { PaymentProcessingScreen } from './PaymentProcessingScreen.js';
import { PaymentErrorScreen } from './PaymentErrorScreen.js';
import { PaymentCompleteScreen } from './PaymentCompleteScreen.js';

test('payment with BLIK', async () => {
  await withTestRenderer(<PaymentPage />, async ({ awaiting, showing, shown, resolve }) => {
    expect(showing()).toBe(PaymentSelectionScreen);
    expect(awaiting()).toBe('selection');
    await resolve({ selection: { name: 'BLIK', description: 'Payment using BLIK' } });
    expect(showing()).toBe(PaymentMethodBLIK);
    expect(awaiting()).toBe('submission.or.cancellation');
    await resolve({ submission: { number: '123 456' } });
    expect(shown()).toContain(PaymentProcessingScreen);
    expect(showing()).toBe(PaymentCompleteScreen);
    expect(awaiting()).toBe(undefined);
  });
});
