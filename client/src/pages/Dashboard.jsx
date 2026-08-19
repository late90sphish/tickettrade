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
  const [tradeOffers, setTradeOffers] = useState({ incoming: [], outgoing: [] });
  const [swaps, setSwaps] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (tab === 'listings') fetchListings();
    if (tab === 'offers') fetchOffers();
    if (tab === 'purchases') fetchTransactions();
    if (tab === 'trades') fetchTradeOffers();
    if (tab === 'swaps') fetchSwaps();
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

  const fetchTradeOffers = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/trades/mine');
      setTradeOffers({ incoming: res.data.incoming || [], outgoing: res.data.outgoing || [] });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSwaps = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/swaps/mine');
      setSwaps(res.data.swaps || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptTrade = async (offerId) => {
    try {
      await axios.post(`/api/trades/${offerId}/accept`);
      fetchTradeOffers();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to accept trade');
    }
  };

  const handleRejectTrade = async (offerId) => {
    try {
      await axios.post(`/api/trades/${offerId}/reject`);
      fetchTradeOffers();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to reject trade');
    }
  };

  const handleSwapTransferred = async (swapId) => {
    if (!window.confirm('Confirm you have transferred your ticket to the other person?')) return;
    try {
      await axios.post(`/api/swaps/${swapId}/mark-transferred`);
      fetchSwaps();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to mark transferred');
    }
  };

  const handleSwapConfirmed = async (swapId) => {
    if (!window.confirm('Confirm you received their ticket? This completes your side of the trade.')) return;
    try {
      await axios.post(`/api/swaps/${swapId}/confirm-received`);
      fetchSwaps();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to confirm receipt');
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
              <button onClick={() => setTab('trades')} className={`px-6 py-4 font-medium ${tab === 'trades' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}>Trades</button>
              <button onClick={() => setTab('swaps')} className={`px-6 py-4 font-medium ${tab === 'swaps' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}>Active Swaps</button>
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

            {!loading && tab === 'trades' && (
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Incoming Trade Offers</h3>
                  {tradeOffers.incoming.length > 0 ? (
                    <div className="space-y-3">
                      {tradeOffers.incoming.map((o) => (
                        <div key={o.id} className="p-4 border rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <p className="text-sm text-gray-600"><span className="font-medium text-gray-900">{o.proposer?.username}</span> wants your ticket:</p>
                              <p className="font-medium text-gray-900">{o.target_listing?.title}</p>
                              <p className="text-sm text-gray-600 mt-2">They offer:</p>
                              <p className="font-medium text-purple-700">{o.offered_listing?.title} <span className="text-gray-500 font-normal">(${o.offered_listing?.asking_price?.toFixed(2)})</span></p>
                              {o.message && <p className="text-sm text-gray-500 mt-1 italic">"{o.message}"</p>}
                            </div>
                            <span className="text-xs px-2 py-1 rounded bg-yellow-100 text-yellow-800">{o.status}</span>
                          </div>
                          <div className="flex gap-2 mt-3">
                            <button onClick={() => handleAcceptTrade(o.id)} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium">Accept Trade</button>
                            <button onClick={() => handleRejectTrade(o.id)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">Reject</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : <p className="text-sm text-gray-500">No incoming trade offers.</p>}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Outgoing Trade Offers</h3>
                  {tradeOffers.outgoing.length > 0 ? (
                    <div className="space-y-3">
                      {tradeOffers.outgoing.map((o) => (
                        <div key={o.id} className="p-4 border rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <p className="text-sm text-gray-600">You offered:</p>
                              <p className="font-medium text-purple-700">{o.offered_listing?.title}</p>
                              <p className="text-sm text-gray-600 mt-2">For their ticket:</p>
                              <p className="font-medium text-gray-900">{o.target_listing?.title} <span className="text-gray-500 font-normal">(${o.target_listing?.asking_price?.toFixed(2)})</span></p>
                              {o.message && <p className="text-sm text-gray-500 mt-1 italic">"{o.message}"</p>}
                            </div>
                            <span className="text-xs px-2 py-1 rounded bg-yellow-100 text-yellow-800">{o.status}</span>
                          </div>
                          <div className="flex gap-2 mt-3">
                            <button onClick={() => handleRejectTrade(o.id)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">Withdraw</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : <p className="text-sm text-gray-500">No outgoing trade offers.</p>}
                </div>
              </div>
            )}

            {!loading && tab === 'swaps' && (
              swaps.length > 0 ? (
                <div className="space-y-4">
                  {swaps.map((sw) => {
                    const you = sw.you;
                    if (!you) return null;
                    const done = sw.status === 'completed';
                    return (
                      <div key={sw.id} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-4">
                          <p className="font-medium text-gray-900">Trade with {you.other_user?.username}</p>
                          <span className={`text-xs px-2 py-1 rounded ${done ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>{done ? 'Completed' : 'In progress'}</span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-4">
                          <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                            <p className="text-xs text-gray-600 mb-1">You give</p>
                            <p className="font-medium text-gray-900 text-sm">{you.your_listing?.title}</p>
                          </div>
                          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <p className="text-xs text-gray-600 mb-1">You get</p>
                            <p className="font-medium text-gray-900 text-sm">{you.their_listing?.title}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-4">
                          <div>
                            <p className="text-xs font-medium text-gray-500 mb-2">YOUR STATUS</p>
                            <div className={`flex items-center gap-2 text-sm mb-1 ${you.you_transferred ? 'text-green-700' : 'text-gray-400'}`}>
                              <span>{you.you_transferred ? '✓' : '○'}</span> You transferred
                            </div>
                            <div className={`flex items-center gap-2 text-sm ${you.you_confirmed ? 'text-green-700' : 'text-gray-400'}`}>
                              <span>{you.you_confirmed ? '✓' : '○'}</span> You confirmed receipt
                            </div>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-500 mb-2">THEIR STATUS</p>
                            <div className={`flex items-center gap-2 text-sm mb-1 ${you.they_transferred ? 'text-green-700' : 'text-gray-400'}`}>
                              <span>{you.they_transferred ? '✓' : '○'}</span> They transferred
                            </div>
                            <div className={`flex items-center gap-2 text-sm ${you.they_confirmed ? 'text-green-700' : 'text-gray-400'}`}>
                              <span>{you.they_confirmed ? '✓' : '○'}</span> They confirmed receipt
                            </div>
                          </div>
                        </div>

                        {!done && (
                          <div className="flex gap-2">
                            {!you.you_transferred && (
                              <button onClick={() => handleSwapTransferred(sw.id)} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
                                I've Transferred My Ticket
                              </button>
                            )}
                            {you.you_transferred && !you.you_confirmed && (
                              <button
                                onClick={() => handleSwapConfirmed(sw.id)}
                                disabled={!you.they_transferred}
                                title={!you.they_transferred ? 'Wait for them to transfer first' : ''}
                                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium"
                              >
                                {you.they_transferred ? "I've Received Their Ticket" : 'Waiting for them to send...'}
                              </button>
                            )}
                            {you.you_transferred && you.you_confirmed && (
                              <p className="text-sm text-gray-600">Your side is done — waiting for them to finish.</p>
                            )}
                          </div>
                        )}
                        {done && <p className="text-sm text-green-700 font-medium">✓ Trade completed — both sides confirmed.</p>}
                      </div>
                    );
                  })}
                </div>
              ) : <div className="text-center py-12 text-gray-500">No active swaps. Accept a trade offer to start one.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
