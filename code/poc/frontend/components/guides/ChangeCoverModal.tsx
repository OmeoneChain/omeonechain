// File: code/poc/frontend/components/guides/ChangeCoverModal.tsx
// Modal for changing a guide's cover image

'use client';

import { useState, useRef, useCallback } from 'react';
import { X, Upload, Camera, Image as ImageIcon, Loader2, RotateCcw } from 'lucide-react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';

interface ChangeCoverModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newCoverUrl: string, source?: string) => void;
  guideId: string;
  guideTitle: string;
  currentCoverUrl?: string;
  currentCoverSource?: string;
}

export default function ChangeCoverModal({
  isOpen,
  onClose,
  onSuccess,
  guideId,
  guideTitle,
  currentCoverUrl,
  currentCoverSource
}: ChangeCoverModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://omeonechain-production.up.railway.app';

  const handleFileSelect = useCallback((file: File) => {
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Please select a JPEG, PNG, or WebP image');
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      setError('Image must be less than 10MB');
      return;
    }

    setError(null);
    setSelectedFile(file);

    // Create preview URL
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const handleUpload = async () => {
    if (!selectedFile) return;

    const token = localStorage.getItem('omeone_auth_token');
    if (!token) {
      setError('Please log in to change the cover image');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('cover', selectedFile);

      const response = await fetch(`${API_BASE_URL}/lists/${guideId}/cover`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to upload cover image');
      }

      const data = await response.json();
      console.log('✅ Cover image uploaded:', data);
      
      onSuccess(data.cover_image_url, 'user_upload');
      handleClose();

    } catch (err) {
      console.error('Cover upload error:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  };

  const handleReset = async () => {
    const token = localStorage.getItem('omeone_auth_token');
    if (!token) {
      setError('Please log in to reset the cover image');
      return;
    }

    setIsResetting(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/lists/${guideId}/cover`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to reset cover image');
      }

      const data = await response.json();
      console.log('✅ Cover image reset:', data);
      
      onSuccess(data.cover_image_url || '', data.cover_image_source || 'google_places');
      handleClose();

    } catch (err) {
      console.error('Cover reset error:', err);
      setError(err instanceof Error ? err.message : 'Failed to reset image');
    } finally {
      setIsResetting(false);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setError(null);
    setDragActive(false);
    onClose();
  };

  const clearSelection = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-lg bg-white dark:bg-[#2D2C3A] rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-[#3D3C4A]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#FFF4E1] dark:bg-[#FF644A]/20 rounded-xl flex items-center justify-center">
                <Camera className="w-5 h-5 text-[#FF644A]" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[#1F1E2A] dark:text-white">
                  Change Cover Photo
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-[250px]">
                  {guideTitle}
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-[#353444] rounded-full transition-colors"
            >
              <X size={20} className="text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4 space-y-4">
            {/* Current Cover Preview (if exists and no new selection) */}
            {currentCoverUrl && !previewUrl && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Current Cover</p>
                <div className="relative h-32 rounded-xl overflow-hidden bg-gray-100 dark:bg-[#353444]">
                  <Image
                    src={currentCoverUrl}
                    alt="Current cover"
                    fill
                    className="object-cover opacity-60"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="px-3 py-1 bg-black/50 text-white text-sm rounded-full">
                      Current
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Upload Area */}
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`
                relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all
                ${dragActive 
                  ? 'border-[#FF644A] bg-[#FF644A]/5' 
                  : 'border-gray-300 dark:border-[#3D3C4A] hover:border-[#FF644A] hover:bg-gray-50 dark:hover:bg-[#353444]'
                }
                ${previewUrl ? 'p-0 border-0' : ''}
              `}
            >
              {previewUrl ? (
                /* Selected Image Preview */
                <div className="relative">
                  <div className="relative h-48 rounded-xl overflow-hidden">
                    <Image
                      src={previewUrl}
                      alt="Preview"
                      fill
                      className="object-cover"
                    />
                    {/* Overlay with aspect ratio preview */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                    <div className="absolute bottom-3 left-3 right-3">
                      <p className="text-white text-sm font-medium truncate drop-shadow-lg">
                        {guideTitle}
                      </p>
                    </div>
                  </div>
                  {/* Clear button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      clearSelection();
                    }}
                    className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors"
                  >
                    <X size={16} />
                  </button>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                    Click to choose a different image
                  </p>
                </div>
              ) : (
                /* Upload Prompt */
                <div className="space-y-3">
                  <div className="w-14 h-14 mx-auto bg-[#FFF4E1] dark:bg-[#FF644A]/20 rounded-full flex items-center justify-center">
                    <Upload className="w-7 h-7 text-[#FF644A]" />
                  </div>
                  <div>
                    <p className="text-base font-medium text-[#1F1E2A] dark:text-white">
                      Drop your image here
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      or click to browse
                    </p>
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    JPEG, PNG, or WebP • Max 10MB
                  </p>
                </div>
              )}
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleInputChange}
                className="hidden"
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            {/* Tips */}
            <div className="p-3 bg-[#FFF4E1] dark:bg-[#353444] rounded-xl">
              <p className="text-xs text-gray-600 dark:text-gray-400">
                <span className="font-medium">Tip:</span> Landscape images (16:9 or wider) work best for guide covers.
              </p>
            </div>

            {/* Reset to Auto Option - Only show if user has uploaded a custom cover */}
            {currentCoverSource === 'user_upload' && (
              <div className="text-center">
                <button
                  onClick={handleReset}
                  disabled={isResetting || isUploading}
                  className="text-sm text-gray-500 dark:text-gray-400 hover:text-[#FF644A] dark:hover:text-[#FF644A] transition-colors underline underline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isResetting ? 'Resetting...' : 'Reset to auto-generated photo'}
                </button>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Uses the photo from your first restaurant
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 dark:border-[#3D3C4A]">
            <button
              onClick={handleClose}
              disabled={isUploading}
              className="px-4 py-2.5 text-gray-600 dark:text-gray-400 hover:text-[#1F1E2A] dark:hover:text-white font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={!selectedFile || isUploading}
              className={`
                px-6 py-2.5 rounded-xl font-semibold transition-all flex items-center gap-2
                ${selectedFile && !isUploading
                  ? 'bg-[#FF644A] hover:bg-[#E65441] text-white'
                  : 'bg-gray-200 dark:bg-[#353444] text-gray-400 dark:text-gray-500 cursor-not-allowed'
                }
              `}
            >
              {isUploading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <ImageIcon size={18} />
                  Save Cover
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}