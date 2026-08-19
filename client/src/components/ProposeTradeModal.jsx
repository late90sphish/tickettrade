import React, { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

// Modal for proposing a trade: the buyer picks one of their own active listings
// to offer in exchange for the listing they're viewing.
export default function ProposeTradeModal({ targetListing, onClose, onSuccess }) {
  const { user } = useContext(AuthContext);
  const [myListings, setMyListings] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMyListings = async () => {
      try {
        const res = await axios.get('/api/listings', { params: { seller_id: user.id } });
        // Only active listings, and never the same listing being targeted.
        const active = (res.data.listings || []).filter(
          (l) => l.status === 'active' && l.id !== targetListing.id
        );
        setMyListings(active);
      } catch (err) {
        setError('Could not load your listings');
      } finally {
        setLoading(false);
      }
    };
    fetchMyListings();
  }, [user, targetListing]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedId) {
      setError('Please choose one of your tickets to offer');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await axios.post('/api/trades', {
        target_listing_id: targetListing.id,
        offered_listing_id: selectedId,
        message: message,
      });
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to propose trade');
    } finally {
      setSubmitting(false);
    }
  };

  const selected = myListings.find((l) => l.id === selectedId);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-900">Propose a Trade</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>

        <p className="text-sm text-gray-600 mb-1">You want:</p>
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg mb-4">
          <p className="font-medium text-gray-900">{targetListing.title}</p>
          <p className="text-sm text-gray-600">${targetListing.asking_price.toFixed(2)}</p>
        </div>

        {loading ? (
          <p className="text-gray-500 text-center py-6">Loading your tickets...</p>
        ) : myListings.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-gray-700 mb-2">You don't have any active tickets to offer.</p>
            <p className="text-sm text-gray-500">Create a listing first, then you can propose a trade.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <label className="block text-sm font-medium text-gray-700 mb-2">Offer one of your tickets:</label>
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
            >
              <option value="">Select a ticket...</option>
              {myListings.map((l) => (
                <option key={l.id} value={l.id}>{l.title} (${l.asking_price.toFixed(2)})</option>
              ))}
            </select>

            {selected && (
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg mb-4">
                <p className="text-xs text-gray-600 mb-1">You give:</p>
                <p className="font-medium text-gray-900">{selected.title}</p>
                <p className="text-sm text-gray-600">${selected.asking_price.toFixed(2)}</p>
                {selected.show_date && (
                  <p className="text-xs text-gray-500 mt-1">📅 {new Date(selected.show_date).toLocaleDateString()}</p>
                )}
              </div>
            )}

            <label className="block text-sm font-medium text-gray-700 mb-2">Message <span className="font-normal text-gray-500">(optional)</span></label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Add a note about your trade..."
              rows="2"
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4 text-sm"
            />

            {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">{error}</div>}

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={submitting || !selectedId}
                className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 font-medium"
              >
                {submitting ? 'Sending...' : 'Propose Trade'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {error && myListings.length === 0 && (
          <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">{error}</div>
        )}
      </div>
    </div>
  );
}
