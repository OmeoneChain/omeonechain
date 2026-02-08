// components/recommendation/EnhancedPhotoUpload.tsx
// UPDATED: Safe Capacitor Camera integration with file input fallback
// UPDATED: Better mobile UX with proper native camera support
// FIXED: Compress images BEFORE size check (Jan 30, 2026)
// FIXED: Better compression for large photos from phone cameras
// NEW: Crop/reposition modal before upload (Feb 8, 2026)
//   - 4:3 aspect ratio enforcement for consistent feed appearance
//   - Pinch-to-zoom and drag on mobile
//   - Applies to both camera capture and gallery selection

import React, { useState, useRef, useCallback } from 'react';
import { Camera, Upload, X, Loader, FileImage, AlertCircle, RotateCw, ZoomIn, ZoomOut, Check } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'react-hot-toast';
import Cropper from 'react-easy-crop';
import type { Area, Point } from 'react-easy-crop';

// Safe import of Capacitor - won't crash if not available
let CapacitorCore: any = null;
try {
  CapacitorCore = require('@capacitor/core').Capacitor;
} catch (e) {
  console.log('Capacitor not available');
}

// ─── Types ───────────────────────────────────────────────────────────

interface PhotoData {
  file: File;
  preview: string;
  timestamp: Date;
}

interface PhotoUploadProps {
  photos: PhotoData[];
  onPhotosChange: (photos: PhotoData[]) => void;
  maxPhotos?: number;
  maxSizeBytes?: number;
  maxSizeBeforeCompressionMB?: number;
}

interface CropState {
  imageUrl: string;
  originalFile: File;
}

// ─── Crop Helper ─────────────────────────────────────────────────────

/**
 * Takes an image URL and a pixel-area crop rectangle,
 * returns a new File containing only the cropped region.
 */
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

  // White background for any transparency
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
      0.92 // High quality — compression happens later in processFile
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
}

