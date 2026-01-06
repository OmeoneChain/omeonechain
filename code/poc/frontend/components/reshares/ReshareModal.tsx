'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Repeat2, Send } from 'lucide-react';
import Image from 'next/image';
import toast from 'react-hot-toast';

interface ReshareModalProps {
  isOpen: boolean;
  onClose: () => void;
  recommendation: {
    id: string;
    title: string;
    author: {
      name: string;
      avatar: string;
    };
    location: {
      name: string;
    };
    overall_rating: number;
  };
  onReshare: (recommendationId: string, comment?: string) => Promise<void>;
}

const ReshareModal: React.FC<ReshareModalProps> = ({
  isOpen,
  onClose,
  recommendation,
  onReshare
}) => {
  const t = useTranslations('recommendations.reshare');
  
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onReshare(recommendation.id, comment.trim() || undefined);
      toast.success(t('successWithComment'));
      setComment('');
      onClose();
    } catch (error) {
      console.error('Failed to reshare:', error);
      toast.error(t('failed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/50"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative bg-white rounded-2xl shadow-xl max-w-xl w-full max-h-[80vh] overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Repeat2 size={20} className="text-[#FF644A]" />
              {t('title')}
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X size={20} className="text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4 space-y-4 max-h-[calc(80vh-140px)] overflow-y-auto">
            {/* Commentary Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('addThoughts')}
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={t('placeholder')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#FF644A] focus:border-[#FF644A] transition-all"
                rows={3}
                maxLength={280}
                autoFocus
              />
              <div className="mt-1 text-xs text-gray-500 text-right">
                {t('charCount', { count: comment.length })}
              </div>
            </div>

            {/* Preview of Recommendation */}
            <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
              <div className="flex items-start gap-3">
                {/* Author Avatar */}
                <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                  <Image
                    src={recommendation.author.avatar}
                    alt={recommendation.author.name}
                    width={40}
                    height={40}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-gray-900">
                      {recommendation.author.name}
                    </span>
                  </div>
                  <h4 className="font-semibold text-gray-900 text-sm line-clamp-2">
                    {recommendation.title}
                  </h4>
                  <p className="text-xs text-gray-600 mt-1 line-clamp-1">
                    {recommendation.location.name}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-xs font-medium text-yellow-600">
                      ⭐ {recommendation.overall_rating}/10
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 flex items-center justify-end gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {t('cancel')}
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-4 py-2 bg-[#FF644A] text-white rounded-lg text-sm font-medium hover:bg-[#E5512F] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              <Repeat2 size={16} />
              {isSubmitting ? t('resharing') : t('reshare')}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ReshareModal;