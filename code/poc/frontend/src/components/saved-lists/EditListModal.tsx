// components/saved-lists/EditListModal.tsx
"use client";

import { useState, useEffect } from 'react';
import { X, Save, Trash2, MapPin, Loader, Utensils, Plus, FileText, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import RestaurantAutocomplete from '@/components/restaurant/RestaurantAutocomplete';
import PublishGuideModal from './PublishGuideModal';
import Image from 'next/image';
import savedListsService from '@/lib/services/saved-lists-service';

interface Restaurant {
  id: string | number;
  itemId?: string;
  name: string;
  cuisine?: string;
  location?: string;
  address?: string;
  image?: string;
}

interface SavedListDetail {
  id: string;
  name: string;
  description?: string;
  icon: string;
  listType: 'places' | 'bookmarks' | 'mixed';
  isPublic: boolean;
  items: Restaurant[];
  notes?: string;
}

interface EditListModalProps {
  list: SavedListDetail;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updatedList: SavedListDetail) => void;
  onPublishAsGuide?: () => void;
}

const ICON_OPTIONS = [
  '📚', '🔖', '⭐', '❤️', '🍕', '🍜', '🍣', '🍔', '🥗', '🍷',
  '☕', '🍰', '🎉', '🎯', '✨', '🏆', '🌟', '💎', '🎨', '📍'
];

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://redesigned-lamp-q74wgggqq9jjfxqjp-3001.app.github.dev';

