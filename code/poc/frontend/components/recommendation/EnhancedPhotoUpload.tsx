// components/recommendation/EnhancedPhotoUpload.tsx
// UPDATED: Safe Capacitor Camera integration with file input fallback
// UPDATED: Better mobile UX with proper native camera support
// FIXED: Compress images BEFORE size check (Jan 30, 2026)
// FIXED: Better compression for large photos from phone cameras

import React, { useState, useRef, useCallback } from 'react';
import { Camera, Upload, X, Loader, FileImage, AlertCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'react-hot-toast';

// Safe import of Capacitor - won't crash if not available
let Capacitor: any = null;
try {
  Capacitor = require('@capacitor/core').Capacitor;
} catch (e) {
  console.log('Capacitor not available');
}

interface PhotoData {
  file: File;
  preview: string;
  timestamp: Date;
}

interface PhotoUploadProps {
  photos: PhotoData[];
  onPhotosChange: (photos: PhotoData[]) => void;
  maxPhotos?: number;
  maxSizeBytes?: number; // Max size AFTER compression
  maxSizeBeforeCompressionMB?: number; // Max size before even attempting (e.g., 50MB)
}

const EnhancedPhotoUpload: React.FC<PhotoUploadProps> = ({
  photos,
  onPhotosChange,
  maxPhotos = 5,
  maxSizeBytes = 2 * 1024 * 1024, // 2MB after compression (was 5MB)
  maxSizeBeforeCompressionMB = 50, // Don't even try files over 50MB
}) => {
  const t = useTranslations('recommendations');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');

  // Aggressive compression for large files
  const compressImage = (file: File, quality: number = 0.85, maxDimension: number = 1200): Promise<File> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = new Image();
      
      img.onload = () => {
        let { width, height } = img;
        
        // Calculate new dimensions
        if (width > height && width > maxDimension) {
          height = (height * maxDimension) / width;
          width = maxDimension;
        } else if (height > maxDimension) {
          width = (width * maxDimension) / height;
          height = maxDimension;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Use white background for transparency
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, '.jpg'), {
                type: 'image/jpeg',
                lastModified: Date.now()
              });
              console.log(`📷 Compressed: ${(file.size / 1024 / 1024).toFixed(2)}MB → ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB (${Math.round((1 - compressedFile.size / file.size) * 100)}% reduction)`);
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

  // Progressive compression - try multiple quality levels if needed
  const compressToTargetSize = async (file: File, targetSizeBytes: number): Promise<File> => {
    const originalSizeMB = file.size / 1024 / 1024;
    console.log(`📷 Processing ${file.name}: ${originalSizeMB.toFixed(2)}MB`);
    
    // If already small enough and is JPEG, return as-is
    if (file.size <= targetSizeBytes && file.type === 'image/jpeg') {
      console.log(`📷 File already small enough, keeping original`);
      return file;
    }
    
    // Try progressively more aggressive compression
    const attempts = [
      { quality: 0.85, maxDim: 1200 },  // Standard
      { quality: 0.75, maxDim: 1200 },  // Medium
      { quality: 0.65, maxDim: 1000 },  // Aggressive
      { quality: 0.50, maxDim: 800 },   // Very aggressive
      { quality: 0.40, maxDim: 600 },   // Last resort
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
    
    // Return best effort even if over target
    console.warn(`📷 Could not compress below target, best: ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`);
    return compressedFile;
  };

  const processFile = async (file: File): Promise<PhotoData | null> => {
    try {
      // Step 1: Check if file is unreasonably large (e.g., video file or corrupted)
      const maxBeforeBytes = maxSizeBeforeCompressionMB * 1024 * 1024;
      if (file.size > maxBeforeBytes) {
        toast.error(
          t('photoUpload.errors.tooLarge', { 
            name: file.name, 
            max: maxSizeBeforeCompressionMB 
          }) || `${file.name} is too large (max ${maxSizeBeforeCompressionMB}MB)`
        );
        return null;
      }
      
      // Step 2: Compress the image
      setProcessingStatus(`Processing ${file.name}...`);
      const compressedFile = await compressToTargetSize(file, maxSizeBytes);
      
      // Step 3: Final size check (warn but allow slightly over)
      const finalSizeMB = compressedFile.size / 1024 / 1024;
      if (compressedFile.size > maxSizeBytes * 1.5) {
        // More than 50% over target - reject
        toast.error(
          t('photoUpload.errors.compressionFailed', { name: file.name }) || 
          `${file.name} is still too large after compression (${finalSizeMB.toFixed(1)}MB). Try a smaller image.`
        );
        return null;
      } else if (compressedFile.size > maxSizeBytes) {
        // Slightly over - warn but allow
        toast(`${file.name}: ${finalSizeMB.toFixed(1)}MB (larger than ideal)`, {
          icon: '⚠️',
          duration: 3000,
        });
      }
      
      const photoData: PhotoData = {
        file: compressedFile,
        preview: URL.createObjectURL(compressedFile),
        timestamp: new Date()
      };

      return photoData;
    } catch (error) {
      console.error('Error processing file:', error);
      toast.error(
        t('photoUpload.errors.processingFailed', { name: file.name }) || 
        `Failed to process ${file.name}`
      );
      return null;
    }
  };

  const handleFileSelect = useCallback(async (files: FileList) => {
    if (photos.length >= maxPhotos) {
      toast.error(t('photoUpload.errors.maxPhotos', { max: maxPhotos }));
      return;
    }

    setIsProcessing(true);
    setProcessingStatus('Starting...');

    const newPhotos: PhotoData[] = [];
    const fileArray = Array.from(files);
    
    // Filter to only images
    const imageFiles = fileArray.filter(file => {
      if (!file.type.startsWith('image/')) {
        toast.error(t('photoUpload.errors.notImage', { name: file.name }));
        return false;
      }
      return true;
    });

    // Process files (up to remaining slots)
    const filesToProcess = imageFiles.slice(0, maxPhotos - photos.length);
    
    for (let i = 0; i < filesToProcess.length; i++) {
      const file = filesToProcess[i];
      setProcessingStatus(`Processing ${i + 1}/${filesToProcess.length}: ${file.name}`);
      
      const photoData = await processFile(file);
      if (photoData) {
        newPhotos.push(photoData);
      }
    }

    if (newPhotos.length > 0) {
      onPhotosChange([...photos, ...newPhotos]);
      toast.success(
        t('photoUpload.success.added', { count: newPhotos.length }) || 
        `Added ${newPhotos.length} photo(s)`
      );
    }
    
    setIsProcessing(false);
    setProcessingStatus('');
  }, [photos, maxPhotos, maxSizeBytes, onPhotosChange, t]);

  // Handle Capacitor Camera for native platforms
  const handleCameraCapture = useCallback(async () => {
    if (photos.length >= maxPhotos) {
      toast.error(t('photoUpload.errors.maxPhotos', { max: maxPhotos }));
      return;
    }

    const isNative = Capacitor?.isNativePlatform?.() ?? false;

    if (isNative) {
      try {
        console.log('📱 Attempting Capacitor Camera for photo capture');
        
        // Dynamic import to prevent crashes if plugin not available
        const { Camera: CapacitorCamera, CameraResultType, CameraSource } = await import('@capacitor/camera');
        
        // Check if Camera plugin is available
        if (typeof CapacitorCamera?.getPhoto !== 'function') {
          console.log('⚠️ Camera plugin not available, falling back to file input');
          fileInputRef.current?.click();
          return;
        }

        // Check permissions first
        try {
          const permissions = await CapacitorCamera.checkPermissions();
          console.log('📷 Camera permissions:', permissions);
          
          if (permissions.camera === 'denied') {
            const requested = await CapacitorCamera.requestPermissions();
            if (requested.camera === 'denied') {
              toast.error(t('photoUpload.errors.cameraPermission') || 'Camera permission required. Please enable in Settings.');
              fileInputRef.current?.click();
              return;
            }
          }
        } catch (permError) {
          console.log('⚠️ Permission check failed, trying anyway:', permError);
        }
        
        const image = await CapacitorCamera.getPhoto({
          quality: 85,
          allowEditing: false,
          resultType: CameraResultType.DataUrl,
          source: CameraSource.Camera, // Camera only
          width: 1200,
          height: 1200
        });

        if (image.dataUrl) {
          console.log('✅ Photo captured successfully');
          setIsProcessing(true);
          setProcessingStatus('Processing captured photo...');
          
          // Convert data URL to File object
          const response = await fetch(image.dataUrl);
          const blob = await response.blob();
          const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
          
          const photoData = await processFile(file);
          if (photoData) {
            onPhotosChange([...photos, photoData]);
            toast.success(t('photoUpload.success.captured') || 'Photo captured!');
          }
          setIsProcessing(false);
          setProcessingStatus('');
        }
      } catch (error: any) {
        console.error('❌ Camera error:', error);
        setIsProcessing(false);
        setProcessingStatus('');
        
        // User cancelled - not an error
        if (error.message?.includes('User cancelled') || error.message?.includes('cancelled')) {
          console.log('📷 User cancelled photo capture');
          return;
        }
        
        // Fall back to file input
        console.log('⚠️ Camera failed, falling back to file input');
        fileInputRef.current?.click();
      }
    } else {
      // Web - use file input with camera capture
      console.log('🌐 Using file input for web platform');
      fileInputRef.current?.click();
    }
  }, [photos, maxPhotos, onPhotosChange, t]);

  // Handle gallery selection with Capacitor
  const handleGallerySelect = useCallback(async () => {
    if (photos.length >= maxPhotos) {
      toast.error(t('photoUpload.errors.maxPhotos', { max: maxPhotos }));
      return;
    }

    const isNative = Capacitor?.isNativePlatform?.() ?? false;

    if (isNative) {
      try {
        console.log('📱 Attempting Capacitor Camera for gallery selection');
        
        // Dynamic import to prevent crashes
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
              toast.error(t('photoUpload.errors.galleryPermission') || 'Photo library permission required. Please enable in Settings.');
              galleryInputRef.current?.click();
              return;
            }
          }
        } catch (permError) {
          console.log('⚠️ Permission check failed, trying anyway:', permError);
        }
        
        const image = await CapacitorCamera.getPhoto({
          quality: 85,
          allowEditing: false,
          resultType: CameraResultType.DataUrl,
          source: CameraSource.Photos, // Gallery only
          width: 1200,
          height: 1200
        });

        if (image.dataUrl) {
          console.log('✅ Photo selected from gallery');
          setIsProcessing(true);
          setProcessingStatus('Processing selected photo...');
          
          const response = await fetch(image.dataUrl);
          const blob = await response.blob();
          const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
          
          const photoData = await processFile(file);
          if (photoData) {
            onPhotosChange([...photos, photoData]);
            toast.success(t('photoUpload.success.selected') || 'Photo added!');
          }
          setIsProcessing(false);
          setProcessingStatus('');
        }
      } catch (error: any) {
        console.error('❌ Gallery error:', error);
        setIsProcessing(false);
        setProcessingStatus('');
        
        if (error.message?.includes('User cancelled') || error.message?.includes('cancelled')) {
          console.log('📷 User cancelled gallery selection');
          return;
        }
        
        // Fall back to file input
        console.log('⚠️ Gallery selection failed, falling back to file input');
        galleryInputRef.current?.click();
      }
    } else {
      // Web - use standard file input
      console.log('🌐 Using file input for gallery');
      galleryInputRef.current?.click();
    }
  }, [photos, maxPhotos, onPhotosChange, t]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      handleFileSelect(e.dataTransfer.files);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const removePhoto = (index: number) => {
    const newPhotos = [...photos];
    URL.revokeObjectURL(newPhotos[index].preview);
    newPhotos.splice(index, 1);
    onPhotosChange(newPhotos);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // Calculate total size
  const totalSizeMB = photos.reduce((sum, p) => sum + p.file.size, 0) / 1024 / 1024;

  return (
    <div className="space-y-4">
      {/* Photo Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {photos.map((photo, index) => (
          <div key={index} className="relative group">
            <img
              src={photo.preview}
              alt={t('photoUpload.photoAlt', { number: index + 1 })}
              className="w-full h-32 object-cover rounded-lg border border-gray-200 dark:border-[#3D3C4A]"
            />
            
            {/* Delete button - always visible on mobile for easier access */}
            <button
              onClick={() => removePhoto(index)}
              className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 transition-opacity shadow-lg"
            >
              <X className="h-4 w-4" />
            </button>

            {/* File size indicator */}
            <div className="absolute bottom-1 left-1">
              <div className={`text-white text-xs px-1.5 py-0.5 rounded ${
                photo.file.size > maxSizeBytes ? 'bg-yellow-500' : 'bg-black bg-opacity-60'
              }`}>
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
            className="border-2 border-dashed border-gray-300 dark:border-[#3D3C4A] rounded-lg p-6 text-center cursor-pointer hover:border-[#FF644A] hover:bg-[#FFF4E1] dark:hover:bg-[#FF644A]/10 transition-colors h-32 flex flex-col items-center justify-center"
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

      {/* Hidden File Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        capture="environment"
        onChange={(e) => {
          if (e.target.files) {
            handleFileSelect(e.target.files);
            e.target.value = ''; // Reset for same file selection
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
            e.target.value = ''; // Reset for same file selection
          }
        }}
        className="hidden"
      />

      {/* Photo Info */}
      {photos.length > 0 && (
        <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
          <p>📸 {t('photoUpload.info.photoCount', { count: photos.length, max: maxPhotos })}</p>
          <p className={totalSizeMB > 5 ? 'text-yellow-600 dark:text-yellow-400' : ''}>
            💾 {t('photoUpload.info.totalSize', { size: totalSizeMB.toFixed(1) })}
            {totalSizeMB > 5 && ' ⚠️'}
          </p>
        </div>
      )}

      {/* Size Warning */}
      {totalSizeMB > 8 && (
        <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
          <p className="text-xs text-yellow-700 dark:text-yellow-300">
            {t('photoUpload.warnings.largeTotalSize') || 'Large total upload size. This may take longer to upload.'}
          </p>
        </div>
      )}

      {/* Mobile Camera/Gallery Buttons */}
      {photos.length < maxPhotos && (
        <div className="flex space-x-3">
          <button
            onClick={handleCameraCapture}
            disabled={isProcessing}
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
            disabled={isProcessing}
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