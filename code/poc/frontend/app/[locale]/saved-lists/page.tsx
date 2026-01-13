// app/[locale]/saved-lists/page.tsx
// V6: Using savedListsService for backend calls
// - No search bar
// - Tabs without emoji
// - Mobile responsive (1 col on mobile, 2 on tablet, 3 on desktop)
// - Dark mode support
// - i18n translations
//
// =============================================================================
// DARK MODE PATTERNS USED IN THIS FILE:
// =============================================================================
// Page background:      bg-[#FFF4E1] dark:bg-[#1F1E2A]
// Card/Surface:         bg-white dark:bg-[#2D2C3A]
// Elevated surface:     bg-[#FFF4E1] dark:bg-[#353444]
// Primary text:         text-[#1F1E2A] dark:text-gray-100
// Secondary text:       text-gray-600 dark:text-gray-400
// Borders:              border-gray-200 dark:border-[#3D3C4A]
// Input fields:         bg-white dark:bg-[#353444] with dark borders
// Hover states:         hover:bg-[#FFE8E4] dark:hover:bg-[#353444]
// Error backgrounds:    bg-red-50 dark:bg-red-900/20
// Skeleton loaders:     bg-gray-200 dark:bg-gray-700
// =============================================================================

"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { 
  Plus,
  LayoutGrid,
  List,
  FolderHeart,
  Bookmark,
  BookOpen,
  Layers
} from 'lucide-react';
import SavedListCard from '@/components/saved-lists/SavedListCard';
import CleanHeader from '@/components/CleanHeader';
import { cn } from '@/lib/utils';
import savedListsService, { SavedList } from '@/lib/services/saved-lists-service';

// Extended SavedList type to include items for preview
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

// Tab configuration - NO EMOJI
const TABS = [
  { id: 'all', labelKey: 'tabs.all', Icon: Layers },
  { id: 'places', labelKey: 'tabs.places', Icon: FolderHeart },
  { id: 'guides', labelKey: 'tabs.guides', Icon: BookOpen },
] as const;

type TabId = typeof TABS[number]['id'];

