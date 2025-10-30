'use client';
import { useState, useEffect } from 'react';
import { Bookmark, BookmarkCheck } from 'lucide-react';
import SaveToListModal from './SaveToListModal';
import savedListsService from '@/lib/services/saved-lists-service';

interface SaveButtonProps {
  itemType: 'restaurant' | 'recommendation' | 'guide';
  itemId: string | number;
  compact?: boolean;
  className?: string;
}

export default function SaveButton({ 
  itemType, 
  itemId, 
  compact = false,
  className = ''
}: SaveButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check if item is already saved
  useEffect(() => {
    checkIfSaved();
  }, [itemType, itemId]);

  const checkIfSaved = async () => {
    try {
      const data = await savedListsService.checkItemSaved(itemType, itemId);
      setIsSaved(data.isSaved);
    } catch (error) {
      console.error('Error checking save status:', error);
      // Set to false on error so user can still try to save
      setIsSaved(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Context-aware label
  const getLabel = () => {
    switch(itemType) {
      case 'restaurant': return 'Save to Try';
      case 'recommendation': return 'Bookmark';
      case 'guide': return 'Save Guide';
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowModal(true);
  };

  const handleSaveSuccess = () => {
    setIsSaved(true);
    checkIfSaved(); // Refresh save status
  };

  if (isLoading) {
    return (
      <button 
        className={`save-button loading ${className}`}
        disabled
      >
        <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
      </button>
    );
  }

  return (
    <>
      <button
        onClick={handleClick}
        className={`save-button ${isSaved ? 'saved' : 'unsaved'} ${compact ? 'compact' : ''} ${className}`}
        title={getLabel()}
      >
        {isSaved ? (
          <BookmarkCheck className="w-5 h-5" />
        ) : (
          <Bookmark className="w-5 h-5" />
        )}
        {!compact && <span className="ml-2">{getLabel()}</span>}
      </button>

      {showModal && (
        <SaveToListModal
          itemType={itemType}
          itemId={itemId}
          onClose={() => setShowModal(false)}
          onSave={handleSaveSuccess}
        />
      )}

      <style jsx>{`
        .save-button {
          display: inline-flex;
          align-items: center;
          padding: 0.5rem 1rem;
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          background: white;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 0.875rem;
          font-weight: 500;
        }
        .save-button:hover {
          background: #f9fafb;
          border-color: #d1d5db;
        }
        .save-button.saved {
          background: #fef3c7;
          border-color: #fbbf24;
          color: #92400e;
        }
        .save-button.saved:hover {
          background: #fde68a;
        }
        .save-button.compact {
          padding: 0.5rem;
        }
        .save-button.loading {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .save-button:disabled {
          cursor: not-allowed;
        }
      `}</style>
    </>
  );
}