// app/[locale]/saved-lists/page.tsx
// V5: Using savedListsService for backend calls
// - No search bar
// - Tabs without emoji
// - Mobile responsive (1 col on mobile, 2 on tablet, 3 on desktop)
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
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
  { id: 'all', label: 'All Saved Lists', Icon: Layers },
  { id: 'places', label: 'Personal Lists', Icon: FolderHeart },
  { id: 'guides', label: 'Curated Lists', Icon: BookOpen },
] as const;

type TabId = typeof TABS[number]['id'];

export default function SavedListsPage() {
  const router = useRouter();
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
      alert('Link copied to clipboard!');
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

  return (
    <>
      <CleanHeader />
      <div className="min-h-screen bg-[#FFF4E1]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-[#1F1E2A]">My Saved Lists</h1>
              <p className="text-gray-600 mt-1">Organize your favorite places, bookmarks, and guides</p>
            </div>
            
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#FF644A] hover:bg-[#E65441] text-white font-medium rounded-lg transition-colors shadow-sm"
            >
              <Plus size={20} />
              Create New List
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
                      : "bg-white text-[#1F1E2A] hover:bg-[#FFE8E4] border border-gray-200"
                  )}
                >
                  <TabIcon size={16} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Error State */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              <p className="font-medium">Error loading lists</p>
              <p className="text-sm">{error}</p>
              <button 
                onClick={() => window.location.reload()}
                className="mt-2 text-sm underline hover:no-underline"
              >
                Try again
              </button>
            </div>
          )}

          {/* View Toggle - Only show if we have lists */}
          {filteredLists.length > 0 && (
            <div className="flex justify-end mb-6">
              <div className="inline-flex items-center bg-white rounded-lg border border-gray-200 p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={cn(
                    "p-2 rounded-md transition-colors",
                    viewMode === 'grid'
                      ? "bg-[#FFF4E1] text-[#E65441]"
                      : "text-gray-500 hover:text-gray-700"
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
                      ? "bg-[#FFF4E1] text-[#E65441]"
                      : "text-gray-500 hover:text-gray-700"
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
                <div key={i} className="bg-white rounded-xl border border-gray-200 overflow-hidden animate-pulse">
                  <div className="h-48 bg-gray-200" />
                  <div className="p-4 space-y-3">
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
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
              <h3 className="text-xl font-semibold text-[#1F1E2A] mb-2">
                {activeTab === 'all' 
                  ? "No saved lists yet" 
                  : `No ${TABS.find(t => t.id === activeTab)?.label.toLowerCase()} yet`}
              </h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Create your first list to start organizing your favorite restaurants and discoveries.
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#FF644A] hover:bg-[#E65441] text-white font-medium rounded-lg transition-colors"
              >
                <Plus size={20} />
                Create Your First List
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
              className="bg-white rounded-xl max-w-md w-full p-6"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <h2 className="text-xl font-bold text-[#1F1E2A] mb-4">Create New List</h2>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="listName" className="block text-sm font-medium text-gray-700 mb-1">
                    List Name *
                  </label>
                  <input
                    id="listName"
                    type="text"
                    value={newListName}
                    onChange={(e) => setNewListName(e.target.value)}
                    placeholder="e.g., Date Night Spots"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF644A] focus:border-transparent outline-none"
                    autoFocus
                  />
                </div>
                
                <div>
                  <label htmlFor="listDescription" className="block text-sm font-medium text-gray-700 mb-1">
                    Description (optional)
                  </label>
                  <textarea
                    id="listDescription"
                    value={newListDescription}
                    onChange={(e) => setNewListDescription(e.target.value)}
                    placeholder="What's this list for?"
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF644A] focus:border-transparent outline-none resize-none"
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
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  disabled={creating}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateList}
                  disabled={!newListName.trim() || creating}
                  className="px-4 py-2 bg-[#FF644A] text-white rounded-lg hover:bg-[#E65441] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creating ? 'Creating...' : 'Create List'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </>
  );
}