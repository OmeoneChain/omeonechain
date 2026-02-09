// components/recommendation/EditRecommendationModal.tsx
// Modal wrapper for editing an existing recommendation
// Fetches the existing recommendation data, then renders RecommendationCreationFlow in edit mode
//
// Usage:
//   <EditRecommendationModal
//     recommendationId="abc-123"
//     isOpen={showEditModal}
//     onClose={() => setShowEditModal(false)}
//     onSuccess={(id) => { /* refresh feed */ }}
//   />

import React, { useEffect, useState } from 'react';
import { X, Loader, AlertCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'react-hot-toast';

import RecommendationCreationFlow from './RecommendationCreationFlow';

interface EditRecommendationModalProps {
  recommendationId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (recommendationId: string) => void;
}

const PINATA_GATEWAY = process.env.NEXT_PUBLIC_PINATA_GATEWAY || 'https://gateway.pinata.cloud/ipfs';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://omeonechain-production.up.railway.app';

const EditRecommendationModal: React.FC<EditRecommendationModalProps> = ({
  recommendationId,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const t = useTranslations('recommendations');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [existingData, setExistingData] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch the existing recommendation when modal opens
  useEffect(() => {
    if (!isOpen || !recommendationId) return;

    const fetchRecommendation = async () => {
      setLoading(true);
      setError(null);

      try {
        const token = localStorage.getItem('omeone_auth_token');
        
        // Fetch the full recommendation data
        const response = await fetch(
          `${API_BASE_URL}/api/recommendations/${recommendationId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch recommendation (${response.status})`);
        }

        const data = await response.json();
        const rec = data.recommendation || data;

        // Transform API data into the shape RecommendationCreationFlow expects
        const editData = {
          id: rec.id,
          restaurant: rec.restaurants || rec.restaurant || {
            id: rec.restaurant_id,
            name: rec.location?.name || rec.restaurant_name || '',
            address: rec.location?.address || '',
            city: rec.location?.city || '',
            latitude: rec.location?.latitude,
            longitude: rec.location?.longitude,
          },
          title: rec.title || '',
          body: rec.content || rec.description || '',
          category: rec.category || '',
          overall_rating: rec.overall_rating || 7,
          cuisine_type: rec.cuisine_type || '',
          context_tags: rec.context_tags || [],
          
          // Dishes — may come from a nested relation or inline
          dishes: (rec.dishes || rec.recommendation_dishes || []).map((d: any, idx: number) => ({
            id: d.id || `dish-existing-${idx}`,
            name: d.name,
            rating: d.rating,
            notes: d.notes || '',
            would_order_again: d.would_order_again ?? true,
          })),
          
          // Aspects
          aspects: rec.aspects || rec.restaurant_aspects?.[0] || rec.restaurant_aspects || null,
          
          // Context
          context: rec.context || rec.recommendation_context?.[0] || rec.recommendation_context || null,
          
          // Photos — transform IPFS CIDs into the format the upload component can display
          existingPhotos: (rec.photos || []).map((photo: any, idx: number) => {
            const cid = typeof photo === 'string' ? photo : photo.ipfsHash || photo.cid || photo.url;
            const isIpfsHash = cid && !cid.startsWith('http');
            const url = isIpfsHash ? `${PINATA_GATEWAY}/${cid}` : cid;
            
            return {
              cid: isIpfsHash ? cid : null,
              url: url,
              caption: photo.caption || '',
              tag: null, // will be populated from photo_tagging if available
            };
          }),
          
          // Photo tagging
          photoTagging: rec.photo_tagging || [],
          
          // Metadata for edit logic
          created_at: rec.created_at,
          blockchain_status: rec.blockchain_status,
        };

        setExistingData(editData);
      } catch (err: any) {
        console.error('Failed to fetch recommendation for editing:', err);
        setError(err.message || 'Failed to load recommendation');
        toast.error(t('edit.fetchFailed') || 'Failed to load recommendation for editing');
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendation();
  }, [isOpen, recommendationId]);

  // Handle successful edit
  const handleEditSuccess = (id: string) => {
    toast.success(t('edit.success') || 'Recommendation updated!');
    onSuccess?.(id);
    onClose();
  };

  // Handle cancel
  const handleCancel = () => {
    if (isSubmitting) return; // Don't close while submitting
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9998] flex flex-col bg-[#FFF4E1] dark:bg-[#1F1E2A]">
      {/* Modal Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-[#2D2C3A] border-b border-gray-200 dark:border-[#3D3C4A] shadow-sm">
        <button
          onClick={handleCancel}
          disabled={isSubmitting}
          className="p-2 text-gray-500 dark:text-gray-400 hover:text-[#FF644A] transition-colors disabled:opacity-50"
        >
          <X className="h-5 w-5" />
        </button>
        <h2 className="text-lg font-semibold text-[#1F1E2A] dark:text-white">
          {t('edit.title') || 'Edit Recommendation'}
        </h2>
        <div className="w-9" /> {/* Spacer for centering */}
      </div>

      {/* Modal Body */}
      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader className="h-8 w-8 text-[#FF644A] animate-spin mb-4" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('edit.loading') || 'Loading recommendation...'}
            </p>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center py-20 px-4">
            <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
            <p className="text-sm text-red-600 dark:text-red-400 text-center mb-4">{error}</p>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-[#FF644A] text-white rounded-lg hover:bg-[#E65441] transition-colors text-sm"
            >
              {t('actions.close') || 'Close'}
            </button>
          </div>
        )}

        {!loading && !error && existingData && (
          <RecommendationCreationFlow
            editMode={true}
            editData={existingData}
            onSuccess={handleEditSuccess}
            onCancel={handleCancel}
            isSubmitting={isSubmitting}
            setIsSubmitting={setIsSubmitting}
          />
        )}
      </div>
    </div>
  );
};

export default EditRecommendationModal;