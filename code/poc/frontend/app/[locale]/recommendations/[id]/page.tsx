// File: code/poc/frontend/app/[locale]/recommendations/[id]/page.tsx
// Recommendation detail page with full BocaBoca branding
// UPDATED: Dark mode support added
// UPDATED: Fixed hardcoded backend URL to use environment variable

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Heart, 
  MessageCircle, 
  Share2, 
  MapPin,
  Star,
  Clock,
  DollarSign,
  Users,
  Bookmark,
  MoreVertical
} from 'lucide-react';
import { CleanHeader } from '@/components/CleanHeader';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'react-hot-toast';

// Use the same API URL pattern as the discover page
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://redesigned-lamp-q74wgggqq9jjfxqjp-3001.app.github.dev/api';

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
  trust_score: number;
  likes_count: number;
  comments_count: number;
  reshares_count: number;
  created_at: string;
  is_liked?: boolean;
  is_bookmarked?: boolean;
  images?: string[];
}

interface Comment {
  id: string;
  content: string;
  user_id: string;
  author: {  // Changed from 'user' to 'author'
    id: string;
    username: string;
    display_name?: string;
    name?: string;  // Backend uses 'name'
    avatar_url: string | null;
    avatar?: string;  // Backend uses 'avatar'
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
      setIsLoading(true);
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
        <div className="max-w-4xl mx-auto px-4 py-6">
          {/* Back Button */}
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-[#FF644A] transition-colors mb-6"
          >
            <ArrowLeft size={20} />
            <span>Back</span>
          </button>

          {/* Main Content Card */}
          <div className="bg-white dark:bg-[#2D2C3A] rounded-xl shadow-sm dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] overflow-hidden mb-6">
            {/* Author Header */}
            <div className="p-6 border-b border-gray-100 dark:border-[#3D3C4A]">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {recommendation.author ? (
                    <>
                      <Link href={`/users/${recommendation.author.id}`}>
                        {recommendation.author.avatar_url ? (
                          <img
                            src={recommendation.author.avatar_url}
                            alt={recommendation.author.display_name}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-gradient-to-br from-[#FF644A] to-[#E65441] rounded-full flex items-center justify-center text-white font-semibold">
                            {recommendation.author.display_name?.[0]?.toUpperCase() || 'U'}
                          </div>
                        )}
                      </Link>
                      <div>
                        <Link 
                          href={`/users/${recommendation.author.id}`}
                          className="font-semibold text-[#1F1E2A] dark:text-white hover:text-[#FF644A] dark:hover:text-[#FF644A]"
                        >
                          {recommendation.author.display_name}
                        </Link>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          @{recommendation.author.username} · {formatTimeAgo(recommendation.created_at)}
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-12 h-12 bg-gradient-to-br from-[#FF644A] to-[#E65441] rounded-full flex items-center justify-center text-white font-semibold">
                        U
                      </div>
                      <div>
                        <p className="font-semibold text-[#1F1E2A] dark:text-white">Unknown User</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {formatTimeAgo(recommendation.created_at)}
                        </p>
                      </div>
                    </>
                  )}
                </div>
                <button className="p-2 text-gray-500 dark:text-gray-400 hover:text-[#1F1E2A] dark:hover:text-white rounded-lg hover:bg-gray-50 dark:hover:bg-[#353444]">
                  <MoreVertical size={20} />
                </button>
              </div>
            </div>

            {/* Restaurant Info */}
            {recommendation.restaurant && (
              <div className="px-6 py-4 bg-[#FFF4E1] dark:bg-[#353444] border-b border-gray-100 dark:border-[#3D3C4A]">
                <Link 
                  href={`/restaurant/${recommendation.restaurant.id}`}
                  className="block hover:opacity-80 transition-opacity"
                >
                  <h2 className="text-xl font-semibold text-[#1F1E2A] dark:text-white mb-2">
                    {recommendation.restaurant.name}
                  </h2>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      {recommendation.restaurant.cuisine_type}
                    </span>
                    <span className="flex items-center gap-1">
                      <DollarSign size={14} />
                      {getPriceLevel(recommendation.restaurant.price_level)}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin size={14} />
                      {recommendation.restaurant.city}
                    </span>
                  </div>
                </Link>
              </div>
            )}

            {/* Recommendation Content */}
            <div className="p-6">
              <h3 className="text-xl font-semibold text-[#1F1E2A] dark:text-white mb-4">
                {recommendation.title}
              </h3>
              
              <div className="prose dark:prose-invert max-w-none text-[#1F1E2A] dark:text-gray-200 mb-6">
                {recommendation.content.split('\n').map((paragraph, i) => (
                  <p key={i} className="mb-4 last:mb-0 leading-relaxed">
                    {paragraph}
                  </p>
                ))}
              </div>

              {/* Images */}
              {recommendation.images && recommendation.images.length > 0 && (
                <div className="grid grid-cols-2 gap-2 mb-6">
                  {recommendation.images.map((image, i) => (
                    <img
                      key={i}
                      src={image}
                      alt={`Photo ${i + 1}`}
                      className="w-full h-48 object-cover rounded-lg"
                    />
                  ))}
                </div>
              )}

              {/* Trust Score */}
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#BFE2D9] dark:bg-[#BFE2D9]/20 rounded-lg">
                <Star size={16} className="text-[#2D7A5F] dark:text-[#BFE2D9]" />
                <span className="font-semibold text-[#2D7A5F] dark:text-[#BFE2D9]">
                  {recommendation.trust_score.toFixed(1)} Trust Score
                </span>
              </div>
            </div>

            {/* Action Bar */}
            <div className="px-6 py-4 border-t border-gray-100 dark:border-[#3D3C4A] flex items-center justify-between">
              <div className="flex items-center gap-6">
                <button
                  onClick={handleLike}
                  className={`flex items-center gap-2 transition-colors ${
                    recommendation.is_liked 
                      ? 'text-[#FF644A]' 
                      : 'text-gray-500 dark:text-gray-400 hover:text-[#FF644A]'
                  }`}
                >
                  <Heart 
                    size={20} 
                    fill={recommendation.is_liked ? '#FF644A' : 'none'}
                  />
                  <span className="text-sm font-medium">
                    {recommendation.likes_count}
                  </span>
                </button>

                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                  <MessageCircle size={20} />
                  <span className="text-sm font-medium">
                    {recommendation.comments_count}
                  </span>
                </div>

                <button className="flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-[#FF644A] transition-colors">
                  <Share2 size={20} />
                  <span className="text-sm font-medium">
                    {recommendation.reshares_count}
                  </span>
                </button>
              </div>

              <button
                onClick={handleBookmark}
                className={`p-2 rounded-lg transition-colors ${
                  recommendation.is_bookmarked
                    ? 'text-[#FF644A] bg-[#FF644A]/10 dark:bg-[#FF644A]/20'
                    : 'text-gray-500 dark:text-gray-400 hover:text-[#FF644A] hover:bg-gray-50 dark:hover:bg-[#353444]'
                }`}
              >
                <Bookmark 
                  size={20}
                  fill={recommendation.is_bookmarked ? '#FF644A' : 'none'}
                />
              </button>
            </div>
          </div>

          {/* Comments Section */}
          <div className="bg-white dark:bg-[#2D2C3A] rounded-xl shadow-sm dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] p-6">
            <h3 className="text-lg font-semibold text-[#1F1E2A] dark:text-white mb-6">
              Comments ({comments.length})
            </h3>

            {/* Comment Form */}
            {isAuthenticated ? (
              <form onSubmit={handleSubmitComment} className="mb-6">
                <div className="flex gap-3">
                  {user?.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={user.display_name || 'You'}
                      className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-gradient-to-br from-[#FF644A] to-[#E65441] rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
                      {(user?.display_name || 'U')[0]?.toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1">
                    <textarea
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Add a comment..."
                      className="w-full px-4 py-3 bg-white dark:bg-[#353444] border border-gray-200 dark:border-[#3D3C4A] rounded-lg text-[#1F1E2A] dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-[#FF644A] focus:border-[#FF644A] outline-none resize-none"
                      rows={3}
                    />
                    <div className="mt-2 flex justify-end">
                      <button
                        type="submit"
                        disabled={!commentText.trim() || isSubmitting}
                        className="px-6 py-2 bg-[#FF644A] text-white rounded-lg hover:bg-[#E65441] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSubmitting ? 'Posting...' : 'Post Comment'}
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            ) : (
              <div className="mb-6 p-4 bg-[#FFF4E1] dark:bg-[#353444] rounded-lg text-center">
                <p className="text-gray-500 dark:text-gray-400 mb-3">
                  Sign in to join the conversation
                </p>
                <button
                  onClick={() => router.push('/login')}
                  className="px-6 py-2 bg-[#FF644A] text-white rounded-lg hover:bg-[#E65441] transition-colors"
                >
                  Sign In
                </button>
              </div>
            )}

            {/* Comments List */}
            <div className="space-y-6">
              {comments.length === 0 ? (
                <div className="text-center py-8">
                  <MessageCircle size={32} className="mx-auto mb-2 text-gray-400 dark:text-gray-500" />
                  <p className="text-gray-500 dark:text-gray-400">No comments yet</p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                    Be the first to share your thoughts!
                  </p>
                </div>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3">
                    {comment.author ? (
                      <>
                        <Link href={`/users/${comment.author.id}`}>
                          {(comment.author.avatar_url || comment.author.avatar) ? (
                            <img
                              src={comment.author.avatar_url || comment.author.avatar || ''}
                              alt={comment.author.display_name || comment.author.name || comment.author.username}
                              className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-gradient-to-br from-[#FF644A] to-[#E65441] rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
                              {(comment.author.display_name || comment.author.name || comment.author.username)?.[0]?.toUpperCase() || 'U'}
                            </div>
                          )}
                        </Link>
                        <div className="flex-1">
                          <div className="bg-[#FFF4E1] dark:bg-[#353444] rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <Link
                                href={`/users/${comment.author.id}`}
                                className="font-semibold text-[#1F1E2A] dark:text-white hover:text-[#FF644A] dark:hover:text-[#FF644A]"
                              >
                                {comment.author.display_name || comment.author.name || comment.author.username}
                              </Link>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {formatTimeAgo(comment.created_at)}
                              </span>
                            </div>
                            <p className="text-[#1F1E2A] dark:text-gray-200 leading-relaxed">
                              {comment.content}
                            </p>
                          </div>
                          <div className="flex items-center gap-4 mt-2 ml-4">
                            <button className="text-sm text-gray-500 dark:text-gray-400 hover:text-[#FF644A] transition-colors">
                              Reply
                            </button>
                            <button className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-[#FF644A] transition-colors">
                              <Heart size={14} />
                              {comment.likes_count > 0 && (
                                <span>{comment.likes_count}</span>
                              )}
                            </button>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="w-10 h-10 bg-gradient-to-br from-[#FF644A] to-[#E65441] rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
                          U
                        </div>
                        <div className="flex-1">
                          <div className="bg-[#FFF4E1] dark:bg-[#353444] rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-semibold text-[#1F1E2A] dark:text-white">Unknown User</span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {formatTimeAgo(comment.created_at)}
                              </span>
                            </div>
                            <p className="text-[#1F1E2A] dark:text-gray-200 leading-relaxed">
                              {comment.content}
                            </p>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}