const CropModal: React.FC<CropModalProps> = ({ imageUrl, onConfirm, onCancel, t }) => {
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

  return (
    <div className="fixed inset-0 z-[9999] bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/80 backdrop-blur-sm border-b border-white/10">
        <button
          onClick={onCancel}
          className="text-white/80 hover:text-white px-3 py-1.5 rounded-lg transition-colors text-sm font-medium"
        >
          {t('photoUpload.crop.cancel') || 'Cancel'}
        </button>
        <span className="text-white text-sm font-medium">
          {t('photoUpload.crop.title') || 'Adjust Photo'}
        </span>
        <button
          onClick={handleConfirm}
          className="bg-[#FF644A] text-white px-4 py-1.5 rounded-lg hover:bg-[#E65441] transition-colors text-sm font-medium flex items-center gap-1.5"
        >
          <Check className="h-4 w-4" />
          {t('photoUpload.crop.confirm') || 'Done'}
        </button>
      </div>

      {/* Crop area — fills available space */}
      <div className="relative flex-1">
        <Cropper
          image={imageUrl}
          crop={crop}
          zoom={zoom}
          aspect={4 / 3}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
          showGrid={true}
          cropShape="rect"
          objectFit="contain"
          style={{
            containerStyle: {
              background: '#000',
            },
            cropAreaStyle: {
              border: '2px solid rgba(255, 100, 74, 0.8)',
            },
          }}
        />
      </div>

      {/* Bottom controls */}
      <div className="px-6 py-4 bg-black/80 backdrop-blur-sm border-t border-white/10">
        {/* Zoom slider */}
        <div className="flex items-center gap-3">
          <ZoomOut className="h-4 w-4 text-white/60 flex-shrink-0" />
          <input
            type="range"
            min={1}
            max={3}
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
          {t('photoUpload.crop.hint') || 'Pinch or drag to adjust · 4:3 frame'}
        </p>
      </div>
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
}) => {
  const t = useTranslations('recommendations');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');

  // Crop state — when set, the crop modal is shown
  const [cropState, setCropState] = useState<CropState | null>(null);

  // ── Compression (unchanged) ──────────────────────────────────────

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
              console.log(
                `📷 Compressed: ${(file.size / 1024 / 1024).toFixed(2)}MB → ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB (${Math.round((1 - compressedFile.size / file.size) * 100)}% reduction)`
              );
              resolve(compressedFile);
            } else {
              reject(new Error('Failed to compress image'));
            }
          },
          'image/jpeg',
          quality
        );
      };

      img.onerror = () => {
        console.warn('Image load failed, using original file');
        resolve(file);
      };

      img.src = URL.createObjectURL(file);
    });
  };

  const compressToTargetSize = async (file: File, targetSizeBytes: number): Promise<File> => {
    const originalSizeMB = file.size / 1024 / 1024;
    console.log(`📷 Processing ${file.name}: ${originalSizeMB.toFixed(2)}MB`);

    if (file.size <= targetSizeBytes && file.type === 'image/jpeg') {
      console.log(`📷 File already small enough, keeping original`);
      return file;
    }

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

      if (compressedFile.size <= targetSizeBytes) {
        console.log(`📷 Success at quality ${attempt.quality}, dimension ${attempt.maxDim}`);
        return compressedFile;
      }
    }

    console.warn(`📷 Could not compress below target, best: ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`);
    return compressedFile;
  };

  // ── Process a single file (compress + validate) ──────────────────

  const processFile = async (file: File): Promise<PhotoData | null> => {
    try {
      const maxBeforeBytes = maxSizeBeforeCompressionMB * 1024 * 1024;
      if (file.size > maxBeforeBytes) {
        toast.error(
          t('photoUpload.errors.tooLarge', { name: file.name, max: maxSizeBeforeCompressionMB }) ||
            `${file.name} is too large (max ${maxSizeBeforeCompressionMB}MB)`
        );
        return null;
      }

      setProcessingStatus(`Processing ${file.name}...`);
      const compressedFile = await compressToTargetSize(file, maxSizeBytes);

      const finalSizeMB = compressedFile.size / 1024 / 1024;
      if (compressedFile.size > maxSizeBytes * 1.5) {
        toast.error(
          t('photoUpload.errors.compressionFailed', { name: file.name }) ||
            `${file.name} is still too large after compression (${finalSizeMB.toFixed(1)}MB). Try a smaller image.`
        );
        return null;
      } else if (compressedFile.size > maxSizeBytes) {
        toast(`${file.name}: ${finalSizeMB.toFixed(1)}MB (larger than ideal)`, {
          icon: '⚠️',
          duration: 3000,
        });
      }

      const photoData: PhotoData = {
        file: compressedFile,
        preview: URL.createObjectURL(compressedFile),
        timestamp: new Date(),
      };

      return photoData;
    } catch (error) {
      console.error('Error processing file:', error);
      toast.error(
        t('photoUpload.errors.processingFailed', { name: file.name }) || `Failed to process ${file.name}`
      );
      return null;
    }
  };

  // ── Open crop modal for a file ───────────────────────────────────

  const openCropModal = (file: File) => {
    const imageUrl = URL.createObjectURL(file);
    setCropState({ imageUrl, originalFile: file });
  };

  // ── Handle crop confirm — process the cropped result ─────────────

  const handleCropConfirm = useCallback(
    async (croppedAreaPixels: Area) => {
      if (!cropState) return;

      setIsProcessing(true);
      setProcessingStatus('Cropping photo...');

      try {
        // Generate cropped file from the original image
        const croppedFile = await getCroppedImageFile(
          cropState.imageUrl,
          croppedAreaPixels,
          cropState.originalFile.name.replace(/\.[^/.]+$/, '-cropped.jpg')
        );

        console.log(
          `✂️ Cropped: ${(cropState.originalFile.size / 1024 / 1024).toFixed(2)}MB → ${(croppedFile.size / 1024 / 1024).toFixed(2)}MB`
        );

        // Now compress and validate
        const photoData = await processFile(croppedFile);
        if (photoData) {
          onPhotosChange([...photos, photoData]);
          toast.success(t('photoUpload.success.added', { count: 1 }) || 'Photo added!');
        }
      } catch (error) {
        console.error('Crop failed:', error);
        toast.error(t('photoUpload.errors.cropFailed') || 'Failed to crop photo. Please try again.');
      } finally {
        // Clean up
        URL.revokeObjectURL(cropState.imageUrl);
        setCropState(null);
        setIsProcessing(false);
        setProcessingStatus('');
      }
    },
    [cropState, photos, onPhotosChange, t]
  );

  // ── Handle crop cancel ───────────────────────────────────────────

  const handleCropCancel = useCallback(() => {
    if (cropState) {
      URL.revokeObjectURL(cropState.imageUrl);
    }
    setCropState(null);
  }, [cropState]);

  // ── File selection (for drag-drop and the fallback file input) ───

  const handleFileSelect = useCallback(
    async (files: FileList) => {
      if (photos.length >= maxPhotos) {
        toast.error(t('photoUpload.errors.maxPhotos', { max: maxPhotos }));
        return;
      }

      const fileArray = Array.from(files);

      // Filter to only images
      const imageFiles = fileArray.filter((file) => {
        if (!file.type.startsWith('image/')) {
          toast.error(t('photoUpload.errors.notImage', { name: file.name }));
          return false;
        }
        return true;
      });

      if (imageFiles.length === 0) return;

      // For a single image, open the crop modal
      // For multiple images, crop them one by one (first one now, queue not needed for MVP)
      const filesToProcess = imageFiles.slice(0, maxPhotos - photos.length);

      if (filesToProcess.length === 1) {
        // Single photo — open crop modal
        openCropModal(filesToProcess[0]);
      } else {
        // Multiple photos — open crop modal for first one
        // Remaining will need to be added via subsequent taps
        // (Cropping multiple in sequence would need a queue; keeping it simple for now)
        openCropModal(filesToProcess[0]);
        if (filesToProcess.length > 1) {
          toast(
            t('photoUpload.info.cropOneAtATime') ||
              `Crop this photo first — then add the remaining ${filesToProcess.length - 1} photo(s).`,
            { icon: '📸', duration: 4000 }
          );
        }
      }
    },
    [photos, maxPhotos, t]
  );

  // ── Capacitor Camera capture ─────────────────────────────────────

  const handleCameraCapture = useCallback(async () => {
    if (photos.length >= maxPhotos) {
      toast.error(t('photoUpload.errors.maxPhotos', { max: maxPhotos }));
      return;
    }

    const isNative = CapacitorCore?.isNativePlatform?.() ?? false;

    if (isNative) {
      try {
        console.log('📱 Attempting Capacitor Camera for photo capture');

        const { Camera: CapacitorCamera, CameraResultType, CameraSource } = await import('@capacitor/camera');

        if (typeof CapacitorCamera?.getPhoto !== 'function') {
          console.log('⚠️ Camera plugin not available, falling back to file input');
          fileInputRef.current?.click();
          return;
        }

        // Check permissions
        try {
          const permissions = await CapacitorCamera.checkPermissions();
          console.log('📷 Camera permissions:', permissions);

          if (permissions.camera === 'denied') {
            const requested = await CapacitorCamera.requestPermissions();
            if (requested.camera === 'denied') {
              toast.error(
                t('photoUpload.errors.cameraPermission') || 'Camera permission required. Please enable in Settings.'
              );
              fileInputRef.current?.click();
              return;
            }
          }
        } catch (permError) {
          console.log('⚠️ Permission check failed, trying anyway:', permError);
        }

        const image = await CapacitorCamera.getPhoto({
          quality: 90, // Slightly higher since we'll crop + compress later
          allowEditing: false, // We handle editing ourselves now
          resultType: CameraResultType.DataUrl,
          source: CameraSource.Camera,
          width: 2400, // Larger capture — crop will reduce
          height: 2400,
        });

        if (image.dataUrl) {
          console.log('✅ Photo captured — opening crop modal');

          // Convert data URL to File, then open crop modal
          const response = await fetch(image.dataUrl);
          const blob = await response.blob();
          const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });

          openCropModal(file);
        }
      } catch (error: any) {
        console.error('❌ Camera error:', error);

        if (error.message?.includes('User cancelled') || error.message?.includes('cancelled')) {
          console.log('📷 User cancelled photo capture');
          return;
        }

        console.log('⚠️ Camera failed, falling back to file input');
        fileInputRef.current?.click();
      }
    } else {
      // Web — use file input with camera capture
      console.log('🌐 Using file input for web platform');
      fileInputRef.current?.click();
    }
  }, [photos, maxPhotos, t]);

  // ── Capacitor Gallery selection ──────────────────────────────────

  const handleGallerySelect = useCallback(async () => {
    if (photos.length >= maxPhotos) {
      toast.error(t('photoUpload.errors.maxPhotos', { max: maxPhotos }));
      return;
    }

    const isNative = CapacitorCore?.isNativePlatform?.() ?? false;

    if (isNative) {
      try {
        console.log('📱 Attempting Capacitor Camera for gallery selection');

        const { Camera: CapacitorCamera, CameraResultType, CameraSource } = await import('@capacitor/camera');

        if (typeof CapacitorCamera?.getPhoto !== 'function') {
          console.log('⚠️ Camera plugin not available, falling back to file input');
          galleryInputRef.current?.click();
          return;
        }

        // Check photo library permissions
        try {
          const permissions = await CapacitorCamera.checkPermissions();
          if (permissions.photos === 'denied') {
            const requested = await CapacitorCamera.requestPermissions();
            if (requested.photos === 'denied') {
              toast.error(
                t('photoUpload.errors.galleryPermission') ||
                  'Photo library permission required. Please enable in Settings.'
              );
              galleryInputRef.current?.click();
              return;
            }
          }
        } catch (permError) {
          console.log('⚠️ Permission check failed, trying anyway:', permError);
        }

        const image = await CapacitorCamera.getPhoto({
          quality: 90,
          allowEditing: false, // We handle editing ourselves
          resultType: CameraResultType.DataUrl,
          source: CameraSource.Photos,
          width: 2400,
          height: 2400,
        });

        if (image.dataUrl) {
          console.log('✅ Photo selected from gallery — opening crop modal');

          const response = await fetch(image.dataUrl);
          const blob = await response.blob();
          const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });

          openCropModal(file);
        }
      } catch (error: any) {
        console.error('❌ Gallery error:', error);

        if (error.message?.includes('User cancelled') || error.message?.includes('cancelled')) {
          console.log('📷 User cancelled gallery selection');
          return;
        }

        console.log('⚠️ Gallery selection failed, falling back to file input');
        galleryInputRef.current?.click();
      }
    } else {
      console.log('🌐 Using file input for gallery');
      galleryInputRef.current?.click();
    }
  }, [photos, maxPhotos, t]);

  // ── Drag & drop ──────────────────────────────────────────────────

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer.files) {
        handleFileSelect(e.dataTransfer.files);
      }
    },
    [handleFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  // ── Remove photo ─────────────────────────────────────────────────

  const removePhoto = (index: number) => {
    const newPhotos = [...photos];
    URL.revokeObjectURL(newPhotos[index].preview);
    newPhotos.splice(index, 1);
    onPhotosChange(newPhotos);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // ── Calculated values ────────────────────────────────────────────

  const totalSizeMB = photos.reduce((sum, p) => sum + p.file.size, 0) / 1024 / 1024;

  // ── Render ───────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* ── Crop Modal (portal-like fullscreen overlay) ── */}
      {cropState && (
        <CropModal
          imageUrl={cropState.imageUrl}
          onConfirm={handleCropConfirm}
          onCancel={handleCropCancel}
          t={t}
        />
      )}

      {/* ── Photo Grid ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {photos.map((photo, index) => (
          <div key={index} className="relative group">
            <img
              src={photo.preview}
              alt={t('photoUpload.photoAlt', { number: index + 1 })}
              className="w-full aspect-[4/3] object-cover rounded-lg border border-gray-200 dark:border-[#3D3C4A]"
            />

            {/* Delete button */}
            <button
              onClick={() => removePhoto(index)}
              className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 transition-opacity shadow-lg"
            >
              <X className="h-4 w-4" />
            </button>

            {/* File size indicator */}
            <div className="absolute bottom-1 left-1">
              <div
                className={`text-white text-xs px-1.5 py-0.5 rounded ${
                  photo.file.size > maxSizeBytes ? 'bg-yellow-500' : 'bg-black bg-opacity-60'
                }`}
              >
                {(photo.file.size / 1024 / 1024).toFixed(1)}MB
              </div>
            </div>
          </div>
        ))}

        {/* Add Photo Button (drag & drop zone) */}
        {photos.length < maxPhotos && (
          <div
            onClick={triggerFileInput}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className="border-2 border-dashed border-gray-300 dark:border-[#3D3C4A] rounded-lg p-6 text-center cursor-pointer hover:border-[#FF644A] hover:bg-[#FFF4E1] dark:hover:bg-[#FF644A]/10 transition-colors aspect-[4/3] flex flex-col items-center justify-center"
          >
            {isProcessing ? (
              <>
                <Loader className="h-6 w-6 text-[#FF644A] animate-spin mb-2" />
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {processingStatus || t('photoUpload.processing')}
                </span>
              </>
            ) : (
              <>
                <div className="flex space-x-2 mb-2">
                  <Camera className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                  <Upload className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400">{t('photoUpload.addPhoto')}</span>
                <span className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  {t('photoUpload.tapOrDrag')}
                </span>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Hidden File Inputs ── */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => {
          if (e.target.files) {
            handleFileSelect(e.target.files);
            e.target.value = '';
          }
        }}
        className="hidden"
      />

      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => {
          if (e.target.files) {
            handleFileSelect(e.target.files);
            e.target.value = '';
          }
        }}
        className="hidden"
      />

      {/* ── Photo Info ── */}
      {photos.length > 0 && (
        <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
          <p>📸 {t('photoUpload.info.photoCount', { count: photos.length, max: maxPhotos })}</p>
          <p className={totalSizeMB > 5 ? 'text-yellow-600 dark:text-yellow-400' : ''}>
            💾 {t('photoUpload.info.totalSize', { size: totalSizeMB.toFixed(1) })}
            {totalSizeMB > 5 && ' ⚠️'}
          </p>
        </div>
      )}

      {/* ── Size Warning ── */}
      {totalSizeMB > 8 && (
        <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
          <p className="text-xs text-yellow-700 dark:text-yellow-300">
            {t('photoUpload.warnings.largeTotalSize') || 'Large total upload size. This may take longer to upload.'}
          </p>
        </div>
      )}

      {/* ── Mobile Camera/Gallery Buttons ── */}
      {photos.length < maxPhotos && (
        <div className="flex space-x-3">
          <button
            onClick={handleCameraCapture}
            disabled={isProcessing || !!cropState}
            className="flex-1 px-4 py-3 bg-[#FF644A] text-white rounded-lg hover:bg-[#E65441] transition-colors flex items-center justify-center font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <Loader className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <Camera className="h-5 w-5 mr-2" />
                {t('photoUpload.takePhoto')}
              </>
            )}
          </button>
          <button
            onClick={handleGallerySelect}
            disabled={isProcessing || !!cropState}
            className="flex-1 px-4 py-3 bg-[#353444] dark:bg-[#404050] text-white rounded-lg hover:bg-[#2D2C3A] dark:hover:bg-[#4D4C5A] transition-colors flex items-center justify-center font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <Loader className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <FileImage className="h-5 w-5 mr-2" />
                {t('photoUpload.fromGallery')}
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default EnhancedPhotoUpload;