export default function SavedListsPage() {
  const router = useRouter();
  const t = useTranslations('savedLists');
  const [lists, setLists] = useState<SavedListWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListDescription, setNewListDescription] = useState('');
  const [creating, setCreating] = useState(false);

  // Fetch lists using the service
  useEffect(() => {
    const fetchLists = async () => {
      try {
        setError(null);
        const data = await savedListsService.getUserLists();
        // Cast to our extended type that includes items
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

  // Filter lists based on active tab
  const filteredLists = lists.filter(list => {
    if (activeTab === 'all') return true;
    if (activeTab === 'places') return list.listType === 'places';
    if (activeTab === 'bookmarks') return list.listType === 'bookmarks';
    if (activeTab === 'guides') return list.listType === 'mixed';
    return true;
  });

  // Handlers
  const handleEdit = (list: SavedListWithItems) => {
    router.push(`/saved-lists/${list.id}/edit`);
  };

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
      // Fallback: copy to clipboard
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
        listType: 'mixed',
      });
      
      // Add to local state with empty items
      setLists([...lists, { ...newList, items: [], restaurant_count: 0 } as SavedListWithItems]);
      setShowCreateModal(false);
      setNewListName('');
      setNewListDescription('');
    } catch (err) {
      console.error('Failed to create list:', err);
      alert(err instanceof Error ? err.message : 'Failed to create list');
    } finally {
      setCreating(false);
    }
  };

  // Get empty state message based on active tab
  const getEmptyMessage = () => {
    switch (activeTab) {
      case 'places':
        return t('empty.places');
      case 'guides':
        return t('empty.guides');
      default:
        return t('empty.all');
    }
  };

  // Helper to get modal translation keys
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-[#1F1E2A] dark:text-gray-100">{t('pageTitle')}</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">{t('pageDescription')}</p>
            </div>
            
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#FF644A] hover:bg-[#E65441] text-white font-medium rounded-lg transition-colors shadow-sm"
            >
              <Plus size={20} />
              {t('createNewList')}
            </button>
          </div>

          {/* Tabs - NO EMOJI, just icons */}
          <div className="flex flex-wrap items-center gap-2 mb-6">
            {TABS.map((tab) => {
              const TabIcon = tab.Icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all",
                    activeTab === tab.id
                      ? "bg-[#FF644A] text-white shadow-sm"
                      : "bg-white dark:bg-[#2D2C3A] text-[#1F1E2A] dark:text-gray-300 hover:bg-[#FFE8E4] dark:hover:bg-[#353444] border border-gray-200 dark:border-[#3D3C4A]"
                  )}
                >
                  <TabIcon size={16} />
                  {t(tab.labelKey)}
                </button>
              );
            })}
          </div>

          {/* Error State */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-lg text-red-700 dark:text-red-400">
              <p className="font-medium">{t('error.title')}</p>
              <p className="text-sm">{error}</p>
              <button 
                onClick={() => window.location.reload()}
                className="mt-2 text-sm underline hover:no-underline"
              >
                {t('error.tryAgain')}
              </button>
            </div>
          )}

          {/* View Toggle - Only show if we have lists */}
          {filteredLists.length > 0 && (
            <div className="flex justify-end mb-6">
              <div className="inline-flex items-center bg-white dark:bg-[#2D2C3A] rounded-lg border border-gray-200 dark:border-[#3D3C4A] p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={cn(
                    "p-2 rounded-md transition-colors",
                    viewMode === 'grid'
                      ? "bg-[#FFF4E1] dark:bg-[#353444] text-[#E65441] dark:text-[#FF644A]"
                      : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                  )}
                  aria-label="Grid view"
                >
                  <LayoutGrid size={18} />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={cn(
                    "p-2 rounded-md transition-colors",
                    viewMode === 'list'
                      ? "bg-[#FFF4E1] dark:bg-[#353444] text-[#E65441] dark:text-[#FF644A]"
                      : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                  )}
                  aria-label="List view"
                >
                  <List size={18} />
                </button>
              </div>
            </div>
          )}

          {/* Content */}
          {loading ? (
            // Loading skeleton
            <div className={cn(
              "grid gap-6",
              viewMode === 'grid' 
                ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" 
                : "grid-cols-1 max-w-2xl"
            )}>
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white dark:bg-[#2D2C3A] rounded-xl border border-gray-200 dark:border-[#3D3C4A] overflow-hidden animate-pulse">
                  <div className="h-48 bg-gray-200 dark:bg-gray-700" />
                  <div className="p-4 space-y-3">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredLists.length === 0 ? (
            // Empty state
            <motion.div 
              className="text-center py-16"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-[#E65441] to-[#C94232] flex items-center justify-center">
                <FolderHeart size={40} className="text-white" />
              </div>
              <h3 className="text-xl font-semibold text-[#1F1E2A] dark:text-gray-100 mb-2">
                {getEmptyMessage()}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
                {t('empty.description')}
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#FF644A] hover:bg-[#E65441] text-white font-medium rounded-lg transition-colors"
              >
                <Plus size={20} />
                {t('createFirstList')}
              </button>
            </motion.div>
          ) : (
            // Lists grid - RESPONSIVE: 1 col mobile, 2 col tablet, 3 col desktop
            <motion.div 
              className={cn(
                "grid gap-6",
                viewMode === 'grid' 
                  ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" 
                  : "grid-cols-1 max-w-2xl"
              )}
              layout
            >
              <AnimatePresence mode="popLayout">
                {filteredLists.map((list) => (
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
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onShare={handleShare}
                    variant={viewMode === 'list' ? 'compact' : 'default'}
                  />
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </div>

        {/* Create List Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div 
              className="bg-white dark:bg-[#2D2C3A] rounded-xl max-w-md w-full p-6 border border-transparent dark:border-[#3D3C4A]"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <h2 className="text-xl font-bold text-[#1F1E2A] dark:text-gray-100 mb-4">{modal.title}</h2>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="listName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {modal.nameRequired}
                  </label>
                  <input
                    id="listName"
                    type="text"
                    value={newListName}
                    onChange={(e) => setNewListName(e.target.value)}
                    placeholder={modal.namePlaceholder}
                    className="w-full px-3 py-2 bg-white dark:bg-[#353444] border border-gray-300 dark:border-[#4D4C5A] rounded-lg focus:ring-2 focus:ring-[#FF644A] focus:border-transparent outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                    autoFocus
                  />
                </div>
                
                <div>
                  <label htmlFor="listDescription" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {modal.descriptionLabel}
                  </label>
                  <textarea
                    id="listDescription"
                    value={newListDescription}
                    onChange={(e) => setNewListDescription(e.target.value)}
                    placeholder={modal.descriptionPlaceholder}
                    rows={2}
                    className="w-full px-3 py-2 bg-white dark:bg-[#353444] border border-gray-300 dark:border-[#4D4C5A] rounded-lg focus:ring-2 focus:ring-[#FF644A] focus:border-transparent outline-none resize-none text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
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
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                  disabled={creating}
                >
                  {modal.cancel}
                </button>
                <button
                  onClick={handleCreateList}
                  disabled={!newListName.trim() || creating}
                  className="px-4 py-2 bg-[#FF644A] text-white rounded-lg hover:bg-[#E65441] disabled:opacity-50 disabled:cursor-not-allowed"
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