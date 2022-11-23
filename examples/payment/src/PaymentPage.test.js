import { withTestRenderer } from 'react-seq/test-utils';
import { PaymentPage } from './PaymentPage.js';

test('payment with BLIK', async () => {
  await withTestRenderer(<PaymentPage />, async ({ awaiting, resolve }) => {
    let success = false;
    let selected = false;
    while (!success) {
      if (!selected) {
        expect(awaiting()).toBe('selection');
        await resolve({ name: 'BLIK', description: 'Payment using BLIK' });
        selected = true;
      }
      expect(awaiting()).toBe('response');
      await resolve({ number: '123 456' });
      if (awaiting() === 'confirmation') {
        await resolve();
      } else {
        success = true;
      }
    }
  });
});
