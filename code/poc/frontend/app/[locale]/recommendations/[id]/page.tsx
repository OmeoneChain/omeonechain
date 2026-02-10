// File: code/poc/frontend/app/[locale]/recommendations/[id]/page.tsx
// Recommendation detail page with full BocaBoca branding
// UPDATED: Cleaner, tighter design consistent with feed cards (Jan 28, 2026)
// UPDATED: Dark mode support
// UPDATED: Fixed keyboard issues on mobile
// UPDATED: Added SaveToListModal integration (Jan 29, 2026)
// UPDATED: Added Edit option in three-dot menu for own recommendations (Feb 10, 2026)

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Heart, 
  MessageCircle, 
  Share2, 
  MapPin,
  Star,
  DollarSign,
  Bookmark,
  MoreVertical,
  Repeat2,
  Flag,
  Edit,
  FolderPlus
} from 'lucide-react';
import { CleanHeader } from '@/components/CleanHeader';
import SaveToListModal from '@/components/saved-lists/SaveToListModal';
import EditRecommendationModal from '@/components/recommendation/EditRecommendationModal';
import PhotoGallery from '@/components/recommendation/PhotoGallery';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'react-hot-toast';

// Use the same API URL pattern as the discover page
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://omeonechain-production.up.railway.app/api';

interface Recommendation {
  id: string;
  title: string;
  content: string;
  author_id: string;
  author: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
  restaurant?: {
    id: string;
    name: string;
    cuisine_type: string;
    price_level: number;
    address: string;
    city: string;
  };
  overall_rating?: number;
  trust_score: number;
  likes_count: number;
  comments_count: number;
  reshares_count: number;
  created_at: string;
  is_liked?: boolean;
  is_bookmarked?: boolean;
  photos?: string[];
  is_edited?: boolean;
  edited_at?: string;
}

interface Comment {
  id: string;
  content: string;
  user_id: string;
  author: {
    id: string;
    username: string;
    display_name?: string;
    name?: string;
    avatar_url: string | null;
    avatar?: string;
  };
  created_at: string;
  likes_count: number;
  is_liked?: boolean;
  replies?: Comment[];
}

