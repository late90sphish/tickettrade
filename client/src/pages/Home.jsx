
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { PHISH_SHOWS } from '../data/phishShows';


export default function Home() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetchListings();
  }, [search, category, page]);

  const fetchListings = async () => {
    try {
      setLoading(true);
      const params = { page };
      if (search) params.search = search;
      if (category) params.category = category;
      const response = await axios.get('/api/listings', { params });
      setListings(response.data.listings);
      setError(null);
    } catch (err) {
      setError('Failed to load listings');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
  };

  const getShowDetails = (showId) => {
  return PHISH_SHOWS.find(s => s.id === showId);
  };

  const getPriceChange = (original, asking) => {
    const diff = original - asking;
    const percent = ((diff / original) * 100).toFixed(1);
    return { diff, percent };
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-blue-600 text-white py-12">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-4xl font-bold mb-4">TicketTrade</h1>
          <p className="text-xl text-blue-100">Fair-price Phish tickets. Face value only, no markup.</p>
        </div>
      </div>

      <div className="bg-white border-b sticky top-16 z-10">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="flex gap-2">
              <input type="text" placeholder="Search listings..." value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">Search</button>
            </div>
          </form>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-12">
        {error && <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-lg">{error}</div>}

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading listings...</p>
          </div>
        ) : listings.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {listings.map((listing) => {
                const { percent } = getPriceChange(listing.original_purchase_price, listing.asking_price);
                return (
                  <Link key={listing.id} to={`/listings/${listing.id}`} className="bg-white rounded-lg shadow hover:shadow-lg transition overflow-hidden cursor-pointer group">
                    <div className="relative bg-gray-200 h-48 overflow-hidden">
                      {listing.images.length > 0 ? (
                        <img src={listing.images[0].url} alt={listing.title} className="w-full h-full object-cover group-hover:scale-105 transition" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">No image</div>
                      )}
                      <div className="absolute top-3 right-3 bg-green-600 text-white px-3 py-1 rounded-full text-sm font-medium">{percent}% off</div>
                    </div>
                    <div className="p-4">
                      <p className="text-xs text-gray-500 mb-1">{listing.category}</p>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">{listing.title}</h3>
                      {listing.show_date && <p className="text-xs text-gray-500 mb-1">{new Date(listing.show_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>}
                      <div className="mb-3">
                        <div className="text-sm text-gray-600">Face Value: <span className="line-through">${listing.original_purchase_price.toFixed(2)}</span></div>
                        <div className="text-2xl font-bold text-green-600">${listing.seller_covers_fees ? listing.asking_price.toFixed(2) : (listing.asking_price + (listing.asking_price * 0.054) + 0.30).toFixed(2)}</div>
<div className="text-xs text-gray-500">{listing.seller_covers_fees ? 'Seller covers fees' : 'Includes platform & processing fees'}</div>
                      </div>
                      <div className="flex items-center pt-3 border-t space-y-2">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{listing.seller.username}</p>
                          <p className="text-xs text-gray-500">⭐ {listing.seller.rating.toFixed(1)} ({listing.seller.total_reviews})</p>
                        </div>
                        {listing.accepts_offers ? (
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded font-medium">Offers Welcome</span>
                        ) : (
                          <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded font-medium">Fixed Price</span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
            <div className="flex justify-center gap-2">
              <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="px-4 py-2 border rounded-lg disabled:opacity-50 hover:bg-gray-50">Previous</button>
              <div className="px-4 py-2 flex items-center">Page {page}</div>
              <button onClick={() => setPage(page + 1)} disabled={listings.length < 20} className="px-4 py-2 border rounded-lg disabled:opacity-50 hover:bg-gray-50">Next</button>
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg">No listings found</p>
            <p className="text-gray-500">Try adjusting your search or filters</p>
          </div>
        )}
      </div>
    </div>
  );
}