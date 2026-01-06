// app/saved-lists/[id]/page.tsx
// Saved List Detail Page - Shows full list of restaurants in a saved list
// ✅ UPDATED: BocaBoca brand colors applied
// ✅ UPDATED: Now includes EditListModal functionality
// ✅ FIXED: Icon rendering - converts "folder-heart" string to actual Lucide icon
// ✅ FIXED: Restaurant placeholder with gradient initials instead of emoji
// ✅ FIXED: Renamed "Publish as Guide" to "Publish Curated List"
// ✅ ADDED: Numbered gradient badges for restaurant items
"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  MapPin, 
  Utensils,
  Star,
  Lock,
  Globe,
  Edit,
  Trash2,
  Calendar,
  Plus,
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
import Image from 'next/image';
import { motion } from 'framer-motion';
import { cn, timeAgo } from '@/lib/utils';
import CleanHeader from '@/components/CleanHeader';
import EditListModal from '@/components/saved-lists/EditListModal';
import savedListsService from '@/lib/services/saved-lists-service';

// ============================================
// ICON MAPPING FOR SAVED LISTS
// ============================================

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
 * @param iconName - The icon identifier (e.g., "folder-heart" or "🍕")
 * @param className - Tailwind classes for the icon
 */
const renderListIcon = (iconName: string, className: string = "w-8 h-8 text-white") => {
  // Check if it's a known Lucide icon name
  const IconComponent = ICON_MAP[iconName];
  if (IconComponent) {
    return <IconComponent className={className} />;
  }
  // Fallback for emoji icons (legacy data) - emojis are typically 1-2 chars
  if (iconName && iconName.length <= 2) {
    return <span className="text-3xl">{iconName}</span>;
  }
  // Default icon if nothing matches
  return <FolderHeart className={className} />;
};

