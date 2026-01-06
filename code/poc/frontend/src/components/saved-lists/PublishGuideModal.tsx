// components/saved-lists/PublishGuideModal.tsx
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
  const t = useTranslations();
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
    // FIXED: Use the correct localStorage key for token
    const token = localStorage.getItem('omeone_auth_token');
    if (!token) {
      setError(t('savedLists.publish.errors.notLoggedIn'));
      return;
    }

    // Validation
    if (!title.trim()) {
      setError(t('savedLists.publish.validation.titleRequired'));
      return;
    }

    if (list.items.length === 0) {
      setError(t('savedLists.publish.validation.emptyList'));
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
        throw new Error(errorData.error || t('savedLists.publish.errors.publishFailed'));
      }

      const data = await response.json();
      alert(t('savedLists.publish.success', { title }));
      onSuccess(data.guide.id); // This will trigger parent to refresh
      onClose();
      onClose();
    } catch (err) {
      console.error('Error publishing guide:', err);
      setError(err instanceof Error ? err.message : t('savedLists.publish.errors.publishFailed'));
    } finally {
      setIsPublishing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-500 to-purple-500">
            <div className="flex items-center gap-3">
              <Globe className="text-white" size={24} />
              <h2 className="text-2xl font-bold text-white">{t('savedLists.publish.title')}</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white"
              aria-label={t('common.close')}
            >
              <X size={24} />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
            {/* Info Banner */}
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="text-blue-600 mt-0.5" size={20} />
                <div className="flex-1">
                  <h3 className="font-medium text-blue-900 mb-1">
                    {t('savedLists.publish.infoBanner.title')}
                  </h3>
                  <p className="text-sm text-blue-700">
                    {t('savedLists.publish.infoBanner.description')}
                  </p>
                </div>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            <div className="space-y-5">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('savedLists.publish.fields.title.label')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={t('savedLists.publish.fields.title.placeholder')}
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('savedLists.publish.fields.description.label')} <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={4}
                  placeholder={t('savedLists.publish.fields.description.placeholder')}
                />
                <p className="mt-1 text-xs text-gray-500">
                  {list.notes 
                    ? t('savedLists.publish.fields.description.hintPrefilled') 
                    : t('savedLists.publish.fields.description.hintEmpty')
                  }
                </p>
              </div>

              {/* Category & City */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('savedLists.publish.fields.category.label')}
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="restaurants">{t('savedLists.publish.fields.category.options.restaurants')}</option>
                    <option value="cafes">{t('savedLists.publish.fields.category.options.cafes')}</option>
                    <option value="bars">{t('savedLists.publish.fields.category.options.bars')}</option>
                    <option value="quick_bites">{t('savedLists.publish.fields.category.options.quickBites')}</option>
                    <option value="fine_dining">{t('savedLists.publish.fields.category.options.fineDining')}</option>
                    <option value="local_favorites">{t('savedLists.publish.fields.category.options.localFavorites')}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('savedLists.publish.fields.city.label')}
                  </label>
                  <select
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('savedLists.publish.fields.bestFor.label')}
                </label>
                <input
                  type="text"
                  value={bestFor}
                  onChange={(e) => setBestFor(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={t('savedLists.publish.fields.bestFor.placeholder')}
                />
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('savedLists.publish.fields.tags.label')}
                </label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={t('savedLists.publish.fields.tags.placeholder')}
                />
                <p className="mt-1 text-xs text-gray-500">
                  {t('savedLists.publish.fields.tags.hint')}
                </p>
              </div>

              {/* Preview */}
              <div className="border-t pt-5">
                <h3 className="text-sm font-medium text-gray-700 mb-3">
                  {t('savedLists.publish.preview.title')}
                </h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">{t('savedLists.publish.preview.restaurantsIncluded')}</p>
                    <p className="font-medium text-gray-900">
                      {t('savedLists.publish.preview.restaurantCount', { count: list.items.length })}
                    </p>
                  </div>
                  {list.items.length > 0 && (
                    <div className="text-sm text-gray-600">
                      {list.items.slice(0, 3).map((item, idx) => (
                        <div key={item.id} className="flex items-center gap-2 mb-1">
                          <span className="text-gray-400">{idx + 1}.</span>
                          <span>{item.name}</span>
                          {item.cuisine && (
                            <span className="text-xs text-gray-500">• {item.cuisine}</span>
                          )}
                        </div>
                      ))}
                      {list.items.length > 3 && (
                        <p className="text-xs text-gray-500 mt-2">
                          {t('savedLists.publish.preview.moreRestaurants', { count: list.items.length - 3 })}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
            <p className="text-sm text-gray-600">
              {t('savedLists.publish.footerNote')}
            </p>

            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                disabled={isPublishing}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handlePublish}
                disabled={isPublishing || !title.trim()}
                className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 transition-all"
              >
                {isPublishing ? (
                  <>
                    <Loader className="animate-spin" size={18} />
                    {t('savedLists.publish.actions.publishing')}
                  </>
                ) : (
                  <>
                    <Globe size={18} />
                    {t('savedLists.publish.actions.publish')}
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