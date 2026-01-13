'use client';

import { useState, useEffect } from 'react';
import { X, Plus, Check, FolderHeart, Bookmark, Layers, ChefHat } from 'lucide-react';
import { useTranslations } from 'next-intl';
import CreateListForm from './CreateListForm';
import savedListsService, { SavedList } from '@/lib/services/saved-lists-service';

interface SaveToListModalProps {
  itemType: 'restaurant' | 'recommendation' | 'guide';
  itemId: string | number;
  onClose: () => void;
  onSave: () => void;
}

// Map list types to clean icons (no emoji)
const getListIcon = (listType: string) => {
  switch (listType) {
    case 'places':
      return FolderHeart;
    case 'bookmarks':
      return Bookmark;
    case 'mixed':
    default:
      return Layers;
  }
};

export default function SaveToListModal({
  itemType,
  itemId,
  onClose,
  onSave
}: SaveToListModalProps) {
  const t = useTranslations('savedLists');
  const tCommon = useTranslations('common');
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
      const userLists = Array.isArray(response) ? response : (response.lists || response.data || []);
      setLists(userLists);
      
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
      showToast(t('modal.toast.loadFailed'), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const getTitle = () => {
    switch(itemType) {
      case 'restaurant': return t('modal.title.restaurant');
      case 'recommendation': return t('modal.title.recommendation');
      case 'guide': return t('modal.title.guide');
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

      showToast(t('modal.toast.saved'));
      onSave();
      onClose();
    } catch (error) {
      console.error('Error saving to list:', error);
      showToast(error instanceof Error ? error.message : t('modal.toast.saveFailed'), 'error');
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

  const handleListCreated = async (newList: SavedList) => {
    console.log('New list created:', newList);
    
    try {
      setLists([...lists, newList]);
      setShowCreateNew(false);
      
      setIsSaving(true);
      console.log('Auto-saving item to new list...');
      
      await savedListsService.addItemToList(newList.id, {
        itemType,
        itemId
      });

      console.log('Item saved successfully to new list');
      showToast(t('modal.toast.createdAndSaved', { name: newList.name }));
      
      onSave();
      onClose();
    } catch (error) {
      console.error('Error saving to new list:', error);
      showToast(error instanceof Error ? error.message : t('modal.toast.saveToNewFailed'), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleListClick = (list: SavedList) => {
    if (savedToLists.has(list.id)) return;
    
    if (showCreateNew) {
      setShowCreateNew(false);
    }
    
    setSelectedListId(list.id);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="header-icon">
            <Bookmark className="w-5 h-5 text-[#E65441]" />
          </div>
          <h2>{getTitle()}</h2>
          <button onClick={onClose} className="close-button" aria-label={tCommon('close')}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="modal-body">
          {isLoading ? (
            <div className="loading-state">
              <div className="spinner" />
              <p>{t('modal.loading')}</p>
            </div>
          ) : (
            <>
              <div className="list-selector">
                {lists.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">
                      <FolderHeart className="w-8 h-8 text-[#E65441]" />
                    </div>
                    <p className="empty-title">{t('modal.empty.title')}</p>
                    <p className="empty-description">{t('modal.empty.description')}</p>
                  </div>
                ) : (
                  lists.map(list => {
                    const ListIcon = getListIcon(list.listType);
                    const isSelected = selectedListId === list.id;
                    const isAlreadySaved = savedToLists.has(list.id);
                    
                    return (
                      <div
                        key={list.id}
                        className={`list-option ${isSelected ? 'selected' : ''} ${isAlreadySaved ? 'already-saved' : ''}`}
                        onClick={() => handleListClick(list)}
                      >
                        {/* Clean icon container instead of emoji */}
                        <div className={`list-icon-container ${isSelected ? 'selected' : ''}`}>
                          <ListIcon className="w-5 h-5" />
                        </div>
                        
                        <div className="list-info">
                          <div className="list-name">{list.name}</div>
                          <div className="list-meta">
                            {t('modal.itemCount', { count: list.itemCount || 0 })}
                          </div>
                        </div>
                        
                        {isAlreadySaved ? (
                          <div className="saved-badge">
                            <Check className="w-4 h-4" />
                            <span>{t('modal.alreadySaved')}</span>
                          </div>
                        ) : isSelected ? (
                          <div className="selected-indicator">
                            <div className="radio-dot" />
                          </div>
                        ) : null}
                      </div>
                    );
                  })
                )}
              </div>

              {!showCreateNew ? (
                <button 
                  onClick={() => {
                    setShowCreateNew(true);
                    setSelectedListId(null);
                  }}
                  className="create-new-button"
                >
                  <Plus className="w-4 h-4" />
                  {t('modal.actions.createNew')}
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

        {/* Footer - only when not creating */}
        {!showCreateNew && (
          <div className="modal-footer">
            <button onClick={onClose} className="button-secondary">
              {tCommon('cancel')}
            </button>
            <button 
              onClick={handleSave} 
              disabled={!selectedListId || isSaving}
              className="button-primary"
            >
              {isSaving ? t('modal.actions.saving') : tCommon('save')}
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
          background: rgba(31, 30, 42, 0.5);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 1rem;
        }

        .modal-content {
          background: white;
          border-radius: 1rem;
          max-width: 420px;
          width: 100%;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          box-shadow: 0 20px 25px -5px rgba(31, 30, 42, 0.15);
        }

        :global(.dark) .modal-content {
          background: #2D2C3A;
          box-shadow: 0 20px 40px -5px rgba(0, 0, 0, 0.4);
        }

        .modal-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1.25rem 1.5rem;
          border-bottom: 1px solid #f3f4f6;
        }

        :global(.dark) .modal-header {
          border-bottom-color: #3D3C4A;
        }

        .header-icon {
          width: 2.25rem;
          height: 2.25rem;
          border-radius: 0.5rem;
          background: linear-gradient(135deg, #FFE8E4 0%, #FFF4E1 100%);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        :global(.dark) .header-icon {
          background: linear-gradient(135deg, rgba(255, 100, 74, 0.2) 0%, rgba(230, 84, 65, 0.2) 100%);
        }

        .modal-header h2 {
          flex: 1;
          margin: 0;
          font-size: 1.125rem;
          font-weight: 600;
          color: #1F1E2A;
        }

        :global(.dark) .modal-header h2 {
          color: white;
        }

        .close-button {
          background: none;
          border: none;
          cursor: pointer;
          padding: 0.5rem;
          border-radius: 0.5rem;
          color: #6b7280;
          transition: all 0.2s;
        }

        :global(.dark) .close-button {
          color: #9ca3af;
        }

        .close-button:hover {
          background: #f3f4f6;
          color: #1F1E2A;
        }

        :global(.dark) .close-button:hover {
          background: #353444;
          color: white;
        }

        .modal-body {
          flex: 1;
          overflow-y: auto;
          padding: 1.25rem 1.5rem;
        }

        .loading-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 2.5rem;
          gap: 1rem;
        }

        .loading-state p {
          color: #6b7280;
        }

        :global(.dark) .loading-state p {
          color: #9ca3af;
        }

        .spinner {
          width: 2rem;
          height: 2rem;
          border: 3px solid #FFE8E4;
          border-top-color: #E65441;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        :global(.dark) .spinner {
          border-color: #353444;
          border-top-color: #FF644A;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .list-selector {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }

        .list-option {
          display: flex;
          align-items: center;
          gap: 0.875rem;
          padding: 0.875rem 1rem;
          border: 2px solid #f3f4f6;
          border-radius: 0.75rem;
          cursor: pointer;
          transition: all 0.2s;
          background: white;
        }

        :global(.dark) .list-option {
          background: #353444;
          border-color: #3D3C4A;
        }

        .list-option:hover:not(.already-saved) {
          border-color: #E65441;
          background: #FFF4E1;
        }

        :global(.dark) .list-option:hover:not(.already-saved) {
          border-color: #FF644A;
          background: rgba(255, 100, 74, 0.1);
        }

        .list-option.selected {
          border-color: #E65441;
          background: #FFF4E1;
        }

        :global(.dark) .list-option.selected {
          border-color: #FF644A;
          background: rgba(255, 100, 74, 0.15);
        }

        .list-option.already-saved {
          opacity: 0.6;
          cursor: not-allowed;
          background: #f9fafb;
        }

        :global(.dark) .list-option.already-saved {
          background: #2D2C3A;
        }

        /* Clean icon container - no emoji! */
        .list-icon-container {
          width: 2.5rem;
          height: 2.5rem;
          border-radius: 0.625rem;
          background: linear-gradient(135deg, #E65441 0%, #C94232 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          flex-shrink: 0;
        }

        .list-icon-container.selected {
          background: linear-gradient(135deg, #FF644A 0%, #E65441 100%);
          box-shadow: 0 4px 12px rgba(230, 84, 65, 0.3);
        }

        .list-info {
          flex: 1;
          min-width: 0;
        }

        .list-name {
          font-weight: 600;
          font-size: 0.9375rem;
          color: #1F1E2A;
          margin-bottom: 0.125rem;
        }

        :global(.dark) .list-name {
          color: white;
        }

        .list-meta {
          font-size: 0.8125rem;
          color: #9ca3af;
        }

        :global(.dark) .list-meta {
          color: #6b7280;
        }

        .saved-badge {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.25rem 0.625rem;
          background: #ecfdf5;
          border-radius: 1rem;
          color: #059669;
          font-size: 0.75rem;
          font-weight: 500;
        }

        :global(.dark) .saved-badge {
          background: rgba(5, 150, 105, 0.2);
          color: #34d399;
        }

        .selected-indicator {
          width: 1.25rem;
          height: 1.25rem;
          border-radius: 50%;
          border: 2px solid #E65441;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        :global(.dark) .selected-indicator {
          border-color: #FF644A;
        }

        .radio-dot {
          width: 0.625rem;
          height: 0.625rem;
          border-radius: 50%;
          background: #E65441;
        }

        :global(.dark) .radio-dot {
          background: #FF644A;
        }

        .empty-state {
          text-align: center;
          padding: 2rem 1rem;
        }

        .empty-icon {
          width: 4rem;
          height: 4rem;
          border-radius: 1rem;
          background: linear-gradient(135deg, #FFE8E4 0%, #FFF4E1 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 1rem;
        }

        :global(.dark) .empty-icon {
          background: linear-gradient(135deg, rgba(255, 100, 74, 0.2) 0%, rgba(230, 84, 65, 0.2) 100%);
        }

        .empty-title {
          font-weight: 600;
          color: #1F1E2A;
          margin-bottom: 0.25rem;
        }

        :global(.dark) .empty-title {
          color: white;
        }

        .empty-description {
          font-size: 0.875rem;
          color: #9ca3af;
        }

        :global(.dark) .empty-description {
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
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        :global(.dark) .create-new-button {
          background: #353444;
          border-color: #4D4C5A;
          color: #9ca3af;
        }

        .create-new-button:hover {
          border-color: #E65441;
          color: #E65441;
          background: #FFF4E1;
        }

        :global(.dark) .create-new-button:hover {
          border-color: #FF644A;
          color: #FF644A;
          background: rgba(255, 100, 74, 0.1);
        }

        .create-form-wrapper {
          margin-top: 0.5rem;
          padding-top: 1rem;
          border-top: 1px solid #f3f4f6;
        }

        :global(.dark) .create-form-wrapper {
          border-top-color: #3D3C4A;
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
          padding: 1.25rem 1.5rem;
          border-top: 1px solid #f3f4f6;
        }

        :global(.dark) .modal-footer {
          border-top-color: #3D3C4A;
        }

        .button-secondary {
          padding: 0.625rem 1.25rem;
          border: 1px solid #d1d5db;
          border-radius: 0.5rem;
          background: white;
          font-weight: 500;
          font-size: 0.875rem;
          color: #4b5563;
          cursor: pointer;
          transition: all 0.2s;
        }

        :global(.dark) .button-secondary {
          background: #353444;
          border-color: #3D3C4A;
          color: #d1d5db;
        }

        .button-secondary:hover {
          background: #f9fafb;
          border-color: #9ca3af;
        }

        :global(.dark) .button-secondary:hover {
          background: #404050;
          border-color: #4D4C5A;
        }

        .button-primary {
          padding: 0.625rem 1.5rem;
          border: none;
          border-radius: 0.5rem;
          background: #FF644A;
          color: white;
          font-weight: 500;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .button-primary:hover:not(:disabled) {
          background: #E65441;
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
          background: #059669;
          color: white;
          font-weight: 500;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
          z-index: 2000;
          animation: slideIn 0.3s ease-out;
        }

        :global(.toast-error) {
          background: #E65441;
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