// components/recommendation/EnhancedPhotoUpload.tsx
// UPDATED: Safe Capacitor Camera integration with file input fallback
// UPDATED: Better mobile UX with proper native camera support

import React, { useState, useRef, useCallback } from 'react';
import { Camera, Upload, X, Loader, FileImage } from 'lucide-react';
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
  maxSizeBytes?: number;
}

const EnhancedPhotoUpload: React.FC<PhotoUploadProps> = ({
  photos,
  onPhotosChange,
  maxPhotos = 5,
  maxSizeBytes = 5 * 1024 * 1024, // 5MB
}) => {
  const t = useTranslations('recommendations');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = new Image();
      
      img.onload = () => {
        let { width, height } = img;
        const maxDimension = 1200;
        
        if (width > height && width > maxDimension) {
          height = (height * maxDimension) / width;
          width = maxDimension;
        } else if (height > maxDimension) {
          width = (width * maxDimension) / height;
          height = maxDimension;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now()
              });
              resolve(compressedFile);
            } else {
              resolve(file);
            }
          },
          'image/jpeg',
          0.85
        );
      };
      
      img.onerror = () => {
        console.warn('Image load failed, using original file');
        resolve(file);
      };
      
      img.src = URL.createObjectURL(file);
    });
  };

  const processFile = async (file: File): Promise<PhotoData> => {
    const compressedFile = await compressImage(file);
    
    const photoData: PhotoData = {
      file: compressedFile,
      preview: URL.createObjectURL(compressedFile),
      timestamp: new Date()
    };

    return photoData;
  };

  const handleFileSelect = useCallback(async (files: FileList) => {
    if (photos.length >= maxPhotos) {
      toast.error(t('photoUpload.errors.maxPhotos', { max: maxPhotos }));
      return;
    }

    setIsProcessing(true);

    const newPhotos: PhotoData[] = [];
    const validFiles = Array.from(files).filter(file => {
      if (!file.type.startsWith('image/')) {
        toast.error(t('photoUpload.errors.notImage', { name: file.name }));
        return false;
      }
      if (file.size > maxSizeBytes) {
        toast.error(t('photoUpload.errors.tooLarge', { name: file.name, max: Math.round(maxSizeBytes / 1024 / 1024) }));
        return false;
      }
      return true;
    });

    for (const file of validFiles.slice(0, maxPhotos - photos.length)) {
      try {
        const photoData = await processFile(file);
        newPhotos.push(photoData);
      } catch (error) {
        console.error('Error processing file:', error);
        toast.error(t('photoUpload.errors.processingFailed', { name: file.name }));
      }
    }

    if (newPhotos.length > 0) {
      onPhotosChange([...photos, ...newPhotos]);
      toast.success(t('photoUpload.success.added', { count: newPhotos.length }) || `Added ${newPhotos.length} photo(s)`);
    }
    
    setIsProcessing(false);
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
          
          // Convert data URL to File object
          const response = await fetch(image.dataUrl);
          const blob = await response.blob();
          const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
          
          const photoData = await processFile(file);
          onPhotosChange([...photos, photoData]);
          toast.success(t('photoUpload.success.captured') || 'Photo captured!');
          setIsProcessing(false);
        }
      } catch (error: any) {
        console.error('❌ Camera error:', error);
        setIsProcessing(false);
        
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
          
          const response = await fetch(image.dataUrl);
          const blob = await response.blob();
          const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
          
          const photoData = await processFile(file);
          onPhotosChange([...photos, photoData]);
          toast.success(t('photoUpload.success.selected') || 'Photo added!');
          setIsProcessing(false);
        }
      } catch (error: any) {
        console.error('❌ Gallery error:', error);
        setIsProcessing(false);
        
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
              <div className="bg-black bg-opacity-60 text-white text-xs px-1.5 py-0.5 rounded">
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
                <span className="text-xs text-gray-500 dark:text-gray-400">{t('photoUpload.processing')}</span>
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
          <p>💾 {t('photoUpload.info.totalSize', { size: (photos.reduce((sum, p) => sum + p.file.size, 0) / 1024 / 1024).toFixed(1) })}</p>
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