// app/saved-lists/[id]/page.tsx
// Saved List Detail Page — shows restaurants in a saved list
// V2: Cleaned up — removed type/privacy badges, removed Publish as Guide
// Kept: restaurant list, add restaurant, edit modal, delete
// Dark mode + i18n
"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  ArrowLeft,
  MapPin,
  Utensils,
  Star,
  Edit,
  Trash2,
  Calendar,
  Plus,
  FolderHeart,
  type LucideIcon,
} from 'lucide-react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import CleanHeader from '@/components/CleanHeader';
import EditListModal from '@/components/saved-lists/EditListModal';
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
      <span className="text-white font-bold text-lg">{initials}</span>
    </div>
  );
};

/** Format relative time */
const useTimeAgo = () => {
  const t = useTranslations('savedLists');

  return (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    );

    if (diffInHours < 1) return t('time.justNow');
    if (diffInHours < 24) return t('time.hoursAgo', { hours: diffInHours });
    if (diffInHours < 48) return t('time.yesterday');
    if (diffInHours < 168)
      return t('time.daysAgo', { days: Math.floor(diffInHours / 24) });
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };
};

// ============================================
// INTERFACES
// ============================================

interface Restaurant {
  id: string | number;
  name: string;
  cuisine?: string;
  location?: string;
  address?: string;
  image?: string;
  rating?: number;
}

interface SavedListDetail {
  id: string;
  name: string;
  description?: string;
  icon: string;
  listType: 'places' | 'bookmarks' | 'mixed';
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  itemCount: number;
  items: Restaurant[];
  restaurant_count: number;
  notes?: string;
}

// ============================================
// COMPONENT
// ============================================

