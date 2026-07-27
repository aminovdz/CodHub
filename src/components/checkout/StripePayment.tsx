'use client';

import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { CreditCard, ShieldCheck } from 'lucide-react';

interface StripePaymentProps {
  publishableKey: string;
  amount: number;
  currency: string;
  onSuccess: (paymentIntentId: string) => void;
  onError: (error: string) => void;
}

const StripeForm = ({ amount, currency, onSuccess, onError }: Omit<StripePaymentProps, 'publishableKey'>) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      // Create PaymentIntent on the server
      const res = await fetch('/api/stripe/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, currency }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to initialize payment');
      }

      const clientSecret = data.clientSecret;

      // Confirm the payment on the client
      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement)!,
        },
      });

      if (result.error) {
        onError(result.error.message || 'Payment failed');
      } else if (result.paymentIntent && result.paymentIntent.status === 'succeeded') {
        onSuccess(result.paymentIntent.id);
      }
    } catch (err: any) {
      onError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form id="stripe-payment-form" onSubmit={handleSubmit} className="space-y-4">
      <div className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
        <CardElement options={{
          style: {
            base: {
              fontSize: '16px',
              color: '#334155',
              '::placeholder': {
                color: '#94a3b8',
              },
            },
            invalid: {
              color: '#ef4444',
            },
          },
        }} />
      </div>
      <button
        type="submit"
        disabled={!stripe || isProcessing}
        className="w-full py-4 px-5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-black text-lg rounded-xl transition-all flex justify-center items-center gap-2 disabled:bg-slate-300 disabled:cursor-not-allowed shadow-lg"
      >
        <CreditCard size={20} />
        {isProcessing ? 'Processing...' : `Pay ${amount.toLocaleString()} ${currency}`}
      </button>
      <div className="flex items-center justify-center gap-1 mt-2 text-xs font-bold text-slate-500 uppercase">
        <ShieldCheck size={14} className="text-emerald-500" />
        Secured by Stripe
      </div>
    </form>
  );
};

export default function StripePayment({ publishableKey, ...props }: StripePaymentProps) {
  const stripePromise = loadStripe(publishableKey);

  return (
    <Elements stripe={stripePromise}>
      <StripeForm {...props} />
    </Elements>
  );
}
