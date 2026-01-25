import React, { useState, useRef, useCallback } from 'react';
import { Camera, Upload, X, Loader, FileImage } from 'lucide-react';
import { useTranslations } from 'next-intl';

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
      alert(t('photoUpload.errors.maxPhotos', { max: maxPhotos }));
      return;
    }

    setIsProcessing(true);

    const newPhotos: PhotoData[] = [];
    const validFiles = Array.from(files).filter(file => {
      if (!file.type.startsWith('image/')) {
        alert(t('photoUpload.errors.notImage', { name: file.name }));
        return false;
      }
      if (file.size > maxSizeBytes) {
        alert(t('photoUpload.errors.tooLarge', { name: file.name, max: Math.round(maxSizeBytes / 1024 / 1024) }));
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
        alert(t('photoUpload.errors.processingFailed', { name: file.name }));
      }
    }

    onPhotosChange([...photos, ...newPhotos]);
    setIsProcessing(false);
  }, [photos, maxPhotos, maxSizeBytes, onPhotosChange, t]);

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
            
            {/* Photo overlay with delete button */}
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 rounded-lg flex items-center justify-center">
              <button
                onClick={() => removePhoto(index)}
                className="bg-red-500 text-white rounded-full p-1 hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* File size indicator */}
            <div className="absolute top-1 right-1">
              <div className="bg-black bg-opacity-60 text-white text-xs px-1 py-0.5 rounded">
                {(photo.file.size / 1024 / 1024).toFixed(1)}MB
              </div>
            </div>
          </div>
        ))}

        {/* Add Photo Button */}
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

      {/* File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        capture="environment"
        onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
        className="hidden"
      />

      {/* Photo Info */}
      {photos.length > 0 && (
        <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
          <p>📸 {t('photoUpload.info.photoCount', { count: photos.length, max: maxPhotos })}</p>
          <p>💾 {t('photoUpload.info.totalSize', { size: (photos.reduce((sum, p) => sum + p.file.size, 0) / 1024 / 1024).toFixed(1) })}</p>
        </div>
      )}

      {/* Mobile Camera Buttons */}
      <div className="flex space-x-3">
        <button
          onClick={triggerFileInput}
          className="flex-1 px-4 py-3 bg-[#FF644A] text-white rounded-lg hover:bg-[#E65441] transition-colors flex items-center justify-center font-medium"
        >
          <Camera className="h-5 w-5 mr-2" />
          {t('photoUpload.takePhoto')}
        </button>
        <button
          onClick={() => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.multiple = true;
            input.onchange = (e) => {
              const files = (e.target as HTMLInputElement).files;
              if (files) handleFileSelect(files);
            };
            input.click();
          }}
          className="flex-1 px-4 py-3 bg-[#353444] dark:bg-[#404050] text-white rounded-lg hover:bg-[#2D2C3A] dark:hover:bg-[#4D4C5A] transition-colors flex items-center justify-center font-medium"
        >
          <FileImage className="h-5 w-5 mr-2" />
          {t('photoUpload.fromGallery')}
        </button>
      </div>
    </div>
  );
};

export default EnhancedPhotoUpload;