export default function SavedListDetailPage() {
  const params = useParams();
  const router = useRouter();
  const t = useTranslations('savedLists');
  const timeAgo = useTimeAgo();
  const listId = params.id as string;

  const [list, setList] = useState<SavedListDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    fetchListDetail();
  }, [listId]);

  const fetchListDetail = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await savedListsService.getListById(listId);
      setList(data);
    } catch (err) {
      console.error('Error fetching saved list:', err);
      setError(err instanceof Error ? err.message : 'Failed to load list');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setShowEditModal(true);
  };

  const handleUpdateList = (updatedList: SavedListDetail) => {
    setList(updatedList);
    fetchListDetail();
  };

  const handleDelete = async () => {
    if (!list) return;
    const confirmed = window.confirm(
      t('deleteConfirm', { name: list.name })
    );
    if (!confirmed) return;

    try {
      setIsDeleting(true);
      await savedListsService.deleteList(listId);
      router.push('/saved-lists');
    } catch (err) {
      console.error('Error deleting list:', err);
      alert('Failed to delete list. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  // ============================================
  // LOADING STATE
  // ============================================

  if (loading) {
    return (
      <>
        <CleanHeader />
        <div className="min-h-screen bg-[#FFF4E1] dark:bg-[#1F1E2A] flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-10 w-10 border-3 border-[#FFB3AB] border-t-[#FF644A]" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('detail.loading')}
            </p>
          </div>
        </div>
      </>
    );
  }

  // ============================================
  // ERROR STATE
  // ============================================

  if (error || !list) {
    return (
      <>
        <CleanHeader />
        <div className="min-h-screen bg-[#FFF4E1] dark:bg-[#1F1E2A] flex items-center justify-center px-4">
          <div className="text-center bg-white dark:bg-[#2D2C3A] p-8 rounded-2xl shadow-sm dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] border border-gray-200 dark:border-[#3D3C4A] max-w-sm">
            <div className="w-14 h-14 mx-auto mb-4 bg-gradient-to-br from-[#FFB3AB] to-[#FF644A] rounded-xl flex items-center justify-center">
              <FolderHeart className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-xl font-bold text-[#1F1E2A] dark:text-white mb-2">
              {t('detail.listNotFound.title')}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              {error || t('detail.listNotFound.description')}
            </p>
            <button
              onClick={() => router.push('/saved-lists')}
              className="px-5 py-2.5 bg-[#FF644A] text-white rounded-xl hover:bg-[#E65441] transition-colors font-medium text-sm"
            >
              {t('detail.backToLists')}
            </button>
          </div>
        </div>
      </>
    );
  }

  // ============================================
  // MAIN RENDER
  // ============================================

  const restaurantCount = list.restaurant_count || list.items?.length || 0;

  return (
    <>
      <CleanHeader />
      <div className="min-h-screen bg-[#FFF4E1] dark:bg-[#1F1E2A]">
        {/* Back bar */}
        <div className="bg-white dark:bg-[#2D2C3A] border-b border-gray-200 dark:border-[#3D3C4A]">
          <div className="max-w-2xl mx-auto px-4 py-3">
            <button
              onClick={() => router.push('/saved-lists')}
              className="flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-[#FF644A] transition-colors text-sm group"
            >
              <ArrowLeft
                size={18}
                className="group-hover:-translate-x-0.5 transition-transform"
              />
              <span>{t('detail.backToLists')}</span>
            </button>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-6">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="bg-white dark:bg-[#2D2C3A] rounded-2xl border border-gray-200 dark:border-[#3D3C4A] shadow-sm dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] overflow-hidden"
          >
            {/* Header — simple gradient bar with name and actions */}
            <div className="relative bg-gradient-to-r from-[#FFB3AB] to-[#FF644A] px-5 py-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h1 className="text-xl font-bold text-white leading-tight mb-1">
                    {list.name}
                  </h1>
                  <div className="flex items-center gap-3 text-white/80 text-xs">
                    <span className="flex items-center gap-1">
                      <Utensils size={12} />
                      {t('restaurantCount', { count: restaurantCount })}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar size={12} />
                      {timeAgo(list.updatedAt)}
                    </span>
                  </div>
                </div>

                {/* Edit + Delete */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleEdit}
                    className="p-2 bg-white/20 backdrop-blur-sm text-white rounded-lg hover:bg-white/30 transition-colors"
                    title={t('actions.edit')}
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="p-2 bg-white/20 backdrop-blur-sm text-white rounded-lg hover:bg-red-500/50 transition-colors disabled:opacity-50"
                    title={t('actions.delete')}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>

            <div className="p-5 space-y-5">
              {/* Description */}
              {list.description && (
                <div className="bg-[#FFF4E1]/50 dark:bg-[#FF644A]/10 rounded-xl p-3.5 border border-[#FFB3AB]/30 dark:border-[#FF644A]/20">
                  <p className="text-sm text-[#1F1E2A] dark:text-gray-200 leading-relaxed">
                    {list.description}
                  </p>
                </div>
              )}

              {/* Restaurants section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-[#1F1E2A] dark:text-white flex items-center gap-2">
                    <Utensils size={16} className="text-[#FF644A]" />
                    {t('detail.restaurants')}
                  </h2>
                  <button
                    onClick={handleEdit}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-[#FF644A] hover:bg-[#FFF4E1] dark:hover:bg-[#FF644A]/10 rounded-lg transition-colors"
                  >
                    <Plus size={14} />
                    {t('actions.addRestaurant')}
                  </button>
                </div>

                {list.items && list.items.length > 0 ? (
                  <div className="space-y-2">
                    {list.items.map((restaurant, index) => (
                      <motion.div
                        key={restaurant.id}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{
                          duration: 0.2,
                          delay: index * 0.04,
                        }}
                        className="flex items-center gap-3 p-3 bg-white dark:bg-[#353444] rounded-xl border border-gray-100 dark:border-[#3D3C4A] hover:border-[#FF644A]/40 dark:hover:border-[#FF644A]/30 hover:bg-[#FFF4E1]/50 dark:hover:bg-[#FF644A]/5 transition-all cursor-pointer"
                      >
                        {/* Number badge */}
                        <div className="flex-shrink-0 w-7 h-7 bg-gradient-to-br from-[#FFB3AB] to-[#FF644A] rounded-full flex items-center justify-center shadow-sm">
                          <span className="text-white text-xs font-bold">
                            {index + 1}
                          </span>
                        </div>

                        {/* Restaurant image */}
                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-[#FFF4E1] dark:bg-[#404050] flex-shrink-0 border border-gray-100 dark:border-[#4D4C5A]">
                          {restaurant.image ? (
                            <Image
                              src={restaurant.image}
                              alt={restaurant.name}
                              width={48}
                              height={48}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <RestaurantPlaceholder name={restaurant.name} />
                          )}
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-0.5">
                            <h3 className="font-semibold text-[#1F1E2A] dark:text-white text-sm truncate">
                              {restaurant.name}
                            </h3>
                            {restaurant.rating && (
                              <div className="flex items-center gap-0.5 flex-shrink-0 bg-[#FFF4E1] dark:bg-[#FF644A]/20 px-1.5 py-0.5 rounded-full">
                                <Star className="h-3 w-3 text-[#FF644A] fill-[#FF644A]" />
                                <span className="text-xs font-medium text-[#1F1E2A] dark:text-white">
                                  {restaurant.rating.toFixed(1)}
                                </span>
                              </div>
                            )}
                          </div>
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
                                <MapPin size={11} className="text-gray-400 dark:text-gray-500 flex-shrink-0" />
                                {restaurant.location}
                              </span>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  /* Empty state — invite user to add restaurants */
                  <div className="text-center py-10 bg-[#FFF4E1]/50 dark:bg-[#353444] rounded-xl border-2 border-dashed border-[#FFB3AB]/60 dark:border-[#FF644A]/30">
                    <div className="w-14 h-14 mx-auto mb-3 bg-white dark:bg-[#2D2C3A] rounded-xl flex items-center justify-center shadow-sm">
                      <Utensils size={28} className="text-[#FF644A]" />
                    </div>
                    <p className="text-base font-medium text-[#1F1E2A] dark:text-white mb-1">
                      {t('detail.noRestaurants.title')}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-5 max-w-xs mx-auto">
                      {t('detail.noRestaurants.description')}
                    </p>
                    <button
                      onClick={handleEdit}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#FF644A] text-white rounded-xl font-medium text-sm hover:bg-[#E65441] transition-colors shadow-sm"
                    >
                      <Plus size={16} />
                      {t('detail.noRestaurants.addButton')}
                    </button>
                  </div>
                )}
              </div>

              {/* Bottom actions — only Edit, shown when there are restaurants */}
              {list.items && list.items.length > 0 && (
                <div className="pt-4 border-t border-gray-100 dark:border-[#3D3C4A]">
                  <button
                    onClick={handleEdit}
                    className="flex items-center gap-2 px-4 py-2.5 bg-[#FF644A] text-white rounded-xl font-medium text-sm hover:bg-[#E65441] transition-colors"
                  >
                    <Edit size={15} />
                    {t('detail.editList')}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <EditListModal
          list={list}
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onUpdate={handleUpdateList}
        />
      )}
    </>
  );
}