export default function EditListModal({
  list,
  isOpen,
  onClose,
  onUpdate,
  onPublishAsGuide
}: EditListModalProps) {
  const [editedList, setEditedList] = useState<SavedListDetail>(list);
  const [isSaving, setIsSaving] = useState(false);
  const [isRemoving, setIsRemoving] = useState<string | null>(null);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [showAddRestaurant, setShowAddRestaurant] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update local state when list prop changes
  useEffect(() => {
    setEditedList(list);
  }, [list]);

  const handleSave = async () => {
    if (!editedList.name.trim()) {
      setError('List name is required');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/saved-lists/${editedList.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('omeone_auth_token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: editedList.name.trim(),
          description: editedList.description?.trim() || null,
          icon: editedList.icon,
          notes: editedList.notes?.trim() || null
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update list');
      }

      const data = await response.json();
      onUpdate(editedList);
      onClose();
    } catch (err) {
      console.error('Error updating list:', err);
      setError('Failed to update list. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveRestaurant = async (itemId: string) => {
    setIsRemoving(itemId);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/saved-lists/${editedList.id}/items/${itemId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('omeone_auth_token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to remove restaurant');
      }

      // Update local state - FIXED: filter by itemId
      setEditedList(prev => ({
        ...prev,
        items: prev.items.filter(item => item.itemId !== itemId)
      }));
    } catch (err) {
      console.error('Error removing restaurant:', err);
      setError('Failed to remove restaurant. Please try again.');
    } finally {
      setIsRemoving(null);
    }
  };

  const handleAddRestaurant = async (restaurant: any) => {
    setError(null);

    try {
      await savedListsService.addItemToList(editedList.id, {
        itemType: 'restaurant',
        itemId: restaurant.id.toString(),
      });

      // Update local state
      const newRestaurant: Restaurant = {
        id: restaurant.id,
        name: restaurant.name,
        cuisine: restaurant.category || restaurant.cuisineType,
        location: restaurant.city,
        address: restaurant.address
      };

      setEditedList(prev => ({
        ...prev,
        items: [...prev.items, newRestaurant]
      }));

      setShowAddRestaurant(false);
    } catch (err) {
      console.error('Error adding restaurant:', err);
      setError(err instanceof Error ? err.message : 'Failed to add restaurant. Please try again.');
    }
  };

  const handlePublishSuccess = (guideId: string) => {
    // Redirect to discover page instead of guide detail
    window.location.href = '/discover';
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900">Edit List</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            <div className="space-y-6">
              {/* Icon Picker */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  List Icon
                </label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowIconPicker(!showIconPicker)}
                    className="text-4xl p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    {editedList.icon}
                  </button>
                  <span className="text-sm text-gray-600">Click to change</span>
                </div>
                
                {showIconPicker && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg grid grid-cols-10 gap-2">
                    {ICON_OPTIONS.map((icon) => (
                      <button
                        key={icon}
                        onClick={() => {
                          setEditedList(prev => ({ ...prev, icon }));
                          setShowIconPicker(false);
                        }}
                        className="text-2xl p-2 hover:bg-gray-200 rounded transition-colors"
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* List Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  List Name *
                </label>
                <input
                  type="text"
                  value={editedList.name}
                  onChange={(e) => setEditedList(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Best Date Night Spots"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={editedList.description || ''}
                  onChange={(e) => setEditedList(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="What's this list about?"
                />
              </div>

              {/* Notes/Draft Text (for guide conversion) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FileText className="inline h-4 w-4 mr-1" />
                  Notes / Guide Draft
                </label>
                <textarea
                  value={editedList.notes || ''}
                  onChange={(e) => setEditedList(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                  rows={4}
                  placeholder="Add notes to yourself, or draft content for when you publish this as a guide..."
                />
                <p className="mt-1 text-xs text-gray-500">
                  These notes are private. They'll be used as the starting content when you publish this list as a guide.
                </p>
              </div>

              {/* Restaurants Section */}
              <div className="border-t pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Utensils size={20} />
                    Restaurants ({editedList.items.length})
                  </h3>
                  <button
                    onClick={() => setShowAddRestaurant(!showAddRestaurant)}
                    className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  >
                    <Plus size={16} />
                    {showAddRestaurant ? 'Cancel' : 'Add Restaurant'}
                  </button>
                </div>

                {/* Add Restaurant Section - Now using Google Places Autocomplete */}
                {showAddRestaurant && (
                  <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="text-sm font-medium text-blue-900 mb-3">
                      Search for a restaurant
                    </h4>
                    <RestaurantAutocomplete
                      onSelect={handleAddRestaurant}
                      placeholder="Type restaurant name (e.g., Dom Francisco)"
                      userLocation={{ latitude: -15.7934, longitude: -47.8823 }}
                    />
                    <p className="mt-2 text-xs text-blue-700">
                      Start typing to search. Select from suggestions to add to your list.
                    </p>
                  </div>
                )}

                {/* Current Restaurants */}
                <div className="space-y-2">
                  {editedList.items.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Utensils size={48} className="mx-auto mb-3 opacity-50" />
                      <p className="text-sm">No restaurants yet. Click "Add Restaurant" to get started!</p>
                    </div>
                  ) : (
                    editedList.items.map((restaurant) => (
                      <div
                        key={restaurant.itemId || restaurant.id}
                        className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                      >
                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
                          {restaurant.image ? (
                            <Image
                              src={restaurant.image}
                              alt={restaurant.name}
                              width={48}
                              height={48}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xl">
                              🍽️
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 truncate">
                            {restaurant.name}
                          </h4>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            {restaurant.cuisine && <span>{restaurant.cuisine}</span>}
                            {restaurant.cuisine && restaurant.location && <span>•</span>}
                            {restaurant.location && (
                              <div className="flex items-center gap-1">
                                <MapPin size={12} />
                                <span>{restaurant.location}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <button
                          onClick={() => handleRemoveRestaurant(restaurant.itemId || restaurant.id.toString())}
                          disabled={isRemoving === (restaurant.itemId || restaurant.id.toString())}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Remove from list"
                        >
                          {isRemoving === (restaurant.itemId || restaurant.id.toString()) ? (
                            <Loader className="animate-spin" size={18} />
                          ) : (
                            <Trash2 size={18} />
                          )}
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
            <div>
              <button
                onClick={() => setShowPublishModal(true)}
                className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <Globe size={18} />
                <span className="font-medium">Publish as Guide</span>
              </button>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {isSaving ? (
                  <>
                    <Loader className="animate-spin" size={18} />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Publish Guide Modal */}
      {showPublishModal && (
        <PublishGuideModal
          list={editedList}
          isOpen={showPublishModal}
          onClose={() => setShowPublishModal(false)}
          onSuccess={handlePublishSuccess}
        />
      )}
    </AnimatePresence>
  );
}