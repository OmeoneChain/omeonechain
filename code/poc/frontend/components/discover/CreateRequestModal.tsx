// File: code/poc/frontend/components/discover/CreateRequestModal.tsx
// Modal for creating new discovery requests
// Follows CreateListFlow pattern with simplified form

"use client"

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, HelpCircle, MapPin, Utensils, Calendar, DollarSign, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface CreateRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (requestId: string) => void;
}

const CreateRequestModal: React.FC<CreateRequestModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    cuisine_type: '',
    occasion: '',
    budget_range: '',
    dietary_restrictions: [] as string[]
  });

  const occasionOptions = [
    { value: 'date_night', label: 'Date Night' },
    { value: 'family', label: 'Family Dinner' },
    { value: 'business', label: 'Business Meal' },
    { value: 'casual', label: 'Casual Dining' },
    { value: 'celebration', label: 'Celebration' },
    { value: 'group', label: 'Group Outing' },
    { value: 'solo', label: 'Solo Dining' }
  ];

  const budgetOptions = [
    { value: '$', label: '$ - Budget Friendly' },
    { value: '$$', label: '$$ - Moderate' },
    { value: '$$$', label: '$$$ - Upscale' },
    { value: '$$$$', label: '$$$$ - Fine Dining' }
  ];

  const dietaryOptions = [
    'Vegetarian',
    'Vegan',
    'Gluten-Free',
    'Dairy-Free',
    'Nut-Free',
    'Halal',
    'Kosher'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.title.trim()) {
      toast.error('Please enter a title for your request');
      return;
    }

    if (formData.title.length < 10) {
      toast.error('Title must be at least 10 characters');
      return;
    }

    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('omeone_auth_token');
      
      if (!token) {
        toast.error('Please log in to create a request');
        setIsSubmitting(false);
        return;
      }

      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://redesigned-lamp-q74wgggqq9jjfxqjp-3001.app.github.dev';

      const response = await fetch(`${API_BASE_URL}/api/discovery/requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: formData.title.trim(),
          description: formData.description.trim() || undefined,
          location: formData.location.trim() || undefined,
          cuisine_type: formData.cuisine_type || undefined,
          occasion: formData.occasion || undefined,
          budget_range: formData.budget_range || undefined,
          dietary_restrictions: formData.dietary_restrictions.length > 0 ? formData.dietary_restrictions : undefined
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create request');
      }

      toast.success('Request created successfully!');
      onSuccess(data.request.id);
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        location: '',
        cuisine_type: '',
        occasion: '',
        budget_range: '',
        dietary_restrictions: []
      });
      
      onClose();
    } catch (error) {
      console.error('Error creating request:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleDietaryRestriction = (restriction: string) => {
    setFormData(prev => ({
      ...prev,
      dietary_restrictions: prev.dietary_restrictions.includes(restriction)
        ? prev.dietary_restrictions.filter(r => r !== restriction)
        : [...prev.dietary_restrictions, restriction]
    }));
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4 flex items-center justify-between border-b border-purple-700 z-10">
            <div className="flex items-center gap-3 text-white">
              <HelpCircle className="w-6 h-6" />
              <div>
                <h2 className="text-xl font-bold">Ask for Recommendations</h2>
                <p className="text-sm text-purple-100">Get help finding the perfect spot</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                What are you looking for? <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Best Italian for anniversary dinner?"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                maxLength={200}
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                {formData.title.length}/200 characters (minimum 10)
              </p>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Details
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Tell us more about what you're looking for... dietary needs, group size, special requirements, etc."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                rows={4}
                maxLength={1000}
              />
              <p className="text-xs text-gray-500 mt-1">
                {formData.description.length}/1000 characters (optional)
              </p>
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <MapPin size={16} />
                Location
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="e.g., Asa Sul, Downtown, Near Shopping Center"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            {/* Cuisine Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Utensils size={16} />
                Cuisine Type
              </label>
              <input
                type="text"
                value={formData.cuisine_type}
                onChange={(e) => setFormData({ ...formData, cuisine_type: e.target.value })}
                placeholder="e.g., Italian, Japanese, Brazilian, Vegetarian"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            {/* Occasion */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Calendar size={16} />
                Occasion
              </label>
              <select
                value={formData.occasion}
                onChange={(e) => setFormData({ ...formData, occasion: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="">Select an occasion (optional)</option>
                {occasionOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Budget Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <DollarSign size={16} />
                Budget Range
              </label>
              <div className="grid grid-cols-2 gap-3">
                {budgetOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, budget_range: option.value })}
                    className={`px-4 py-3 border rounded-lg text-sm font-medium transition-colors ${
                      formData.budget_range === option.value
                        ? 'border-purple-600 bg-purple-50 text-purple-700'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Dietary Restrictions */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Dietary Restrictions (optional)
              </label>
              <div className="flex flex-wrap gap-2">
                {dietaryOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => toggleDietaryRestriction(option)}
                    className={`px-3 py-2 border rounded-lg text-sm font-medium transition-colors ${
                      formData.dietary_restrictions.includes(option)
                        ? 'border-purple-600 bg-purple-50 text-purple-700'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>💡 Tip:</strong> The more details you provide, the better recommendations you'll receive from the community!
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !formData.title.trim() || formData.title.length < 10}
                className="px-6 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Post Request'
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default CreateRequestModal;