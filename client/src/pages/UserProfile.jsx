import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function UserProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [listings, setListings] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchUserProfile();
  }, [id]);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      const userResponse = await axios.get(`/api/users/${id}`);
      setUser(userResponse.data);
      const listingsResponse = await axios.get('/api/listings', { params: { seller_id: id } });
      setListings(listingsResponse.data.listings);
      const reviewsResponse = await axios.get(`/api/users/${id}/reviews`);
      setReviews(reviewsResponse.data.reviews);
    } catch (err) {
      setError('Failed to load user profile');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-white rounded-lg p-8 text-center">
            <h1 className="text-2xl font-bold mb-2">Profile Not Found</h1>
            <p className="text-gray-600 mb-4">{error}</p>
            <button onClick={() => navigate('/')} className="px-6 py-2 bg-blue-600 text-white rounded-lg">Back</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow p-8 mb-8">
          <div className="flex items-start gap-6 mb-6">
            {user.avatar_url ? (
              <img src={user.avatar_url} alt={user.username} className="w-24 h-24 rounded-full object-cover" />
            ) : (
              <div className="w-24 h-24 rounded-full bg-blue-600 flex items-center justify-center text-white text-4xl font-bold">
                {user.username[0].toUpperCase()}
              </div>
            )}
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900">{user.username}</h1>
              {user.first_name && <p className="text-gray-600">{user.first_name} {user.last_name}</p>}
              <div className="flex gap-6 mt-4">
                <div>
                  <p className="text-gray-600 text-sm">Rating</p>
                  <p className="text-2xl font-bold">⭐ {user.rating.toFixed(1)}</p>
                  <p className="text-xs text-gray-500">{user.total_reviews} reviews</p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">Sales</p>
                  <p className="text-2xl font-bold">{user.completed_sales}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">Purchases</p>
                  <p className="text-2xl font-bold">{user.completed_purchases}</p>
                </div>
              </div>
            </div>
          </div>
          {user.bio && (
            <div className="border-t pt-4">
              <h3 className="font-semibold mb-2">About</h3>
              <p className="text-gray-700">{user.bio}</p>
            </div>
          )}
        </div>

        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Listings ({listings.length})</h2>
          {listings.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {listings.map((listing) => (
                <div key={listing.id} onClick={() => navigate(`/listings/${listing.id}`)} className="bg-white rounded-lg shadow hover:shadow-lg cursor-pointer">
                  <div className="bg-gray-200 h-48 rounded-t-lg flex items-center justify-center">
                    <div className="text-gray-400 text-center">
                      <p className="text-4xl mb-1">🎫</p>
                      <p className="text-sm">Phish Ticket</p>
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">{listing.title}</h3>
                    <p className="text-2xl font-bold text-green-600">${listing.asking_price.toFixed(2)}</p>
                    <p className="text-xs text-gray-500 line-through">${listing.original_purchase_price.toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-lg p-8 text-center text-gray-600">No listings</div>
          )}
        </div>

        <div className="mt-10">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Reviews ({reviews.length})</h2>
          {reviews.length > 0 ? (
            <div className="space-y-3">
              {reviews.map((rev) => (
                <div key={rev.id} className="bg-white rounded-lg shadow p-4">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-medium text-gray-900">{rev.reviewer_username}</p>
                    <p className="text-yellow-400 text-sm">{'★'.repeat(rev.rating)}<span className="text-gray-300">{'★'.repeat(5 - rev.rating)}</span></p>
                  </div>
                  {rev.comment && <p className="text-sm text-gray-700">{rev.comment}</p>}
                  <p className="text-xs text-gray-400 mt-1">{new Date(rev.created_at).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-lg p-8 text-center text-gray-600">No reviews yet</div>
          )}
        </div>
      </div>
    </div>
  );
}
