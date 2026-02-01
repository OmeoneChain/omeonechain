// app/[locale]/saved-lists/page.tsx
// V7: Simplified — no tabs, no view toggle, redirect after create
// - Single flat list of all saved lists
// - Clean "My Lists" header
// - After creating a list, redirects to detail page so user can start adding restaurants
// - Dark mode + i18n
//
// =============================================================================
// DARK MODE PATTERNS:
// Page background:      bg-[#FFF4E1] dark:bg-[#1F1E2A]
// Card/Surface:         bg-white dark:bg-[#2D2C3A]
// Primary text:         text-[#1F1E2A] dark:text-gray-100
// Secondary text:       text-gray-600 dark:text-gray-400
// Borders:              border-gray-200 dark:border-[#3D3C4A]
// =============================================================================

"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { Plus, FolderHeart } from 'lucide-react';
import SavedListCard from '@/components/saved-lists/SavedListCard';
import CleanHeader from '@/components/CleanHeader';
import savedListsService, { SavedList } from '@/lib/services/saved-lists-service';

// Extended type that includes items for preview
interface SavedListWithItems extends SavedList {
  items?: Array<{
    id: string | number;
    name: string;
    image?: string;
    cuisine?: string;
    location?: string;
  }>;
  restaurant_count?: number;
}

