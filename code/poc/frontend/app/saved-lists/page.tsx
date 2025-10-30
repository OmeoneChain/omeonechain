'use client';

import { useState, useEffect } from 'react';
import { Plus, Search } from 'lucide-react';
import SavedListCard from '@/src/components/saved-lists/SavedListCard';
import CreateListForm from '@/src/components/saved-lists/CreateListForm';
import savedListsService, { SavedList } from '@/lib/services/saved-lists-service';
import CleanHeader from '@/components/CleanHeader';

interface Tab {
  id: string;
  label: string;
  icon: string;
  filter?: string;
}

export default function SavedListsPage() {
  const [lists, setLists] = useState<SavedList[]>([]);
  const [filteredLists, setFilteredLists] = useState<SavedList[]>([]);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const tabs: Tab[] = [
    { id: 'all', label: 'All Saved Items', icon: '📚' },
    { id: 'places', label: 'Want to Try', icon: '🍽️', filter: 'places' },
    { id: 'bookmarks', label: 'Bookmarks', icon: '📖', filter: 'bookmarks' },
    { id: 'guides', label: 'Saved Guides', icon: '📖', filter: 'mixed' }
  ];

  useEffect(() => {
    fetchLists();
  }, []);

  useEffect(() => {
    filterLists();
  }, [lists, activeTab, searchQuery]);

  const fetchLists = async () => {
    try {
      setIsLoading(true);
      const userLists = await savedListsService.getUserLists();
      setLists(userLists);
    } catch (error) {
      console.error('Error fetching lists:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterLists = () => {
    let filtered = [...lists];

    // Filter by tab
    if (activeTab !== 'all') {
      const tab = tabs.find(t => t.id === activeTab);
      if (tab?.filter) {
        filtered = filtered.filter(list => 
          list.listType === tab.filter
        );
      }
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(list =>
        list.name.toLowerCase().includes(query) ||
        list.description?.toLowerCase().includes(query)
      );
    }

    setFilteredLists(filtered);
  };

  const handleListCreated = (newList: SavedList) => {
    setLists([newList, ...lists]);
    setShowCreateForm(false);
  };

  const handleListDeleted = async (listId: string) => {
    try {
      await savedListsService.deleteList(listId);
      setLists(lists.filter(list => list.id !== listId));
    } catch (error) {
      console.error('Error deleting list:', error);
    }
  };

  const handleListUpdated = (updatedList: SavedList) => {
    setLists(lists.map(list => 
      list.id === updatedList.id ? updatedList : list
    ));
  };

  return (
    <>
      <CleanHeader />
      
      <div className="saved-lists-page">
        <div className="page-header">
          <div className="header-content">
            <h1>My Saved Lists</h1>
            <p className="subtitle">Organize your favorite places, bookmarks, and guides</p>
          </div>
          <button 
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="create-button"
          >
            <Plus className="w-5 h-5" />
            <span>Create New List</span>
          </button>
        </div>

        {showCreateForm && (
          <div className="create-form-container">
            <CreateListForm
              onCreated={handleListCreated}
              onCancel={() => setShowCreateForm(false)}
            />
          </div>
        )}

        <div className="tabs-container">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`tab ${activeTab === tab.id ? 'active' : ''}`}
            >
              <span className="tab-icon">{tab.icon}</span>
              <span className="tab-label">{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="search-container">
          <Search className="search-icon" />
          <input
            type="text"
            placeholder="Search your lists..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="lists-container">
          {isLoading ? (
            <div className="loading-state">
              <div className="spinner" />
              <p>Loading your lists...</p>
            </div>
          ) : filteredLists.length === 0 ? (
            <div className="empty-state">
              {searchQuery ? (
                <>
                  <p>No lists found matching "{searchQuery}"</p>
                  <button onClick={() => setSearchQuery('')} className="clear-search">
                    Clear search
                  </button>
                </>
              ) : lists.length === 0 ? (
                <>
                  <h3>No saved lists yet</h3>
                  <p>Create your first list to start organizing!</p>
                  <button 
                    onClick={() => setShowCreateForm(true)}
                    className="create-button-large"
                  >
                    <Plus className="w-6 h-6" />
                    Create Your First List
                  </button>
                </>
              ) : (
                <p>No lists in this category yet</p>
              )}
            </div>
          ) : (
            // ✅ CHANGED: From grid to vertical stacking
            <div className="lists-stack">
              {filteredLists.map(list => (
                <SavedListCard
                  key={list.id}
                  list={list}
                  onDeleted={handleListDeleted}
                  onUpdated={handleListUpdated}
                />
              ))}
            </div>
          )}
        </div>

        <style jsx>{`
          .saved-lists-page {
            max-width: 1200px;
            margin: 0 auto;
            padding: 2rem;
          }

          .page-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 2rem;
            flex-wrap: wrap;
            gap: 1rem;
          }

          .header-content h1 {
            font-size: 2rem;
            font-weight: 700;
            margin: 0 0 0.5rem 0;
          }

          .subtitle {
            color: #6b7280;
            margin: 0;
          }

          .create-button {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.75rem 1.5rem;
            background: #3b82f6;
            color: white;
            border: none;
            border-radius: 0.5rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
          }

          .create-button:hover {
            background: #2563eb;
            transform: translateY(-1px);
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          }

          .create-form-container {
            margin-bottom: 2rem;
          }

          .tabs-container {
            display: flex;
            gap: 0.5rem;
            margin-bottom: 1.5rem;
            border-bottom: 2px solid #e5e7eb;
            overflow-x: auto;
            padding-bottom: 2px;
          }

          .tab {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.75rem 1.25rem;
            background: none;
            border: none;
            border-bottom: 3px solid transparent;
            cursor: pointer;
            font-weight: 500;
            color: #6b7280;
            transition: all 0.2s;
            white-space: nowrap;
            margin-bottom: -2px;
          }

          .tab:hover {
            color: #111827;
            background: #f9fafb;
          }

          .tab.active {
            color: #3b82f6;
            border-bottom-color: #3b82f6;
          }

          .tab-icon {
            font-size: 1.25rem;
          }

          .search-container {
            position: relative;
            margin-bottom: 2rem;
          }

          .search-icon {
            position: absolute;
            left: 1rem;
            top: 50%;
            transform: translateY(-50%);
            color: #9ca3af;
            width: 1.25rem;
            height: 1.25rem;
          }

          .search-input {
            width: 100%;
            padding: 0.875rem 1rem 0.875rem 3rem;
            border: 1px solid #d1d5db;
            border-radius: 0.5rem;
            font-size: 1rem;
            transition: all 0.2s;
          }

          .search-input:focus {
            outline: none;
            border-color: #3b82f6;
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
          }

          .lists-container {
            min-height: 300px;
          }

          .loading-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 4rem;
            gap: 1rem;
          }

          .spinner {
            width: 3rem;
            height: 3rem;
            border: 4px solid #e5e7eb;
            border-top-color: #3b82f6;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }

          @keyframes spin {
            to { transform: rotate(360deg); }
          }

          .empty-state {
            text-align: center;
            padding: 4rem 2rem;
            color: #6b7280;
          }

          .empty-state h3 {
            font-size: 1.5rem;
            font-weight: 600;
            margin-bottom: 0.5rem;
            color: #111827;
          }

          .empty-state p {
            margin-bottom: 2rem;
          }

          .clear-search {
            padding: 0.5rem 1rem;
            background: #f3f4f6;
            border: none;
            border-radius: 0.375rem;
            cursor: pointer;
            font-weight: 500;
            transition: all 0.2s;
          }

          .clear-search:hover {
            background: #e5e7eb;
          }

          .create-button-large {
            display: inline-flex;
            align-items: center;
            gap: 0.75rem;
            padding: 1rem 2rem;
            background: #3b82f6;
            color: white;
            border: none;
            border-radius: 0.5rem;
            font-weight: 600;
            font-size: 1.125rem;
            cursor: pointer;
            transition: all 0.2s;
          }

          .create-button-large:hover {
            background: #2563eb;
            transform: translateY(-2px);
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
          }

          /* ✅ CHANGED: From grid to vertical stacking */
          .lists-stack {
            display: flex;
            flex-direction: column;
            gap: 1.5rem;
          }

          @media (max-width: 768px) {
            .saved-lists-page {
              padding: 1rem;
            }

            .page-header {
              flex-direction: column;
              align-items: flex-start;
            }
          }
        `}</style>
      </div>
    </>
  );
}