'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import savedListsService, { SavedList } from '@/lib/services/saved-lists-service';

interface CreateListFormProps {
  onCreated: (list: SavedList) => void;
  onCancel: () => void;
}

// Reduced to 6 most relevant icons (per Architecture Plan feedback)
const ICON_OPTIONS = [
  '🍽️', // Places/Restaurants
  '📖', // Bookmarks
  '⭐', // Favorites
  '📚', // Collections
  '❤️', // Love/Must-try
  '🎯'  // Goals/Plans
];

const LIST_TYPE_OPTIONS = [
  { value: 'places', label: 'Places to Try', icon: '🍽️' },
  { value: 'bookmarks', label: 'Bookmarks', icon: '📖' },
  { value: 'mixed', label: 'Mixed Collection', icon: '📚' }
];

export default function CreateListForm({ onCreated, onCancel }: CreateListFormProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('📚');
  const [listType, setListType] = useState<'places' | 'bookmarks' | 'mixed'>('places');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Debug: Log state changes
  useEffect(() => {
    console.log('CreateListForm state:', {
      name,
      description,
      selectedIcon,
      listType,
      isSubmitting,
      isNameValid: name.trim().length > 0,
      buttonShouldBeEnabled: !isSubmitting && name.trim().length > 0
    });
  }, [name, description, selectedIcon, listType, isSubmitting]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('Form submitted with:', { name, description, selectedIcon, listType });
    
    if (!name.trim()) {
      setError('Please enter a list name');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');

      console.log('Creating list...');
      const newList = await savedListsService.createList({
        name: name.trim(),
        description: description.trim() || undefined,
        icon: selectedIcon,
        listType
      });

      console.log('List created successfully:', newList);
      onCreated(newList);
    } catch (err) {
      console.error('Error creating list:', err);
      setError(err instanceof Error ? err.message : 'Failed to create list. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    console.log('Name changed to:', newValue);
    setName(newValue);
    if (error) setError(''); // Clear error when user types
  };

  // Check if form is valid
  const isFormValid = name.trim().length > 0;
  const isButtonDisabled = isSubmitting || !isFormValid;

  console.log('Render - Button disabled?', isButtonDisabled, { isSubmitting, isFormValid, nameLength: name.length });

  return (
    <form onSubmit={handleSubmit} className="create-list-form">
      <div className="form-header">
        <h3>Create New List</h3>
        <button 
          type="button" 
          onClick={onCancel}
          className="close-button"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div className="form-group">
        <label htmlFor="list-name">
          List Name <span className="required">*</span>
        </label>
        <input
          id="list-name"
          type="text"
          value={name}
          onChange={handleNameChange}
          placeholder="e.g., Buenos Aires Trip, Read Later, Date Night Ideas"
          maxLength={100}
          autoFocus
          required
        />
        {/* Debug helper */}
        <small style={{ color: '#666', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
          Characters: {name.length} | Valid: {isFormValid ? 'Yes' : 'No'}
        </small>
      </div>

      <div className="form-group">
        <label htmlFor="list-description">
          Description <span className="optional">(optional)</span>
        </label>
        <textarea
          id="list-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What's this list for?"
          maxLength={500}
          rows={2}
        />
      </div>

      <div className="form-group">
        <label>List Type</label>
        <div className="list-type-options">
          {LIST_TYPE_OPTIONS.map(type => (
            <button
              key={type.value}
              type="button"
              className={`type-option ${listType === type.value ? 'selected' : ''}`}
              onClick={() => {
                console.log('List type selected:', type.value);
                setListType(type.value as 'places' | 'bookmarks' | 'mixed');
              }}
            >
              <span className="type-icon">{type.icon}</span>
              <span className="type-label">{type.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="form-group">
        <label>Choose an Icon</label>
        <div className="icon-picker">
          {ICON_OPTIONS.map(icon => (
            <button
              key={icon}
              type="button"
              className={`icon-option ${selectedIcon === icon ? 'selected' : ''}`}
              onClick={() => {
                console.log('Icon selected:', icon);
                setSelectedIcon(icon);
              }}
            >
              {icon}
            </button>
          ))}
        </div>
      </div>

      <div className="form-actions">
        <button 
          type="button" 
          onClick={onCancel}
          className="button-secondary"
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button 
          type="submit"
          className="button-primary"
          disabled={isButtonDisabled}
        >
          {isSubmitting ? 'Creating...' : 'Create List'}
        </button>
      </div>

      <style jsx>{`
        .create-list-form {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 0.75rem;
          padding: 1.5rem;
        }

        .form-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.25rem;
        }

        .form-header h3 {
          margin: 0;
          font-size: 1rem;
          font-weight: 600;
        }

        .close-button {
          background: none;
          border: none;
          cursor: pointer;
          padding: 0.25rem;
          border-radius: 0.25rem;
          transition: background 0.2s;
        }

        .close-button:hover {
          background: #e5e7eb;
        }

        .error-message {
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #dc2626;
          padding: 0.75rem;
          border-radius: 0.5rem;
          margin-bottom: 1rem;
          font-size: 0.875rem;
        }

        .form-group {
          margin-bottom: 1.25rem;
        }

        .form-group label {
          display: block;
          font-weight: 500;
          font-size: 0.875rem;
          margin-bottom: 0.5rem;
          color: #374151;
        }

        .required {
          color: #dc2626;
        }

        .optional {
          color: #9ca3af;
          font-weight: 400;
        }

        .form-group input,
        .form-group textarea {
          width: 100%;
          padding: 0.625rem;
          border: 1px solid #d1d5db;
          border-radius: 0.5rem;
          font-size: 0.875rem;
          font-family: inherit;
          transition: all 0.2s;
        }

        .form-group input:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .form-group textarea {
          resize: vertical;
          min-height: 60px;
        }

        .list-type-options {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0.5rem;
        }

        .type-option {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem;
          border: 2px solid #e5e7eb;
          border-radius: 0.5rem;
          background: white;
          cursor: pointer;
          transition: all 0.2s;
        }

        .type-option:hover {
          border-color: #3b82f6;
          background: #eff6ff;
        }

        .type-option.selected {
          border-color: #3b82f6;
          background: #eff6ff;
        }

        .type-icon {
          font-size: 1.5rem;
        }

        .type-label {
          font-size: 0.75rem;
          font-weight: 500;
          text-align: center;
        }

        .icon-picker {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 0.5rem;
        }

        .icon-option {
          aspect-ratio: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          border: 2px solid #e5e7eb;
          border-radius: 0.5rem;
          background: white;
          cursor: pointer;
          transition: all 0.2s;
        }

        .icon-option:hover {
          border-color: #3b82f6;
          background: #eff6ff;
          transform: scale(1.1);
        }

        .icon-option.selected {
          border-color: #3b82f6;
          background: #eff6ff;
          transform: scale(1.15);
        }

        .form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
          margin-top: 1.5rem;
        }

        .button-secondary {
          padding: 0.5rem 1rem;
          border: 1px solid #d1d5db;
          border-radius: 0.5rem;
          background: white;
          font-weight: 500;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .button-secondary:hover:not(:disabled) {
          background: #f9fafb;
        }

        .button-secondary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .button-primary {
          padding: 0.5rem 1rem;
          border: none;
          border-radius: 0.5rem;
          background: #3b82f6;
          color: white;
          font-weight: 500;
          font-size: 0.875rem;
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
      `}</style>
    </form>
  );
}