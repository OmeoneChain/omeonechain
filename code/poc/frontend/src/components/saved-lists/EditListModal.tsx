// components/saved-lists/EditListModal.tsx
// ✅ UPDATED: BocaBoca brand colors (terracotta/coral instead of blue)
// ✅ UPDATED: Lucide icon picker instead of emoji picker
// ✅ UPDATED: Gradient initials placeholder for restaurants
// ✅ UPDATED: "Publish Curated List" instead of "Publish as Guide"
// ✅ FIXED: Smaller header, proper footer visibility
// ✅ FIXED: RestaurantAutocomplete import path
"use client";

import { useState, useEffect } from 'react';
import { 
  X, 
  Save, 
  Trash2, 
  MapPin, 
  Loader, 
  Utensils, 
  Plus, 
  FileText, 
  Globe,
  FolderHeart,
  Bookmark,
  Layers,
  Heart,
  Coffee,
  Wine,
  Pizza,
  UtensilsCrossed,
  Salad,
  Cake,
  type LucideIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
// FIXED: Correct import path for RestaurantAutocomplete
import RestaurantAutocomplete from '../../../components/restaurant/RestaurantAutocomplete';
import PublishGuideModal from './PublishGuideModal';
import Image from 'next/image';
import savedListsService from '@/lib/services/saved-lists-service';

// ============================================
// ICON SYSTEM FOR LISTS
// ============================================

interface IconOption {
  id: string;
  icon: LucideIcon;
  label: string;
}

const ICON_OPTIONS: IconOption[] = [
  { id: 'folder-heart', icon: FolderHeart, label: 'Favorites' },
  { id: 'bookmark', icon: Bookmark, label: 'Bookmark' },
  { id: 'layers', icon: Layers, label: 'Collection' },
  { id: 'heart', icon: Heart, label: 'Love' },
  { id: 'coffee', icon: Coffee, label: 'Coffee' },
  { id: 'wine', icon: Wine, label: 'Wine' },
  { id: 'pizza', icon: Pizza, label: 'Pizza' },
  { id: 'utensils', icon: UtensilsCrossed, label: 'Dining' },
  { id: 'salad', icon: Salad, label: 'Healthy' },
  { id: 'cake', icon: Cake, label: 'Desserts' },
];

const ICON_MAP: Record<string, LucideIcon> = {
  'folder-heart': FolderHeart,
  'bookmark': Bookmark,
  'layers': Layers,
  'heart': Heart,
  'coffee': Coffee,
  'wine': Wine,
  'pizza': Pizza,
  'utensils': UtensilsCrossed,
  'salad': Salad,
  'cake': Cake,
};

/**
 * Render list icon - handles both Lucide icon names and emoji fallback
 */
const renderListIcon = (iconName: string, className: string = "w-6 h-6") => {
  const IconComponent = ICON_MAP[iconName];
  if (IconComponent) {
    return <IconComponent className={className} />;
  }
  // Fallback for emoji icons (legacy data)
  if (iconName && iconName.length <= 2) {
    return <span className="text-2xl">{iconName}</span>;
  }
  // Default icon
  return <FolderHeart className={className} />;
};

/**
 * Generate gradient placeholder for restaurant (initials-based)
 */
const RestaurantPlaceholder = ({ name }: { name: string }) => {
  const initials = name
    .split(' ')
    .map(word => word[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();
  
  return (
    <div className="w-full h-full bg-gradient-to-br from-[#FFB3AB] to-[#FF644A] flex items-center justify-center">
      <span className="text-white font-bold text-sm">{initials}</span>
    </div>
  );
};

// ============================================
// INTERFACES
// ============================================

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

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://redesigned-lamp-q74wgggqq9jjfxqjp-3001.app.github.dev';

// ============================================
// COMPONENT
// ============================================

export default function EditListModal({
  list,
  isOpen,
  onClose,
  onUpdate,
  onPublishAsGuide
}: EditListModalProps) {
  const t = useTranslations();
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
      setError(t('savedLists.edit.validation.nameRequired'));
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/saved-lists/${editedList.id}`, {
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
      setError(t('savedLists.edit.errors.updateFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveRestaurant = async (itemId: string) => {
    setIsRemoving(itemId);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/saved-lists/${editedList.id}/items/${itemId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('omeone_auth_token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to remove restaurant');
      }

      // Update local state - filter by itemId
      setEditedList(prev => ({
        ...prev,
        items: prev.items.filter(item => item.itemId !== itemId)
      }));
    } catch (err) {
      console.error('Error removing restaurant:', err);
      setError(t('savedLists.edit.errors.removeFailed'));
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
        itemId: `item-${Date.now()}`, // Temporary itemId until refresh
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
      setError(err instanceof Error ? err.message : t('savedLists.edit.errors.addFailed'));
    }
  };

  const handlePublishSuccess = (guideId: string) => {
    // Redirect to discover page instead of guide detail
    window.location.href = '/discover';
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50"
          onClick={onClose}
        />

        {/* Modal - FIXED: Better height constraints */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden"
        >
          {/* Header - FIXED: Smaller padding */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 bg-gradient-to-r from-[#FFF4E1] to-white flex-shrink-0">
            <h2 className="text-xl font-bold text-[#1F1E2A]">{t('savedLists.edit.title')}</h2>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-[#FFF4E1] rounded-lg transition-colors text-gray-500 hover:text-[#1F1E2A]"
              aria-label={t('common.close')}
            >
              <X size={20} />
            </button>
          </div>

          {/* Content - Scrollable area */}
          <div className="flex-1 overflow-y-auto p-5">
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            <div className="space-y-5">
              {/* Icon Picker - Now uses Lucide icons */}
              <div>
                <label className="block text-sm font-medium text-[#1F1E2A] mb-2">
                  {t('savedLists.edit.fields.icon.label')}
                </label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowIconPicker(!showIconPicker)}
                    className="p-2.5 bg-gradient-to-br from-[#FFB3AB] to-[#FF644A] hover:from-[#FF644A] hover:to-[#E65441] rounded-xl transition-all shadow-sm hover:shadow-md"
                  >
                    {renderListIcon(editedList.icon, "w-7 h-7 text-white")}
                  </button>
                  <span className="text-sm text-gray-600">{t('savedLists.edit.fields.icon.hint')}</span>
                </div>
                
                {/* Lucide Icon Picker Grid */}
                {showIconPicker && (
                  <div className="mt-3 p-3 bg-[#FFF4E1]/50 rounded-xl border border-[#FFB3AB]/30">
                    <div className="grid grid-cols-5 gap-2">
                      {ICON_OPTIONS.map((option) => {
                        const IconComponent = option.icon;
                        const isSelected = editedList.icon === option.id;
                        return (
                          <button
                            key={option.id}
                            onClick={() => {
                              setEditedList(prev => ({ ...prev, icon: option.id }));
                              setShowIconPicker(false);
                            }}
                            className={`
                              flex flex-col items-center gap-1 p-2 rounded-lg transition-all
                              ${isSelected 
                                ? 'bg-gradient-to-br from-[#FFB3AB] to-[#FF644A] text-white shadow-md' 
                                : 'bg-white hover:bg-[#FFF4E1] text-[#1F1E2A] border border-gray-200 hover:border-[#FF644A]'
                              }
                            `}
                            title={option.label}
                          >
                            <IconComponent className="w-5 h-5" />
                            <span className="text-[10px] font-medium truncate w-full text-center">
                              {option.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* List Name */}
              <div>
                <label className="block text-sm font-medium text-[#1F1E2A] mb-1.5">
                  {t('savedLists.edit.fields.name.label')} <span className="text-[#E65441]">*</span>
                </label>
                <input
                  type="text"
                  value={editedList.name}
                  onChange={(e) => setEditedList(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF644A] focus:border-transparent transition-all text-sm"
                  placeholder={t('savedLists.edit.fields.name.placeholder')}
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-[#1F1E2A] mb-1.5">
                  {t('savedLists.edit.fields.description.label')}
                </label>
                <textarea
                  value={editedList.description || ''}
                  onChange={(e) => setEditedList(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF644A] focus:border-transparent transition-all resize-none text-sm"
                  rows={2}
                  placeholder={t('savedLists.edit.fields.description.placeholder')}
                />
              </div>

              {/* Notes/Draft Text (for guide conversion) */}
              <div>
                <label className="block text-sm font-medium text-[#1F1E2A] mb-1.5">
                  <FileText className="inline h-4 w-4 mr-1 text-[#FF644A]" />
                  {t('savedLists.edit.fields.notes.label')}
                </label>
                <textarea
                  value={editedList.notes || ''}
                  onChange={(e) => setEditedList(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF644A] focus:border-transparent font-mono text-xs transition-all resize-none"
                  rows={3}
                  placeholder={t('savedLists.edit.fields.notes.placeholder')}
                />
                <p className="mt-1 text-xs text-gray-500">
                  {t('savedLists.edit.fields.notes.hint')}
                </p>
              </div>

              {/* Restaurants Section */}
              <div className="border-t border-gray-200 pt-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-base font-semibold text-[#1F1E2A] flex items-center gap-2">
                    <Utensils size={18} className="text-[#FF644A]" />
                    {t('savedLists.edit.restaurants.title', { count: editedList.items.length })}
                  </h3>
                  <button
                    onClick={() => setShowAddRestaurant(!showAddRestaurant)}
                    className={`
                      flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all
                      ${showAddRestaurant 
                        ? 'bg-gray-200 text-gray-700 hover:bg-gray-300' 
                        : 'bg-[#FF644A] text-white hover:bg-[#E65441]'
                      }
                    `}
                  >
                    <Plus size={16} />
                    {showAddRestaurant 
                      ? t('common.cancel') 
                      : t('savedLists.edit.restaurants.addButton')
                    }
                  </button>
                </div>

                {/* Add Restaurant Section - with RestaurantAutocomplete */}
                {showAddRestaurant && (
                  <div className="mb-4 p-4 bg-[#FFF4E1] border border-[#FFB3AB]/50 rounded-xl">
                    <h4 className="text-sm font-medium text-[#1F1E2A] mb-3 flex items-center gap-2">
                      <MapPin size={16} className="text-[#FF644A]" />
                      {t('savedLists.edit.restaurants.search.title')}
                    </h4>
                    <RestaurantAutocomplete
                      onSelect={handleAddRestaurant}
                      placeholder={t('savedLists.edit.restaurants.search.placeholder')}
                      clearAfterSelect={true}
                    />
                    <p className="mt-2 text-xs text-gray-600">
                      {t('savedLists.edit.restaurants.search.hint')}
                    </p>
                  </div>
                )}

                {/* Current Restaurants */}
                <div className="space-y-2">
                  {editedList.items.length === 0 ? (
                    <div className="text-center py-6 bg-[#FFF4E1]/50 rounded-xl border-2 border-dashed border-[#FFB3AB]">
                      <Utensils size={36} className="mx-auto mb-2 text-[#FF644A] opacity-50" />
                      <p className="text-sm text-gray-600">{t('savedLists.edit.restaurants.empty')}</p>
                    </div>
                  ) : (
                    editedList.items.map((restaurant, index) => (
                      <div
                        key={restaurant.itemId || restaurant.id}
                        className="flex items-center gap-3 p-2.5 bg-white border border-gray-200 rounded-lg hover:border-[#FF644A] hover:bg-[#FFF4E1]/30 transition-all group"
                      >
                        {/* Numbered badge */}
                        <div className="flex-shrink-0 w-6 h-6 bg-gradient-to-br from-[#FFB3AB] to-[#FF644A] rounded-full flex items-center justify-center">
                          <span className="text-white text-xs font-bold">{index + 1}</span>
                        </div>

                        {/* Restaurant image/placeholder */}
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0 border border-gray-100">
                          {restaurant.image ? (
                            <Image
                              src={restaurant.image}
                              alt={restaurant.name}
                              width={40}
                              height={40}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <RestaurantPlaceholder name={restaurant.name} />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-[#1F1E2A] text-sm truncate">
                            {restaurant.name}
                          </h4>
                          <div className="flex items-center gap-2 text-xs text-gray-600">
                            {restaurant.cuisine && (
                              <span className="text-[#FF644A] font-medium">{restaurant.cuisine}</span>
                            )}
                            {restaurant.cuisine && restaurant.location && <span>•</span>}
                            {restaurant.location && (
                              <div className="flex items-center gap-1">
                                <MapPin size={10} className="text-gray-400" />
                                <span className="truncate">{restaurant.location}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <button
                          onClick={() => handleRemoveRestaurant(restaurant.itemId || restaurant.id.toString())}
                          disabled={isRemoving === (restaurant.itemId || restaurant.id.toString())}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100 disabled:opacity-50"
                          title={t('savedLists.edit.restaurants.removeButton')}
                        >
                          {isRemoving === (restaurant.itemId || restaurant.id.toString()) ? (
                            <Loader className="animate-spin" size={16} />
                          ) : (
                            <Trash2 size={16} />
                          )}
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Footer - FIXED: flex-shrink-0 ensures it stays visible */}
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-200 bg-[#FFF4E1]/30 flex-shrink-0">
            <div>
              <button
                onClick={() => setShowPublishModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[#FF644A] hover:bg-[#FFF4E1] rounded-lg transition-colors text-sm"
              >
                <Globe size={16} />
                <span className="font-medium">Publish Curated List</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors font-medium text-sm"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 px-5 py-2 bg-[#FF644A] text-white rounded-lg hover:bg-[#E65441] disabled:opacity-50 transition-colors font-medium text-sm shadow-sm hover:shadow-md"
              >
                {isSaving ? (
                  <>
                    <Loader className="animate-spin" size={16} />
                    {t('savedLists.edit.actions.saving')}
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    {t('savedLists.edit.actions.save')}
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