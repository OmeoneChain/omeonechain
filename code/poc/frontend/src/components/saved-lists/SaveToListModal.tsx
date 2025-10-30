'use client';

import { useState, useEffect } from 'react';
import { X, Plus, Check } from 'lucide-react';
import CreateListForm from './CreateListForm';
import savedListsService, { SavedList } from '@/lib/services/saved-lists-service';

interface SaveToListModalProps {
  itemType: 'restaurant' | 'recommendation' | 'guide';
  itemId: string | number;
  onClose: () => void;
  onSave: () => void;
}

export default function SaveToListModal({
  itemType,
  itemId,
  onClose,
  onSave
}: SaveToListModalProps) {
  const [lists, setLists] = useState<SavedList[]>([]);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [showCreateNew, setShowCreateNew] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [savedToLists, setSavedToLists] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchUserLists();
  }, []);

  const fetchUserLists = async () => {
    try {
      setIsLoading(true);
      const response = await savedListsService.getUserLists();
      // Handle different response formats
      const userLists = Array.isArray(response) ? response : (response.lists || response.data || []);
      setLists(userLists);
      
      // Check which lists already contain this item
      const alreadySaved = new Set<string>();
      for (const list of userLists) {
        try {
          const exists = await savedListsService.checkItemInList(list.id, itemType, itemId);
          if (exists) {
            alreadySaved.add(list.id);
          }
        } catch (error) {
          console.error(`Error checking list ${list.id}:`, error);
        }
      }
      setSavedToLists(alreadySaved);
    } catch (error) {
      console.error('Error fetching lists:', error);
      showToast('Failed to load lists', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const getTitle = () => {
    switch(itemType) {
      case 'restaurant': return 'Add to Try List';
      case 'recommendation': return 'Bookmark to List';
      case 'guide': return 'Save Guide to List';
    }
  };

  const handleSave = async () => {
    if (!selectedListId) return;

    try {
      setIsSaving(true);
      await savedListsService.addItemToList(selectedListId, {
        itemType,
        itemId
      });

      showToast('Saved successfully!');
      onSave();
      onClose();
    } catch (error) {
      console.error('Error saving to list:', error);
      showToast(error instanceof Error ? error.message : 'Failed to save', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  };

  // FIXED: Auto-save item when list is created
  const handleListCreated = async (newList: SavedList) => {
    console.log('New list created:', newList);
    
    try {
      // Update the lists array
      setLists([...lists, newList]);
      setShowCreateNew(false);
      
      // Immediately save the item to the new list
      setIsSaving(true);
      console.log('Auto-saving item to new list...');
      
      await savedListsService.addItemToList(newList.id, {
        itemType,
        itemId
      });

      console.log('Item saved successfully to new list');
      showToast(`Created "${newList.name}" and saved item!`);
      
      // Trigger parent refresh and close modal
      onSave();
      onClose();
    } catch (error) {
      console.error('Error saving to new list:', error);
      showToast(error instanceof Error ? error.message : 'Failed to save to new list', 'error');
      // Keep modal open on error so user can try again
    } finally {
      setIsSaving(false);
    }
  };

  const handleListClick = (list: SavedList) => {
    // Debug logging
    console.log('List clicked:', list.id, list.name);
    console.log('Already saved?', savedToLists.has(list.id));
    
    // Don't allow selecting already-saved lists
    if (savedToLists.has(list.id)) {
      console.log('Cannot select - already saved to this list');
      return;
    }
    
    // Close create form if open
    if (showCreateNew) {
      setShowCreateNew(false);
    }
    
    // Select the list
    setSelectedListId(list.id);
    console.log('List selected:', list.id);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{getTitle()}</h2>
          <button onClick={onClose} className="close-button">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="modal-body">
          {isLoading ? (
            <div className="loading-state">
              <div className="spinner" />
              <p>Loading your lists...</p>
            </div>
          ) : (
            <>
              <div className="list-selector">
                {lists.length === 0 ? (
                  <div className="empty-state">
                    <p>You don't have any lists yet.</p>
                    <p className="text-sm text-gray-500">Create your first list to get started!</p>
                  </div>
                ) : (
                  lists.map(list => (
                    <div
                      key={list.id}
                      className={`list-option ${selectedListId === list.id ? 'selected' : ''} ${savedToLists.has(list.id) ? 'already-saved' : ''}`}
                      onClick={() => handleListClick(list)}
                    >
                      <div className="list-icon">{list.icon || '📚'}</div>
                      <div className="list-info">
                        <div className="list-name">{list.name}</div>
                        {list.description && (
                          <div className="list-description">{list.description}</div>
                        )}
                        <div className="list-meta">
                          {list.itemCount || 0} items
                        </div>
                      </div>
                      {savedToLists.has(list.id) ? (
                        <div className="saved-indicator">
                          <Check className="w-5 h-5 text-green-600" />
                          <span className="text-sm text-green-600">Saved</span>
                        </div>
                      ) : (
                        selectedListId === list.id && (
                          <div className="selected-indicator">
                            <div className="radio-selected" />
                          </div>
                        )
                      )}
                    </div>
                  ))
                )}
              </div>

              {!showCreateNew ? (
                <button 
                  onClick={() => {
                    setShowCreateNew(true);
                    setSelectedListId(null); // Clear selection when creating new
                  }}
                  className="create-new-button"
                >
                  <Plus className="w-4 h-4" />
                  Create New List
                </button>
              ) : (
                <div className="create-form-wrapper">
                  <CreateListForm
                    onCreated={handleListCreated}
                    onCancel={() => {
                      setShowCreateNew(false);
                      setSelectedListId(null);
                    }}
                  />
                </div>
              )}
            </>
          )}
        </div>

        {/* Only show footer when NOT creating a new list */}
        {!showCreateNew && (
          <div className="modal-footer">
            <button onClick={onClose} className="button-secondary">
              Cancel
            </button>
            <button 
              onClick={handleSave} 
              disabled={!selectedListId || isSaving}
              className="button-primary"
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 1rem;
        }

        .modal-content {
          background: white;
          border-radius: 1rem;
          max-width: 500px;
          width: 100%;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.5rem;
          border-bottom: 1px solid #e5e7eb;
        }

        .modal-header h2 {
          margin: 0;
          font-size: 1.25rem;
          font-weight: 600;
        }

        .close-button {
          background: none;
          border: none;
          cursor: pointer;
          padding: 0.5rem;
          border-radius: 0.5rem;
          transition: background 0.2s;
        }

        .close-button:hover {
          background: #f3f4f6;
        }

        .modal-body {
          flex: 1;
          overflow-y: auto;
          padding: 1.5rem;
        }

        .loading-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          gap: 1rem;
        }

        .spinner {
          width: 2rem;
          height: 2rem;
          border: 3px solid #e5e7eb;
          border-top-color: #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .list-selector {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          margin-bottom: 1rem;
        }

        .list-option {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          border: 2px solid #e5e7eb;
          border-radius: 0.75rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .list-option:hover:not(.already-saved) {
          border-color: #3b82f6;
          background: #eff6ff;
        }

        .list-option.selected {
          border-color: #3b82f6;
          background: #eff6ff;
        }

        .list-option.already-saved {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .list-icon {
          font-size: 1.5rem;
          flex-shrink: 0;
        }

        .list-info {
          flex: 1;
          min-width: 0;
        }

        .list-name {
          font-weight: 600;
          font-size: 1rem;
          margin-bottom: 0.25rem;
        }

        .list-description {
          font-size: 0.875rem;
          color: #6b7280;
          margin-bottom: 0.25rem;
        }

        .list-meta {
          font-size: 0.75rem;
          color: #9ca3af;
        }

        .saved-indicator {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .selected-indicator {
          flex-shrink: 0;
        }

        .radio-selected {
          width: 1.25rem;
          height: 1.25rem;
          border-radius: 50%;
          background: #3b82f6;
          border: 3px solid white;
          box-shadow: 0 0 0 2px #3b82f6;
        }

        .empty-state {
          text-align: center;
          padding: 2rem;
          color: #6b7280;
        }

        .create-new-button {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          width: 100%;
          padding: 0.75rem;
          border: 2px dashed #d1d5db;
          border-radius: 0.75rem;
          background: white;
          color: #6b7280;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .create-new-button:hover {
          border-color: #3b82f6;
          color: #3b82f6;
          background: #eff6ff;
        }

        .create-form-wrapper {
          margin-top: 0.5rem;
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
          padding: 1.5rem;
          border-top: 1px solid #e5e7eb;
        }

        .button-secondary {
          padding: 0.625rem 1.25rem;
          border: 1px solid #d1d5db;
          border-radius: 0.5rem;
          background: white;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .button-secondary:hover {
          background: #f9fafb;
        }

        .button-primary {
          padding: 0.625rem 1.25rem;
          border: none;
          border-radius: 0.5rem;
          background: #3b82f6;
          color: white;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .button-primary:hover:not(:disabled) {
          background: #2563eb;
        }

        .button-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        :global(.toast) {
          position: fixed;
          bottom: 2rem;
          right: 2rem;
          padding: 1rem 1.5rem;
          border-radius: 0.5rem;
          background: #10b981;
          color: white;
          font-weight: 500;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
          z-index: 2000;
          animation: slideIn 0.3s ease-out;
        }

        :global(.toast-error) {
          background: #ef4444;
        }

        @keyframes slideIn {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}