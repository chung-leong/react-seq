import { delay } from 'react-seq';

export async function getPaymentMethods() {
  await delay(250);
  return [
    { name: 'CreditCard', description: 'Payment with a credit card' },
    { name: 'BankTransfer', description: 'Payment through a bank transfer' },
    { name: 'BLIK', description: 'Payment using BLIK' },
  ]
}

export async function processPayment(method, details) {
  await delay(1000);
  if (Math.random() > 0.5) {
    throw new Error('Unable to process payment for random reason');
  }
}
