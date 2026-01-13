'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Comment } from '@/src/types/comments';
import CommentItem from './CommentItem';

interface CommentListProps {
  comments: Comment[];
  isRecommendationAuthor?: boolean;
  currentUserId?: string;
  currentUser?: {
    avatar?: string;
    display_name?: string;
    username: string;
  };
  onReply: (parentCommentId: string, content: string) => Promise<void>;
  onEdit: (commentId: string, content: string) => Promise<void>;
  onDelete: (commentId: string) => Promise<void>;
  onLike: (commentId: string) => Promise<void>;
  onReport?: (commentId: string) => void;
  onMarkHelpful?: (commentId: string) => Promise<void>;
  onAuthorClick?: (authorId: string) => void;
  isLoading?: boolean;
}

type SortOption = 'newest' | 'oldest' | 'most_liked';

const CommentList: React.FC<CommentListProps> = ({
  comments,
  currentUserId,
  currentUser,
  isRecommendationAuthor,
  onMarkHelpful,
  onReply,
  onEdit,
  onDelete,
  onLike,
  onReport,
  onAuthorClick,
  isLoading = false
}) => {
  const t = useTranslations();
  const [sortBy, setSortBy] = useState<SortOption>('newest');

  // Preserve the nested tree structure that backend already created
  // Backend buildCommentTree() already nests replies properly
  const preserveCommentTree = (comments: Comment[]): Comment[] => {
    return comments.map(comment => ({
      ...comment,
      replies: comment.replies || []
    }));
  };

  // Sort comments
  const sortComments = (comments: Comment[]): Comment[] => {
    const sorted = [...comments];
    
    switch (sortBy) {
      case 'newest':
        sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case 'oldest':
        sorted.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
      case 'most_liked':
        sorted.sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0));
        break;
    }

    // Recursively sort replies
    sorted.forEach(comment => {
      if (comment.replies && comment.replies.length > 0) {
        comment.replies = sortComments(comment.replies);
      }
    });

    return sorted;
  };

  const commentTree = preserveCommentTree(comments);
  const sortedComments = sortComments(commentTree);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="animate-pulse">
            <div className="flex gap-3">
              <div className="w-8 h-8 bg-gray-200 dark:bg-[#353444] rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 dark:bg-[#353444] rounded w-32" />
                <div className="h-16 bg-gray-200 dark:bg-[#353444] rounded" />
                <div className="flex gap-4">
                  <div className="h-6 bg-gray-200 dark:bg-[#353444] rounded w-16" />
                  <div className="h-6 bg-gray-200 dark:bg-[#353444] rounded w-16" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (comments.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-gray-100 dark:bg-[#353444] rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
        <p className="text-gray-500 dark:text-gray-400 text-sm">{t('comments.empty.title')}</p>
        <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">{t('comments.empty.description')}</p>
      </div>
    );
  }

  return (
    <div>
      {/* Sort Controls */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200 dark:border-[#3D3C4A]">
        <h3 className="font-semibold text-gray-900 dark:text-white">
          {t('comments.count', { count: comments.length })}
        </h3>
        
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 dark:text-gray-400">{t('comments.sort.label')}</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="text-sm border border-gray-300 dark:border-[#4D4C5A] rounded-lg px-3 py-1.5 bg-white dark:bg-[#353444] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FF644A] focus:border-[#FF644A] transition-all"
          >
            <option value="newest">{t('comments.sort.newest')}</option>
            <option value="oldest">{t('comments.sort.oldest')}</option>
            <option value="most_liked">{t('comments.sort.mostLiked')}</option>
          </select>
        </div>
      </div>

      {/* Comments */}
      <div className="space-y-4">
        {sortedComments.map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            currentUserId={currentUserId}
            currentUser={currentUser}
            onReply={onReply}
            onEdit={onEdit}
            onDelete={onDelete}
            onLike={onLike}
            onReport={onReport}
          />
        ))}
      </div>
    </div>
  );
};

export default CommentList;