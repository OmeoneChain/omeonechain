'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { Comment } from '@/src/types/comments';
import CommentInput from './CommentInput';
import CommentList from './CommentList';
import toast from 'react-hot-toast';
import tokenBalanceService from '@/src/services/TokenBalanceService';

interface CommentSectionProps {
  recommendationId: string;
  initialCommentCount?: number;
  onCommentCountChange?: (count: number) => void;
  onAuthorClick?: (authorId: string) => void;
  collapsedByDefault?: boolean;
  backendUrl?: string;
}

const CommentSection: React.FC<CommentSectionProps> = ({
  recommendationId,
  initialCommentCount = 0,
  onCommentCountChange,
  onAuthorClick,
  collapsedByDefault = false,
  backendUrl = 'https://redesigned-lamp-q74wgggqq9jjfxqjp-3001.app.github.dev'
}) => {
  const t = useTranslations();
  
  const [comments, setComments] = useState<Comment[]>([]);
  const [isExpanded, setIsExpanded] = useState(!collapsedByDefault);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasLoadedComments, setHasLoadedComments] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>();

  // Get current user ID from JWT token
  useEffect(() => {
    const token = localStorage.getItem('omeone_auth_token');
    if (token) {
      try {
        // Decode JWT token to extract user ID
        const payload = JSON.parse(atob(token.split('.')[1]));
        setCurrentUserId(payload.userId || payload.user_id || payload.sub);
      } catch (error) {
        console.error('Failed to decode token:', error);
      }
    }
  }, []);

  // Fetch comments when expanded
  const fetchComments = useCallback(async () => {
    if (hasLoadedComments) return;
    
    setIsLoading(true);
    try {
      const token = localStorage.getItem('omeone_auth_token');
      const response = await fetch(
        `${backendUrl}/api/recommendations/${recommendationId}/comments`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch comments');
      }

      const data = await response.json();
      
      // Explicitly preserve nested replies structure
      const commentsWithReplies = data.comments?.map((comment: any) => ({
        ...comment,
        replies: comment.replies || []
      }));

      console.log('📦 Comments with replies preserved:', commentsWithReplies);
      console.log('📦 First comment with replies check:', commentsWithReplies?.find((c: any) => c.replies?.length > 0));

      setComments(commentsWithReplies || []);
      setHasLoadedComments(true);
      
      // Update parent component with actual count
      if (onCommentCountChange && data.comments) {
        onCommentCountChange(data.comments.length);
      }
    } catch (error) {
      console.error('Failed to fetch comments:', error);
      toast.error(t('comments.errors.loadFailed'));
    } finally {
      setIsLoading(false);
    }
  }, [recommendationId, backendUrl, hasLoadedComments, onCommentCountChange, t]);

  useEffect(() => {
    if (isExpanded && !hasLoadedComments) {
      fetchComments();
    }
  }, [isExpanded, hasLoadedComments, fetchComments]);

  // Clear any stale cache on mount
  useEffect(() => {
    if (currentUserId) {
      tokenBalanceService.forceRefreshBalance(currentUserId);
    }
  }, [currentUserId]);

  // Create new comment
  const handleCreateComment = async (content: string) => {
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('omeone_auth_token');
      const response = await fetch(
        `${backendUrl}/api/recommendations/${recommendationId}/comments`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ content })
        }
      );

      if (!response.ok) {
        throw new Error('Failed to create comment');
      }

      const data = await response.json();
      
      // Ensure new comment has replies array
      const newComment = {
        ...data.comment,
        replies: data.comment.replies || []
      };
      
      // Optimistically add comment to list
      setComments(prev => [newComment, ...prev]);
      
      // Update comment count
      if (onCommentCountChange) {
        onCommentCountChange(comments.length + 1);
      }

      // Get tokens earned from response (fallback to 0.5 BOCA - 10x update)
      const tokensEarned = data.tokens_earned || 0.5;
      console.log('💰 Tokens earned from comment:', tokensEarned);

      // Optimistic update: Header updates IMMEDIATELY
      if (currentUserId) {
        console.log('🚀 Optimistic balance update - header will update instantly');
        await tokenBalanceService.optimisticUpdate(currentUserId, tokensEarned);
      }

      // Success toast with token amount
      toast.success(
        t('comments.toast.commentCreated', { amount: tokensEarned.toFixed(2) }),
        { 
          duration: 5000,
          icon: '💰'
        }
      );
    } catch (error) {
      console.error('Failed to create comment:', error);
      toast.error(t('comments.errors.createFailed'));
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reply to comment
  const handleReply = async (commentId: string, content: string) => {
    try {
      const token = localStorage.getItem('omeone_auth_token');
      const response = await fetch(
        `${backendUrl}/api/comments/${commentId}/reply`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ content })
        }
      );

      if (!response.ok) {
        throw new Error('Failed to reply to comment');
      }

      const data = await response.json();
      
      // Ensure reply has replies array
      const newReply = {
        ...data.comment,
        replies: data.comment.replies || []
      };
      
      // Update comments tree with new reply, preserving existing structure
      setComments(prev => updateCommentTree(prev, commentId, newReply));
      
      // Update comment count
      if (onCommentCountChange) {
        onCommentCountChange(comments.length + 1);
      }

      // Get tokens earned from response (fallback to 0.5 BOCA - 10x update)
      const tokensEarned = data.tokens_earned || 0.5;
      console.log('💰 Tokens earned from reply:', tokensEarned);

      // Optimistic update: Header updates IMMEDIATELY
      if (currentUserId) {
        console.log('🚀 Optimistic balance update - header will update instantly');
        await tokenBalanceService.optimisticUpdate(currentUserId, tokensEarned);
      }

      // Success toast with token amount
      toast.success(
        t('comments.toast.replyCreated', { amount: tokensEarned.toFixed(2) }),
        { 
          duration: 5000,
          icon: '💰'
        }
      );
    } catch (error) {
      console.error('Failed to reply:', error);
      toast.error(t('comments.errors.replyFailed'));
      throw error;
    }
  };

  // Edit comment
  const handleEdit = async (commentId: string, content: string) => {
    try {
      const token = localStorage.getItem('omeone_auth_token');
      const response = await fetch(
        `${backendUrl}/api/comments/${commentId}`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ content })
        }
      );

      if (!response.ok) {
        throw new Error('Failed to edit comment');
      }

      const data = await response.json();
      
      // Update comment in tree
      setComments(prev => updateCommentInTree(prev, commentId, data.comment));
      
      toast.success(t('comments.toast.commentEdited'));
    } catch (error) {
      console.error('Failed to edit:', error);
      toast.error(t('comments.errors.editFailed'));
      throw error;
    }
  };

  // Delete comment
  const handleDelete = async (commentId: string) => {
    try {
      const token = localStorage.getItem('omeone_auth_token');
      const response = await fetch(
        `${backendUrl}/api/comments/${commentId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to delete comment');
      }
      
      // Soft delete - mark as deleted in tree
      setComments(prev => markCommentAsDeleted(prev, commentId));
      
      // Update comment count (don't decrement if it has replies)
      const comment = findCommentInTree(comments, commentId);
      if (comment && (!comment.replies || comment.replies.length === 0)) {
        if (onCommentCountChange) {
          onCommentCountChange(Math.max(0, comments.length - 1));
        }
      }
      
      toast.success(t('comments.toast.commentDeleted'));
    } catch (error) {
      console.error('Failed to delete:', error);
      toast.error(t('comments.errors.deleteFailed'));
      throw error;
    }
  };

  // Like/unlike comment
  const handleLike = async (commentId: string) => {
    try {
      const token = localStorage.getItem('omeone_auth_token');
      const comment = findCommentInTree(comments, commentId);
      
      if (!comment) return;
      
      const method = comment.has_liked ? 'DELETE' : 'POST';
      const response = await fetch(
        `${backendUrl}/api/comments/${commentId}/like`,
        {
          method,
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to like comment');
      }
      
      // Optimistically update like state
      setComments(prev => toggleCommentLike(prev, commentId));
    } catch (error) {
      console.error('Failed to like:', error);
      // Revert optimistic update
      setComments(prev => toggleCommentLike(prev, commentId));
    }
  };

  // Report comment
  const handleReport = (commentId: string) => {
    // TODO: Implement report functionality
    toast.success(t('comments.toast.reportSent'));
  };

  // Helper functions
  const updateCommentTree = (comments: Comment[], parentId: string, newReply: Comment): Comment[] => {
    return comments.map(comment => {
      if (comment.id === parentId) {
        return {
          ...comment,
          replies: [...(comment.replies || []), newReply],
          replies_count: (comment.replies_count || 0) + 1
        };
      }
      if (comment.replies && comment.replies.length > 0) {
        return {
          ...comment,
          replies: updateCommentTree(comment.replies, parentId, newReply)
        };
      }
      return comment;
    });
  };

  const updateCommentInTree = (comments: Comment[], commentId: string, updatedComment: Comment): Comment[] => {
    return comments.map(comment => {
      if (comment.id === commentId) {
        return { ...comment, ...updatedComment };
      }
      if (comment.replies && comment.replies.length > 0) {
        return {
          ...comment,
          replies: updateCommentInTree(comment.replies, commentId, updatedComment)
        };
      }
      return comment;
    });
  };

  const markCommentAsDeleted = (comments: Comment[], commentId: string): Comment[] => {
    return comments.map(comment => {
      if (comment.id === commentId) {
        return { ...comment, deleted_at: new Date().toISOString(), content: t('comments.deleted') };
      }
      if (comment.replies && comment.replies.length > 0) {
        return {
          ...comment,
          replies: markCommentAsDeleted(comment.replies, commentId)
        };
      }
      return comment;
    });
  };

  const toggleCommentLike = (comments: Comment[], commentId: string): Comment[] => {
    return comments.map(comment => {
      if (comment.id === commentId) {
        return {
          ...comment,
          has_liked: !comment.has_liked,
          likes_count: comment.has_liked ? comment.likes_count - 1 : comment.likes_count + 1
        };
      }
      if (comment.replies && comment.replies.length > 0) {
        return {
          ...comment,
          replies: toggleCommentLike(comment.replies, commentId)
        };
      }
      return comment;
    });
  };

  const findCommentInTree = (comments: Comment[], commentId: string): Comment | null => {
    for (const comment of comments) {
      if (comment.id === commentId) return comment;
      if (comment.replies && comment.replies.length > 0) {
        const found = findCommentInTree(comment.replies, commentId);
        if (found) return found;
      }
    }
    return null;
  };

  const totalComments = hasLoadedComments ? comments.length : initialCommentCount;

  return (
    <div className="border-t border-gray-200 dark:border-[#3D3C4A] pt-4">
      {/* Toggle button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:text-[#FF644A] dark:hover:text-[#FF644A] transition-colors mb-4 font-medium"
      >
        <MessageCircle className="w-5 h-5" />
        <span>
          {t('comments.count', { count: totalComments })}
        </span>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4" />
        ) : (
          <ChevronDown className="w-4 h-4" />
        )}
      </button>

      {/* Expanded comment section */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            {/* New comment input */}
            <CommentInput
              onSubmit={handleCreateComment}
              placeholder={t('comments.placeholder')}
              isLoading={isSubmitting}
            />

            {/* Comments list */}
            <CommentList
              comments={comments}
              currentUserId={currentUserId}
              onReply={handleReply}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onLike={handleLike}
              onReport={handleReport}
              onAuthorClick={onAuthorClick}
              isLoading={isLoading}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CommentSection;