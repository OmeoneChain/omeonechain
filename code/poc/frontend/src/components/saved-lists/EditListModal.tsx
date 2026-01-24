// components/saved-lists/EditListModal.tsx
// UPDATED: Dark mode support added
// ✅ UPDATED: BocaBoca brand colors (terracotta/coral instead of blue)
// ✅ UPDATED: Lucide icon picker instead of emoji picker
// ✅ UPDATED: Gradient initials placeholder for restaurants
// ✅ UPDATED: "Publish Curated List" instead of "Publish as Guide"
// ✅ FIXED: Smaller header, proper footer visibility
// ✅ FIXED: RestaurantAutocomplete import path
// ✅ FIXED: Real itemId from backend (not fake item-timestamp)
// ✅ FIXED: Added reorder functionality (move up/down)
// ✅ FIXED: Mobile-friendly reorder/delete buttons (matching Curated List style)
"use client";

import { useState, useEffect } from 'react';
import { 
  X, 
  Save, 
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
  ChevronUp,
  ChevronDown,
  type LucideIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
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
  if (iconName && iconName.length <= 2) {
    return <span className="text-2xl">{iconName}</span>;
  }
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

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://omeonechain-production.up.railway.app';

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
  const t = useTranslations('savedLists');
  const tCommon = useTranslations('common');
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
      setError(t('edit.validation.nameRequired'));
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
      setError(t('edit.errors.updateFailed'));
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

      setEditedList(prev => ({
        ...prev,
        items: prev.items.filter(item => item.itemId !== itemId)
      }));
    } catch (err) {
      console.error('Error removing restaurant:', err);
      setError(t('edit.errors.removeFailed'));
    } finally {
      setIsRemoving(null);
    }
  };

  const handleAddRestaurant = async (restaurant: any) => {
    setError(null);

    try {
      const result = await savedListsService.addItemToList(editedList.id, {
        itemType: 'restaurant',
        itemId: restaurant.id.toString(),
      });

      const newRestaurant: Restaurant = {
        id: restaurant.id,
        itemId: result.id || result.itemId,
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
      setError(err instanceof Error ? err.message : t('edit.errors.addFailed'));
    }
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    setEditedList(prev => {
      const newItems = [...prev.items];
      [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];
      return { ...prev, items: newItems };
    });
  };

  const handleMoveDown = (index: number) => {
    if (index === editedList.items.length - 1) return;
    setEditedList(prev => {
      const newItems = [...prev.items];
      [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
      return { ...prev, items: newItems };
    });
  };

  const handlePublishSuccess = (guideId: string) => {
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
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative bg-white dark:bg-[#2D2C3A] rounded-xl shadow-2xl dark:shadow-[0_4px_30px_rgba(0,0,0,0.4)] w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-[#3D3C4A] bg-gradient-to-r from-[#FFF4E1] to-white dark:from-[#353444] dark:to-[#2D2C3A] flex-shrink-0">
            <h2 className="text-xl font-bold text-[#1F1E2A] dark:text-white">{t('edit.title')}</h2>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-[#FFF4E1] dark:hover:bg-[#404050] rounded-lg transition-colors text-gray-500 dark:text-gray-400 hover:text-[#1F1E2A] dark:hover:text-white"
              aria-label={tCommon('close')}
            >
              <X size={20} />
            </button>
          </div>

          {/* Content - Scrollable area */}
          <div className="flex-1 overflow-y-auto p-5">
            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-lg text-red-700 dark:text-red-400 text-sm">
                {error}
              </div>
            )}

            <div className="space-y-5">
              {/* Icon Picker */}
              <div>
                <label className="block text-sm font-medium text-[#1F1E2A] dark:text-white mb-2">
                  {t('edit.fields.icon.label')}
                </label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowIconPicker(!showIconPicker)}
                    className="p-2.5 bg-gradient-to-br from-[#FFB3AB] to-[#FF644A] hover:from-[#FF644A] hover:to-[#E65441] rounded-xl transition-all shadow-sm hover:shadow-md"
                  >
                    {renderListIcon(editedList.icon, "w-7 h-7 text-white")}
                  </button>
                  <span className="text-sm text-gray-600 dark:text-gray-400">{t('edit.fields.icon.hint')}</span>
                </div>
                
                {/* Lucide Icon Picker Grid */}
                {showIconPicker && (
                  <div className="mt-3 p-3 bg-[#FFF4E1]/50 dark:bg-[#353444] rounded-xl border border-[#FFB3AB]/30 dark:border-[#3D3C4A]">
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
                                : 'bg-white dark:bg-[#2D2C3A] hover:bg-[#FFF4E1] dark:hover:bg-[#404050] text-[#1F1E2A] dark:text-white border border-gray-200 dark:border-[#3D3C4A] hover:border-[#FF644A]'
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
                <label className="block text-sm font-medium text-[#1F1E2A] dark:text-white mb-1.5">
                  {t('edit.fields.name.label')} <span className="text-[#E65441]">*</span>
                </label>
                <input
                  type="text"
                  value={editedList.name}
                  onChange={(e) => setEditedList(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 bg-white dark:bg-[#353444] border border-gray-300 dark:border-[#3D3C4A] rounded-lg text-[#1F1E2A] dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-[#FF644A] focus:border-transparent transition-all text-sm"
                  placeholder={t('edit.fields.name.placeholder')}
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-[#1F1E2A] dark:text-white mb-1.5">
                  {t('edit.fields.description.label')}
                </label>
                <textarea
                  value={editedList.description || ''}
                  onChange={(e) => setEditedList(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 bg-white dark:bg-[#353444] border border-gray-300 dark:border-[#3D3C4A] rounded-lg text-[#1F1E2A] dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-[#FF644A] focus:border-transparent transition-all resize-none text-sm"
                  rows={2}
                  placeholder={t('edit.fields.description.placeholder')}
                />
              </div>

              {/* Notes/Draft Text */}
              <div>
                <label className="block text-sm font-medium text-[#1F1E2A] dark:text-white mb-1.5">
                  <FileText className="inline h-4 w-4 mr-1 text-[#FF644A]" />
                  {t('edit.fields.notes.label')}
                </label>
                <textarea
                  value={editedList.notes || ''}
                  onChange={(e) => setEditedList(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3 py-2 bg-white dark:bg-[#353444] border border-gray-300 dark:border-[#3D3C4A] rounded-lg text-[#1F1E2A] dark:text-white placeholder-gray-400 dark:placeholder-gray-500 font-mono text-xs focus:ring-2 focus:ring-[#FF644A] focus:border-transparent transition-all resize-none"
                  rows={3}
                  placeholder={t('edit.fields.notes.placeholder')}
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {t('edit.fields.notes.hint')}
                </p>
              </div>

              {/* Restaurants Section */}
              <div className="border-t border-gray-200 dark:border-[#3D3C4A] pt-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-base font-semibold text-[#1F1E2A] dark:text-white flex items-center gap-2">
                    <Utensils size={18} className="text-[#FF644A]" />
                    {t('edit.restaurants.title', { count: editedList.items.length })}
                  </h3>
                  <button
                    onClick={() => setShowAddRestaurant(!showAddRestaurant)}
                    className={`
                      flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all
                      ${showAddRestaurant 
                        ? 'bg-gray-200 dark:bg-[#404050] text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-[#4D4C5A]' 
                        : 'bg-[#FF644A] text-white hover:bg-[#E65441]'
                      }
                    `}
                  >
                    <Plus size={16} />
                    {showAddRestaurant 
                      ? tCommon('cancel') 
                      : t('edit.restaurants.addButton')
                    }
                  </button>
                </div>

                {/* Add Restaurant Section */}
                {showAddRestaurant && (
                  <div className="mb-4 p-4 bg-[#FFF4E1] dark:bg-[#353444] border border-[#FFB3AB]/50 dark:border-[#3D3C4A] rounded-xl">
                    <h4 className="text-sm font-medium text-[#1F1E2A] dark:text-white mb-3 flex items-center gap-2">
                      <MapPin size={16} className="text-[#FF644A]" />
                      {t('edit.restaurants.search.title')}
                    </h4>
                    <RestaurantAutocomplete
                      onSelect={handleAddRestaurant}
                      placeholder={t('edit.restaurants.search.placeholder')}
                      clearAfterSelect={true}
                    />
                    <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                      {t('edit.restaurants.search.hint')}
                    </p>
                  </div>
                )}

                {/* Current Restaurants */}
                <div className="space-y-2">
                  {editedList.items.length === 0 ? (
                    <div className="text-center py-6 bg-[#FFF4E1]/50 dark:bg-[#353444] rounded-xl border-2 border-dashed border-[#FFB3AB] dark:border-[#FF644A]/30">
                      <Utensils size={36} className="mx-auto mb-2 text-[#FF644A] opacity-50" />
                      <p className="text-sm text-gray-600 dark:text-gray-400">{t('edit.restaurants.empty')}</p>
                    </div>
                  ) : (
                    editedList.items.map((restaurant, index) => (
                      <div
                        key={restaurant.itemId || restaurant.id}
                        className="flex items-center gap-3 p-3 bg-white dark:bg-[#353444] border border-gray-200 dark:border-[#3D3C4A] rounded-lg hover:border-[#FF644A] hover:bg-[#FFF4E1]/30 dark:hover:bg-[#404050] transition-all"
                      >
                        {/* Drag handle / Numbered badge */}
                        <div className="flex-shrink-0 flex items-center gap-2">
                          <div className="text-gray-300 dark:text-gray-600 cursor-grab">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                              <circle cx="4" cy="4" r="1.5" />
                              <circle cx="4" cy="8" r="1.5" />
                              <circle cx="4" cy="12" r="1.5" />
                              <circle cx="10" cy="4" r="1.5" />
                              <circle cx="10" cy="8" r="1.5" />
                              <circle cx="10" cy="12" r="1.5" />
                            </svg>
                          </div>
                          <div className="w-7 h-7 bg-gradient-to-br from-[#FFB3AB] to-[#FF644A] rounded-full flex items-center justify-center">
                            <span className="text-white text-xs font-bold">{index + 1}</span>
                          </div>
                        </div>

                        {/* Restaurant image/placeholder */}
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-200 dark:bg-[#404050] flex-shrink-0 border border-gray-100 dark:border-[#4D4C5A]">
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

                        {/* Restaurant info */}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-[#1F1E2A] dark:text-white text-sm truncate">
                            {restaurant.name}
                          </h4>
                          <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                            {restaurant.cuisine && (
                              <span className="text-[#FF644A] font-medium">{restaurant.cuisine}</span>
                            )}
                            {restaurant.cuisine && restaurant.location && <span className="text-gray-300 dark:text-gray-600">•</span>}
                            {restaurant.location && (
                              <div className="flex items-center gap-1">
                                <MapPin size={10} className="text-gray-400 dark:text-gray-500" />
                                <span className="truncate">{restaurant.location}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Reorder buttons */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleMoveUp(index)}
                            disabled={index === 0}
                            className="p-2 text-gray-400 dark:text-gray-500 hover:text-[#FF644A] hover:bg-[#FFF4E1] dark:hover:bg-[#404050] rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Move up"
                          >
                            <ChevronUp size={20} />
                          </button>
                          <button
                            onClick={() => handleMoveDown(index)}
                            disabled={index === editedList.items.length - 1}
                            className="p-2 text-gray-400 dark:text-gray-500 hover:text-[#FF644A] hover:bg-[#FFF4E1] dark:hover:bg-[#404050] rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Move down"
                          >
                            <ChevronDown size={20} />
                          </button>
                        </div>

                        {/* Delete button */}
                        <button
                          onClick={() => handleRemoveRestaurant(restaurant.itemId || restaurant.id.toString())}
                          disabled={isRemoving === (restaurant.itemId || restaurant.id.toString())}
                          className="p-2 text-red-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all disabled:opacity-50"
                          title={t('edit.restaurants.removeButton')}
                        >
                          {isRemoving === (restaurant.itemId || restaurant.id.toString()) ? (
                            <Loader className="animate-spin" size={20} />
                          ) : (
                            <X size={20} />
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
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-200 dark:border-[#3D3C4A] bg-[#FFF4E1]/30 dark:bg-[#353444]/50 flex-shrink-0">
            <div>
              <button
                onClick={() => setShowPublishModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[#FF644A] hover:bg-[#FFF4E1] dark:hover:bg-[#FF644A]/10 rounded-lg transition-colors text-sm"
              >
                <Globe size={16} />
                <span className="font-medium">{t('detail.publishCuratedList')}</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#404050] rounded-lg transition-colors font-medium text-sm"
              >
                {tCommon('cancel')}
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 px-5 py-2 bg-[#FF644A] text-white rounded-lg hover:bg-[#E65441] disabled:opacity-50 transition-colors font-medium text-sm shadow-sm hover:shadow-md"
              >
                {isSaving ? (
                  <>
                    <Loader className="animate-spin" size={16} />
                    {t('edit.actions.saving')}
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    {t('edit.actions.save')}
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