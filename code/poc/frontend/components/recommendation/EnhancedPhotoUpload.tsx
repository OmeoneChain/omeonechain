// components/recommendation/EnhancedPhotoUpload.tsx
// UPDATED: Safe Capacitor Camera integration with file input fallback
// FIXED: Compress images BEFORE size check (Jan 30, 2026)
// NEW: Crop/reposition modal before upload (Feb 8, 2026)
// NEW: Re-crop support for existing IPFS photos in edit mode (Feb 8, 2026)
// FIXED: Safe area insets for iPhone, free-pan cropping (Feb 9, 2026)
// UPDATED: Single "Add Photo" zone — removed redundant Take Photo / From Gallery buttons (Feb 14, 2026)
// NEW: Crop queue — select multiple photos, crop one-by-one (Feb 14, 2026)
// NEW: Per-photo annotation — "What's in this photo?" + auto-rating slider (Feb 14, 2026)

import React, { useState, useRef, useCallback } from 'react';
import { Camera, Upload, X, Loader, AlertCircle, ZoomIn, ZoomOut, Check, Crop, Star } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'react-hot-toast';
import Cropper from 'react-easy-crop';
import type { Area, Point } from 'react-easy-crop';

// Safe import of Capacitor
let CapacitorCore: any = null;
try {
  CapacitorCore = require('@capacitor/core').Capacitor;
} catch (e) {
  console.log('Capacitor not available');
}

// ─── Types ───────────────────────────────────────────────────────────

export interface PhotoData {
  file: File;
  preview: string;
  timestamp: Date;
  // Annotation fields (NEW — Feb 14, 2026)
  annotation?: string;        // Free text: "Lasagna", "the patio", "cocktail menu", etc.
  dishRating?: number;        // 0-10 rating (only if user confirms this is a dish)
  showRating?: boolean;       // UI state: undefined=auto-show when text exists, false=user dismissed
}

/** Existing photos loaded from the server during edit mode */
export interface ExistingPhoto {
  cid: string | null;
  url: string;
  caption?: string;
  tag?: string | null;
  isModified?: boolean;
  newFile?: File;
  // Annotation fields (NEW)
  annotation?: string;
  dishRating?: number;
  showRating?: boolean;
}

interface PhotoUploadProps {
  photos: PhotoData[];
  onPhotosChange: (photos: PhotoData[]) => void;
  maxPhotos?: number;
  maxSizeBytes?: number;
  maxSizeBeforeCompressionMB?: number;
  existingPhotos?: ExistingPhoto[];
  onExistingPhotosChange?: (photos: ExistingPhoto[]) => void;
}

interface CropState {
  imageUrl: string;
  originalFile?: File;
  existingIndex?: number;
}

// ─── Crop Helper ─────────────────────────────────────────────────────

async function getCroppedImageFile(
  imageSrc: string,
  pixelCrop: Area,
  fileName: string
): Promise<File> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Canvas toBlob failed'));
          return;
        }
        const file = new File([blob], fileName, {
          type: 'image/jpeg',
          lastModified: Date.now(),
        });
        resolve(file);
      },
      'image/jpeg',
      0.92
    );
  });
}

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener('load', () => resolve(img));
    img.addEventListener('error', (err) => reject(err));
    img.setAttribute('crossOrigin', 'anonymous');
    img.src = url;
  });
}

// ─── Crop Modal Component ────────────────────────────────────────────

interface CropModalProps {
  imageUrl: string;
  onConfirm: (croppedAreaPixels: Area) => void;
  onCancel: () => void;
  t: ReturnType<typeof useTranslations>;
  queuePosition?: number;
  queueTotal?: number;
}

