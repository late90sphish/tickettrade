import React, { useState, useRef } from 'react';
import { useStripe, useElements, CardElement } from '@stripe/react-stripe-js';
import axios from 'axios';

// Renders Stripe's card field, charges the card, and only calls onSuccess
// once Stripe confirms the payment actually succeeded.
export default function PaymentModal({ listing, amount, onClose, onSuccess }) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const inFlight = useRef(false); // synchronous guard against double-submit

  const handlePay = async () => {
    if (!stripe || !elements) return; // Stripe.js not loaded yet
    if (inFlight.current) return;     // already charging - ignore extra clicks
    inFlight.current = true;
    setError(null);
    setProcessing(true);
    try {
      // 1. Ask our backend to create a PaymentIntent and give us its client secret.
      const intentRes = await axios.post('/api/payments/create-intent', {
        listing_id: listing.id,
        amount: amount,
      });
      const clientSecret = intentRes.data.client_secret;

      // 2. Confirm the card payment in the browser with Stripe directly.
      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: { card: elements.getElement(CardElement) },
      });

      if (result.error) {
        setError(result.error.message || 'Payment failed');
        setProcessing(false);
        return;
      }

      // 3. Only if Stripe says it succeeded, tell our backend to record it.
      if (result.paymentIntent && result.paymentIntent.status === 'succeeded') {
        const confirmRes = await axios.post('/api/payments/confirm', {
          listing_id: listing.id,
          payment_intent_id: result.paymentIntent.id,
        });
        onSuccess(confirmRes.data.transaction);
      } else {
        setError('Payment did not complete. Please try again.');
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Something went wrong');
    } finally {
      setProcessing(false);
      inFlight.current = false;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-900">Complete your purchase</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>

        <p className="text-sm text-gray-600 mb-2">{listing.title}</p>
        <p className="text-3xl font-bold text-green-600 mb-4">${amount.toFixed(2)}</p>

        <div className="border rounded-lg p-4 mb-4">
          <CardElement options={{ style: { base: { fontSize: '16px' } } }} />
        </div>

        <p className="text-xs text-gray-500 mb-4">
          Test mode: use card 4242 4242 4242 4242, any future expiry, any CVC, any ZIP.
        </p>

        {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">{error}</div>}

        <button
          onClick={handlePay}
          disabled={!stripe || processing}
          className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
        >
          {processing ? 'Processing...' : `Pay $${amount.toFixed(2)}`}
        </button>

        <p className="text-xs text-gray-500 mt-4 text-center">
          Your payment is held in escrow until you confirm you received the ticket.
        </p>
      </div>
    </div>
  );
}
