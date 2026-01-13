'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, MessageCircle, MoreHorizontal, Edit2, Trash2, Flag } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Comment } from '@/src/types/comments';
import CommentInput from './CommentInput';

interface CommentItemProps {
  comment: Comment;
  currentUserId?: string;
  currentUser?: {
    avatar?: string;
    display_name?: string;
    username: string;
  };
  depth?: number;
  maxDepth?: number;
  onReply: (parentCommentId: string, content: string) => Promise<void>;
  onEdit: (commentId: string, content: string) => Promise<void>;
  onDelete: (commentId: string) => Promise<void>;
  onLike: (commentId: string) => Promise<void>;
  onReport?: (commentId: string) => void;
}

const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  currentUserId,
  currentUser,
  depth = 0,
  maxDepth = 3,
  onReply,
  onEdit,
  onDelete,
  onLike,
  onReport
}) => {
  const t = useTranslations();
  
  console.log(`🔍 CommentItem received comment ${comment.id}, replies:`, comment.replies?.length || 0, comment.replies);
  const [isReplying, setIsReplying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [showMenu, setShowMenu] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  const isAuthor = currentUserId === comment.user_id;
  const isDeleted = !!comment.deleted_at;
  const canReply = depth < maxDepth;
  
  // Check if comment was edited
  const isEdited = comment.updated_at && comment.updated_at !== comment.created_at;
  
  // Check if edit is still allowed (within 5 minutes)
  const canEdit = isAuthor && !isDeleted && (() => {
    const createdTime = new Date(comment.created_at).getTime();
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;
    return (now - createdTime) < fiveMinutes;
  })();

  const timeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return t('comments.labels.justNow');
    if (diffInSeconds < 3600) return t('comments.labels.minutesAgo', { count: Math.floor(diffInSeconds / 60) });
    if (diffInSeconds < 86400) return t('comments.labels.hoursAgo', { count: Math.floor(diffInSeconds / 3600) });
    if (diffInSeconds < 604800) return t('comments.labels.daysAgo', { count: Math.floor(diffInSeconds / 86400) });
    return t('comments.labels.weeksAgo', { count: Math.floor(diffInSeconds / 604800) });
  };

  const handleReplySubmit = async (content: string) => {
    await onReply(comment.id, content);
    setIsReplying(false);
  };

  const handleEditSubmit = async () => {
    if (!editContent.trim() || editContent === comment.content) {
      setIsEditing(false);
      return;
    }
    
    try {
      await onEdit(comment.id, editContent.trim());
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to edit comment:', error);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`${t('comments.confirm.deleteTitle')}\n${t('comments.confirm.deleteMessage')}`)) return;
    
    setIsDeleting(true);
    try {
      await onDelete(comment.id);
    } catch (error) {
      console.error('Failed to delete comment:', error);
      setIsDeleting(false);
    }
  };

  const handleLike = async () => {
    try {
      await onLike(comment.id);
    } catch (error) {
      console.error('Failed to like comment:', error);
    }
  };

  if (isDeleted) {
    return (
      <div className={`${depth > 0 ? 'comment-reply-indent' : ''} py-3`}>
        <div className="text-sm text-gray-400 dark:text-gray-500 italic bg-gray-50 dark:bg-[#353444] rounded-lg p-3">
          {t('comments.deleted')}
        </div>
        
        {/* Show replies even if parent is deleted */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-2 space-y-2">
            {comment.replies.map((reply) => (
              <CommentItem
                key={reply.id}
                comment={reply}
                currentUserId={currentUserId}
                currentUser={currentUser}
                depth={depth + 1}
                maxDepth={maxDepth}
                onReply={onReply}
                onEdit={onEdit}
                onDelete={onDelete}
                onLike={onLike}
                onReport={onReport}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`${depth > 0 ? 'comment-reply-indent' : ''} animate-slide-in`}>
      <div className="comment-item">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {/* Avatar */}
            <div className="flex-shrink-0">
              <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 dark:bg-[#353444]">
                {comment.author?.avatar && !avatarError ? (
                  <Image
                    src={comment.author.avatar}
                    alt={comment.author.name || comment.author.username || t('comments.fallback.anonymous')}
                    width={32}
                    height={32}
                    className="w-full h-full object-cover"
                    onError={() => setAvatarError(true)}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#FF644A] to-[#E65441] text-white text-sm font-medium">
                    {(comment.author?.name || comment.author?.username || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            </div>
            
            {/* User info */}
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm text-gray-900 dark:text-white truncate">
                  {comment.author?.name || comment.author?.username || t('comments.fallback.anonymous')}
                </span>
                {comment.author?.verificationLevel && comment.author.verificationLevel !== 'basic' && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                    comment.author.verificationLevel === 'expert' 
                      ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                      : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                  }`}>
                    {comment.author.verificationLevel}
                  </span>
                )}
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {timeAgo(comment.created_at)}
                </span>
                {isEdited && (
                  <span className="text-xs text-gray-400 dark:text-gray-500 italic">
                    ({t('comments.labels.edited')})
                  </span>
                )}
              </div>
            </div>
          </div>
          
          {/* Menu */}
          <div className="relative flex-shrink-0">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 hover:bg-gray-100 dark:hover:bg-[#353444] rounded transition-colors"
            >
              <MoreHorizontal size={16} className="text-gray-500 dark:text-gray-400" />
            </button>
            
            <AnimatePresence>
              {showMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute right-0 top-8 bg-white dark:bg-[#2D2C3A] border border-gray-200 dark:border-[#3D3C4A] rounded-lg shadow-lg dark:shadow-[0_4px_20px_rgba(0,0,0,0.4)] py-1 z-10 min-w-[120px]"
                >
                  {canEdit && (
                    <button
                      onClick={() => {
                        setIsEditing(true);
                        setShowMenu(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-[#353444] flex items-center gap-2 text-gray-700 dark:text-gray-300"
                    >
                      <Edit2 size={14} />
                      {t('comments.actions.edit')}
                    </button>
                  )}
                  {isAuthor && (
                    <button
                      onClick={() => {
                        handleDelete();
                        setShowMenu(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-[#353444] flex items-center gap-2 text-red-600 dark:text-red-400"
                    >
                      <Trash2 size={14} />
                      {t('comments.actions.delete')}
                    </button>
                  )}
                  {!isAuthor && (
                    <button
                      onClick={() => {
                        onReport?.(comment.id);
                        setShowMenu(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-[#353444] flex items-center gap-2 text-red-600 dark:text-red-400"
                    >
                      <Flag size={14} />
                      {t('comments.actions.report')}
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
        
        {/* Content */}
        {isEditing ? (
          <div className="mb-3">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-[#3D3C4A] rounded-lg resize-none bg-white dark:bg-[#353444] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FF644A] focus:border-[#FF644A] transition-all"
              rows={3}
              maxLength={1000}
              autoFocus
            />
            <div className="mt-2 flex items-center gap-2 justify-end">
              <button
                onClick={() => {
                  setIsEditing(false);
                  setEditContent(comment.content);
                }}
                className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 font-medium"
              >
                {t('comments.actions.cancel')}
              </button>
              <button
                onClick={handleEditSubmit}
                disabled={!editContent.trim() || editContent === comment.content}
                className="px-4 py-1.5 bg-[#FF644A] text-white rounded-lg text-sm font-medium hover:bg-[#E65441] disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
              >
                {t('comments.actions.save')}
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed mb-3 whitespace-pre-wrap">
            {comment.content}
          </p>
        )}
        
        {/* Actions */}
        <div className="flex items-center gap-4">
          <motion.button
            onClick={handleLike}
            className={`flex items-center gap-1 text-xs font-medium transition-colors ${
              comment.has_liked
                ? 'text-[#FF644A]'
                : 'text-gray-500 dark:text-gray-400 hover:text-[#FF644A]'
            }`}
            whileTap={{ scale: 0.95 }}
          >
            <Heart size={14} fill={comment.has_liked ? 'currentColor' : 'none'} />
            {comment.likes_count || 0}
          </motion.button>
          
          {canReply && (
            <motion.button
              onClick={() => setIsReplying(!isReplying)}
              className="flex items-center gap-1 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-[#FF644A] transition-colors"
              whileTap={{ scale: 0.95 }}
            >
              <MessageCircle size={14} />
              {t('comments.actions.reply')}
            </motion.button>
          )}
        </div>
      </div>
      
      {/* Reply Input */}
      <AnimatePresence>
        {isReplying && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3"
          >
            <CommentInput
              recommendationId={comment.recommendation_id}
              parentCommentId={comment.id}
              placeholder={t('comments.replyPlaceholder')}
              autoFocus
              onSubmit={handleReplySubmit}
              onCancel={() => setIsReplying(false)}
              currentUser={currentUser}
              replyingTo={comment.author?.username}
            />
          </motion.div>
        )}
      </AnimatePresence>
      
      {console.log('🔵 Rendering', comment.replies?.length || 0, 'replies for comment:', comment.id)}

      {/* Nested Replies */}
      {comment.replies && comment.replies.length > 0 && Array.isArray(comment.replies) && (
        <div className="mt-3 space-y-3">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              currentUserId={currentUserId}
              currentUser={currentUser}
              depth={depth + 1}
              maxDepth={maxDepth}
              onReply={onReply}
              onEdit={onEdit}
              onDelete={onDelete}
              onLike={onLike}
              onReport={onReport}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default CommentItem;