export default function SavedListsPage() {
  const router = useRouter();
  const t = useTranslations('savedLists');
  const [lists, setLists] = useState<SavedListWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListDescription, setNewListDescription] = useState('');
  const [creating, setCreating] = useState(false);

  // Fetch all lists
  useEffect(() => {
    const fetchLists = async () => {
      try {
        setError(null);
        const data = await savedListsService.getUserLists();
        setLists(data as SavedListWithItems[]);
      } catch (err) {
        console.error('Failed to fetch lists:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch lists');
      } finally {
        setLoading(false);
      }
    };

    fetchLists();
  }, []);

  // Handlers
  const handleDelete = async (listId: string) => {
    try {
      await savedListsService.deleteList(listId);
      setLists(lists.filter(l => l.id !== listId));
    } catch (err) {
      console.error('Failed to delete list:', err);
      alert(err instanceof Error ? err.message : 'Failed to delete list');
    }
  };

  const handleShare = (list: SavedListWithItems) => {
    if (navigator.share) {
      navigator.share({
        title: list.name,
        text: list.description || `Check out my list: ${list.name}`,
        url: `${window.location.origin}/saved-lists/${list.id}`,
      });
    } else {
      navigator.clipboard.writeText(`${window.location.origin}/saved-lists/${list.id}`);
      alert(t('linkCopied'));
    }
  };

  const handleCreateList = async () => {
    if (!newListName.trim()) return;

    setCreating(true);
    try {
      const newList = await savedListsService.createList({
        name: newListName.trim(),
        description: newListDescription.trim() || undefined,
        listType: 'places',
      });

      // Close modal and clear form
      setShowCreateModal(false);
      setNewListName('');
      setNewListDescription('');

      // Redirect to the new list's detail page so user can start adding restaurants
      router.push(`/saved-lists/${newList.id}`);
    } catch (err) {
      console.error('Failed to create list:', err);
      alert(err instanceof Error ? err.message : 'Failed to create list');
    } finally {
      setCreating(false);
    }
  };

  // Translation helpers for the modal
  const modal = {
    title: t('modal.title.create'),
    nameRequired: t('modal.fields.nameRequired'),
    namePlaceholder: t('modal.fields.namePlaceholder'),
    descriptionLabel: t('modal.fields.descriptionLabel'),
    descriptionPlaceholder: t('modal.fields.descriptionPlaceholder'),
    cancel: t('modal.actions.cancel'),
    create: t('modal.actions.create'),
    creating: t('modal.actions.creating'),
  };

  return (
    <>
      <CleanHeader />
      <div className="min-h-screen bg-[#FFF4E1] dark:bg-[#1F1E2A]">
        <div className="max-w-2xl mx-auto px-4 py-4 sm:py-6">

          {/* Header — tight on mobile */}
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-[#1F1E2A] dark:text-gray-100">
                {t('pageTitle')}
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                {t('pageDescription')}
              </p>
            </div>

            {/* Only show top-right button when lists exist */}
            {lists.length > 0 && !loading && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-[#FF644A] hover:bg-[#E65441] text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
              >
                <Plus size={16} />
                <span className="hidden sm:inline">{t('createNewList')}</span>
              </button>
            )}
          </div>

          {/* Error State */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-lg text-red-700 dark:text-red-400">
              <p className="font-medium">{t('error.title')}</p>
              <p className="text-sm mt-1">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-2 text-sm underline hover:no-underline"
              >
                {t('error.tryAgain')}
              </button>
            </div>
          )}

          {/* Content */}
          {loading ? (
            // Loading skeleton — simple cards
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="bg-white dark:bg-[#2D2C3A] rounded-xl border border-gray-200 dark:border-[#3D3C4A] p-4 animate-pulse"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : lists.length === 0 ? (
            // Empty state — single, inviting CTA
            <motion.div
              className="text-center py-20"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="w-20 h-20 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-[#FFB3AB] to-[#FF644A] flex items-center justify-center shadow-lg">
                <FolderHeart size={36} className="text-white" />
              </div>
              <h3 className="text-xl font-semibold text-[#1F1E2A] dark:text-gray-100 mb-2">
                {t('empty.all')}
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-sm mx-auto text-sm leading-relaxed">
                {t('empty.description')}
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#FF644A] hover:bg-[#E65441] text-white font-medium rounded-xl transition-colors shadow-md hover:shadow-lg"
              >
                <Plus size={18} />
                {t('createFirstList')}
              </button>
            </motion.div>
          ) : (
            // Lists — single column, compact cards
            <motion.div className="space-y-3" layout>
              <AnimatePresence mode="popLayout">
                {lists.map((list) => (
                  <SavedListCard
                    key={list.id}
                    list={{
                      id: list.id,
                      name: list.name,
                      description: list.description,
                      icon: list.icon,
                      listType: list.listType,
                      isPublic: list.isPublic,
                      createdAt: list.createdAt,
                      updatedAt: list.updatedAt,
                      itemCount: list.itemCount,
                      restaurant_count: list.restaurant_count,
                      items: list.items,
                    }}
                    onDelete={handleDelete}
                    onShare={handleShare}
                  />
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </div>

        {/* Create List Modal — simple name + description, then redirect */}
        {showCreateModal && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget && !creating) {
                setShowCreateModal(false);
                setNewListName('');
                setNewListDescription('');
              }
            }}
          >
            <motion.div
              className="bg-white dark:bg-[#2D2C3A] rounded-2xl max-w-sm w-full p-6 border border-transparent dark:border-[#3D3C4A] shadow-xl"
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <h2 className="text-lg font-bold text-[#1F1E2A] dark:text-gray-100 mb-4">
                {modal.title}
              </h2>

              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="listName"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
                  >
                    {modal.nameRequired}
                  </label>
                  <input
                    id="listName"
                    type="text"
                    value={newListName}
                    onChange={(e) => setNewListName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newListName.trim() && !creating) {
                        handleCreateList();
                      }
                    }}
                    placeholder={modal.namePlaceholder}
                    className="w-full px-3 py-2.5 bg-white dark:bg-[#353444] border border-gray-300 dark:border-[#4D4C5A] rounded-xl focus:ring-2 focus:ring-[#FF644A] focus:border-transparent outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 text-sm"
                    autoFocus
                    maxLength={100}
                  />
                </div>

                <div>
                  <label
                    htmlFor="listDescription"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
                  >
                    {modal.descriptionLabel}
                  </label>
                  <textarea
                    id="listDescription"
                    value={newListDescription}
                    onChange={(e) => setNewListDescription(e.target.value)}
                    placeholder={modal.descriptionPlaceholder}
                    rows={2}
                    className="w-full px-3 py-2.5 bg-white dark:bg-[#353444] border border-gray-300 dark:border-[#4D4C5A] rounded-xl focus:ring-2 focus:ring-[#FF644A] focus:border-transparent outline-none resize-none text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 text-sm"
                    maxLength={500}
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end mt-6">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewListName('');
                    setNewListDescription('');
                  }}
                  className="px-4 py-2.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 rounded-lg transition-colors"
                  disabled={creating}
                >
                  {modal.cancel}
                </button>
                <button
                  onClick={handleCreateList}
                  disabled={!newListName.trim() || creating}
                  className="px-5 py-2.5 bg-[#FF644A] text-white text-sm font-medium rounded-xl hover:bg-[#E65441] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {creating ? modal.creating : modal.create}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </>
  );
}