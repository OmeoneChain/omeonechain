'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import savedListsService, { SavedList } from '@/lib/services/saved-lists-service';

interface CreateListFormProps {
  onCreated: (list: SavedList) => void;
  onCancel: () => void;
}

export default function CreateListForm({ onCreated, onCancel }: CreateListFormProps) {
  const t = useTranslations();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError(t('savedLists.form.validation.nameRequired'));
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');

      const newList = await savedListsService.createList({
        name: name.trim(),
        description: description.trim() || undefined,
        icon: 'folder-heart', // Default icon
        listType: 'places'    // Always 'places' for user-created lists
      });

      onCreated(newList);
    } catch (err) {
      console.error('Error creating list:', err);
      setError(err instanceof Error ? err.message : t('savedLists.form.errors.createFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setName(newValue);
    if (error) setError('');
  };

  const isFormValid = name.trim().length > 0;
  const isButtonDisabled = isSubmitting || !isFormValid;

  return (
    <form onSubmit={handleSubmit} className="create-list-form">
      <div className="form-header">
        <h3>{t('savedLists.form.title')}</h3>
        <button 
          type="button" 
          onClick={onCancel}
          className="close-button"
          aria-label={t('common.close')}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {/* List Name */}
      <div className="form-group">
        <label htmlFor="list-name">
          {t('savedLists.form.fields.name.label')} <span className="required">*</span>
        </label>
        <input
          id="list-name"
          type="text"
          value={name}
          onChange={handleNameChange}
          placeholder={t('savedLists.form.fields.name.placeholder')}
          maxLength={100}
          autoFocus
          required
        />
      </div>

      {/* Description */}
      <div className="form-group">
        <label htmlFor="list-description">
          {t('savedLists.form.fields.description.label')} <span className="optional">({t('common.optional')})</span>
        </label>
        <textarea
          id="list-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t('savedLists.form.fields.description.placeholder')}
          maxLength={500}
          rows={2}
        />
      </div>

      {/* No List Type selector - defaults to 'places' */}

      <div className="form-actions">
        <button 
          type="button" 
          onClick={onCancel}
          className="button-secondary"
          disabled={isSubmitting}
        >
          {t('common.cancel')}
        </button>
        <button 
          type="submit"
          className="button-primary"
          disabled={isButtonDisabled}
        >
          {isSubmitting ? t('savedLists.form.actions.creating') : t('savedLists.form.actions.create')}
        </button>
      </div>

      <style jsx>{`
        .create-list-form {
          background: white;
          border: 1px solid #f3f4f6;
          border-radius: 0.75rem;
          padding: 1.25rem;
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
          color: #1F1E2A;
        }

        .close-button {
          background: none;
          border: none;
          cursor: pointer;
          padding: 0.375rem;
          border-radius: 0.375rem;
          color: #9ca3af;
          transition: all 0.2s;
        }

        .close-button:hover {
          background: #f3f4f6;
          color: #1F1E2A;
        }

        .error-message {
          background: #FEF2F2;
          border: 1px solid #FECACA;
          color: #DC2626;
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
          color: #1F1E2A;
        }

        .required {
          color: #E65441;
        }

        .optional {
          color: #9ca3af;
          font-weight: 400;
        }

        .form-group input,
        .form-group textarea {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          font-size: 0.875rem;
          font-family: inherit;
          transition: all 0.2s;
          background: white;
        }

        .form-group input::placeholder,
        .form-group textarea::placeholder {
          color: #9ca3af;
        }

        .form-group input:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: #E65441;
          box-shadow: 0 0 0 3px rgba(230, 84, 65, 0.1);
        }

        .form-group textarea {
          resize: vertical;
          min-height: 60px;
        }

        .form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
          margin-top: 1.5rem;
          padding-top: 1rem;
          border-top: 1px solid #f3f4f6;
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

        .button-secondary:hover:not(:disabled) {
          background: #f9fafb;
          border-color: #9ca3af;
        }

        .button-secondary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .button-primary {
          padding: 0.625rem 1.25rem;
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
      `}</style>
    </form>
  );
}