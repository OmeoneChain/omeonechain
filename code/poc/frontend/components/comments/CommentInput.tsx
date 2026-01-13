'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Send, X } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

interface CommentInputProps {
  recommendationId?: string;
  parentCommentId?: string;
  placeholder?: string;
  autoFocus?: boolean;
  onSubmit: (content: string) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  currentUser?: {
    avatar?: string;
    display_name?: string;
    username: string;
  };
  replyingTo?: string; // Username being replied to
}

const CommentInput: React.FC<CommentInputProps> = ({
  recommendationId,
  parentCommentId,
  placeholder,
  autoFocus = false,
  onSubmit,
  onCancel,
  isLoading = false,
  currentUser,
  replyingTo
}) => {
  const t = useTranslations();
  
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [charCount, setCharCount] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const maxChars = 1000;

  // Use provided placeholder or default from translations
  const inputPlaceholder = placeholder || t('comments.placeholder');

  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [content]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    if (newContent.length <= maxChars) {
      setContent(newContent);
      setCharCount(newContent.length);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim() || isSubmitting) return;
    
    setIsSubmitting(true);
    
    try {
      await onSubmit(content.trim());
      setContent('');
      setCharCount(0);
      
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch (error) {
      console.error('Failed to submit comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Ctrl/Cmd + Enter
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      handleSubmit(e);
    }
  };

  const handleCancel = () => {
    setContent('');
    setCharCount(0);
    onCancel?.();
  };

  const isReply = !!parentCommentId;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-3 ${isReply ? 'ml-8 pl-4 border-l-2 border-gray-200 dark:border-[#3D3C4A]' : ''}`}
    >
      {/* User Avatar */}
      {currentUser && (
        <div className="flex-shrink-0">
          <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 dark:bg-[#353444]">
            {currentUser.avatar ? (
              <Image
                src={currentUser.avatar}
                alt={currentUser.display_name || currentUser.username}
                width={32}
                height={32}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#FF644A] to-[#E65441] text-white text-sm font-medium">
                {(currentUser.display_name || currentUser.username).charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="flex-1">
        <div className="relative">
          {/* Reply indicator */}
          {replyingTo && (
            <div className="mb-2 text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
              <span>
                {t('comments.labels.replyingTo', { name: '' })}
                <span className="font-medium text-[#FF644A]">@{replyingTo}</span>
              </span>
              {onCancel && (
                <button
                  type="button"
                  onClick={handleCancel}
                  className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          )}
          
          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={inputPlaceholder}
            rows={1}
            className="w-full px-4 py-3 bg-white dark:bg-[#353444] border border-gray-200 dark:border-[#4D4C5A] rounded-lg resize-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#FF644A] focus:border-[#FF644A] transition-all"
            disabled={isSubmitting || isLoading}
          />
          
          {/* Character count and submit */}
          <div className="mt-2 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className={`text-xs ${charCount > maxChars * 0.9 ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`}>
                {charCount}/{maxChars}
              </span>
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {t('comments.hint.submitShortcut')}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              {isReply && onCancel && (
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 font-medium transition-colors"
                  disabled={isSubmitting}
                >
                  {t('comments.actions.cancel')}
                </button>
              )}
              
              <motion.button
                type="submit"
                disabled={!content.trim() || isSubmitting || isLoading}
                className={`px-4 py-1.5 rounded-lg font-medium text-sm flex items-center gap-2 transition-all ${
                  content.trim() && !isSubmitting && !isLoading
                    ? 'bg-[#FF644A] text-white hover:bg-[#E65441]'
                    : 'bg-gray-200 dark:bg-[#4D4C5A] text-gray-400 dark:text-gray-500 cursor-not-allowed'
                }`}
                whileTap={content.trim() && !isSubmitting && !isLoading ? { scale: 0.95 } : {}}
              >
                {isSubmitting || isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    <span>{t('comments.actions.posting')}</span>
                  </>
                ) : (
                  <>
                    <Send size={14} />
                    <span>{isReply ? t('comments.actions.reply') : t('comments.actions.comment')}</span>
                  </>
                )}
              </motion.button>
            </div>
          </div>
        </div>
      </form>
    </motion.div>
  );
};

export default CommentInput;