import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import ReviewForm from '../components/ReviewForm';

export default function Dashboard({ user }) {
  const navigate = useNavigate();
  const [tab, setTab] = useState('listings');
  const [listings, setListings] = useState([]);
  const [offers, setOffers] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (tab === 'listings') fetchListings();
    if (tab === 'offers') fetchOffers();
    if (tab === 'purchases') fetchTransactions();
  }, [tab]);

  const fetchListings = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/listings', { params: { seller_id: user.id } });
      setListings(res.data.listings);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchOffers = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/offers/received');
      setOffers(res.data.offers);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/transactions/mine');
      setPurchases(res.data.purchases);
      setSales(res.data.sales);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (offerId) => {
    try {
      await axios.post(`/api/offers/${offerId}/accept`);
      fetchOffers();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to accept offer');
    }
  };

  const handleReject = async (offerId) => {
    try {
      await axios.post(`/api/offers/${offerId}/reject`);
      fetchOffers();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to reject offer');
    }
  };

  const handleConfirmReceipt = async (transactionId) => {
    if (!window.confirm('Did you receive the ticket? This will release payment to the seller.')) return;
    try {
      await axios.post(`/api/transactions/${transactionId}/confirm-received`);
      fetchTransactions();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to confirm receipt');
    }
  };

  const handleMarkTransferred = async (transactionId) => {
    if (!window.confirm('Confirm you have transferred the ticket to the buyer via Ticketmaster?')) return;
    try {
      await axios.post(`/api/transactions/${transactionId}/mark-transferred`);
      fetchTransactions();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to mark transferred');
    }
  };

  const handleCancel = async (transactionId) => {
    if (!window.confirm('Cancel this purchase and refund yourself? The seller missed the transfer window.')) return;
    try {
      await axios.post(`/api/transactions/${transactionId}/cancel`);
      fetchTransactions();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to cancel');
    }
  };

  const isPast = (iso) => iso && new Date(iso) < new Date();

  const statusLabel = (s) => ({
    awaiting_transfer: 'Awaiting transfer',
    transferred: 'Ticket sent',
    completed: 'Completed',
    cancelled: 'Cancelled / refunded',
    escrow_held: 'In escrow',
  }[s] || s);

  const statusColor = (s) => ({
    awaiting_transfer: 'bg-yellow-100 text-yellow-800',
    transferred: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-gray-200 text-gray-700',
  }[s] || 'bg-blue-100 text-blue-800');

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <button onClick={() => navigate('/create-listing')} className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium">+ Sell Ticket</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg p-6"><p className="text-gray-600 text-sm mb-1">Rating</p><p className="text-3xl font-bold text-gray-900">⭐ {user.rating.toFixed(1)}</p><p className="text-xs text-gray-500">{user.total_reviews} reviews</p></div>
          <div className="bg-white rounded-lg p-6"><p className="text-gray-600 text-sm mb-1">Sales</p><p className="text-3xl font-bold text-gray-900">{user.completed_sales}</p></div>
          <div className="bg-white rounded-lg p-6"><p className="text-gray-600 text-sm mb-1">Purchases</p><p className="text-3xl font-bold text-gray-900">{user.completed_purchases}</p></div>
          <div className="bg-white rounded-lg p-6"><p className="text-gray-600 text-sm mb-1">Member Since</p><p className="text-lg font-semibold text-gray-900">{new Date(user.created_at).toLocaleDateString()}</p></div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="border-b">
            <div className="flex">
              <button onClick={() => setTab('listings')} className={`px-6 py-4 font-medium ${tab === 'listings' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}>My Listings</button>
              <button onClick={() => setTab('offers')} className={`px-6 py-4 font-medium ${tab === 'offers' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}>Offers Received</button>
              <button onClick={() => setTab('purchases')} className={`px-6 py-4 font-medium ${tab === 'purchases' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}>Purchases &amp; Sales</button>
            </div>
          </div>

          <div className="p-6">
            {loading && <div className="text-center py-12 text-gray-500">Loading...</div>}

            {!loading && tab === 'listings' && (
              listings.length > 0 ? (
                <div className="space-y-3">
                  {listings.map((l) => (
                    <div key={l.id} onClick={() => navigate(`/listings/${l.id}`)} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                      <div>
                        <p className="font-medium text-gray-900">{l.title}</p>
                        <p className="text-sm text-gray-500">${l.asking_price.toFixed(2)} · {l.status}</p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded ${l.accepts_offers ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{l.accepts_offers ? 'Offers Welcome' : 'Fixed Price'}</span>
                    </div>
                  ))}
                </div>
              ) : <div className="text-center py-12 text-gray-500">No listings yet. Click "Sell Ticket" to create one.</div>
            )}

            {!loading && tab === 'offers' && (
              offers.length > 0 ? (
                <div className="space-y-3">
                  {offers.map((o) => (
                    <div key={o.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-medium text-gray-900">{o.listing?.title}</p>
                          <p className="text-sm text-gray-600">{o.buyer.username} offered <span className="font-semibold text-green-600">${o.offered_price.toFixed(2)}</span></p>
                          {o.message && <p className="text-sm text-gray-500 mt-1 italic">"{o.message}"</p>}
                        </div>
                        <span className={`text-xs px-2 py-1 rounded ${o.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : o.status === 'accepted' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{o.status}</span>
                      </div>
                      {o.status === 'pending' && (
                        <div className="flex gap-2 mt-3">
                          <button onClick={() => handleAccept(o.id)} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium">Accept</button>
                          <button onClick={() => handleReject(o.id)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">Reject</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : <div className="text-center py-12 text-gray-500">No offers received yet.</div>
            )}

            {!loading && tab === 'purchases' && (
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Purchases</h3>
                  {purchases.length > 0 ? (
                    <div className="space-y-3">
                      {purchases.map((t) => (
                        <div key={t.id} className="p-4 border rounded-lg">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-gray-900">{t.listing?.title || 'Listing'}</p>
                              <p className="text-sm text-gray-500">${t.amount.toFixed(2)} · {new Date(t.created_at).toLocaleDateString()}</p>
                            </div>
                            <span className={`text-xs px-2 py-1 rounded ${statusColor(t.status)}`}>{statusLabel(t.status)}</span>
                          </div>

                          {t.status === 'awaiting_transfer' && !isPast(t.transfer_deadline) && (
                            <p className="mt-3 text-sm text-gray-600">Waiting for the seller to transfer your ticket. You'll be able to confirm receipt once they do.</p>
                          )}
                          {t.status === 'awaiting_transfer' && isPast(t.transfer_deadline) && (
                            <div className="mt-3">
                              <p className="text-sm text-red-700 mb-2">The seller missed the transfer window. You can cancel and get refunded.</p>
                              <button onClick={() => handleCancel(t.id)} className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium text-sm">
                                Cancel & Refund Me
                              </button>
                            </div>
                          )}
                          {t.status === 'transferred' && (
                            <button onClick={() => handleConfirmReceipt(t.id)} className="mt-3 w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium text-sm">
                              ✓ I Received the Ticket
                            </button>
                          )}
                          {t.status === 'cancelled' && (
                            <p className="mt-2 text-sm text-gray-600">This purchase was cancelled and refunded.</p>
                          )}
                          {t.status === 'completed' && t.auto_released && (
                            <p className="mt-2 text-xs text-gray-500">Auto-completed after the confirmation window passed.</p>
                          )}
                          {t.status === 'completed' && !t.reviewed && (
                            <ReviewForm
                              transactionId={t.id}
                              sellerName={t.listing?.seller?.username || 'the seller'}
                              onSubmitted={fetchTransactions}
                            />
                          )}
                          {t.status === 'completed' && t.reviewed && (
                            <p className="mt-2 text-sm text-green-700">✓ You reviewed this purchase</p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : <p className="text-sm text-gray-500">No purchases yet.</p>}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Sales</h3>
                  {sales.length > 0 ? (
                    <div className="space-y-3">
                      {sales.map((t) => (
                        <div key={t.id} className="p-4 border rounded-lg">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-gray-900">{t.listing?.title || 'Listing'}</p>
                              <p className="text-sm text-gray-500">${t.amount.toFixed(2)} · {new Date(t.created_at).toLocaleDateString()}</p>
                            </div>
                            <span className={`text-xs px-2 py-1 rounded ${statusColor(t.status)}`}>{statusLabel(t.status)}</span>
                          </div>
                          {t.status === 'awaiting_transfer' && (
                            <div className="mt-3">
                              <p className="text-sm text-gray-600 mb-2">Transfer the ticket to the buyer via Ticketmaster, then mark it here so they can confirm.</p>
                              <button onClick={() => handleMarkTransferred(t.id)} className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm">
                                I've Transferred the Ticket
                              </button>
                            </div>
                          )}
                          {t.status === 'transferred' && (
                            <p className="mt-2 text-sm text-gray-600">Waiting for the buyer to confirm receipt. Payment releases on confirmation (or automatically after the window).</p>
                          )}
                          {t.status === 'completed' && (
                            <p className="mt-2 text-sm text-green-700">✓ Sale complete — payment released.</p>
                          )}
                          {t.status === 'cancelled' && (
                            <p className="mt-2 text-sm text-gray-600">Buyer cancelled after the transfer window; they were refunded.</p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : <p className="text-sm text-gray-500">No sales yet.</p>}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
