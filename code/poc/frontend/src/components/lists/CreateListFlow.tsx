// File: code/poc/frontend/src/components/lists/CreateListFlow.tsx
// FIXED: Added proper authentication using existing useAuth pattern

'use client';

import React, { useState, useEffect } from 'react';
import { useAuth, useAuthenticatedFetch } from '@/hooks/useAuth';
import { toast } from 'react-hot-toast';

interface Restaurant {
  id: number;
  name: string;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  category: string;
  verification_status: string;
}

interface CreateListFlowProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (listId: string) => void;
}

interface ListFormData {
  title: string;
  description: string;
  visibility: 'public' | 'private' | 'followers_only';
  selectedRestaurants: Restaurant[];
}

const CreateListFlow: React.FC<CreateListFlowProps> = ({ isOpen, onClose, onSuccess }) => {
  const { user, isAuthenticated } = useAuth();
  const authenticatedFetch = useAuthenticatedFetch();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Restaurant[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<ListFormData>({
    title: '',
    description: '',
    visibility: 'public',
    selectedRestaurants: []
  });

  // FIXED: Use environment variable from your existing pattern
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://redesigned-lamp-q74wgggqq9jjfxqjp-3001.app.github.dev';

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setCurrentStep(1);
      setFormData({
        title: '',
        description: '',
        visibility: 'public',
        selectedRestaurants: []
      });
      setSearchQuery('');
      setSearchResults([]);
      setSearchError(null);
    }
  }, [isOpen]);

  // FIXED: Restaurant search with proper authentication
  const fetchRestaurants = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    setSearchError(null);

    try {
      console.log('🔍 Searching restaurants with query:', query);
      
      // FIXED: Use authenticatedFetch from useAuth hook
      const response = await authenticatedFetch(
        `${API_BASE_URL}/api/restaurants?search=${encodeURIComponent(query)}&limit=10`
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ Restaurant search results:', data);

      if (data.success && data.results) {
        setSearchResults(data.results);
        console.log(`✅ Found ${data.results.length} restaurants`);
      } else {
        console.warn('Unexpected API response format:', data);
        setSearchResults([]);
      }
    } catch (error) {
      console.error('❌ Restaurant search failed:', error);
      setSearchError(error instanceof Error ? error.message : 'Failed to search restaurants');
      setSearchResults([]);
      toast.error('Failed to search restaurants. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchRestaurants(searchQuery);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const handleRestaurantSelect = (restaurant: Restaurant) => {
    if (!formData.selectedRestaurants.find(r => r.id === restaurant.id)) {
      setFormData(prev => ({
        ...prev,
        selectedRestaurants: [...prev.selectedRestaurants, restaurant]
      }));
      toast.success(`Added ${restaurant.name} to list`);
    }
  };

  const handleRestaurantRemove = (restaurantId: number) => {
    setFormData(prev => ({
      ...prev,
      selectedRestaurants: prev.selectedRestaurants.filter(r => r.id !== restaurantId)
    }));
  };

  // FIXED: Real API call to create list in database
  const handleSubmit = async () => {
    if (!isAuthenticated || !user) {
      toast.error('Please log in to create a list');
      return;
    }

    if (!formData.title.trim()) {
      toast.error('Please enter a list title');
      return;
    }

    if (formData.selectedRestaurants.length === 0) {
      toast.error('Please select at least one restaurant');
      return;
    }

    setIsLoading(true);

    try {
      console.log('📝 Creating list with data:', formData);

      // FIXED: Real API call to create list
      const response = await authenticatedFetch(`${API_BASE_URL}/api/lists`, {
        method: 'POST',
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          visibility: formData.visibility,
          restaurant_ids: formData.selectedRestaurants.map(r => r.id),
          created_by: user.id
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to create list`);
      }

      const data = await response.json();
      console.log('✅ List created successfully:', data);

      if (data.success && data.list) {
        toast.success('List created successfully!');
        onSuccess?.(data.list.id);
        onClose();
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error) {
      console.error('❌ List creation failed:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create list');
    } finally {
      setIsLoading(false);
    }
  };

  const nextStep = () => {
    if (currentStep === 1) {
      if (!formData.title.trim()) {
        toast.error('Please enter a list title');
        return;
      }
    }
    setCurrentStep(prev => Math.min(prev + 1, 3));
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Create New List</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              ✕
            </button>
          </div>
          
          {/* Progress indicator */}
          <div className="flex items-center mt-4 space-x-4">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    currentStep >= step
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {step}
                </div>
                {step < 3 && (
                  <div
                    className={`w-16 h-1 mx-2 ${
                      currentStep > step ? 'bg-orange-500' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          
          <div className="mt-2 text-sm text-gray-600">
            {currentStep === 1 && 'List Details'}
            {currentStep === 2 && 'Select Restaurants'}
            {currentStep === 3 && 'Review & Create'}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Step 1: List Details */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  List Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="e.g., Best Pizza Places in Brasília"
                  maxLength={100}
                />
                <div className="text-xs text-gray-500 mt-1">
                  {formData.title.length}/100 characters
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Tell others what makes this list special..."
                  rows={3}
                  maxLength={500}
                />
                <div className="text-xs text-gray-500 mt-1">
                  {formData.description.length}/500 characters
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Visibility
                </label>
                <select
                  value={formData.visibility}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    visibility: e.target.value as 'public' | 'private' | 'followers_only'
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="public">Public - Anyone can see this list</option>
                  <option value="followers_only">Followers Only - Only your followers can see</option>
                  <option value="private">Private - Only you can see this list</option>
                </select>
              </div>
            </div>
          )}

          {/* Step 2: Restaurant Selection */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search Restaurants
                </label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Search for restaurants to add..."
                />
              </div>

              {/* Search Results */}
              <div className="space-y-2">
                {isSearching && (
                  <div className="text-center py-4 text-gray-500">
                    Searching restaurants...
                  </div>
                )}

                {searchError && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-3">
                    <p className="text-red-600 text-sm">{searchError}</p>
                  </div>
                )}

                {!isSearching && searchQuery && searchResults.length === 0 && !searchError && (
                  <div className="text-center py-4 text-gray-500">
                    No restaurants found for "{searchQuery}"
                  </div>
                )}

                {searchResults.map((restaurant) => (
                  <div
                    key={restaurant.id}
                    className="flex items-center justify-between p-3 border border-gray-200 rounded-md hover:bg-gray-50"
                  >
                    <div>
                      <h4 className="font-medium text-gray-900">{restaurant.name}</h4>
                      <p className="text-sm text-gray-600">{restaurant.address}</p>
                      <p className="text-xs text-gray-500">{restaurant.category}</p>
                    </div>
                    <button
                      onClick={() => handleRestaurantSelect(restaurant)}
                      disabled={formData.selectedRestaurants.some(r => r.id === restaurant.id)}
                      className="px-3 py-1 bg-orange-500 text-white rounded-md hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm"
                    >
                      {formData.selectedRestaurants.some(r => r.id === restaurant.id) ? 'Added' : 'Add'}
                    </button>
                  </div>
                ))}
              </div>

              {/* Selected Restaurants */}
              {formData.selectedRestaurants.length > 0 && (
                <div className="mt-6">
                  <h4 className="font-medium text-gray-900 mb-3">
                    Selected Restaurants ({formData.selectedRestaurants.length})
                  </h4>
                  <div className="space-y-2">
                    {formData.selectedRestaurants.map((restaurant) => (
                      <div
                        key={restaurant.id}
                        className="flex items-center justify-between p-3 bg-orange-50 border border-orange-200 rounded-md"
                      >
                        <div>
                          <h5 className="font-medium text-gray-900">{restaurant.name}</h5>
                          <p className="text-sm text-gray-600">{restaurant.address}</p>
                        </div>
                        <button
                          onClick={() => handleRestaurantRemove(restaurant.id)}
                          className="text-red-500 hover:text-red-700 text-sm"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Review */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">List Details</h4>
                <div className="bg-gray-50 p-4 rounded-md">
                  <p className="font-medium">{formData.title}</p>
                  {formData.description && (
                    <p className="text-gray-600 mt-1">{formData.description}</p>
                  )}
                  <p className="text-sm text-gray-500 mt-2">
                    Visibility: {formData.visibility.replace('_', ' ')}
                  </p>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-2">
                  Restaurants ({formData.selectedRestaurants.length})
                </h4>
                <div className="space-y-2">
                  {formData.selectedRestaurants.map((restaurant, index) => (
                    <div key={restaurant.id} className="flex items-center p-3 bg-gray-50 rounded-md">
                      <div className="w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-medium mr-3">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{restaurant.name}</p>
                        <p className="text-sm text-gray-600">{restaurant.address}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex justify-between">
          <button
            onClick={currentStep === 1 ? onClose : prevStep}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            {currentStep === 1 ? 'Cancel' : 'Back'}
          </button>

          <div className="space-x-3">
            {currentStep < 3 ? (
              <button
                onClick={nextStep}
                className="px-6 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors"
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isLoading || formData.selectedRestaurants.length === 0}
                className="px-6 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? 'Creating...' : 'Create List'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateListFlow;