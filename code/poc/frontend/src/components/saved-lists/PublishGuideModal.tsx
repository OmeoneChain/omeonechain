// components/saved-lists/PublishGuideModal.tsx
// UPDATED: Dark mode support and BocaBoca brand colors (coral/terracotta instead of blue/purple)
"use client";

import { useState } from 'react';
import { X, Globe, Loader, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';

interface Restaurant {
  id: string | number;
  name: string;
  cuisine?: string;
  location?: string;
}

interface SavedListDetail {
  id: string;
  name: string;
  description?: string;
  notes?: string;
  items: Restaurant[];
}

interface PublishGuideModalProps {
  list: SavedListDetail;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (guideId: string) => void;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://redesigned-lamp-q74wgggqq9jjfxqjp-3001.app.github.dev';

export default function PublishGuideModal({
  list,
  isOpen,
  onClose,
  onSuccess
}: PublishGuideModalProps) {
  const t = useTranslations('savedLists');
  const tCommon = useTranslations('common');
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Guide metadata that can be edited
  const [title, setTitle] = useState(list.name);
  const [description, setDescription] = useState(list.notes || list.description || '');
  const [category, setCategory] = useState('restaurants');
  const [city, setCity] = useState('Brasília');
  const [bestFor, setBestFor] = useState('');
  const [tags, setTags] = useState('');

  const handlePublish = async () => {
    const token = localStorage.getItem('omeone_auth_token');
    if (!token) {
      setError(t('publish.errors.notLoggedIn'));
      return;
    }

    // Validation
    if (!title.trim()) {
      setError(t('publish.validation.titleRequired'));
      return;
    }

    if (list.items.length === 0) {
      setError(t('publish.validation.emptyList'));
      return;
    }

    setIsPublishing(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/lists/from-saved-list`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          listId: list.id,
          title: title.trim(),
          description: description.trim(),
          category,
          city,
          bestFor: bestFor.trim() || null,
          tags: tags.trim() ? tags.split(',').map(t => t.trim()) : [],
          visibility: 'public',
          contentType: 'guide'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || t('publish.errors.publishFailed'));
      }

      const data = await response.json();
      alert(t('publish.success', { title }));
      onSuccess(data.guide.id);
      onClose();
    } catch (err) {
      console.error('Error publishing guide:', err);
      setError(err instanceof Error ? err.message : t('publish.errors.publishFailed'));
    } finally {
      setIsPublishing(false);
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
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative bg-white dark:bg-[#2D2C3A] rounded-xl shadow-2xl dark:shadow-[0_4px_30px_rgba(0,0,0,0.4)] w-full max-w-2xl max-h-[90vh] overflow-hidden"
        >
          {/* Header - BocaBoca coral gradient */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-[#3D3C4A] bg-gradient-to-r from-[#FF644A] to-[#E65441]">
            <div className="flex items-center gap-3">
              <Globe className="text-white" size={24} />
              <h2 className="text-2xl font-bold text-white">{t('publish.title')}</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white"
              aria-label={tCommon('close')}
            >
              <X size={24} />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
            {/* Info Banner - BocaBoca colors */}
            <div className="mb-6 p-4 bg-[#FFF4E1] dark:bg-[#FF644A]/10 border border-[#FFB3AB] dark:border-[#FF644A]/30 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="text-[#FF644A] mt-0.5" size={20} />
                <div className="flex-1">
                  <h3 className="font-medium text-[#1F1E2A] dark:text-white mb-1">
                    {t('publish.infoBanner.title')}
                  </h3>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    {t('publish.infoBanner.description')}
                  </p>
                </div>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-lg text-red-700 dark:text-red-400 text-sm">
                {error}
              </div>
            )}

            <div className="space-y-5">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-[#1F1E2A] dark:text-white mb-2">
                  {t('publish.fields.title.label')} <span className="text-[#E65441]">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2 bg-white dark:bg-[#353444] border border-gray-300 dark:border-[#3D3C4A] rounded-lg text-[#1F1E2A] dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-[#FF644A]/20 focus:border-[#FF644A] transition-all"
                  placeholder={t('publish.fields.title.placeholder')}
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-[#1F1E2A] dark:text-white mb-2">
                  {t('publish.fields.description.label')} <span className="text-[#E65441]">*</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-2 bg-white dark:bg-[#353444] border border-gray-300 dark:border-[#3D3C4A] rounded-lg text-[#1F1E2A] dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-[#FF644A]/20 focus:border-[#FF644A] transition-all resize-none"
                  rows={4}
                  placeholder={t('publish.fields.description.placeholder')}
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {list.notes 
                    ? t('publish.fields.description.hintPrefilled') 
                    : t('publish.fields.description.hintEmpty')
                  }
                </p>
              </div>

              {/* Category & City */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#1F1E2A] dark:text-white mb-2">
                    {t('publish.fields.category.label')}
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-4 py-2 bg-white dark:bg-[#353444] border border-gray-300 dark:border-[#3D3C4A] rounded-lg text-[#1F1E2A] dark:text-white focus:ring-2 focus:ring-[#FF644A]/20 focus:border-[#FF644A] transition-all"
                  >
                    <option value="restaurants">{t('publish.fields.category.options.restaurants')}</option>
                    <option value="cafes">{t('publish.fields.category.options.cafes')}</option>
                    <option value="bars">{t('publish.fields.category.options.bars')}</option>
                    <option value="quick_bites">{t('publish.fields.category.options.quickBites')}</option>
                    <option value="fine_dining">{t('publish.fields.category.options.fineDining')}</option>
                    <option value="local_favorites">{t('publish.fields.category.options.localFavorites')}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#1F1E2A] dark:text-white mb-2">
                    {t('publish.fields.city.label')}
                  </label>
                  <select
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-4 py-2 bg-white dark:bg-[#353444] border border-gray-300 dark:border-[#3D3C4A] rounded-lg text-[#1F1E2A] dark:text-white focus:ring-2 focus:ring-[#FF644A]/20 focus:border-[#FF644A] transition-all"
                  >
                    <option value="Brasília">Brasília</option>
                    <option value="São Paulo">São Paulo</option>
                    <option value="Rio de Janeiro">Rio de Janeiro</option>
                    <option value="Lisbon">Lisbon</option>
                  </select>
                </div>
              </div>

              {/* Best For */}
              <div>
                <label className="block text-sm font-medium text-[#1F1E2A] dark:text-white mb-2">
                  {t('publish.fields.bestFor.label')}
                </label>
                <input
                  type="text"
                  value={bestFor}
                  onChange={(e) => setBestFor(e.target.value)}
                  className="w-full px-4 py-2 bg-white dark:bg-[#353444] border border-gray-300 dark:border-[#3D3C4A] rounded-lg text-[#1F1E2A] dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-[#FF644A]/20 focus:border-[#FF644A] transition-all"
                  placeholder={t('publish.fields.bestFor.placeholder')}
                />
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-[#1F1E2A] dark:text-white mb-2">
                  {t('publish.fields.tags.label')}
                </label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  className="w-full px-4 py-2 bg-white dark:bg-[#353444] border border-gray-300 dark:border-[#3D3C4A] rounded-lg text-[#1F1E2A] dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-[#FF644A]/20 focus:border-[#FF644A] transition-all"
                  placeholder={t('publish.fields.tags.placeholder')}
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {t('publish.fields.tags.hint')}
                </p>
              </div>

              {/* Preview */}
              <div className="border-t border-gray-200 dark:border-[#3D3C4A] pt-5">
                <h3 className="text-sm font-medium text-[#1F1E2A] dark:text-white mb-3">
                  {t('publish.preview.title')}
                </h3>
                <div className="bg-gray-50 dark:bg-[#353444] rounded-lg p-4 space-y-3">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('publish.preview.restaurantsIncluded')}</p>
                    <p className="font-medium text-[#1F1E2A] dark:text-white">
                      {t('publish.preview.restaurantCount', { count: list.items.length })}
                    </p>
                  </div>
                  {list.items.length > 0 && (
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                      {list.items.slice(0, 3).map((item, idx) => (
                        <div key={item.id} className="flex items-center gap-2 mb-1">
                          <span className="text-gray-400 dark:text-gray-500">{idx + 1}.</span>
                          <span>{item.name}</span>
                          {item.cuisine && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">• {item.cuisine}</span>
                          )}
                        </div>
                      ))}
                      {list.items.length > 3 && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                          {t('publish.preview.moreRestaurants', { count: list.items.length - 3 })}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-[#3D3C4A] bg-gray-50 dark:bg-[#353444]/50">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('publish.footerNote')}
            </p>

            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                disabled={isPublishing}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#404050] rounded-lg transition-colors disabled:opacity-50"
              >
                {tCommon('cancel')}
              </button>
              <button
                onClick={handlePublish}
                disabled={isPublishing || !title.trim()}
                className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-[#FF644A] to-[#E65441] text-white rounded-lg hover:from-[#E65441] hover:to-[#D54332] disabled:opacity-50 transition-all shadow-sm hover:shadow-md"
              >
                {isPublishing ? (
                  <>
                    <Loader className="animate-spin" size={18} />
                    {t('publish.actions.publishing')}
                  </>
                ) : (
                  <>
                    <Globe size={18} />
                    {t('publish.actions.publish')}
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}