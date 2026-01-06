// app/[locale]/list/[id]/page.tsx
// Curated List (Guide) Detail Page - PUBLIC view of community-created food guides
// ✅ Calls /api/lists/[id] endpoint (guides.ts routes)
// ✅ Public - no auth required to view (optionalAuth)
// ✅ Shows creator attribution
// ✅ Heart icon for likes, Bookmark icon for quick save
// ✅ "Add to List" via three-dot menu (opens SaveToListModal)
// ✅ Individual restaurant save via three-dot menu
"use client";

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  MapPin, 
  Utensils,
  Star,
  Globe,
  Bookmark,
  Share2,
  Calendar,
  User,
  Heart,
  ExternalLink,
  Camera,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  FolderPlus,
  Flag
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { cn, timeAgo } from '@/lib/utils';
import CleanHeader from '@/components/CleanHeader';
import SaveToListModal from '@/components/saved-lists/SaveToListModal';

interface RestaurantPhoto {
  id: string;
  url: string;
  caption?: string;
  uploaded_by?: string;
  created_at?: string;
}

interface Restaurant {
  id: number;
  name: string;
  cuisine_type?: string;
  neighborhood?: string;
  address?: string;
  // List-specific fields
  notes?: string;        // Creator's notes about why this restaurant is on the list
  position?: number;     // Order/rank in the list
  added_at?: string;     // When it was added
  // Photo fields (future-ready)
  photos?: RestaurantPhoto[];
  cover_photo_url?: string;
  photo_url?: string;    // Primary photo
}

interface Creator {
  id: string;
  username: string;
  display_name?: string;
  avatar?: string;
  profile_photo_url?: string;
  reputation_score?: number;
}

interface CuratedListDetail {
  id: string;
  title: string;
  description?: string;
  content?: string;
  category?: string;
  tags?: string[];
  neighborhood?: string;
  visibility?: string;
  likes_count: number;
  bookmarks_count: number;
  user_has_liked?: boolean;
  user_has_bookmarked?: boolean;
  created_at: string;
  updated_at: string;
  restaurants: Restaurant[];
  creator: Creator;
  // Photo fields (future-ready)
  cover_image_url?: string;
  photos?: RestaurantPhoto[];
}