export default function RecommendationDetailPage({ 
  params 
}: { 
  params: { id: string } 
}) {
  const router = useRouter();
  const { token, isAuthenticated, user } = useAuth();
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const recommendationId = params.id;

  // Fetch recommendation details
  useEffect(() => {
    if (recommendationId) {
      fetchRecommendation();
      fetchComments();
    }
  }, [recommendationId, token]);

  const fetchRecommendation = async () => {
    if (!recommendationId) return;
    
    try {
      // Only show loading spinner on initial load, not on re-fetches
      if (!recommendation) {
        setIsLoading(true);
      }
      setError(null);
      
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const apiUrl = `${API_BASE_URL}/recommendations/${recommendationId}`;
      console.log('[RecommendationDetail] Fetching from:', apiUrl);

      const response = await fetch(apiUrl, {
        headers
      });

      if (!response.ok) {
        if (response.status === 404) {
          setError('Recommendation not found');
        } else {
          throw new Error(`Failed to fetch recommendation: ${response.status}`);
        }
        return;
      }

      const data = await response.json();
      console.log('[RecommendationDetail] Response:', data);
      
      if (data.success) {
        setRecommendation(data.recommendation);
      } else {
        throw new Error(data.message || 'Failed to load recommendation');
      }
    } catch (err: any) {
      console.error('Error fetching recommendation:', err);
      setError(err.message || 'Failed to load recommendation');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchComments = async () => {
    if (!recommendationId) return;
    
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const apiUrl = `${API_BASE_URL}/recommendations/${recommendationId}/comments`;

      const response = await fetch(apiUrl, {
        headers
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setComments(data.comments || []);
        }
      }
    } catch (err) {
      console.error('Error fetching comments:', err);
    }
  };

  const handleLike = async () => {
    if (!isAuthenticated || !recommendationId) {
      toast.error('Please sign in to like recommendations');
      return;
    }

    try {
      const apiUrl = `${API_BASE_URL}/recommendations/${recommendationId}/like`;

      const response = await fetch(apiUrl, {
        method: recommendation?.is_liked ? 'DELETE' : 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        setRecommendation(prev => prev ? {
          ...prev,
          is_liked: !prev.is_liked,
          likes_count: prev.is_liked ? prev.likes_count - 1 : prev.likes_count + 1
        } : null);
      }
    } catch (err) {
      toast.error('Failed to like recommendation');
    }
  };

  const handleBookmark = async () => {
    if (!isAuthenticated || !recommendationId) {
      toast.error('Please sign in to bookmark recommendations');
      return;
    }

    try {
      const apiUrl = `${API_BASE_URL}/recommendations/${recommendationId}/bookmark`;

      const response = await fetch(apiUrl, {
        method: recommendation?.is_bookmarked ? 'DELETE' : 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        setRecommendation(prev => prev ? {
          ...prev,
          is_bookmarked: !prev.is_bookmarked
        } : null);
        toast.success(recommendation?.is_bookmarked ? 'Bookmark removed' : 'Bookmarked!');
      }
    } catch (err) {
      toast.error('Failed to bookmark');
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: recommendation?.title || 'Check out this recommendation',
          url: window.location.href,
        });
      } catch (err) {
        // User cancelled or error
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard!');
    }
  };

  const handleAddToList = () => {
    setShowMenu(false);
    if (!isAuthenticated) {
      toast.error('Please sign in to save to a list');
      return;
    }
    setShowSaveModal(true);
  };

  const handleEdit = () => {
    setShowMenu(false);
    setShowEditModal(true);
  };

  const handleTextareaFocus = () => {
    // Scroll into view when focused on mobile
    setTimeout(() => {
      textareaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 300); // Delay to let keyboard appear
  };

  const handleCancelComment = () => {
    setCommentText('');
    // Blur the textarea to dismiss keyboard
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isAuthenticated || !recommendationId) {
      toast.error('Please sign in to comment');
      return;
    }

    if (!commentText.trim()) {
      return;
    }

    try {
      setIsSubmitting(true);
      
      const apiUrl = `${API_BASE_URL}/recommendations/${recommendationId}/comments`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: commentText.trim()
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setCommentText('');
          await fetchComments();
          setRecommendation(prev => prev ? {
            ...prev,
            comments_count: prev.comments_count + 1
          } : null);
          toast.success('Comment posted!');
        }
      } else {
        throw new Error('Failed to post comment');
      }
    } catch (err) {
      toast.error('Failed to post comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  const getPriceLevel = (level: number) => {
    return '$'.repeat(level);
  };

  // Check if current user is the author
  const isOwnRecommendation = user?.id === recommendation?.author_id || user?.id === recommendation?.author?.id;

  if (isLoading) {
    return (
      <>
        <CleanHeader />
        <div className="min-h-screen bg-[#FFF4E1] dark:bg-[#1F1E2A] flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF644A] mx-auto mb-4"></div>
            <p className="text-gray-500 dark:text-gray-400">Loading recommendation...</p>
          </div>
        </div>
      </>
    );
  }

  if (error || !recommendation) {
    return (
      <>
        <CleanHeader />
        <div className="min-h-screen bg-[#FFF4E1] dark:bg-[#1F1E2A] flex items-center justify-center">
          <div className="text-center max-w-md px-4">
            <div className="w-16 h-16 bg-[#E65441]/10 dark:bg-[#E65441]/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageCircle size={32} className="text-[#E65441]" />
            </div>
            <h1 className="text-2xl font-semibold text-[#1F1E2A] dark:text-white mb-2">
              {error === 'Recommendation not found' ? 'Not Found' : 'Oops!'}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              {error || 'This recommendation could not be found.'}
            </p>
            <button
              onClick={() => router.push('/feed')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#FF644A] text-white rounded-lg hover:bg-[#E65441] transition-colors"
            >
              <ArrowLeft size={20} />
              Back to Feed
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <CleanHeader />
      
      <div className="min-h-screen bg-[#FFF4E1] dark:bg-[#1F1E2A]">
        <div className="max-w-2xl mx-auto px-4 py-4 pb-28">
          {/* Back Button */}
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-[#FF644A] transition-colors mb-4"
          >
            <ArrowLeft size={18} />
            <span className="text-sm">Back</span>
          </button>

          {/* Main Content Card */}
          <div className="bg-white dark:bg-[#2D2C3A] rounded-xl shadow-sm dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] overflow-hidden">
            <div className="p-4 space-y-3">
              
              {/* Author Row */}
              <div className="flex items-center justify-between">
                <Link 
                  href={`/users/${recommendation.author?.id}`}
                  className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                >
                  {recommendation.author?.avatar_url ? (
                    <img
                      src={recommendation.author.avatar_url}
                      alt={recommendation.author.display_name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-gradient-to-br from-[#FF644A] to-[#E65441] rounded-full flex items-center justify-center text-white font-semibold">
                      {recommendation.author?.display_name?.[0]?.toUpperCase() || 'U'}
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-[#1F1E2A] dark:text-white text-sm">
                      {recommendation.author?.display_name || 'Unknown User'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      @{recommendation.author?.username} · {formatTimeAgo(recommendation.created_at)}
                      {recommendation.is_edited && (
                        <span className="ml-1 text-gray-400 dark:text-gray-500" title={recommendation.edited_at ? `Edited ${formatTimeAgo(recommendation.edited_at)}` : undefined}>
                          · ✏️ edited
                        </span>
                      )}
                    </p>
                  </div>
                </Link>

                {/* More Menu */}
                <div className="relative">
                  <button 
                    onClick={() => setShowMenu(!showMenu)}
                    className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#353444] rounded-lg transition-colors"
                  >
                    <MoreVertical size={18} />
                  </button>
                  
                  {showMenu && (
                    <>
                      <div 
                        className="fixed inset-0 z-10" 
                        onClick={() => setShowMenu(false)}
                      />
                      <div className="absolute right-0 top-10 bg-white dark:bg-[#2D2C3A] border border-gray-200 dark:border-[#3D3C4A] rounded-lg shadow-lg dark:shadow-[0_4px_20px_rgba(0,0,0,0.4)] py-1 z-20 min-w-[160px]">
                        {/* Edit — only visible for own recommendations */}
                        {isOwnRecommendation && (
                          <button
                            onClick={handleEdit}
                            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-[#353444] flex items-center gap-2 text-gray-700 dark:text-gray-300"
                          >
                            <Edit size={14} />
                            Edit
                          </button>
                        )}
                        <button
                          onClick={handleAddToList}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-[#353444] flex items-center gap-2 text-gray-700 dark:text-gray-300"
                        >
                          <FolderPlus size={14} />
                          Add to List
                        </button>
                        <button
                          onClick={() => {
                            setShowMenu(false);
                          }}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-[#353444] flex items-center gap-2 text-red-600 dark:text-red-400"
                        >
                          <Flag size={14} />
                          Report
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Restaurant Header with Rating */}
              {recommendation.restaurant && (
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <Link 
                      href={`/restaurant/${recommendation.restaurant.id}`}
                      className="text-lg font-semibold text-[#1F1E2A] dark:text-white hover:text-[#FF644A] transition-colors"
                    >
                      {recommendation.restaurant.name}
                    </Link>
                    <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {recommendation.restaurant.cuisine_type && (
                        <span>{recommendation.restaurant.cuisine_type}</span>
                      )}
                      {recommendation.restaurant.price_level && (
                        <span className="flex items-center gap-0.5">
                          <DollarSign size={12} />
                          {getPriceLevel(recommendation.restaurant.price_level)}
                        </span>
                      )}
                      {recommendation.restaurant.city && (
                        <span className="flex items-center gap-0.5">
                          <MapPin size={12} />
                          {recommendation.restaurant.city}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Rating Badge */}
                  {recommendation.overall_rating !== undefined && (
                    <div className="flex-shrink-0 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded-lg px-2.5 py-1.5">
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                        <span className="text-lg font-bold text-gray-900 dark:text-white">
                          {recommendation.overall_rating}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">/10</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* User Title (italic, like feed cards) */}
              {recommendation.title && (
                <p className="text-sm text-gray-600 dark:text-gray-400 italic">
                  {recommendation.title}
                </p>
              )}

              {/* Photos */}
              {recommendation.photos && recommendation.photos.length > 0 && (
                <PhotoGallery
                  photos={recommendation.photos}
                  altPrefix={recommendation.restaurant?.name || 'Restaurant'}
                />
              )}

              {/* Content */}
              {recommendation.content && (
                <div className="text-sm text-[#1F1E2A] dark:text-gray-200 leading-relaxed">
                  {recommendation.content.split('\n').map((paragraph, i) => (
                    <p key={i} className="mb-2 last:mb-0">
                      {paragraph}
                    </p>
                  ))}
                </div>
              )}

              {/* Trust Score (smaller, subtle) */}
              {recommendation.trust_score > 0 && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#BFE2D9]/50 dark:bg-[#BFE2D9]/20 rounded-full">
                  <Star size={12} className="text-[#2D7A5F] dark:text-[#BFE2D9]" />
                  <span className="text-xs font-medium text-[#2D7A5F] dark:text-[#BFE2D9]">
                    {recommendation.trust_score.toFixed(1)} Trust Score
                  </span>
                </div>
              )}

              {/* Photo count badge */}
              {recommendation.photos && recommendation.photos.length > 0 && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 dark:bg-[#353444] rounded-full ml-2">
                  <span className="text-xs">📷</span>
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                    {recommendation.photos.length} photo{recommendation.photos.length !== 1 ? 's' : ''}
                  </span>
                </div>
              )}
              
              {/* Action Bar (icons only, matching feed cards) */}
              <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-[#3D3C4A]">
                {/* Engagement Stats */}
                <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                  <button 
                    onClick={handleLike}
                    className={`flex items-center gap-1 transition-colors ${
                      recommendation.is_liked ? 'text-[#FF644A]' : 'hover:text-[#FF644A]'
                    }`}
                  >
                    <Heart size={14} fill={recommendation.is_liked ? 'currentColor' : 'none'} />
                    <span>{recommendation.likes_count}</span>
                  </button>
                  
                  <div className="flex items-center gap-1">
                    <MessageCircle size={14} />
                    <span>{recommendation.comments_count}</span>
                  </div>
                  
                  {recommendation.reshares_count > 0 && (
                    <div className="flex items-center gap-1">
                      <Repeat2 size={14} />
                      <span>{recommendation.reshares_count}</span>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-1">
                  <motion.button
                    onClick={handleLike}
                    className={`p-2 rounded-lg transition-colors ${
                      recommendation.is_liked 
                        ? 'text-[#FF644A] bg-[#FFE8E4] dark:bg-[#FF644A]/20' 
                        : 'text-gray-500 dark:text-gray-400 hover:text-[#FF644A] hover:bg-[#FFE8E4] dark:hover:bg-[#FF644A]/20'
                    }`}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Heart size={18} fill={recommendation.is_liked ? "currentColor" : "none"} />
                  </motion.button>

                  <motion.button
                    onClick={handleBookmark}
                    className={`p-2 rounded-lg transition-colors ${
                      recommendation.is_bookmarked
                        ? 'text-[#FF644A] bg-[#FFE8E4] dark:bg-[#FF644A]/20'
                        : 'text-gray-500 dark:text-gray-400 hover:text-[#FF644A] hover:bg-[#FFE8E4] dark:hover:bg-[#FF644A]/20'
                    }`}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Bookmark size={18} fill={recommendation.is_bookmarked ? "currentColor" : "none"} />
                  </motion.button>

                  <motion.button
                    onClick={handleShare}
                    className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:text-[#FF644A] hover:bg-[#FFE8E4] dark:hover:bg-[#FF644A]/20 transition-colors"
                    whileTap={{ scale: 0.95 }}
                  >
                    <Share2 size={18} />
                  </motion.button>
                </div>
              </div>

              {/* Comments Section (same card, below divider) */}
              <div className="pt-3 border-t border-gray-100 dark:border-[#3D3C4A]">
                <h3 className="text-sm font-semibold text-[#1F1E2A] dark:text-white mb-3">
                  Comments ({comments.length})
                </h3>

                {/* Comment Form */}
                {isAuthenticated ? (
                  <form onSubmit={handleSubmitComment} className="mb-4">
                    <div className="flex gap-3">
                      {user?.avatar_url ? (
                        <img
                          src={user.avatar_url}
                          alt={user.display_name || 'You'}
                          className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-8 h-8 bg-gradient-to-br from-[#FF644A] to-[#E65441] rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                          {(user?.display_name || 'U')[0]?.toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1">
                        <textarea
                          ref={textareaRef}
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          onFocus={handleTextareaFocus}
                          placeholder="Add a comment..."
                          className="w-full px-3 py-2 bg-gray-50 dark:bg-[#353444] border border-gray-200 dark:border-[#3D3C4A] rounded-lg text-sm text-[#1F1E2A] dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-[#FF644A] focus:border-[#FF644A] outline-none resize-none"
                          rows={2}
                        />
                        <div className="mt-2 flex justify-end gap-2">
                          {/* Cancel button - only show when there's text */}
                          {commentText.trim() && (
                            <button
                              type="button"
                              onClick={handleCancelComment}
                              className="px-4 py-1.5 text-gray-500 dark:text-gray-400 text-sm rounded-lg hover:bg-gray-100 dark:hover:bg-[#353444] transition-colors"
                            >
                              Cancel
                            </button>
                          )}
                          <button
                            type="submit"
                            disabled={!commentText.trim() || isSubmitting}
                            className="px-4 py-1.5 bg-[#FF644A] text-white text-sm rounded-lg hover:bg-[#E65441] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isSubmitting ? 'Posting...' : 'Post'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </form>
                ) : (
                  <div className="mb-4 p-3 bg-gray-50 dark:bg-[#353444] rounded-lg text-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                      Sign in to join the conversation
                    </p>
                    <button
                      onClick={() => router.push('/login')}
                      className="px-4 py-1.5 bg-[#FF644A] text-white text-sm rounded-lg hover:bg-[#E65441] transition-colors"
                    >
                      Sign In
                    </button>
                  </div>
                )}

                {/* Comments List */}
                <div className="space-y-4">
                  {comments.length === 0 ? (
                    <p className="text-center text-xs text-gray-400 dark:text-gray-500 py-3">
                      No comments yet — be the first!
                    </p>
                  ) : (
                    comments.map((comment) => (
                      <div key={comment.id} className="flex gap-3">
                        <Link href={`/users/${comment.author?.id}`}>
                          {(comment.author?.avatar_url || comment.author?.avatar) ? (
                            <img
                              src={comment.author.avatar_url || comment.author.avatar || ''}
                              alt={comment.author.display_name || comment.author.name || comment.author.username}
                              className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 bg-gradient-to-br from-[#FF644A] to-[#E65441] rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                              {(comment.author?.display_name || comment.author?.name || comment.author?.username)?.[0]?.toUpperCase() || 'U'}
                            </div>
                          )}
                        </Link>
                        <div className="flex-1 min-w-0">
                          <div className="bg-gray-50 dark:bg-[#353444] rounded-lg px-3 py-2">
                            <div className="flex items-center gap-2 mb-1">
                              <Link
                                href={`/users/${comment.author?.id}`}
                                className="text-sm font-medium text-[#1F1E2A] dark:text-white hover:text-[#FF644A]"
                              >
                                {comment.author?.display_name || comment.author?.name || comment.author?.username || 'Unknown'}
                              </Link>
                              <span className="text-xs text-gray-400 dark:text-gray-500">
                                {formatTimeAgo(comment.created_at)}
                              </span>
                            </div>
                            <p className="text-sm text-[#1F1E2A] dark:text-gray-200">
                              {comment.content}
                            </p>
                          </div>
                          <div className="flex items-center gap-4 mt-1 ml-3">
                            <button className="text-xs text-gray-500 dark:text-gray-400 hover:text-[#FF644A] transition-colors">
                              Reply
                            </button>
                            <button className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-[#FF644A] transition-colors">
                              <Heart size={12} />
                              {comment.likes_count > 0 && (
                                <span>{comment.likes_count}</span>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Extra padding for keyboard on mobile */}
                <div className="h-4" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Save to List Modal */}
      {showSaveModal && (
        <SaveToListModal
          itemType="recommendation"
          itemId={recommendationId}
          onClose={() => setShowSaveModal(false)}
          onSave={() => setShowSaveModal(false)}
        />
      )}

      {/* Edit Recommendation Modal */}
      {showEditModal && (
        <EditRecommendationModal
          recommendationId={recommendationId}
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => {
            setShowEditModal(false);
            fetchRecommendation(); // Refresh the detail page data
          }}
        />
      )}
    </>
  );
}