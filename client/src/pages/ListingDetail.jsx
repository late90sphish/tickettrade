import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import PaymentModal from '../components/PaymentModal';
import ReviewForm from '../components/ReviewForm';

let stripePromise = null;
function getStripe() {
  if (!stripePromise) {
    stripePromise = axios
      .get('/api/payments/config')
      .then((res) => loadStripe(res.data.publishable_key))
      .catch(() => null);
  }
  return stripePromise;
}

export default function ListingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [offerPrice, setOfferPrice] = useState('');
  const [offerMessage, setOfferMessage] = useState('');
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [submittingOffer, setSubmittingOffer] = useState(false);
  const [transaction, setTransaction] = useState(null);
  const [confirmingReceipt, setConfirmingReceipt] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [stripeInstance, setStripeInstance] = useState(null);

  useEffect(() => {
    fetchListing();
    getStripe().then(setStripeInstance);
  }, [id]);

  const fetchListing = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/listings/${id}`);
      setListing(response.data);
      setOfferPrice(response.data.asking_price);
      setError(null);
    } catch (err) {
      setError('Failed to load listing');
    } finally {
      setLoading(false);
    }
  };

  const handleMakeOffer = async (e) => {
    e.preventDefault();
    if (!offerPrice || parseFloat(offerPrice) <= 0) {
      alert('Please enter a valid offer price');
      return;
    }
    setSubmittingOffer(true);
    try {
      await axios.post('/api/offers', {
        listing_id: id,
        offered_price: parseFloat(offerPrice),
        message: offerMessage,
      });
      alert('Offer submitted!');
      setShowOfferForm(false);
      setOfferMessage('');
      fetchListing();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to submit offer');
    } finally {
      setSubmittingOffer(false);
    }
  };

  const handleConfirmReceipt = async () => {
    if (!window.confirm('Did you receive the ticket? This will release payment to the seller.')) {
      return;
    }
    setConfirmingReceipt(true);
    try {
      await axios.post(`/api/transactions/${transaction.id}/confirm-received`);
      alert('Receipt confirmed! Payment released to seller.');
      setTransaction((prev) => ({ ...prev, status: 'completed', buyer_confirmed_at: new Date().toISOString() }));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to confirm receipt');
    } finally {
      setConfirmingReceipt(false);
    }
  };

  const handlePaymentSuccess = (txn) => {
    setTransaction(txn);
    setShowPayment(false);
    alert('Payment successful! Money held in escrow. Confirm receipt when you get the ticket.');
  };

  const totalBuyerPays = listing ? (listing.seller_covers_fees ? listing.asking_price : listing.asking_price + (listing.asking_price * 0.054) + 0.30) : 0;

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="text-center"><div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div><p className="mt-4">Loading listing...</p></div></div>;

  if (!listing) return <div className="min-h-screen bg-gray-50 py-12"><div className="max-w-4xl mx-auto px-4"><div className="bg-white rounded-lg p-8 text-center"><h1 className="text-2xl font-bold mb-2">Listing Not Found</h1><p className="text-gray-600 mb-4">{error}</p><button onClick={() => navigate('/')} className="px-6 py-2 bg-blue-600 text-white rounded-lg">Back</button></div></div></div>;

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-6xl mx-auto px-4">
        <button onClick={() => navigate('/')} className="mb-6 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg">← Back to listings</button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow">
              <div className="aspect-square bg-gray-200 rounded-t-lg flex items-center justify-center">
                <div className="text-gray-400 text-center">
                  <p className="text-6xl mb-2">🎫</p>
                  <p>Phish Ticket</p>
                </div>
              </div>
              <div className="p-6">
                <h1 className="text-3xl font-bold text-gray-900 mb-4">{listing.title}</h1>
                {listing.show_date && <p className="text-sm text-gray-600 mb-4">📅 {new Date(listing.show_date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>}
                <p className="text-gray-700 mb-6">{listing.description}</p>

                <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg mb-6">
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Face Value</p>
                    <p className="text-lg font-bold text-gray-900">${listing.original_purchase_price.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Your Price</p>
                    <p className="text-lg font-bold text-green-600">${listing.asking_price.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Condition</p>
                    <p className="text-lg font-semibold text-gray-900">{listing.condition}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Offers</p>
                    <p className="text-lg font-semibold text-gray-900">{listing.accepts_offers ? '✓ Accepted' : '✗ Not accepted'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <div className="bg-white rounded-lg shadow p-6 mb-6 sticky top-20">
              <div className="mb-6">
                <p className="text-sm text-gray-600 mb-2">Total you'll pay:</p>
                <p className="text-4xl font-bold text-green-600 mb-1">${totalBuyerPays.toFixed(2)}</p>
                <p className="text-xs text-gray-500">{listing.seller_covers_fees ? 'Seller covers fees' : 'Includes platform & processing fees'}</p>
              </div>

              <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h3 className="font-semibold text-gray-900 mb-3">Seller</h3>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">{listing.seller.username[0].toUpperCase()}</div>
                  <div>
                    <p className="font-medium text-gray-900">{listing.seller.username}</p>
                    <p className="text-sm text-gray-600">⭐ {listing.seller.rating.toFixed(1)} ({listing.seller.total_reviews})</p>
                  </div>
                </div>
                <p className="text-xs text-gray-600 mb-2">{listing.seller.completed_sales} sales completed</p>
                <button onClick={() => navigate(`/users/${listing.seller.id}`)} className="w-full px-3 py-2 text-sm border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50">View Profile</button>
              </div>

              {transaction && (
                <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm font-medium text-gray-900 mb-2">Transaction Status</p>
                  <p className="text-xs text-gray-600 mb-3">
                    {transaction.status === 'escrow_held' ? '💰 Payment held in escrow - waiting for you to confirm receipt' : transaction.status === 'completed' ? '✓ Completed' : transaction.status}
                  </p>
                  {transaction.status === 'escrow_held' && (
                    <button onClick={handleConfirmReceipt} disabled={confirmingReceipt} className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium text-sm">
                      {confirmingReceipt ? 'Confirming...' : '✓ I Received the Ticket'}
                    </button>
                  )}
                  {transaction.status === 'completed' && !reviewed && !transaction.reviewed && (
                    <ReviewForm
                      transactionId={transaction.id}
                      sellerName={listing.seller.username}
                      onSubmitted={() => setReviewed(true)}
                    />
                  )}
                  {transaction.status === 'completed' && (reviewed || transaction.reviewed) && (
                    <p className="mt-3 text-sm text-green-700">✓ Thanks for your review!</p>
                  )}
                </div>
              )}

              {!transaction && (
                listing.accepts_offers ? (
                  !showOfferForm ? (
                    <>
                      <button onClick={() => setShowOfferForm(true)} className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium mb-2">Make Offer</button>
                      <button onClick={() => setShowPayment(true)} className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">Pay Full Price</button>
                    </>
                  ) : (
                    <form onSubmit={handleMakeOffer} className="space-y-3">
                      <input type="number" step="0.01" value={offerPrice} onChange={(e) => setOfferPrice(e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="Your offer" />
                      <textarea value={offerMessage} onChange={(e) => setOfferMessage(e.target.value)} placeholder="Optional message to seller..." rows="2" className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm" />
                      <div className="flex gap-2">
                        <button type="submit" disabled={submittingOffer} className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium text-sm">
                          {submittingOffer ? 'Submitting...' : 'Submit Offer'}
                        </button>
                        <button type="button" onClick={() => setShowOfferForm(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">Cancel</button>
                      </div>
                    </form>
                  )
                ) : (
                  <button onClick={() => setShowPayment(true)} className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">Pay ${totalBuyerPays.toFixed(2)}</button>
                )
              )}

              <p className="text-xs text-gray-500 mt-4 text-center">💳 Secured by Stripe<br/>✓ Buyer protected with escrow</p>
            </div>
          </div>
        </div>
      </div>

      {showPayment && stripeInstance && (
        <Elements stripe={stripeInstance}>
          <PaymentModal
            listing={listing}
            amount={totalBuyerPays}
            onClose={() => setShowPayment(false)}
            onSuccess={handlePaymentSuccess}
          />
        </Elements>
      )}
      {showPayment && !stripeInstance && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 text-center">
            <p className="text-gray-700 mb-4">Payments aren't set up yet. Add your Stripe keys to enable checkout.</p>
            <button onClick={() => setShowPayment(false)} className="px-4 py-2 bg-gray-200 rounded-lg">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
