import React, { useState } from 'react';
import { PHISH_SHOWS, UPCOMING_SHOWS } from '../data/phishShows';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';


export default function CreateListing() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [coverFees, setCoverFees] = useState(true);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    original_purchase_price: '',
    asking_price: '',
    accepts_offers: true,
    allow_trades: false,
    show_id: '',
show_date: '',
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError(null);
  };

  const validateForm = () => {
    if (!formData.title.trim()) { setError('Title is required'); return false; }
    if (!formData.description.trim()) { setError('Seat location is required'); return false; }
    if (!formData.original_purchase_price || formData.original_purchase_price <= 0) { setError('Original purchase price required'); return false; }
    if (!formData.asking_price || formData.asking_price <= 0) { setError('Asking price required'); return false; }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);
    try {
      const response = await axios.post('/api/listings', {
        title: formData.title,
        description: formData.description,
        original_purchase_price: parseFloat(formData.original_purchase_price),
        asking_price: parseFloat(formData.asking_price),
        accepts_offers: formData.accepts_offers,
        allow_trades: formData.allow_trades,
        seller_covers_fees: coverFees,
        show_id: parseInt(formData.show_id),
show_date: formData.show_date,
      });
      navigate(`/listings/${response.data.id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create listing');
    } finally {
      setLoading(false);
    }
  };

  const feeAmount = parseFloat(formData.asking_price) ? (parseFloat(formData.asking_price) * 0.054) + 0.30 : 0;
  const totalBuyerPays = coverFees 
    ? parseFloat(formData.asking_price) || 0
    : (parseFloat(formData.asking_price) || 0) + feeAmount;

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Sell Phish Ticket</h1>
        <p className="text-gray-600 mb-8">List your ticket to the community</p>
        {error && <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-lg">{error}</div>}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-8 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Ticket Title *</label>
            <input type="text" name="title" value={formData.title} onChange={handleInputChange} placeholder="e.g., Phish - Madison Square Garden 12/28/24" className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Seat Location * <span className="font-normal text-gray-500">(section, row, seat)</span></label>
            <textarea name="description" value={formData.description} onChange={handleInputChange} placeholder="e.g. Section 112, Row K, Seats 5-6 — plus any notes" rows="3" className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Phish Show *</label>
            <select name="show_id" value={formData.show_id} onChange={(e) => {
              const show = PHISH_SHOWS.find(s => s.id === parseInt(e.target.value));
              setFormData(prev => ({ ...prev, show_id: e.target.value, show_date: show?.date }));
            }} className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required>
              <option value="">Select a show...</option>
              {UPCOMING_SHOWS.map(show => (
                <option key={show.id} value={show.id}>{new Date(show.date).toLocaleDateString()} - {show.venue}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4 bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Face Value *</label>
              <input type="number" name="original_purchase_price" value={formData.original_purchase_price} onChange={handleInputChange} step="0.01" min="0" placeholder="0.00" className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Your Asking Price *</label>
              <input type="number" name="asking_price" value={formData.asking_price} onChange={handleInputChange} step="0.01" min="0" placeholder="0.00" className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <p className="text-sm font-medium text-gray-900 mb-3">Who covers platform & processing fees?</p>
            <label className="flex items-center gap-3 mb-3 cursor-pointer">
              <input 
                type="radio" 
                checked={coverFees} 
                onChange={() => setCoverFees(true)}
                className="w-4 h-4 text-green-600"
              />
              <div>
                <p className="font-medium text-gray-900">I'll cover the fees</p>
                <p className="text-xs text-gray-600">Buyer pays: ${formData.asking_price || '0.00'}</p>
              </div>
            </label>
            
            <label className="flex items-center gap-3 cursor-pointer">
              <input 
                type="radio" 
                checked={!coverFees} 
                onChange={() => setCoverFees(false)}
                className="w-4 h-4 text-green-600"
              />
              <div>
                <p className="font-medium text-gray-900">Buyer covers the fees</p>
                <p className="text-xs text-gray-600">Buyer pays: ${totalBuyerPays.toFixed(2)} (includes ${feeAmount.toFixed(2)} fees)</p>
              </div>
            </label>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" name="accepts_offers" checked={formData.accepts_offers} onChange={(e) => setFormData(prev => ({ ...prev, accepts_offers: e.target.checked }))} className="w-5 h-5 text-blue-600 rounded" />
              <div>
                <p className="font-medium text-gray-900">{formData.accepts_offers ? '✓ Accepting Offers' : '✗ Not Accepting Offers'}</p>
                <p className="text-sm text-gray-600">{formData.accepts_offers ? 'Buyers can make offers below your asking price' : 'Buyers must pay your full asking price'}</p>
              </div>
            </label>
          </div>

          <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" name="allow_trades" checked={formData.allow_trades} onChange={(e) => setFormData(prev => ({ ...prev, allow_trades: e.target.checked }))} className="w-5 h-5 text-purple-600 rounded" />
              <div>
                <p className="font-medium text-gray-900">{formData.allow_trades ? '✓ Open to Trades' : '✗ Not Open to Trades'}</p>
                <p className="text-sm text-gray-600">{formData.allow_trades ? 'Other users can offer to swap one of their tickets for this one' : 'This ticket is for sale only, no trades'}</p>
              </div>
            </label>
          </div>

          <button type="submit" disabled={loading} className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium text-lg">
            {loading ? 'Creating...' : 'Create Listing'}
          </button>
        </form>
      </div>
    </div>
  );
}