export default function CuratedListDetailPage() {
  const params = useParams();
  const router = useRouter();
  const listId = params.id as string;
  const locale = params.locale as string || 'en';

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://redesigned-lamp-q74wgggqq9jjfxqjp-3001.app.github.dev';

  const [list, setList] = useState<CuratedListDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Like and bookmark state
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [isBookmarking, setIsBookmarking] = useState(false);
  
  // Three-dot menu state for the guide
  const [showGuideMenu, setShowGuideMenu] = useState(false);
  const guideMenuRef = useRef<HTMLDivElement>(null);
  
  // SaveToListModal state for the guide
  const [showSaveGuideModal, setShowSaveGuideModal] = useState(false);
  
  // Three-dot menu state for restaurants (track which one is open)
  const [openRestaurantMenuId, setOpenRestaurantMenuId] = useState<number | null>(null);
  
  // SaveToListModal state for restaurants
  const [saveRestaurantModal, setSaveRestaurantModal] = useState<{
    isOpen: boolean;
    restaurantId: number | null;
  }>({ isOpen: false, restaurantId: null });

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
    
      // Close guide menu if clicking outside
      if (guideMenuRef.current && !guideMenuRef.current.contains(target)) {
        setShowGuideMenu(false);
      }
    
      // Close restaurant menus only if clicking outside any restaurant dropdown
      // Check if click is inside a restaurant dropdown menu
      const clickedInsideRestaurantMenu = (event.target as HTMLElement).closest('[data-restaurant-menu]');
      if (!clickedInsideRestaurantMenu) {
        setOpenRestaurantMenuId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('omeone_auth_token');
    fetchListDetail(token);
  }, [listId]);

  const fetchListDetail = async (authToken?: string | null) => {
    try {
      setLoading(true);
      setError(null);

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      const token = authToken || localStorage.getItem('omeone_auth_token');      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE_URL}/lists/${listId}`, { headers });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Guide not found');
        }
        throw new Error('Failed to fetch guide');
      }

      const data = await response.json();
      console.log('Curated list detail data:', data);
      const listData = data.guide || data;
      setList(listData);
      
      // Set like and bookmark status from API response
      setIsLiked(listData.user_has_liked || false);
      setLikesCount(listData.likes_count || 0);
      setIsBookmarked(listData.user_has_bookmarked || false);
      
    } catch (err) {
      console.error('Error fetching curated list:', err);
      setError(err instanceof Error ? err.message : 'Failed to load guide');
    } finally {
      setLoading(false);
    }
  };

  // Handle like toggle
  const handleLike = async () => {
    const token = localStorage.getItem('omeone_auth_token');
    
    if (!token) {
      // Show a toast or subtle message instead of redirect
      alert(locale === 'pt-BR' ? 'Entre para curtir este guia' : 'Log in to like this guide');
      return;
    }

    try {
      setIsLiking(true);
      
      const response = await fetch(`${API_BASE_URL}/lists/${listId}/like`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        const nowLiked = data.action === 'liked';
        setIsLiked(nowLiked);
        setLikesCount(data.new_count ?? (nowLiked ? likesCount + 1 : likesCount - 1));
      }
    } catch (err) {
      console.error('Error liking list:', err);
    } finally {
      setIsLiking(false);
    }
  };

  // Handle bookmark toggle
  const handleBookmark = async () => {
    const token = localStorage.getItem('omeone_auth_token');
    
    if (!token) {
      alert(locale === 'pt-BR' ? 'Entre para salvar este guia' : 'Log in to save this guide');
      return;
    }

    try {
      setIsBookmarking(true);
      
      const response = await fetch(`${API_BASE_URL}/lists/${listId}/bookmark`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        const nowBookmarked = data.action === 'bookmarked';
        setIsBookmarked(nowBookmarked);
        if (list) {
          setList({
            ...list,
            bookmarks_count: data.new_count ?? (nowBookmarked ? list.bookmarks_count + 1 : list.bookmarks_count - 1)
          });
        }
      }
    } catch (err) {
      console.error('Error bookmarking list:', err);
    } finally {
      setIsBookmarking(false);
    }
  };

  // Open SaveToListModal for the guide (no redirect, just open modal)
  const handleAddGuideToList = () => {
    setShowGuideMenu(false);
    setShowSaveGuideModal(true);
  };

  // Open SaveToListModal for a restaurant (no redirect, just open modal)
  const handleAddRestaurantToList = (restaurantId: number) => {
    console.log('🔥 handleAddRestaurantToList called with:', restaurantId);
    setOpenRestaurantMenuId(null);
    setSaveRestaurantModal({ isOpen: true, restaurantId });
    console.log('🔥 State should now be:', { isOpen: true, restaurantId });
  };

  const handleShare = async () => {
    const url = window.location.href;
    const title = list?.title || 'Check out this food guide!';
    
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch (err) {
        console.log('Share cancelled');
      }
    } else {
      await navigator.clipboard.writeText(url);
      alert(locale === 'pt-BR' ? 'Link copiado!' : 'Link copied to clipboard!');
    }
  };

  const handleRestaurantClick = (restaurantId: string | number) => {
    router.push(`/${locale}/restaurant/${restaurantId}`);
  };

  const handleReport = () => {
    setShowGuideMenu(false);
    alert(locale === 'pt-BR' ? 'Funcionalidade de denúncia em breve' : 'Report functionality coming soon');
  };

  const handleReportRestaurant = (restaurantId: number) => {
    setOpenRestaurantMenuId(null);
    alert(locale === 'pt-BR' ? 'Funcionalidade de denúncia em breve' : 'Report functionality coming soon');
  };

  // Translations
  const t = {
    en: {
      backToDiscover: 'Back to Discover',
      guide: 'Guide',
      public: 'Public',
      restaurants: 'restaurants',
      restaurant: 'restaurant',
      likes: 'likes',
      like: 'like',
      updated: 'Updated',
      created: 'Created',
      by: 'by',
      share: 'Share',
      featuredRestaurants: 'Featured Restaurants',
      noRestaurants: 'No restaurants in this guide yet',
      notFound: 'Guide not found',
      notFoundDesc: 'This guide may have been removed or the link is incorrect.',
      viewProfile: 'View Profile',
      addToList: 'Add to List',
      report: 'Report',
      viewRestaurant: 'View Restaurant',
    },
    'pt-BR': {
      backToDiscover: 'Voltar para Descobrir',
      guide: 'Guia',
      public: 'Público',
      restaurants: 'restaurantes',
      restaurant: 'restaurante',
      likes: 'curtidas',
      like: 'curtida',
      updated: 'Atualizado',
      created: 'Criado',
      by: 'por',
      share: 'Compartilhar',
      featuredRestaurants: 'Restaurantes em Destaque',
      noRestaurants: 'Nenhum restaurante neste guia ainda',
      notFound: 'Guia não encontrado',
      notFoundDesc: 'Este guia pode ter sido removido ou o link está incorreto.',
      viewProfile: 'Ver Perfil',
      addToList: 'Adicionar à Lista',
      report: 'Denunciar',
      viewRestaurant: 'Ver Restaurante',
    }
  }[locale] || {
    backToDiscover: 'Back to Discover',
    guide: 'Guide',
    public: 'Public',
    restaurants: 'restaurants',
    restaurant: 'restaurant',
    likes: 'likes',
    like: 'like',
    updated: 'Updated',
    created: 'Created',
    by: 'by',
    share: 'Share',
    featuredRestaurants: 'Featured Restaurants',
    noRestaurants: 'No restaurants in this guide yet',
    notFound: 'Guide not found',
    notFoundDesc: 'This guide may have been removed or the link is incorrect.',
    viewProfile: 'View Profile',
    addToList: 'Add to List',
    report: 'Report',
    viewRestaurant: 'View Restaurant',
  };

  if (loading) {
    return (
      <>
        <CleanHeader />
        <div className="min-h-screen bg-[#FFF8F0] flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF6B35]"></div>
        </div>
      </>
    );
  }

  if (error || !list) {
    return (
      <>
        <CleanHeader />
        <div className="min-h-screen bg-[#FFF8F0] flex items-center justify-center">
          <div className="text-center px-4">
            <div className="text-6xl mb-4">📋</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{t.notFound}</h2>
            <p className="text-gray-600 mb-6 max-w-md">{t.notFoundDesc}</p>
            <button
              onClick={() => router.push(`/${locale}/discover`)}
              className="px-6 py-3 bg-[#FF6B35] text-white rounded-xl font-semibold hover:bg-[#e55a2b] transition-colors"
            >
              {t.backToDiscover}
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <CleanHeader />
      <div className="min-h-screen bg-[#FFF8F0]">
        {/* Back Button Bar */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <button
              onClick={() => router.push(`/${locale}/discover`)}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft size={20} />
              <span>{t.backToDiscover}</span>
            </button>
          </div>
        </div>

        {/* Hero Section */}
        <div className="relative">
          {/* Cover Image or Gradient */}
          <div className={cn(
            "h-48 sm:h-64 w-full relative",
            list.cover_image_url 
              ? "" 
              : "bg-gradient-to-br from-[#FF6B35] via-[#FF8F5C] to-[#FFB088]"
          )}>
            {list.cover_image_url && (
              <Image
                src={list.cover_image_url}
                alt={list.title}
                fill
                className="object-cover"
                priority
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
          </div>

          {/* Content overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white rounded-2xl shadow-lg flex items-center justify-center text-3xl sm:text-4xl flex-shrink-0">
                  {list.icon || '📋'}
                </div>
                
                {/* Title and badges */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="px-2.5 py-1 bg-white/90 backdrop-blur-sm text-[#FF6B35] text-xs font-semibold rounded-full">
                      {t.guide}
                    </span>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/90 backdrop-blur-sm text-gray-700 text-xs font-medium rounded-full">
                      <Globe className="w-3.5 h-3.5" />
                      <span>{t.public}</span>
                    </div>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight drop-shadow-lg">
                    {list.title}
                  </h1>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto px-4 py-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden"
          >
            <div className="p-6 space-y-6">
              {/* Creator Info & Actions Row */}
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <Link 
                  href={`/${locale}/profile/${list.creator.id}`}
                  className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                >
                  <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                    {(list.creator.avatar || list.creator.profile_photo_url) ? (
                      <Image
                        src={list.creator.avatar || list.creator.profile_photo_url || ''}
                        alt={list.creator.display_name || list.creator.username}
                        width={40}
                        height={40}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-[#FF6B35] text-white font-semibold">
                        {(list.creator.display_name || list.creator.username || 'U')[0].toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">{t.by}</p>
                    <p className="font-semibold text-gray-900">
                      {list.creator.display_name || list.creator.username}
                    </p>
                  </div>
                </Link>

                {/* Action Buttons - Compact icons like social media */}
                <div className="flex items-center gap-2">
                  {/* Heart (Like) Button */}
                  <motion.button
                    onClick={handleLike}
                    disabled={isLiking}
                    className={cn(
                      "p-2.5 rounded-xl transition-all",
                      isLiked
                        ? "bg-red-50 text-red-500"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    )}
                    whileTap={{ scale: 0.95 }}
                    title={isLiked ? 'Unlike' : 'Like'}
                  >
                    <Heart size={18} className={isLiked ? "fill-red-500" : ""} />
                  </motion.button>
                  
                  {/* Bookmark Button */}
                  <motion.button
                    onClick={handleBookmark}
                    disabled={isBookmarking}
                    className={cn(
                      "p-2.5 rounded-xl transition-all",
                      isBookmarked
                        ? "bg-[#FF6B35] text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    )}
                    whileTap={{ scale: 0.95 }}
                    title={isBookmarked ? 'Saved' : 'Save'}
                  >
                    <Bookmark size={18} className={isBookmarked ? "fill-white" : ""} />
                  </motion.button>
                  
                  {/* Share Button */}
                  <motion.button
                    onClick={handleShare}
                    className="p-2.5 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-colors"
                    whileTap={{ scale: 0.95 }}
                    title={t.share}
                  >
                    <Share2 size={18} />
                  </motion.button>

                  {/* Three-Dot Menu for Guide */}
                  <div className="relative" ref={guideMenuRef}>
                    <motion.button
                      onClick={() => setShowGuideMenu(!showGuideMenu)}
                      className="p-2.5 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-colors"
                      whileTap={{ scale: 0.95 }}
                    >
                      <MoreHorizontal size={18} />
                    </motion.button>

                    {/* Dropdown Menu */}
                    {showGuideMenu && (
                      <div className="absolute right-0 top-12 bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-20 min-w-[180px]">
                        <button
                          onClick={handleReport}
                          className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 flex items-center gap-3 text-red-600"
                        >
                          <Flag size={16} />
                          {t.report}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Description */}
              {list.description && (
                <p className="text-base text-gray-700 leading-relaxed">
                  {list.description}
                </p>
              )}

              {/* Tags */}
              {list.tags && list.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {list.tags.map((tag, index) => (
                    <span 
                      key={index}
                      className="px-3 py-1.5 bg-[#FFF8F0] text-[#FF6B35] text-sm font-medium rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Stats */}
              <div className="flex items-center gap-4 text-sm text-gray-600 pb-4 border-b border-gray-200 flex-wrap">
                <div className="flex items-center gap-2">
                  <Utensils size={16} className="text-[#FF6B35]" />
                  <span className="font-medium">
                    {list.restaurants?.length || 0} {(list.restaurants?.length || 0) === 1 ? t.restaurant : t.restaurants}
                  </span>
                </div>
                <span className="text-gray-300">•</span>
                <div className="flex items-center gap-2">
                  <Heart size={16} className="text-red-400" />
                  <span>
                    {likesCount} {likesCount === 1 ? t.like : t.likes}
                  </span>
                </div>
                <span className="text-gray-300">•</span>
                <div className="flex items-center gap-2">
                  <Calendar size={16} />
                  <span>{t.updated} {timeAgo(list.updated_at)}</span>
                </div>
              </div>

              {/* Extended Content/Prose (if available) */}
              {list.content && list.content !== list.description && (
                <div className="prose prose-sm max-w-none text-gray-700">
                  <p className="whitespace-pre-wrap">{list.content}</p>
                </div>
              )}

              {/* Photo Gallery (future-ready) */}
              {list.photos && list.photos.length > 0 && (
                <div className="space-y-3">
                  <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <Camera size={18} className="text-[#FF6B35]" />
                    {locale === 'pt-BR' ? 'Fotos' : 'Photos'}
                  </h2>
                  <div className="relative">
                    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory">
                      {list.photos.map((photo, index) => (
                        <div 
                          key={photo.id || index}
                          className="flex-shrink-0 w-40 h-40 sm:w-48 sm:h-48 relative rounded-xl overflow-hidden snap-start"
                        >
                          <Image
                            src={photo.url}
                            alt={photo.caption || `Photo ${index + 1}`}
                            fill
                            className="object-cover hover:scale-105 transition-transform duration-300"
                          />
                          {photo.caption && (
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                              <p className="text-white text-xs truncate">{photo.caption}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Restaurants Section */}
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Utensils size={18} className="text-[#FF6B35]" />
                  {t.featuredRestaurants}
                </h2>

                {list.restaurants && list.restaurants.length > 0 ? (
                  <div className="space-y-4">
                    {list.restaurants.map((restaurant, index) => {
                      const photoUrl = restaurant.cover_photo_url || 
                                       restaurant.photo_url || 
                                       (restaurant.photos && restaurant.photos[0]?.url);
                      
                      return (
                        <motion.div
                          key={restaurant.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: index * 0.05 }}
                          className="group bg-white rounded-xl border border-gray-200 hover:border-[#FF6B35] hover:shadow-lg transition-all overflow-hidden relative"
                        >
                          <div className="flex items-stretch">
                            {/* Number Badge / Photo */}
                            <div 
                              className="w-20 sm:w-24 relative flex-shrink-0 cursor-pointer"
                              onClick={() => handleRestaurantClick(restaurant.id)}
                            >
                              {photoUrl ? (
                                <>
                                  <Image
                                    src={photoUrl}
                                    alt={restaurant.name}
                                    fill
                                    className="object-cover"
                                  />
                                  <div className="absolute top-2 left-2 w-7 h-7 bg-[#FF6B35] rounded-full flex items-center justify-center shadow-md">
                                    <span className="text-white font-bold text-sm">
                                      {restaurant.position || index + 1}
                                    </span>
                                  </div>
                                </>
                              ) : (
                                <div className="w-full h-full bg-gradient-to-br from-[#FF6B35] to-[#FFB088] flex items-center justify-center min-h-[80px]">
                                  <span className="text-white font-bold text-2xl">
                                    {restaurant.position || index + 1}
                                  </span>
                                </div>
                              )}
                            </div>
                            
                            {/* Content */}
                            <div 
                              className="flex-1 p-4 cursor-pointer"
                              onClick={() => handleRestaurantClick(restaurant.id)}
                            >
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <h3 className="font-semibold text-gray-900 text-base group-hover:text-[#FF6B35] transition-colors">
                                  {restaurant.name}
                                </h3>
                              </div>
                              
                              {/* Cuisine & Location */}
                              <div className="flex items-center gap-2 text-sm text-gray-500 mb-2 flex-wrap">
                                {restaurant.cuisine_type && (
                                  <span className="px-2 py-0.5 bg-[#FFF8F0] text-[#FF6B35] rounded-full text-xs font-medium">
                                    {restaurant.cuisine_type}
                                  </span>
                                )}
                                {restaurant.neighborhood && (
                                  <div className="flex items-center gap-1 text-gray-500">
                                    <MapPin size={12} />
                                    <span className="text-xs">{restaurant.neighborhood}</span>
                                  </div>
                                )}
                              </div>
                              
                              {/* Creator's Notes */}
                              {restaurant.notes && (
                                <p className="text-sm text-gray-600 italic border-l-2 border-[#FFE4D6] pl-3 mt-2">
                                  "{restaurant.notes}"
                                </p>
                              )}
                            </div>

                            {/* Three-Dot Menu for Restaurant */}
                            <div className="absolute top-2 right-2 z-10">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenRestaurantMenuId(
                                    openRestaurantMenuId === restaurant.id ? null : restaurant.id
                                  );
                                }}
                                className="p-1.5 bg-white/90 backdrop-blur-sm rounded-full hover:bg-white transition-colors shadow-sm opacity-0 group-hover:opacity-100"
                              >
                                <MoreHorizontal size={16} className="text-gray-600" />
                              </button>

                              {/* Restaurant Dropdown Menu */}
                              {openRestaurantMenuId === restaurant.id && (
                                <div 
                                  data-restaurant-menu="true"
                                  className="absolute right-0 top-8 bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-20 min-w-[180px]"
                                >
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleAddRestaurantToList(restaurant.id);
                                    }}
                                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 flex items-center gap-3 text-gray-700"
                                  >
                                    <FolderPlus size={16} className="text-[#FF6B35]" />
                                    {t.addToList}
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRestaurantClick(restaurant.id);
                                    }}
                                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 flex items-center gap-3 text-gray-700"
                                  >
                                    <ExternalLink size={16} className="text-gray-500" />
                                    {t.viewRestaurant}
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleReportRestaurant(restaurant.id);
                                    }}
                                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 flex items-center gap-3 text-red-600"
                                  >
                                    <Flag size={16} />
                                    {t.report}
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <Utensils size={48} className="mx-auto mb-3 opacity-50" />
                    <p className="text-base font-medium">{t.noRestaurants}</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* SaveToListModal for Guide */}
      {showSaveGuideModal && (
        <SaveToListModal
          itemType="guide"
          itemId={list.id}
          onClose={() => setShowSaveGuideModal(false)}
          onSave={() => {
            setShowSaveGuideModal(false);
            // Optionally show a success toast
          }}
        />
      )}

      {/* Debug log */}
      {console.log('🔍 saveRestaurantModal state:', saveRestaurantModal)}

      {/* SaveToListModal for Restaurant */}
      {saveRestaurantModal.isOpen && saveRestaurantModal.restaurantId && (
        <SaveToListModal
          itemType="restaurant"
          itemId={saveRestaurantModal.restaurantId}
          onClose={() => setSaveRestaurantModal({ isOpen: false, restaurantId: null })}
          onSave={() => {
            setSaveRestaurantModal({ isOpen: false, restaurantId: null });
            // Optionally show a success toast
          }}
        />
      )}
    </>
  );
}