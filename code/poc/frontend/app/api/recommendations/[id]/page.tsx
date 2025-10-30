// File: code/poc/frontend/src/app/recommendations/[id]/page.tsx
// Individual recommendation detail page to fix 404 errors

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  MapPin, 
  Heart, 
  MessageCircle, 
  Share2, 
  Star, 
  Calendar,
  User,
  ExternalLink,
  Flag,
  Bookmark,
  TrendingUp,
  Shield
} from 'lucide-react';
import { recommendationService, type Recommendation } from '@/lib/services/recommendation-service';
import { useAuth } from '@/components/auth/AuthProvider.backup';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const RecommendationDetailPage = () => {
  const params = useParams();
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [hasUpvoted, setHasUpvoted] = useState(false);

  const recommendationId = params.id as string;

  useEffect(() => {
    if (recommendationId) {
      loadRecommendation();
    }
  }, [recommendationId]);

  useEffect(() => {
    // Load user interaction state from localStorage
    if (recommendationId && isAuthenticated) {
      loadUserInteractionState();
    }
  }, [recommendationId, isAuthenticated]);

  const loadRecommendation = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Loading recommendation:', recommendationId);
      const data = await recommendationService.getRecommendationById(recommendationId);
      
      if (!data) {
        setError('Recommendation not found');
        return;
      }
      
      setRecommendation(data);
      console.log('Loaded recommendation:', data.title);
    } catch (err) {
      console.error('Error loading recommendation:', err);
      setError('Failed to load recommendation');
    } finally {
      setLoading(false);
    }
  };

  const loadUserInteractionState = () => {
    try {
      const bookmarks = JSON.parse(localStorage.getItem('bookmarkedRecommendations') || '[]');
      const upvotes = JSON.parse(localStorage.getItem('upvotedRecommendations') || '[]');
      
      setIsBookmarked(bookmarks.includes(recommendationId));
      setHasUpvoted(upvotes.includes(recommendationId));
    } catch (error) {
      console.warn('Could not load user interaction state:', error);
    }
  };

  const handleBookmark = () => {
    if (!isAuthenticated) {
      alert('Please sign in to bookmark recommendations');
      return;
    }

    try {
      const bookmarks = JSON.parse(localStorage.getItem('bookmarkedRecommendations') || '[]');
      let newBookmarks;
      
      if (isBookmarked) {
        newBookmarks = bookmarks.filter((id: string) => id !== recommendationId);
      } else {
        newBookmarks = [...bookmarks, recommendationId];
      }
      
      localStorage.setItem('bookmarkedRecommendations', JSON.stringify(newBookmarks));
      setIsBookmarked(!isBookmarked);
    } catch (error) {
      console.warn('Could not save bookmark:', error);
    }
  };

  const handleUpvote = () => {
    if (!isAuthenticated) {
      alert('Please sign in to upvote recommendations');
      return;
    }

    try {
      const upvotes = JSON.parse(localStorage.getItem('upvotedRecommendations') || '[]');
      let newUpvotes;
      
      if (hasUpvoted) {
        newUpvotes = upvotes.filter((id: string) => id !== recommendationId);
        // Decrease upvote count
        if (recommendation) {
          setRecommendation({
            ...recommendation,
            upvotes: Math.max(0, recommendation.upvotes - 1)
          });
        }
      } else {
        newUpvotes = [...upvotes, recommendationId];
        // Increase upvote count
        if (recommendation) {
          setRecommendation({
            ...recommendation,
            upvotes: recommendation.upvotes + 1
          });
        }
      }
      
      localStorage.setItem('upvotedRecommendations', JSON.stringify(newUpvotes));
      setHasUpvoted(!hasUpvoted);
    } catch (error) {
      console.warn('Could not save upvote:', error);
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    const title = recommendation?.title || 'Check out this recommendation';
    
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: recommendation?.description || '',
          url
        });
      } catch (error) {
        console.log('Share cancelled or failed');
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(url);
        alert('Link copied to clipboard!');
      } catch (error) {
        console.warn('Could not copy to clipboard');
      }
    }
  };

  const getTrustScoreBadge = (score: number) => {
    if (score >= 9) return { color: 'text-green-600 bg-green-100', label: 'Excelente' };
    if (score >= 7) return { color: 'text-blue-600 bg-blue-100', label: 'Muito Bom' };
    if (score >= 5) return { color: 'text-yellow-600 bg-yellow-100', label: 'Bom' };
    return { color: 'text-gray-600 bg-gray-100', label: 'Regular' };
  };

  const getVerificationBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return { icon: Shield, color: 'text-green-600 bg-green-100', label: 'Verificado' };
      case 'flagged':
        return { icon: Flag, color: 'text-red-600 bg-red-100', label: 'Sinalizado' };
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-4"></div>
            <div className="h-64 bg-gray-200 rounded mb-6"></div>
            <div className="space-y-4">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !recommendation) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            {error || 'Recommendation not found'}
          </h1>
          <p className="text-gray-600 mb-6">
            The recommendation you're looking for doesn't exist or has been removed.
          </p>
          <div className="space-x-4">
            <button
              onClick={() => router.back()}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Go Back
            </button>
            <Link
              href="/discover"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Discover More
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const trustBadge = getTrustScoreBadge(recommendation.trust_score);
  const verificationBadge = getVerificationBadge(recommendation.verification_status);
  const timeAgo = formatDistanceToNow(new Date(recommendation.created_at), { 
    addSuffix: true, 
    locale: ptBR 
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="flex-1">
              <h1 className="text-xl font-semibold text-gray-900">Recommendation</h1>
              <p className="text-sm text-gray-600">
                by {recommendation.author.display_name || recommendation.author.username}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleShare}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Share2 className="w-5 h-5 text-gray-600" />
              </button>
              <button
                onClick={handleBookmark}
                className={`p-2 rounded-lg transition-colors ${
                  isBookmarked 
                    ? 'text-blue-600 bg-blue-50 hover:bg-blue-100' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Bookmark className={`w-5 h-5 ${isBookmarked ? 'fill-current' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              {/* Image */}
              {recommendation.image_url && (
                <div className="aspect-video">
                  <img
                    src={recommendation.image_url}
                    alt={recommendation.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <div className="p-6">
                {/* Title and Trust Score */}
                <div className="mb-4">
                  <div className="flex items-start justify-between mb-2">
                    <h1 className="text-2xl font-bold text-gray-900 flex-1">
                      {recommendation.title}
                    </h1>
                    <div className="flex items-center gap-2 ml-4">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${trustBadge.color}`}>
                        Trust {recommendation.trust_score.toFixed(1)}
                      </span>
                      {verificationBadge && (
                        <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${verificationBadge.color}`}>
                          <verificationBadge.icon className="w-3 h-3" />
                          {verificationBadge.label}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Tags */}
                  {recommendation.tags && recommendation.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {recommendation.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Description */}
                <div className="prose prose-gray max-w-none mb-6">
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {recommendation.description}
                  </p>
                </div>

                {/* Engagement */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-6">
                    <button
                      onClick={handleUpvote}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                        hasUpvoted 
                          ? 'text-red-600 bg-red-50 hover:bg-red-100' 
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <Heart className={`w-5 h-5 ${hasUpvoted ? 'fill-current' : ''}`} />
                      <span className="font-medium">{recommendation.upvotes}</span>
                    </button>
                    
                    <div className="flex items-center gap-2 text-gray-600">
                      <MessageCircle className="w-5 h-5" />
                      <span>{recommendation.comments}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-gray-600">
                      <Bookmark className="w-5 h-5" />
                      <span>{recommendation.saves}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Calendar className="w-4 h-4" />
                    <span>{timeAgo}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Restaurant Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Restaurant</h3>
              
              <div className="space-y-3">
                <h4 className="text-xl font-bold text-gray-900">
                  {recommendation.restaurant.name}
                </h4>
                
                <div className="flex items-start gap-2 text-gray-600">
                  <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{recommendation.restaurant.address}</span>
                </div>
                
                {recommendation.restaurant.category && (
                  <span className="inline-block px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                    {recommendation.restaurant.category}
                  </span>
                )}
                
                {recommendation.distance && (
                  <div className="text-sm text-gray-600">
                    📍 {recommendation.distance.toFixed(1)}km away
                  </div>
                )}
              </div>
              
              <Link
                href={`/restaurants/${recommendation.restaurant.id}`}
                className="mt-4 w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                View Restaurant
                <ExternalLink className="w-4 h-4" />
              </Link>
            </div>

            {/* Author Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Author</h3>
              
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  {recommendation.author.avatar_url ? (
                    <img
                      src={recommendation.author.avatar_url}
                      alt={recommendation.author.display_name || recommendation.author.username}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <User className="w-6 h-6 text-blue-600" />
                  )}
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">
                    {recommendation.author.display_name || recommendation.author.username}
                  </h4>
                  <p className="text-sm text-gray-600">@{recommendation.author.username}</p>
                </div>
              </div>
              
              {recommendation.author.verification_status && (
                <div className="mb-4">
                  <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                    {recommendation.author.verification_status}
                  </span>
                </div>
              )}
              
              <Link
                href={`/users/${recommendation.author.id}`}
                className="w-full border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
              >
                View Profile
                <ExternalLink className="w-4 h-4" />
              </Link>
            </div>

            {/* Token Rewards */}
            {recommendation.token_rewards_earned > 0 && (
              <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-5 h-5 text-yellow-600" />
                  <h3 className="font-semibold text-gray-900">Token Rewards</h3>
                </div>
                <p className="text-2xl font-bold text-yellow-600">
                  {recommendation.token_rewards_earned.toFixed(2)} TOK
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  Earned from this recommendation
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecommendationDetailPage;