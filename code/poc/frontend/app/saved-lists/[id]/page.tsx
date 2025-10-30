// app/saved-lists/[id]/page.tsx
// Saved List Detail Page - Shows full list of restaurants in a saved list
// ✅ UPDATED: Now includes EditListModal functionality
// ✅ VERIFIED: All existing functionality preserved
"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  MapPin, 
  Utensils,
  Star,
  Lock,
  Edit,
  Trash2,
  Calendar
} from 'lucide-react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { cn, timeAgo } from '@/lib/utils';
import CleanHeader from '@/components/CleanHeader';
import EditListModal from '@/components/saved-lists/EditListModal';
import savedListsService from '@/lib/services/saved-lists-service';

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
  notes?: string; // For guide draft text
}

export default function SavedListDetailPage() {
  const params = useParams();
  const router = useRouter();
  const listId = params.id as string;

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://redesigned-lamp-q74wgggqq9jjfxqjp-3001.app.github.dev';

  const [list, setList] = useState<SavedListDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // NEW: Modal state
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    fetchListDetail();
  }, [listId]);

  const fetchListDetail = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await savedListsService.getListById(listId);
      console.log('Saved list detail data:', data);
      setList(data);
    } catch (err) {
      console.error('Error fetching saved list:', err);
      setError(err instanceof Error ? err.message : 'Failed to load list');
    } finally {
      setLoading(false);
    }
  };

  // UPDATED: Now opens modal instead of alert
  const handleEdit = () => {
    setShowEditModal(true);
  };

  // NEW: Handle updates from modal
  const handleUpdateList = (updatedList: SavedListDetail) => {
    setList(updatedList);
    // Refetch to ensure data consistency with backend
    fetchListDetail();
  };

  // NEW: Placeholder for publish as guide
  const handlePublishAsGuide = () => {
    alert('Publish as Guide functionality coming soon!\n\nThis will convert your private list into a public food guide that others can discover.');
  };

  const handleDelete = async () => {
    if (!list) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete "${list.name}"? This action cannot be undone.`
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

  const getListTypeColor = (listType: string) => {
    switch (listType) {
      case 'places':
        return 'from-blue-500 to-cyan-500';
      case 'bookmarks':
        return 'from-purple-500 to-pink-500';
      case 'mixed':
        return 'from-teal-500 to-blue-500';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  if (loading) {
    return (
      <>
        <CleanHeader />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </>
    );
  }

  if (error || !list) {
    return (
      <>
        <CleanHeader />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">List not found</h2>
            <p className="text-gray-600 mb-4">{error || 'Failed to fetch list'}</p>
            <button
              onClick={() => router.push('/saved-lists')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Back to My Saved Lists
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <CleanHeader />
      <div className="min-h-screen bg-gray-50">
        {/* Back Button Bar */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <button
              onClick={() => router.push('/saved-lists')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft size={20} />
              <span>Back to My Saved Lists</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-4xl mx-auto px-4 py-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
          >
            {/* Header with gradient matching list type */}
            <div className={cn(
              "relative bg-gradient-to-r px-6 py-5",
              getListTypeColor(list.listType)
            )}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {/* Icon + Title */}
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-3xl">{list.icon}</span>
                    <h1 className="text-2xl font-bold text-white leading-tight">
                      {list.name}
                    </h1>
                  </div>
                  {/* Privacy badge and metadata */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/20 backdrop-blur-sm text-white text-xs font-medium rounded-full">
                      <Lock className="w-3.5 h-3.5" />
                      <span>Private</span>
                    </div>
                    <span className="px-2.5 py-1 bg-white/20 backdrop-blur-sm text-white text-xs font-medium rounded-full capitalize">
                      {list.listType}
                    </span>
                    <div className="flex items-center gap-1 px-2.5 py-1 bg-white/20 backdrop-blur-sm text-white text-xs rounded-full">
                      <Calendar className="w-3 h-3" />
                      <span>Updated {timeAgo(list.updatedAt)}</span>
                    </div>
                  </div>
                </div>

                {/* Edit/Delete buttons */}
                <div className="flex items-center gap-2">
                  <motion.button
                    onClick={handleEdit}
                    className="p-2 bg-white/20 backdrop-blur-sm text-white rounded-lg hover:bg-white/30 transition-colors"
                    whileTap={{ scale: 0.95 }}
                    title="Edit list"
                  >
                    <Edit size={18} />
                  </motion.button>
                  <motion.button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="p-2 bg-white/20 backdrop-blur-sm text-white rounded-lg hover:bg-red-500/50 transition-colors disabled:opacity-50"
                    whileTap={{ scale: 0.95 }}
                    title="Delete list"
                  >
                    <Trash2 size={18} />
                  </motion.button>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Description */}
              {list.description && (
                <div>
                  <p className="text-base text-gray-700 leading-relaxed">
                    {list.description}
                  </p>
                </div>
              )}

              {/* Stats */}
              <div className="flex items-center gap-4 text-sm text-gray-600 pb-4 border-b border-gray-200">
                <div className="flex items-center gap-2">
                  <Utensils size={16} />
                  <span className="font-medium">
                    {list.restaurant_count} restaurant{list.restaurant_count !== 1 ? 's' : ''}
                  </span>
                </div>
                <span>•</span>
                <div className="flex items-center gap-2">
                  <Calendar size={16} />
                  <span>Created {timeAgo(list.createdAt)}</span>
                </div>
              </div>

              {/* Restaurants Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <Utensils size={18} />
                    Restaurants
                  </h2>
                </div>

                {list.items && list.items.length > 0 ? (
                  <div className="space-y-3">
                    {list.items.map((restaurant, index) => (
                      <motion.div
                        key={restaurant.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                        className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all cursor-pointer"
                      >
                        <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
                          {restaurant.image ? (
                            <Image
                              src={restaurant.image}
                              alt={restaurant.name}
                              width={64}
                              height={64}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-2xl">
                              🍽️
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <h3 className="font-semibold text-gray-900 text-base truncate">
                              {restaurant.name}
                            </h3>
                            {restaurant.rating && (
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                                <span className="text-sm font-medium text-gray-700">
                                  {restaurant.rating.toFixed(1)}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            {restaurant.cuisine && (
                              <span>{restaurant.cuisine}</span>
                            )}
                            {restaurant.cuisine && restaurant.location && (
                              <span>•</span>
                            )}
                            {restaurant.location && (
                              <div className="flex items-center gap-1">
                                <MapPin size={14} />
                                <span>{restaurant.location}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <Utensils size={48} className="mx-auto mb-3 opacity-50" />
                    <p className="text-base font-medium mb-1">No restaurants yet</p>
                    <p className="text-sm">Click the Edit button to add restaurants to your list!</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* NEW: Edit Modal */}
      {showEditModal && (
        <EditListModal
          list={list}
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onUpdate={handleUpdateList}
          onPublishAsGuide={handlePublishAsGuide}
        />
      )}
    </>
  );
}