const CropModal: React.FC<CropModalProps> = ({ imageUrl, onConfirm, onCancel, t, queuePosition, queueTotal }) => {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const onCropComplete = useCallback((_croppedArea: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleConfirm = () => {
    if (croppedAreaPixels) {
      onConfirm(croppedAreaPixels);
    }
  };

  const showQueueIndicator = queuePosition !== undefined && queueTotal !== undefined && queueTotal > 1;

  return (
    <div className="fixed inset-0 z-[9999] bg-black flex flex-col">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 bg-black/80 backdrop-blur-sm border-b border-white/10"
        style={{ paddingTop: 'max(env(safe-area-inset-top, 12px), 12px)' }}
      >
        <button
          onClick={onCancel}
          className="text-white/80 hover:text-white px-3 py-2 rounded-lg transition-colors text-sm font-medium min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          {t('photoUpload.crop.cancel') || 'Cancel'}
        </button>
        <div className="text-center">
          <span className="text-white text-sm font-medium">
            {t('photoUpload.crop.title') || 'Adjust Photo'}
          </span>
          {showQueueIndicator && (
            <p className="text-white/50 text-xs mt-0.5">
              Photo {queuePosition} of {queueTotal}
            </p>
          )}
        </div>
        <button
          onClick={handleConfirm}
          className="bg-[#FF644A] text-white px-4 py-2 rounded-lg hover:bg-[#E65441] transition-colors text-sm font-medium flex items-center gap-1.5 min-h-[44px]"
        >
          <Check className="h-4 w-4" />
          {t('photoUpload.crop.confirm') || 'Done'}
        </button>
      </div>

      {/* Crop area */}
      <div className="relative flex-1">
        <Cropper
          image={imageUrl}
          crop={crop}
          zoom={zoom}
          minZoom={0.5}
          maxZoom={4}
          aspect={4 / 3}
          restrictPosition={false}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
          showGrid={true}
          cropShape="rect"
          objectFit="contain"
          style={{
            containerStyle: { background: '#000' },
            cropAreaStyle: { border: '2px solid rgba(255, 100, 74, 0.8)' },
          }}
        />
      </div>

      {/* Bottom controls */}
      <div
        className="px-6 py-4 bg-black/80 backdrop-blur-sm border-t border-white/10"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 16px), 16px)' }}
      >
        <div className="flex items-center gap-3">
          <ZoomOut className="h-4 w-4 text-white/60 flex-shrink-0" />
          <input
            type="range"
            min={0.5}
            max={4}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="flex-1 h-1 bg-white/20 rounded-full appearance-none cursor-pointer
                       [&::-webkit-slider-thumb]:appearance-none
                       [&::-webkit-slider-thumb]:w-5
                       [&::-webkit-slider-thumb]:h-5
                       [&::-webkit-slider-thumb]:rounded-full
                       [&::-webkit-slider-thumb]:bg-[#FF644A]
                       [&::-webkit-slider-thumb]:shadow-lg
                       [&::-webkit-slider-thumb]:cursor-pointer"
          />
          <ZoomIn className="h-4 w-4 text-white/60 flex-shrink-0" />
        </div>
        <p className="text-white/40 text-xs text-center mt-2">
          {t('photoUpload.crop.hint') || 'Drag to reposition · Pinch to zoom · 4:3 frame'}
        </p>
      </div>
    </div>
  );
};

// ─── Per-Photo Rating Slider ─────────────────────────────────────────
// The text input is now rendered inline next to the photo thumbnail.
// This component only renders the full-width rating slider below the card.

interface RatingSliderProps {
  dishRating?: number;
  showRating?: boolean;
  onChange: (updates: { dishRating?: number; showRating?: boolean }) => void;
  t: ReturnType<typeof useTranslations>;
}

const PhotoRatingSlider: React.FC<RatingSliderProps> = ({ dishRating, showRating, onChange, t }) => {
  if (showRating === false) return null;

  const handleDismissRating = () => {
    onChange({ showRating: false, dishRating: undefined });
  };

  const formatRating = (r: number) => (Number.isInteger(r) ? `${r}.0` : r.toFixed(1));

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-[#FFF4E1] dark:bg-[#FF644A]/10 rounded-b-xl border border-t-0 border-gray-200 dark:border-[#3D3C4A] animate-in fade-in slide-in-from-top-1 duration-200">
      <Star className="h-3.5 w-3.5 text-[#FF644A] fill-[#FF644A] flex-shrink-0" />
      <input
        type="range"
        min="0"
        max="10"
        step="0.5"
        value={dishRating ?? 7}
        onChange={e => onChange({ dishRating: parseFloat(e.target.value) })}
        className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer touch-slider
                   [&::-webkit-slider-thumb]:appearance-none
                   [&::-webkit-slider-thumb]:w-5
                   [&::-webkit-slider-thumb]:h-5
                   [&::-webkit-slider-thumb]:rounded-full
                   [&::-webkit-slider-thumb]:bg-[#FF644A]
                   [&::-webkit-slider-thumb]:shadow-md
                   [&::-webkit-slider-thumb]:cursor-pointer"
        style={{
          background: 'linear-gradient(to right, #ef4444 0%, #eab308 50%, #22c55e 100%)',
        }}
      />
      <span className="text-sm font-bold text-[#FF644A] min-w-[42px] text-right">
        {formatRating(dishRating ?? 7)}/10
      </span>
      <button
        onClick={handleDismissRating}
        className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded transition-colors flex-shrink-0"
        title={t('photos.annotation.dismissRating') || 'Not a dish'}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};

// ─── Main Component ──────────────────────────────────────────────────

const EnhancedPhotoUpload: React.FC<PhotoUploadProps> = ({
  photos,
  onPhotosChange,
  maxPhotos = 5,
  maxSizeBytes = 2 * 1024 * 1024,
  maxSizeBeforeCompressionMB = 50,
  existingPhotos = [],
  onExistingPhotosChange,
}) => {
  const t = useTranslations('recommendations');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [cropState, setCropState] = useState<CropState | null>(null);

  // ── Crop Queue (NEW — Feb 14, 2026) ──────────────────────────────
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [cropQueueIndex, setCropQueueIndex] = useState(0);

  const totalPhotoCount = existingPhotos.length + photos.length;

  // ── Compression ──────────────────────────────────────────────────

  const compressImage = (file: File, quality: number = 0.85, maxDimension: number = 1200): Promise<File> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = new Image();

      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > maxDimension) {
          height = (height * maxDimension) / width;
          width = maxDimension;
        } else if (height > maxDimension) {
          width = (width * maxDimension) / height;
          height = maxDimension;
        }
        canvas.width = width;
        canvas.height = height;
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, '.jpg'), {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              console.log(`📷 Compressed: ${(file.size / 1024 / 1024).toFixed(2)}MB → ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`);
              resolve(compressedFile);
            } else {
              reject(new Error('Failed to compress image'));
            }
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = () => { resolve(file); };
      img.src = URL.createObjectURL(file);
    });
  };

  const compressToTargetSize = async (file: File, targetSizeBytes: number): Promise<File> => {
    if (file.size <= targetSizeBytes && file.type === 'image/jpeg') return file;

    const attempts = [
      { quality: 0.85, maxDim: 1200 },
      { quality: 0.75, maxDim: 1200 },
      { quality: 0.65, maxDim: 1000 },
      { quality: 0.50, maxDim: 800 },
      { quality: 0.40, maxDim: 600 },
    ];

    let compressedFile = file;
    for (const attempt of attempts) {
      setProcessingStatus(`Compressing (${Math.round(attempt.quality * 100)}% quality)...`);
      compressedFile = await compressImage(file, attempt.quality, attempt.maxDim);
      if (compressedFile.size <= targetSizeBytes) return compressedFile;
    }
    return compressedFile;
  };

  // ── Process a single file ────────────────────────────────────────

  const processFile = async (file: File): Promise<PhotoData | null> => {
    try {
      const maxBeforeBytes = maxSizeBeforeCompressionMB * 1024 * 1024;
      if (file.size > maxBeforeBytes) {
        toast.error(`${file.name} is too large (max ${maxSizeBeforeCompressionMB}MB)`);
        return null;
      }
      setProcessingStatus(`Processing ${file.name}...`);
      const compressedFile = await compressToTargetSize(file, maxSizeBytes);
      const finalSizeMB = compressedFile.size / 1024 / 1024;
      if (compressedFile.size > maxSizeBytes * 1.5) {
        toast.error(`${file.name} is still too large after compression (${finalSizeMB.toFixed(1)}MB).`);
        return null;
      } else if (compressedFile.size > maxSizeBytes) {
        toast(`${file.name}: ${finalSizeMB.toFixed(1)}MB (larger than ideal)`, { icon: '⚠️', duration: 3000 });
      }
      return {
        file: compressedFile,
        preview: URL.createObjectURL(compressedFile),
        timestamp: new Date(),
      };
    } catch (error) {
      console.error('Error processing file:', error);
      toast.error(`Failed to process ${file.name}`);
      return null;
    }
  };

  // ── Crop queue helpers ───────────────────────────────────────────

  const openCropForFile = (file: File) => {
    const imageUrl = URL.createObjectURL(file);
    setCropState({ imageUrl, originalFile: file });
  };

  const advanceQueueOrClose = (currentQueue: File[], currentIndex: number) => {
    const nextIndex = currentIndex + 1;
    if (nextIndex < currentQueue.length) {
      setCropQueueIndex(nextIndex);
      openCropForFile(currentQueue[nextIndex]);
    } else {
      // Queue complete
      setPendingFiles([]);
      setCropQueueIndex(0);
      setCropState(null);
    }
  };

  // ── Re-crop existing photo ───────────────────────────────────────

  const openRecropModal = (index: number) => {
    const photo = existingPhotos[index];
    if (!photo) return;
    setCropState({ imageUrl: photo.url, existingIndex: index });
  };

  // ── Handle crop confirm ──────────────────────────────────────────

  const handleCropConfirm = useCallback(
    async (croppedAreaPixels: Area) => {
      if (!cropState) return;

      setIsProcessing(true);

      try {
        if (cropState.existingIndex !== undefined) {
          // ── RE-CROP of an existing photo ──
          setProcessingStatus('Re-cropping photo...');

          const croppedFile = await getCroppedImageFile(
            cropState.imageUrl,
            croppedAreaPixels,
            `recrop-${Date.now()}.jpg`
          );

          const compressedFile = await compressToTargetSize(croppedFile, maxSizeBytes);
          const newPreviewUrl = URL.createObjectURL(compressedFile);

          const updatedExisting = [...existingPhotos];
          updatedExisting[cropState.existingIndex] = {
            ...updatedExisting[cropState.existingIndex],
            url: newPreviewUrl,
            isModified: true,
            newFile: compressedFile,
          };
          onExistingPhotosChange?.(updatedExisting);

          toast.success(t('photoUpload.success.recropped') || 'Photo re-cropped!');

          // Re-crop doesn't use the queue — just close
          if (cropState.originalFile) URL.revokeObjectURL(cropState.imageUrl);
          setCropState(null);
        } else if (cropState.originalFile) {
          // ── CROP of a new photo (may be part of a queue) ──
          setProcessingStatus('Cropping photo...');

          const croppedFile = await getCroppedImageFile(
            cropState.imageUrl,
            croppedAreaPixels,
            cropState.originalFile.name.replace(/\.[^/.]+$/, '-cropped.jpg')
          );

          const photoData = await processFile(croppedFile);
          if (photoData) {
            onPhotosChange([...photos, photoData]);
          }

          // Clean up current blob URL
          URL.revokeObjectURL(cropState.imageUrl);

          // Advance queue or close
          advanceQueueOrClose(pendingFiles, cropQueueIndex);
        }
      } catch (error) {
        console.error('Crop failed:', error);
        toast.error(t('photoUpload.errors.cropFailed') || 'Failed to crop photo. Please try again.');
        if (cropState.originalFile) URL.revokeObjectURL(cropState.imageUrl);
        advanceQueueOrClose(pendingFiles, cropQueueIndex);
      } finally {
        setIsProcessing(false);
        setProcessingStatus('');
      }
    },
    [cropState, photos, existingPhotos, pendingFiles, cropQueueIndex, onPhotosChange, onExistingPhotosChange, t]
  );

  const handleCropCancel = useCallback(() => {
    if (cropState?.originalFile) {
      URL.revokeObjectURL(cropState.imageUrl);
    }

    if (cropState?.existingIndex !== undefined) {
      // Re-crop cancel — just close
      setCropState(null);
    } else {
      // Queue cancel — skip to next photo
      advanceQueueOrClose(pendingFiles, cropQueueIndex);
    }
  }, [cropState, pendingFiles, cropQueueIndex]);

  // ── File selection ───────────────────────────────────────────────

  const handleFileSelect = useCallback(
    async (files: FileList) => {
      if (totalPhotoCount >= maxPhotos) {
        toast.error(t('photoUpload.errors.maxPhotos', { max: maxPhotos }));
        return;
      }
      const imageFiles = Array.from(files).filter((file) => {
        if (!file.type.startsWith('image/')) {
          toast.error(t('photoUpload.errors.notImage', { name: file.name }));
          return false;
        }
        return true;
      });
      if (imageFiles.length === 0) return;

      const filesToProcess = imageFiles.slice(0, maxPhotos - totalPhotoCount);

      // Queue all files and start crop for the first one
      setPendingFiles(filesToProcess);
      setCropQueueIndex(0);
      openCropForFile(filesToProcess[0]);
    },
    [totalPhotoCount, maxPhotos, t]
  );

  // ── Trigger file input (with Capacitor fallback for native) ──────

  const triggerFileInput = useCallback(async () => {
    if (totalPhotoCount >= maxPhotos) {
      toast.error(t('photoUpload.errors.maxPhotos', { max: maxPhotos }));
      return;
    }

    const isNative = CapacitorCore?.isNativePlatform?.() ?? false;

    if (isNative) {
      // On native Capacitor: use native camera/gallery picker
      try {
        const { Camera: CapacitorCamera, CameraResultType, CameraSource } = await import('@capacitor/camera');
        if (typeof CapacitorCamera?.getPhoto !== 'function') {
          fileInputRef.current?.click();
          return;
        }

        try {
          const permissions = await CapacitorCamera.checkPermissions();
          if (permissions.photos === 'denied') {
            const requested = await CapacitorCamera.requestPermissions();
            if (requested.photos === 'denied') {
              toast.error('Photo permission required. Please enable in Settings.');
              fileInputRef.current?.click();
              return;
            }
          }
        } catch (permError) { /* try anyway */ }

        const image = await CapacitorCamera.getPhoto({
          quality: 90,
          allowEditing: false,
          resultType: CameraResultType.DataUrl,
          source: CameraSource.Prompt, // Let user choose camera or gallery
          width: 2400,
          height: 2400,
        });

        if (image.dataUrl) {
          const response = await fetch(image.dataUrl);
          const blob = await response.blob();
          const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
          setPendingFiles([file]);
          setCropQueueIndex(0);
          openCropForFile(file);
        }
      } catch (error: any) {
        if (error.message?.includes('User cancelled') || error.message?.includes('cancelled')) return;
        fileInputRef.current?.click();
      }
    } else {
      // On web/mobile web: use standard file input (OS shows Photo Library, Take Photo, Choose Files)
      fileInputRef.current?.click();
    }
  }, [totalPhotoCount, maxPhotos, t]);

  // ── Drag & drop ──────────────────────────────────────────────────

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer.files) handleFileSelect(e.dataTransfer.files);
    },
    [handleFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); }, []);

  // ── Remove photos ────────────────────────────────────────────────

  const removeNewPhoto = (index: number) => {
    const newPhotos = [...photos];
    URL.revokeObjectURL(newPhotos[index].preview);
    newPhotos.splice(index, 1);
    onPhotosChange(newPhotos);
  };

  const removeExistingPhoto = (index: number) => {
    const updated = [...existingPhotos];
    updated.splice(index, 1);
    onExistingPhotosChange?.(updated);
  };

  // ── Update annotations ───────────────────────────────────────────

  const updateNewPhotoAnnotation = (index: number, updates: Partial<Pick<PhotoData, 'annotation' | 'dishRating' | 'showRating'>>) => {
    const updatedPhotos = [...photos];
    updatedPhotos[index] = { ...updatedPhotos[index], ...updates };

    // If annotation cleared, reset rating state
    if ('annotation' in updates && !updates.annotation?.trim()) {
      updatedPhotos[index].showRating = undefined;
      updatedPhotos[index].dishRating = undefined;
    }

    onPhotosChange(updatedPhotos);
  };

  const updateExistingPhotoAnnotation = (index: number, updates: Partial<Pick<ExistingPhoto, 'annotation' | 'dishRating' | 'showRating'>>) => {
    const updated = [...existingPhotos];
    updated[index] = { ...updated[index], ...updates };

    if ('annotation' in updates && !updates.annotation?.trim()) {
      updated[index].showRating = undefined;
      updated[index].dishRating = undefined;
    }

    onExistingPhotosChange?.(updated);
  };

  // ── Calculated values ────────────────────────────────────────────

  const newPhotoSizeMB = photos.reduce((sum, p) => sum + p.file.size, 0) / 1024 / 1024;

  // ── Render ───────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Crop Modal */}
      {cropState && (
        <CropModal
          imageUrl={cropState.imageUrl}
          onConfirm={handleCropConfirm}
          onCancel={handleCropCancel}
          t={t}
          queuePosition={pendingFiles.length > 1 ? cropQueueIndex + 1 : undefined}
          queueTotal={pendingFiles.length > 1 ? pendingFiles.length : undefined}
        />
      )}

      {/* Photo List — stacked cards (mobile-optimized) */}
      <div className="space-y-3">
        {/* Existing photos (edit mode) */}
        {existingPhotos.map((photo, index) => {
          const hasAnnotation = !!photo.annotation?.trim();
          const shouldShowRating = hasAnnotation && photo.showRating !== false;

          return (
            <div key={`existing-${index}`} className="overflow-hidden">
              {/* Card: thumbnail left + annotation right */}
              <div className={`flex gap-3 p-3 bg-white dark:bg-[#353444] border border-gray-200 dark:border-[#3D3C4A] ${shouldShowRating ? 'rounded-t-xl border-b-0' : 'rounded-xl'}`}>
                {/* Thumbnail */}
                <div className="relative flex-shrink-0 w-24 h-24 sm:w-28 sm:h-28">
                  <img
                    src={photo.url}
                    alt={`Photo ${index + 1}`}
                    className="w-full h-full object-cover rounded-lg"
                    crossOrigin="anonymous"
                  />
                  {photo.isModified && (
                    <div className="absolute top-1 left-1 bg-[#FF644A] text-white text-[9px] px-1 py-0.5 rounded font-medium">
                      {t('photoUpload.recropped') || 'Re-cropped'}
                    </div>
                  )}
                  <button
                    onClick={() => openRecropModal(index)}
                    className="absolute bottom-1 left-1 bg-black/60 text-white rounded-md p-1 hover:bg-black/80 transition-colors"
                    title={t('photoUpload.recrop') || 'Re-crop'}
                  >
                    <Crop className="h-3 w-3" />
                  </button>
                </div>

                {/* Right side: annotation + delete */}
                <div className="flex-1 flex flex-col min-w-0">
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {t('photos.annotation.label') || 'Describe this photo'}
                    </span>
                    <button
                      onClick={() => removeExistingPhoto(index)}
                      className="bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors flex-shrink-0 ml-2"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder={t('photos.annotation.placeholder') || "What's in this photo? (optional)"}
                    value={photo.annotation || ''}
                    onChange={e => {
                      const text = e.target.value;
                      const updates: any = { annotation: text };
                      if (!text.trim()) { updates.showRating = undefined; updates.dishRating = undefined; }
                      updateExistingPhotoAnnotation(index, updates);
                    }}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-[#3D3C4A] rounded-lg bg-gray-50 dark:bg-[#2D2C3A] text-[#1F1E2A] dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-1 focus:ring-[#FF644A] focus:border-transparent focus:bg-white dark:focus:bg-[#353444] transition-all"
                  />
                </div>
              </div>

              {/* Rating slider — full width below card */}
              {shouldShowRating && (
                <PhotoRatingSlider
                  dishRating={photo.dishRating}
                  showRating={photo.showRating}
                  onChange={updates => updateExistingPhotoAnnotation(index, updates)}
                  t={t}
                />
              )}
            </div>
          );
        })}

        {/* New photos */}
        {photos.map((photo, index) => {
          const hasAnnotation = !!photo.annotation?.trim();
          const shouldShowRating = hasAnnotation && photo.showRating !== false;

          return (
            <div key={`new-${index}`} className="overflow-hidden">
              {/* Card: thumbnail left + annotation right */}
              <div className={`flex gap-3 p-3 bg-white dark:bg-[#353444] border border-gray-200 dark:border-[#3D3C4A] ${shouldShowRating ? 'rounded-t-xl border-b-0' : 'rounded-xl'}`}>
                {/* Thumbnail */}
                <div className="relative flex-shrink-0 w-24 h-24 sm:w-28 sm:h-28">
                  <img
                    src={photo.preview}
                    alt={t('photoUpload.photoAlt', { number: existingPhotos.length + index + 1 })}
                    className="w-full h-full object-cover rounded-lg"
                  />
                  <div className="absolute bottom-1 left-1">
                    <div className={`text-white text-[10px] px-1 py-0.5 rounded ${
                      photo.file.size > maxSizeBytes ? 'bg-yellow-500' : 'bg-black/60'
                    }`}>
                      {(photo.file.size / 1024 / 1024).toFixed(1)}MB
                    </div>
                  </div>
                  {existingPhotos.length > 0 && (
                    <div className="absolute top-1 left-1 bg-green-500 text-white text-[9px] px-1 py-0.5 rounded font-medium">
                      {t('photoUpload.new') || 'New'}
                    </div>
                  )}
                </div>

                {/* Right side: annotation + delete */}
                <div className="flex-1 flex flex-col min-w-0">
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {t('photos.annotation.label') || 'Describe this photo'}
                    </span>
                    <button
                      onClick={() => removeNewPhoto(index)}
                      className="bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors flex-shrink-0 ml-2"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder={t('photos.annotation.placeholder') || "What's in this photo? (optional)"}
                    value={photo.annotation || ''}
                    onChange={e => {
                      const text = e.target.value;
                      const updates: any = { annotation: text };
                      if (!text.trim()) { updates.showRating = undefined; updates.dishRating = undefined; }
                      updateNewPhotoAnnotation(index, updates);
                    }}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-[#3D3C4A] rounded-lg bg-gray-50 dark:bg-[#2D2C3A] text-[#1F1E2A] dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-1 focus:ring-[#FF644A] focus:border-transparent focus:bg-white dark:focus:bg-[#353444] transition-all"
                  />
                </div>
              </div>

              {/* Rating slider — full width below card */}
              {shouldShowRating && (
                <PhotoRatingSlider
                  dishRating={photo.dishRating}
                  showRating={photo.showRating}
                  onChange={updates => updateNewPhotoAnnotation(index, updates)}
                  t={t}
                />
              )}
            </div>
          );
        })}

        {/* Add Photo Button — compact full-width */}
        {totalPhotoCount < maxPhotos && (
          <div
            onClick={triggerFileInput}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className="border-2 border-dashed border-gray-300 dark:border-[#3D3C4A] rounded-xl p-4 text-center cursor-pointer hover:border-[#FF644A] hover:bg-[#FFF4E1] dark:hover:bg-[#FF644A]/10 transition-colors flex items-center justify-center gap-3"
          >
            {isProcessing ? (
              <>
                <Loader className="h-5 w-5 text-[#FF644A] animate-spin" />
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {processingStatus || t('photoUpload.processing')}
                </span>
              </>
            ) : (
              <>
                <div className="flex space-x-1.5">
                  <Camera className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                  <Upload className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                </div>
                <div>
                  <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">{t('photoUpload.addPhoto')}</span>
                  <span className="text-xs text-gray-400 dark:text-gray-500 ml-2">
                    {t('photoUpload.tapOrDrag')}
                  </span>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Hidden File Input — single input, no capture (opens OS picker on mobile) */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => {
          if (e.target.files) { handleFileSelect(e.target.files); e.target.value = ''; }
        }}
        className="hidden"
      />

      {/* Photo Info */}
      {totalPhotoCount > 0 && (
        <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
          <p>📸 {t('photoUpload.info.photoCount', { count: totalPhotoCount, max: maxPhotos })}</p>
          {existingPhotos.length > 0 && photos.length > 0 && (
            <p>({existingPhotos.length} existing · {photos.length} new)</p>
          )}
        </div>
      )}

      {/* Size Warning */}
      {newPhotoSizeMB > 8 && (
        <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
          <p className="text-xs text-yellow-700 dark:text-yellow-300">
            {t('photoUpload.warnings.largeTotalSize') || 'Large total upload size. This may take longer to upload.'}
          </p>
        </div>
      )}

      {/* NOTE: "Take Photo" and "From Gallery" buttons REMOVED (Feb 14, 2026)
           The Add Photo zone now triggers the native OS picker which offers
           Photo Library, Take Photo, and Choose Files on mobile.
           On Capacitor native, it uses Capacitor's camera API with CameraSource.Prompt. */}
    </div>
  );
};

export default EnhancedPhotoUpload;