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
        icon: 'folder-heart',
        listType: 'places'
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
    <form onSubmit={handleSubmit} className="bg-white dark:bg-[#2D2C3A] border border-gray-100 dark:border-[#3D3C4A] rounded-xl p-5">
      {/* Form Header */}
      <div className="flex justify-between items-center mb-5">
        <h3 className="m-0 text-base font-semibold text-[#1F1E2A] dark:text-white">
          {t('savedLists.form.title')}
        </h3>
        <button 
          type="button" 
          onClick={onCancel}
          className="bg-transparent border-none cursor-pointer p-1.5 rounded-md text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-[#353444] hover:text-[#1F1E2A] dark:hover:text-white transition-all"
          aria-label={t('common.close')}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 p-3 rounded-lg mb-4 text-sm">
          {error}
        </div>
      )}

      {/* List Name */}
      <div className="mb-5">
        <label htmlFor="list-name" className="block font-medium text-sm mb-2 text-[#1F1E2A] dark:text-white">
          {t('savedLists.form.fields.name.label')} <span className="text-[#E65441]">*</span>
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
          className="w-full p-3 border border-gray-200 dark:border-[#3D3C4A] rounded-lg text-sm bg-white dark:bg-[#353444] text-[#1F1E2A] dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-[#E65441] focus:ring-[3px] focus:ring-[#E65441]/10 transition-all"
        />
      </div>

      {/* Description */}
      <div className="mb-5">
        <label htmlFor="list-description" className="block font-medium text-sm mb-2 text-[#1F1E2A] dark:text-white">
          {t('savedLists.form.fields.description.label')} <span className="text-gray-400 dark:text-gray-500 font-normal">({t('common.optional')})</span>
        </label>
        <textarea
          id="list-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t('savedLists.form.fields.description.placeholder')}
          maxLength={500}
          rows={2}
          className="w-full p-3 border border-gray-200 dark:border-[#3D3C4A] rounded-lg text-sm bg-white dark:bg-[#353444] text-[#1F1E2A] dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-[#E65441] focus:ring-[3px] focus:ring-[#E65441]/10 transition-all resize-y min-h-[60px]"
        />
      </div>

      {/* Form Actions */}
      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100 dark:border-[#3D3C4A]">
        <button 
          type="button" 
          onClick={onCancel}
          className="px-5 py-2.5 border border-gray-300 dark:border-[#3D3C4A] rounded-lg bg-white dark:bg-[#353444] font-medium text-sm text-gray-600 dark:text-gray-300 cursor-pointer transition-all hover:bg-gray-50 dark:hover:bg-[#404050] hover:border-gray-400 dark:hover:border-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isSubmitting}
        >
          {t('common.cancel')}
        </button>
        <button 
          type="submit"
          className="px-5 py-2.5 border-none rounded-lg bg-[#FF644A] text-white font-medium text-sm cursor-pointer transition-all hover:bg-[#E65441] disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isButtonDisabled}
        >
          {isSubmitting ? t('savedLists.form.actions.creating') : t('savedLists.form.actions.create')}
        </button>
      </div>
    </form>
  );
}