/**
 * Generate gradient placeholder for restaurant (initials-based)
 * Much nicer than the 🍽️ emoji placeholder
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
      <span className="text-white font-bold text-lg">{initials}</span>
    </div>
  );
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
  const listId = params.id as string;

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://redesigned-lamp-q74wgggqq9jjfxqjp-3001.app.github.dev';

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
      console.log('Saved list detail data:', data);
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

  const handlePublishAsGuide = () => {
    alert('Publish Curated List functionality coming soon!\n\nThis will convert your private list into a public food guide that others can discover.');
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

  // BocaBoca Brand Colors for list types
  const getListTypeColor = (listType: string) => {
    switch (listType) {
      case 'places':
        return 'from-[#FFB3AB] to-[#FF644A]';      // Sunset Gradient (primary)
      case 'bookmarks':
        return 'from-[#BFE2D9] to-[#7DCBB8]';      // Mint Breeze gradient
      case 'mixed':
        return 'from-[#E65441] to-[#FF644A]';      // Terracotta to Coral
      default:
        return 'from-[#FFB3AB] to-[#FF644A]';      // Default to Sunset
    }
  };

  // Accent color for hover states based on list type
  const getAccentColor = (listType: string) => {
    switch (listType) {
      case 'places':
        return 'hover:border-[#FF644A] hover:bg-[#FFF4E1]';
      case 'bookmarks':
        return 'hover:border-[#7DCBB8] hover:bg-[#F0FAF7]';
      case 'mixed':
        return 'hover:border-[#E65441] hover:bg-[#FFF4E1]';
      default:
        return 'hover:border-[#FF644A] hover:bg-[#FFF4E1]';
    }
  };

  if (loading) {
    return (
      <>
        <CleanHeader />
        <div className="min-h-screen bg-[#FFF4E1] flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#FFB3AB] border-t-[#FF644A]"></div>
            <p className="text-gray-600">Loading your list...</p>
          </div>
        </div>
      </>
    );
  }

  if (error || !list) {
    return (
      <>
        <CleanHeader />
        <div className="min-h-screen bg-[#FFF4E1] flex items-center justify-center">
          <div className="text-center bg-white p-8 rounded-xl shadow-sm border border-gray-200">
            {/* FIXED: Use Lucide icon instead of emoji */}
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-[#FFB3AB] to-[#FF644A] rounded-full flex items-center justify-center">
              <FolderHeart className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-[#1F1E2A] mb-2">List not found</h2>
            <p className="text-gray-600 mb-6">{error || 'Failed to fetch list'}</p>
            <button
              onClick={() => router.push('/saved-lists')}
              className="px-6 py-2.5 bg-[#FF644A] text-white rounded-lg hover:bg-[#E65441] transition-colors font-medium"
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
      <div className="min-h-screen bg-[#FFF4E1]">
        {/* Back Button Bar */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <button
              onClick={() => router.push('/saved-lists')}
              className="flex items-center gap-2 text-gray-600 hover:text-[#FF644A] transition-colors group"
            >
              <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
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
            {/* Header with BocaBoca gradient */}
            <div className={cn(
              "relative bg-gradient-to-r px-6 py-5",
              getListTypeColor(list.listType)
            )}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {/* Icon + Title */}
                  <div className="flex items-center gap-3 mb-2">
                    {/* FIXED: Render actual Lucide icon instead of text string */}
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                      {renderListIcon(list.icon, "w-7 h-7 text-white")}
                    </div>
                    <h1 className="text-2xl font-bold text-white leading-tight">
                      {list.name}
                    </h1>
                  </div>
                  {/* Privacy badge and metadata */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/20 backdrop-blur-sm text-white text-xs font-medium rounded-full">
                      {list.isPublic ? (
                        <>
                          <Globe className="w-3.5 h-3.5" />
                          <span>Public</span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-3.5 h-3.5" />
                          <span>Private</span>
                        </>
                      )}
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
                <div className="bg-[#FFF4E1]/50 rounded-lg p-4 border border-[#FFB3AB]/30">
                  <p className="text-base text-[#1F1E2A] leading-relaxed">
                    {list.description}
                  </p>
                </div>
              )}

              {/* Stats */}
              <div className="flex items-center gap-4 text-sm text-gray-600 pb-4 border-b border-gray-200">
                <div className="flex items-center gap-2">
                  <Utensils size={16} className="text-[#FF644A]" />
                  <span className="font-medium text-[#1F1E2A]">
                    {list.restaurant_count} restaurant{list.restaurant_count !== 1 ? 's' : ''}
                  </span>
                </div>
                <span>•</span>
                <div className="flex items-center gap-2">
                  <Calendar size={16} className="text-gray-400" />
                  <span>Created {timeAgo(list.createdAt)}</span>
                </div>
              </div>

              {/* Restaurants Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-[#1F1E2A] flex items-center gap-2">
                    <Utensils size={18} className="text-[#FF644A]" />
                    Restaurants
                  </h2>
                  <button 
                    onClick={handleEdit}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-[#FF644A] hover:bg-[#FFF4E1] rounded-lg transition-colors"
                  >
                    <Plus size={16} />
                    Add Restaurant
                  </button>
                </div>

                {list.items && list.items.length > 0 ? (
                  <div className="space-y-3">
                    {list.items.map((restaurant, index) => (
                      <motion.div
                        key={restaurant.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                        className={cn(
                          "flex items-center gap-4 p-4 bg-white rounded-lg border border-gray-200 transition-all cursor-pointer",
                          getAccentColor(list.listType)
                        )}
                      >
                        {/* ADDED: Numbered gradient badge */}
                        <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-[#FFB3AB] to-[#FF644A] rounded-full flex items-center justify-center shadow-sm">
                          <span className="text-white text-sm font-bold">{index + 1}</span>
                        </div>

                        {/* FIXED: Restaurant image with gradient initials placeholder */}
                        <div className="w-14 h-14 rounded-lg overflow-hidden bg-[#FFF4E1] flex-shrink-0 border border-gray-100">
                          {restaurant.image ? (
                            <Image
                              src={restaurant.image}
                              alt={restaurant.name}
                              width={56}
                              height={56}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <RestaurantPlaceholder name={restaurant.name} />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <h3 className="font-semibold text-[#1F1E2A] text-base truncate">
                              {restaurant.name}
                            </h3>
                            {restaurant.rating && (
                              <div className="flex items-center gap-1 flex-shrink-0 bg-[#FFF4E1] px-2 py-0.5 rounded-full">
                                <Star className="h-4 w-4 text-[#FF644A] fill-[#FF644A]" />
                                <span className="text-sm font-medium text-[#1F1E2A]">
                                  {restaurant.rating.toFixed(1)}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            {restaurant.cuisine && (
                              <span className="text-[#FF644A] font-medium">{restaurant.cuisine}</span>
                            )}
                            {restaurant.cuisine && restaurant.location && (
                              <span>•</span>
                            )}
                            {restaurant.location && (
                              <div className="flex items-center gap-1">
                                <MapPin size={14} className="text-gray-400" />
                                <span>{restaurant.location}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-[#FFF4E1]/50 rounded-xl border-2 border-dashed border-[#FFB3AB]">
                    <div className="w-16 h-16 mx-auto mb-4 bg-white rounded-full flex items-center justify-center shadow-sm">
                      <Utensils size={32} className="text-[#FF644A]" />
                    </div>
                    <p className="text-lg font-medium text-[#1F1E2A] mb-1">No restaurants yet</p>
                    <p className="text-sm text-gray-500 mb-4">Start adding your favorite spots to this list!</p>
                    <button 
                      onClick={handleEdit}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#FFB3AB] to-[#FF644A] text-white rounded-lg font-medium hover:from-[#FF644A] hover:to-[#E65441] transition-all shadow-sm hover:shadow-md"
                    >
                      <Plus size={18} />
                      Add Restaurants
                    </button>
                  </div>
                )}
              </div>

              {/* Quick Actions */}
              {list.items && list.items.length > 0 && (
                <div className="pt-4 border-t border-gray-200">
                  <div className="flex items-center gap-3 flex-wrap">
                    <button 
                      onClick={handleEdit}
                      className="flex items-center gap-2 px-4 py-2 bg-[#FF644A] text-white rounded-lg font-medium hover:bg-[#E65441] transition-colors"
                    >
                      <Edit size={16} />
                      Edit List
                    </button>
                    {!list.isPublic && (
                      <button 
                        onClick={handlePublishAsGuide}
                        className="flex items-center gap-2 px-4 py-2 border-2 border-[#FF644A] text-[#FF644A] rounded-lg font-medium hover:bg-[#FFF4E1] transition-colors"
                      >
                        <Globe size={16} />
                        {/* FIXED: Renamed from "Publish as Guide" */}
                        Publish Curated List
                      </button>
                    )}
                  </div>
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
          onPublishAsGuide={handlePublishAsGuide}
        />
      )}
    </>
  );
}