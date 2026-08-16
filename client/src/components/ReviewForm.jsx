import React, { useState } from 'react';
import axios from 'axios';

// Simple star-rating + comment form shown after a completed transaction.
export default function ReviewForm({ transactionId, sellerName, onSubmitted }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const submit = async () => {
    if (rating < 1) {
      setError('Please choose a star rating');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await axios.post('/api/reviews', {
        transaction_id: transactionId,
        rating: rating,
        comment: comment,
      });
      onSubmitted();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-4 p-4 bg-white border border-gray-200 rounded-lg">
      <p className="text-sm font-medium text-gray-900 mb-2">Rate your purchase from {sellerName}</p>
      <div className="flex gap-1 mb-3">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
            className="text-2xl leading-none focus:outline-none"
            aria-label={`${star} star${star > 1 ? 's' : ''}`}
          >
            <span className={(hover || rating) >= star ? 'text-yellow-400' : 'text-gray-300'}>★</span>
          </button>
        ))}
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Optional: how did it go? (e.g. fast transfer, smooth deal)"
        rows="2"
        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm mb-3"
      />
      {error && <div className="mb-3 p-2 bg-red-100 text-red-700 rounded text-sm">{error}</div>}
      <button
        onClick={submit}
        disabled={submitting}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium text-sm"
      >
        {submitting ? 'Submitting...' : 'Submit Review'}
      </button>
    </div>
  );
}
