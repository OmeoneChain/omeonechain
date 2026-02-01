// components/saved-lists/EditListModal.tsx
// V2: Simplified + mobile keyboard fix
// - Removed: icon picker, Notes (Draft), Publish Curated List
// - Fixed: mobile keyboard pushing search out of view
// - Full-screen modal on mobile for better keyboard handling
// - Auto-scroll to search section when opened
// - Dark mode + i18n
"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Save,
  MapPin,
  Loader,
  Utensils,
  Plus,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import RestaurantAutocomplete from '../../../components/restaurant/RestaurantAutocomplete';
import Image from 'next/image';
import savedListsService from '@/lib/services/saved-lists-service';

// ============================================
// HELPERS
// ============================================

/** Gradient initials placeholder for restaurants without images */
const RestaurantPlaceholder = ({ name }: { name: string }) => {
  const initials = name
    .split(' ')
    .map((word) => word[0])
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
  onPublishAsGuide?: () => void; // kept optional for backward compat, not rendered
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  'https://omeonechain-production.up.railway.app';

// ============================================
// COMPONENT
// ============================================

export default function EditListModal({
  list,
  isOpen,
  onClose,
  onUpdate,
}: EditListModalProps) {
  const t = useTranslations('savedLists');
  const tCommon = useTranslations('common');
  const [editedList, setEditedList] = useState<SavedListDetail>(list);
  const [isSaving, setIsSaving] = useState(false);
  const [isRemoving, setIsRemoving] = useState<string | null>(null);
  const [showAddRestaurant, setShowAddRestaurant] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs for scroll management
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const searchSectionRef = useRef<HTMLDivElement>(null);

  // Update local state when list prop changes
  useEffect(() => {
    setEditedList(list);
  }, [list]);

  // Auto-scroll to search section when it opens
  useEffect(() => {
    if (showAddRestaurant && searchSectionRef.current) {
      // Small delay to let the DOM render the search section
      const timer = setTimeout(() => {
        searchSectionRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [showAddRestaurant]);

  // Lock body scroll when modal is open (prevents background scrolling on mobile)
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [isOpen]);

  // ============================================
  // HANDLERS
  // ============================================

  const handleSave = async () => {
    if (!editedList.name.trim()) {
      setError(t('edit.validation.nameRequired'));
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(
        `${API_BASE_URL}/saved-lists/${editedList.id}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('omeone_auth_token')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: editedList.name.trim(),
            description: editedList.description?.trim() || null,
            icon: editedList.icon,
            notes: editedList.notes?.trim() || null,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to update list');
      }

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
      const response = await fetch(
        `${API_BASE_URL}/saved-lists/${editedList.id}/items/${itemId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('omeone_auth_token')}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to remove restaurant');
      }

      setEditedList((prev) => ({
        ...prev,
        items: prev.items.filter((item) => item.itemId !== itemId),
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
        address: restaurant.address,
      };

      setEditedList((prev) => ({
        ...prev,
        items: [...prev.items, newRestaurant],
      }));

      setShowAddRestaurant(false);
    } catch (err) {
      console.error('Error adding restaurant:', err);
      setError(
        err instanceof Error ? err.message : t('edit.errors.addFailed')
      );
    }
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    setEditedList((prev) => {
      const newItems = [...prev.items];
      [newItems[index - 1], newItems[index]] = [
        newItems[index],
        newItems[index - 1],
      ];
      return { ...prev, items: newItems };
    });
  };

  const handleMoveDown = (index: number) => {
    if (index === editedList.items.length - 1) return;
    setEditedList((prev) => {
      const newItems = [...prev.items];
      [newItems[index], newItems[index + 1]] = [
        newItems[index + 1],
        newItems[index],
      ];
      return { ...prev, items: newItems };
    });
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal — full-height on mobile, centered card on desktop */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="relative bg-white dark:bg-[#2D2C3A] w-full sm:max-w-lg sm:rounded-2xl sm:mx-4 shadow-2xl dark:shadow-[0_4px_30px_rgba(0,0,0,0.4)] flex flex-col h-full sm:h-auto sm:max-h-[85vh] rounded-t-2xl sm:rounded-b-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-[#3D3C4A] flex-shrink-0">
            <h2 className="text-lg font-bold text-[#1F1E2A] dark:text-white">
              {t('edit.title')}
            </h2>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-[#404050] rounded-lg transition-colors text-gray-500 dark:text-gray-400"
              aria-label={tCommon('close')}
            >
              <X size={20} />
            </button>
          </div>

          {/* Content — scrollable */}
          <div
            ref={scrollContainerRef}
            className="flex-1 overflow-y-auto overscroll-contain p-5"
          >
            {/* Error */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-lg text-red-700 dark:text-red-400 text-sm">
                {error}
              </div>
            )}

            <div className="space-y-5">
              {/* List Name */}
              <div>
                <label className="block text-sm font-medium text-[#1F1E2A] dark:text-white mb-1.5">
                  {t('edit.fields.name.label')}{' '}
                  <span className="text-[#E65441]">*</span>
                </label>
                <input
                  type="text"
                  value={editedList.name}
                  onChange={(e) =>
                    setEditedList((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2.5 bg-white dark:bg-[#353444] border border-gray-300 dark:border-[#3D3C4A] rounded-xl text-[#1F1E2A] dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-[#FF644A] focus:border-transparent transition-all text-sm"
                  placeholder={t('edit.fields.name.placeholder')}
                  maxLength={100}
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-[#1F1E2A] dark:text-white mb-1.5">
                  {t('edit.fields.description.label')}
                </label>
                <textarea
                  value={editedList.description || ''}
                  onChange={(e) =>
                    setEditedList((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2.5 bg-white dark:bg-[#353444] border border-gray-300 dark:border-[#3D3C4A] rounded-xl text-[#1F1E2A] dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-[#FF644A] focus:border-transparent transition-all resize-none text-sm"
                  rows={2}
                  placeholder={t('edit.fields.description.placeholder')}
                  maxLength={500}
                />
              </div>

              {/* Restaurants Section */}
              <div className="border-t border-gray-200 dark:border-[#3D3C4A] pt-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-[#1F1E2A] dark:text-white flex items-center gap-2">
                    <Utensils size={16} className="text-[#FF644A]" />
                    {t('edit.restaurants.title', {
                      count: editedList.items.length,
                    })}
                  </h3>
                  <button
                    onClick={() => setShowAddRestaurant(!showAddRestaurant)}
                    className={`
                      flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all
                      ${
                        showAddRestaurant
                          ? 'bg-gray-200 dark:bg-[#404050] text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-[#4D4C5A]'
                          : 'bg-[#FF644A] text-white hover:bg-[#E65441]'
                      }
                    `}
                  >
                    <Plus size={14} />
                    {showAddRestaurant
                      ? tCommon('cancel')
                      : t('edit.restaurants.addButton')}
                  </button>
                </div>

                {/* Add Restaurant — search section */}
                {showAddRestaurant && (
                  <div
                    ref={searchSectionRef}
                    className="mb-4 p-4 bg-[#FFF4E1] dark:bg-[#353444] border border-[#FFB3AB]/50 dark:border-[#3D3C4A] rounded-xl"
                  >
                    <h4 className="text-sm font-medium text-[#1F1E2A] dark:text-white mb-3 flex items-center gap-2">
                      <MapPin size={14} className="text-[#FF644A]" />
                      {t('edit.restaurants.search.title')}
                    </h4>
                    <RestaurantAutocomplete
                      onSelect={handleAddRestaurant}
                      placeholder={t('edit.restaurants.search.placeholder')}
                      clearAfterSelect={true}
                    />
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      {t('edit.restaurants.search.hint')}
                    </p>
                  </div>
                )}

                {/* Current Restaurants */}
                <div className="space-y-2">
                  {editedList.items.length === 0 ? (
                    <div className="text-center py-6 bg-[#FFF4E1]/50 dark:bg-[#353444] rounded-xl border-2 border-dashed border-[#FFB3AB] dark:border-[#FF644A]/30">
                      <Utensils
                        size={32}
                        className="mx-auto mb-2 text-[#FF644A] opacity-40"
                      />
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {t('edit.restaurants.empty')}
                      </p>
                    </div>
                  ) : (
                    editedList.items.map((restaurant, index) => (
                      <div
                        key={restaurant.itemId || restaurant.id}
                        className="flex items-center gap-2.5 p-3 bg-white dark:bg-[#353444] border border-gray-200 dark:border-[#3D3C4A] rounded-xl hover:border-[#FF644A]/40 dark:hover:border-[#FF644A]/30 transition-all"
                      >
                        {/* Number badge */}
                        <div className="flex-shrink-0 w-6 h-6 bg-gradient-to-br from-[#FFB3AB] to-[#FF644A] rounded-full flex items-center justify-center">
                          <span className="text-white text-[10px] font-bold">
                            {index + 1}
                          </span>
                        </div>

                        {/* Restaurant image */}
                        <div className="w-9 h-9 rounded-lg overflow-hidden bg-gray-200 dark:bg-[#404050] flex-shrink-0 border border-gray-100 dark:border-[#4D4C5A]">
                          {restaurant.image ? (
                            <Image
                              src={restaurant.image}
                              alt={restaurant.name}
                              width={36}
                              height={36}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <RestaurantPlaceholder name={restaurant.name} />
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-[#1F1E2A] dark:text-white text-sm truncate">
                            {restaurant.name}
                          </h4>
                          <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                            {restaurant.cuisine && (
                              <span className="text-[#FF644A] font-medium">
                                {restaurant.cuisine}
                              </span>
                            )}
                            {restaurant.cuisine && restaurant.location && (
                              <span className="text-gray-300 dark:text-gray-600">
                                ·
                              </span>
                            )}
                            {restaurant.location && (
                              <span className="flex items-center gap-0.5 truncate">
                                <MapPin
                                  size={10}
                                  className="text-gray-400 dark:text-gray-500 flex-shrink-0"
                                />
                                {restaurant.location}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Reorder buttons — compact on mobile */}
                        <div className="flex flex-col gap-0.5 flex-shrink-0">
                          <button
                            onClick={() => handleMoveUp(index)}
                            disabled={index === 0}
                            className="p-1 text-gray-400 dark:text-gray-500 hover:text-[#FF644A] rounded transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
                            title="Move up"
                          >
                            <ChevronUp size={16} />
                          </button>
                          <button
                            onClick={() => handleMoveDown(index)}
                            disabled={index === editedList.items.length - 1}
                            className="p-1 text-gray-400 dark:text-gray-500 hover:text-[#FF644A] rounded transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
                            title="Move down"
                          >
                            <ChevronDown size={16} />
                          </button>
                        </div>

                        {/* Delete */}
                        <button
                          onClick={() =>
                            handleRemoveRestaurant(
                              restaurant.itemId || restaurant.id.toString()
                            )
                          }
                          disabled={
                            isRemoving ===
                            (restaurant.itemId || restaurant.id.toString())
                          }
                          className="p-1.5 text-red-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all disabled:opacity-50 flex-shrink-0"
                          title={t('edit.restaurants.removeButton')}
                        >
                          {isRemoving ===
                          (restaurant.itemId || restaurant.id.toString()) ? (
                            <Loader className="animate-spin" size={16} />
                          ) : (
                            <X size={16} />
                          )}
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Footer — just Cancel + Save */}
          <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-gray-200 dark:border-[#3D3C4A] bg-white dark:bg-[#2D2C3A] flex-shrink-0">
            <button
              onClick={onClose}
              className="px-4 py-2.5 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 rounded-xl transition-colors font-medium text-sm"
            >
              {tCommon('cancel')}
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || !editedList.name.trim()}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#FF644A] text-white rounded-xl hover:bg-[#E65441] disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm shadow-sm"
            >
              {isSaving ? (
                <>
                  <Loader className="animate-spin" size={15} />
                  {t('edit.actions.saving')}
                </>
              ) : (
                <>
                  <Save size={15} />
                  {t('edit.actions.save')}
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}