// components/lists/CreateListFlow.tsx
// SINGLE SCREEN VERSION - matches RecommendationCreationFlow pattern
// Uses RestaurantAutocomplete component for restaurant search
// UPDATED: Added reordering functionality (up/down arrows + drag-and-drop)
// Mobile-first: Arrow buttons as primary, drag-and-drop as desktop enhancement

'use client';

import React, { useState, useMemo, useCallback, useRef } from 'react';
import { X, Plus, Lock, Globe, Loader, ListPlus, ChevronUp, ChevronDown, GripVertical } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useTranslations } from 'next-intl';

import RestaurantAutocomplete from '../../../components/restaurant/RestaurantAutocomplete';
import { useAuth } from '../../../hooks/useAuth';

// ============================================
// INTERFACES
// ============================================

interface Restaurant {
  id: number | string;  // Allow both number and string IDs
  name: string;
  address?: string;
  city?: string;
  cuisine?: string;
  category?: string;
}

interface CreateListFlowProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (listId: string) => void;
}

// ============================================
// COMPONENT
// ============================================

const CreateListFlow: React.FC<CreateListFlowProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const t = useTranslations('create');
  const { user, isAuthenticated } = useAuth();

  // ============================================
  // STATE
  // ============================================

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  // Only 'public' or 'private' to match backend schema
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');
  const [selectedRestaurants, setSelectedRestaurants] = useState<Restaurant[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Drag-and-drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragCounter = useRef(0);

  // ============================================
  // VALIDATION
  // ============================================

  const canCreate = useMemo(() => {
    const hasTitle = title.trim().length >= 3;
    const hasRestaurants = selectedRestaurants.length >= 1;
    return hasTitle && hasRestaurants && !isSubmitting;
  }, [title, selectedRestaurants, isSubmitting]);

  // ============================================
  // REORDERING HANDLERS
  // ============================================

  const handleMoveUp = useCallback((index: number) => {
    if (index <= 0) return;
    
    setSelectedRestaurants(prev => {
      const newList = [...prev];
      [newList[index - 1], newList[index]] = [newList[index], newList[index - 1]];
      return newList;
    });
  }, []);

  const handleMoveDown = useCallback((index: number) => {
    setSelectedRestaurants(prev => {
      if (index >= prev.length - 1) return prev;
      
      const newList = [...prev];
      [newList[index], newList[index + 1]] = [newList[index + 1], newList[index]];
      return newList;
    });
  }, []);

  // ============================================
  // DRAG-AND-DROP HANDLERS (Desktop Enhancement)
  // ============================================

  const handleDragStart = useCallback((e: React.DragEvent<HTMLDivElement>, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
    
    // Add a slight delay to show the dragging state
    setTimeout(() => {
      const element = e.target as HTMLElement;
      element.style.opacity = '0.5';
    }, 0);
  }, []);

  const handleDragEnd = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    const element = e.target as HTMLElement;
    element.style.opacity = '1';
    setDraggedIndex(null);
    setDragOverIndex(null);
    dragCounter.current = 0;
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    dragCounter.current++;
    
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  }, [draggedIndex]);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    dragCounter.current--;
    
    if (dragCounter.current === 0) {
      setDragOverIndex(null);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>, dropIndex: number) => {
    e.preventDefault();
    
    const dragIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
    
    if (isNaN(dragIndex) || dragIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      dragCounter.current = 0;
      return;
    }

    setSelectedRestaurants(prev => {
      const newList = [...prev];
      const [draggedItem] = newList.splice(dragIndex, 1);
      newList.splice(dropIndex, 0, draggedItem);
      return newList;
    });

    setDraggedIndex(null);
    setDragOverIndex(null);
    dragCounter.current = 0;
    
    toast.success(t('lists.createFlow.toast.reordered') || 'List reordered');
  }, [t]);

  // ============================================
  // OTHER HANDLERS
  // ============================================

  const handleRestaurantSelect = useCallback((restaurant: Restaurant) => {
    // Avoid duplicates - use String() for comparison since IDs might be string or number
    if (selectedRestaurants.some(r => String(r.id) === String(restaurant.id))) {
      toast.error(t('lists.createFlow.toast.alreadyAdded') || 'Restaurant already added');
      return;
    }
    
    setSelectedRestaurants(prev => [...prev, restaurant]);
    toast.success(t('lists.createFlow.toast.added', { name: restaurant.name }) || `${restaurant.name} added`);
  }, [selectedRestaurants, t]);

  const handleRemoveRestaurant = useCallback((restaurantId: number | string) => {
    setSelectedRestaurants(prev => prev.filter(r => String(r.id) !== String(restaurantId)));
  }, []);

  const handleClose = useCallback(() => {
    // Reset form
    setTitle('');
    setDescription('');
    setVisibility('public');
    setSelectedRestaurants([]);
    setDraggedIndex(null);
    setDragOverIndex(null);
    onClose();
  }, [onClose]);

  const handleSubmit = async () => {
    if (!isAuthenticated || !user) {
      toast.error(t('lists.createFlow.errors.loginRequired') || 'Please log in to create a list');
      return;
    }

    if (!title.trim() || title.trim().length < 3) {
      toast.error(t('lists.createFlow.errors.titleRequired') || 'Please enter a title (at least 3 characters)');
      return;
    }

    if (selectedRestaurants.length === 0) {
      toast.error(t('lists.createFlow.errors.restaurantRequired') || 'Please add at least one restaurant');
      return;
    }

    setIsSubmitting(true);

    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://redesigned-lamp-q74wgggqq9jjfxqjp-3001.app.github.dev';

      // Ensure restaurant IDs are numbers (backend expects array of numbers)
      // The array order determines sort_order in the database
      const restaurantIds = selectedRestaurants
        .map(r => {
          const id = typeof r.id === 'string' ? parseInt(r.id, 10) : r.id;
          return id;
        })
        .filter(id => !isNaN(id));

      if (restaurantIds.length === 0) {
        toast.error(t('lists.createFlow.errors.restaurantRequired') || 'Please add at least one valid restaurant');
        setIsSubmitting(false);
        return;
      }

      const requestBody = {
        title: title.trim(),
        description: description.trim() || null,
        visibility: visibility,  // Already only 'public' or 'private'
        restaurant_ids: restaurantIds,  // Array order = ranking order
      };

      console.log('📋 Creating list with:', requestBody);

      const response = await fetch(`${API_BASE_URL}/lists`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('omeone_auth_token')}`,
        },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('❌ API Error:', result);
        throw new Error(result.error || result.message || `Failed with status ${response.status}`);
      }

      if (!result.success || !result.list?.id) {
        console.error('❌ Invalid response:', result);
        throw new Error(t('lists.createFlow.errors.invalidResponse') || 'Invalid response from server');
      }

      console.log('✅ List created successfully:', result.list);
      toast.success(t('lists.createFlow.toast.created') || 'List created successfully!');
      onSuccess?.(result.list.id);
      handleClose();

    } catch (error: any) {
      console.error('Failed to create list:', error);
      toast.error(error.message || t('lists.createFlow.errors.createFailed') || 'Failed to create list');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============================================
  // RENDER
  // ============================================

  if (!isOpen) return null;

  // Only 2 visibility options to match backend ('public' and 'private')
  const visibilityOptions = [
    { 
      value: 'public' as const, 
      icon: Globe, 
      label: t('lists.createFlow.form.visibility.public') || 'Public'
    },
    { 
      value: 'private' as const, 
      icon: Lock, 
      label: t('lists.createFlow.form.visibility.private') || 'Private'
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#FF644A]/10 rounded-xl">
              <ListPlus className="h-6 w-6 text-[#FF644A]" />
            </div>
            <h2 className="text-xl font-bold text-[#1F1E2A]">
              {t('lists.createFlow.title') || 'Create a Curated List'}
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
            aria-label={t('lists.createFlow.aria.close') || 'Close'}
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-[#1F1E2A] mb-2">
              {t('lists.createFlow.form.titleLabel') || 'List title'} <span className="text-[#FF644A]">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('lists.createFlow.form.titlePlaceholder') || 'e.g., Best Tacos in Town'}
              maxLength={100}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#FF644A] focus:border-transparent transition-all"
            />
            <p className="text-xs text-gray-400 mt-1 text-right">
              {title.length}/100 {t('lists.createFlow.form.characters') || 'characters'}
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-[#1F1E2A] mb-2">
              {t('lists.createFlow.form.descriptionLabel') || 'Description'}
              <span className="text-xs text-gray-400 ml-2">({t('lists.createFlow.form.optional') || 'optional'})</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('lists.createFlow.form.descriptionPlaceholder') || "What's this list about?"}
              rows={3}
              maxLength={500}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#FF644A] focus:border-transparent transition-all resize-none"
            />
          </div>

          {/* Visibility */}
          <div>
            <label className="block text-sm font-semibold text-[#1F1E2A] mb-2">
              {t('lists.createFlow.form.visibilityLabel') || 'Who can see this list?'}
            </label>
            <div className="grid grid-cols-2 gap-3">
              {visibilityOptions.map((option) => {
                const Icon = option.icon;
                const isSelected = visibility === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setVisibility(option.value)}
                    className={`p-4 rounded-xl text-center transition-all ${
                      isSelected
                        ? 'bg-[#FF644A] text-white shadow-md'
                        : 'bg-gray-50 hover:bg-gray-100 text-[#1F1E2A] border border-gray-200'
                    }`}
                  >
                    <Icon className={`h-5 w-5 mx-auto mb-2 ${isSelected ? 'text-white' : 'text-gray-500'}`} />
                    <span className="text-xs font-medium block">{option.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Restaurant Search */}
          <div>
            <label className="block text-sm font-semibold text-[#1F1E2A] mb-2">
              {t('lists.createFlow.search.label') || 'Search for restaurants to add'} <span className="text-[#FF644A]">*</span>
            </label>
            <RestaurantAutocomplete
              onSelect={handleRestaurantSelect}
              placeholder={t('lists.createFlow.search.placeholder') || 'Type restaurant name...'}
              clearAfterSelect={true}
            />
          </div>

          {/* Selected Restaurants with Reordering */}
          {selectedRestaurants.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-semibold text-[#1F1E2A]">
                  {t('lists.createFlow.selected.title') || 'Selected restaurants'} ({selectedRestaurants.length})
                </label>
                {selectedRestaurants.length > 1 && (
                  <span className="text-xs text-gray-400">
                    {t('lists.createFlow.selected.reorderHint') || 'Use arrows to reorder'}
                  </span>
                )}
              </div>
              
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {selectedRestaurants.map((restaurant, index) => {
                  const isFirst = index === 0;
                  const isLast = index === selectedRestaurants.length - 1;
                  const isDragging = draggedIndex === index;
                  const isDragOver = dragOverIndex === index;
                  
                  return (
                    <div
                      key={restaurant.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, index)}
                      onDragEnd={handleDragEnd}
                      onDragEnter={(e) => handleDragEnter(e, index)}
                      onDragLeave={handleDragLeave}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, index)}
                      className={`
                        flex items-center justify-between p-3 rounded-xl transition-all
                        ${isDragging ? 'opacity-50 scale-[0.98]' : ''}
                        ${isDragOver ? 'bg-[#FF644A]/20 border-2 border-dashed border-[#FF644A]' : 'bg-[#FFF4E1]'}
                        ${!isDragging && !isDragOver ? 'hover:bg-[#FFE8D4]' : ''}
                        cursor-grab active:cursor-grabbing
                      `}
                    >
                      {/* Left side: Drag handle + Number + Info */}
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {/* Drag handle (visible on desktop) */}
                        <div className="hidden sm:flex items-center text-gray-400 hover:text-gray-600 cursor-grab">
                          <GripVertical className="h-4 w-4" />
                        </div>
                        
                        {/* Rank number */}
                        <span className="flex-shrink-0 flex items-center justify-center w-7 h-7 bg-[#FF644A] text-white text-xs font-bold rounded-full">
                          {index + 1}
                        </span>
                        
                        {/* Restaurant info */}
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-[#1F1E2A] text-sm truncate">{restaurant.name}</p>
                          {(restaurant.cuisine || restaurant.category) && (
                            <p className="text-xs text-gray-500 truncate">{restaurant.cuisine || restaurant.category}</p>
                          )}
                        </div>
                      </div>
                      
                      {/* Right side: Reorder arrows + Remove button */}
                      <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                        {/* Up arrow */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMoveUp(index);
                          }}
                          disabled={isFirst}
                          className={`
                            p-2 rounded-lg transition-all touch-manipulation
                            ${isFirst 
                              ? 'text-gray-300 cursor-not-allowed' 
                              : 'text-gray-500 hover:bg-[#FF644A]/20 hover:text-[#FF644A] active:bg-[#FF644A]/30'
                            }
                          `}
                          aria-label={t('lists.createFlow.selected.moveUp') || 'Move up'}
                        >
                          <ChevronUp className="h-5 w-5" />
                        </button>
                        
                        {/* Down arrow */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMoveDown(index);
                          }}
                          disabled={isLast}
                          className={`
                            p-2 rounded-lg transition-all touch-manipulation
                            ${isLast 
                              ? 'text-gray-300 cursor-not-allowed' 
                              : 'text-gray-500 hover:bg-[#FF644A]/20 hover:text-[#FF644A] active:bg-[#FF644A]/30'
                            }
                          `}
                          aria-label={t('lists.createFlow.selected.moveDown') || 'Move down'}
                        >
                          <ChevronDown className="h-5 w-5" />
                        </button>
                        
                        {/* Divider */}
                        <div className="w-px h-6 bg-gray-200 mx-1" />
                        
                        {/* Remove button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveRestaurant(restaurant.id);
                          }}
                          className="p-2 hover:bg-red-100 active:bg-red-200 rounded-lg transition-colors touch-manipulation"
                          aria-label={t('lists.createFlow.selected.remove') || 'Remove'}
                        >
                          <X className="h-4 w-4 text-red-500" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Reordering tip for longer lists */}
              {selectedRestaurants.length >= 3 && (
                <p className="text-xs text-gray-400 mt-2 text-center hidden sm:block">
                  {t('lists.createFlow.selected.dragHint') || 'Tip: Drag items to reorder on desktop'}
                </p>
              )}
            </div>
          )}

          {/* Empty state hint */}
          {selectedRestaurants.length === 0 && (
            <div className="text-center py-6 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
              <Plus className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">
                {t('lists.createFlow.search.hint') || 'Search and add restaurants to your list'}
              </p>
            </div>
          )}
        </div>

        {/* Footer with action buttons */}
        <div className="p-6 border-t border-gray-100 bg-gray-50">
          <div className="flex gap-3">
            <button
              onClick={handleClose}
              className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-[#1F1E2A] font-medium hover:bg-gray-100 transition-colors"
            >
              {t('lists.createFlow.buttons.cancel') || 'Cancel'}
            </button>
            <button
              onClick={handleSubmit}
              disabled={!canCreate}
              className="flex-1 px-4 py-3 bg-[#FF644A] text-white rounded-xl font-medium hover:bg-[#E65441] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader className="h-4 w-4 animate-spin" />
                  {t('lists.createFlow.buttons.creating') || 'Creating...'}
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  {t('lists.createFlow.buttons.create') || 'Create List'}
                </>
              )}
            </button>
          </div>
          
          {/* Validation hint */}
          {!canCreate && !isSubmitting && (
            <p className="text-xs text-center text-gray-400 mt-3">
              {title.trim().length < 3 
                ? (t('lists.createFlow.errors.titleRequired') || 'Please enter a title (at least 3 characters)')
                : selectedRestaurants.length === 0
                  ? (t('lists.createFlow.errors.restaurantRequired') || 'Please add at least one restaurant')
                  : ''
              }
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateListFlow;