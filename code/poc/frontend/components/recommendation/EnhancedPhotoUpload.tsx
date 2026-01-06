import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, Upload, X, MapPin, Loader, FileImage } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface PhotoData {
  file: File;
  preview: string;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  timestamp: Date;
}

interface PhotoUploadProps {
  photos: PhotoData[];
  onPhotosChange: (photos: PhotoData[]) => void;
  maxPhotos?: number;
  maxSizeBytes?: number;
  allowLocation?: boolean;
}

interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  loading: boolean;
  error: string | null;
}

const EnhancedPhotoUpload: React.FC<PhotoUploadProps> = ({
  photos,
  onPhotosChange,
  maxPhotos = 5,
  maxSizeBytes = 5 * 1024 * 1024, // 5MB
  allowLocation = true
}) => {
  const t = useTranslations('recommendations');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [geolocation, setGeolocation] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    address: null,
    loading: false,
    error: null
  });

  // Request location permission on component mount
  useEffect(() => {
    if (allowLocation && navigator.geolocation) {
      getCurrentLocation();
    }
  }, [allowLocation]);

  const getCurrentLocation = async () => {
    if (!navigator.geolocation) return;

    setGeolocation(prev => ({ ...prev, loading: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        try {
          // Reverse geocoding to get address
          const address = await reverseGeocode(latitude, longitude);
          
          setGeolocation({
            latitude,
            longitude,
            address,
            loading: false,
            error: null
          });
        } catch (error) {
          setGeolocation(prev => ({
            ...prev,
            latitude,
            longitude,
            loading: false,
            error: t('photoUpload.errors.couldNotGetAddress')
          }));
        }
      },
      (error) => {
        setGeolocation(prev => ({
          ...prev,
          loading: false,
          error: error.message
        }));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      }
    );
  };

  // Mock reverse geocoding - replace with actual service
  const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    if (lat > 38.7 && lat < 38.8 && lng > -9.2 && lng < -9.1) {
      return "Chiado, Lisbon, Portugal";
    } else if (lat > -23.6 && lat < -23.5 && lng > -46.7 && lng < -46.6) {
      return "Vila Madalena, São Paulo, Brazil";
    } else {
      return `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`;
    }
  };

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

    if (geolocation.latitude && geolocation.longitude) {
      photoData.location = {
        latitude: geolocation.latitude,
        longitude: geolocation.longitude,
        address: geolocation.address || undefined
      };
    }

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
  }, [photos, maxPhotos, maxSizeBytes, onPhotosChange, geolocation, t]);

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
      {/* Location Status */}
      {allowLocation && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <MapPin className="h-4 w-4 text-blue-600 mr-2" />
              <span className="text-sm font-medium text-blue-800">
                {geolocation.loading ? t('photoUpload.location.getting') : 
                 geolocation.address ? t('photoUpload.location.found', { address: geolocation.address }) :
                 geolocation.error ? t('photoUpload.location.unavailable') :
                 t('photoUpload.location.ready')}
              </span>
            </div>
            {geolocation.loading && <Loader className="h-4 w-4 animate-spin text-blue-600" />}
          </div>
          {geolocation.error && !geolocation.latitude && (
            <button
              onClick={getCurrentLocation}
              className="text-xs text-blue-600 hover:text-blue-800 mt-1"
            >
              {t('photoUpload.location.retry')}
            </button>
          )}
        </div>
      )}

      {/* Photo Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {photos.map((photo, index) => (
          <div key={index} className="relative group">
            <img
              src={photo.preview}
              alt={t('photoUpload.photoAlt', { number: index + 1 })}
              className="w-full h-32 object-cover rounded-lg border border-gray-200"
            />
            
            {/* Photo overlay with info */}
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 rounded-lg flex items-center justify-center">
              <button
                onClick={() => removePhoto(index)}
                className="bg-red-500 text-white rounded-full p-1 hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Location indicator */}
            {photo.location && (
              <div className="absolute bottom-1 left-1">
                <div className="bg-black bg-opacity-60 text-white text-xs px-1 py-0.5 rounded flex items-center">
                  <MapPin className="h-3 w-3 mr-1" />
                  GPS
                </div>
              </div>
            )}

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
            className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-gray-400 hover:bg-gray-50 transition-colors h-32 flex flex-col items-center justify-center"
          >
            {isProcessing ? (
              <>
                <Loader className="h-6 w-6 text-gray-400 animate-spin mb-2" />
                <span className="text-xs text-gray-500">{t('photoUpload.processing')}</span>
              </>
            ) : (
              <>
                <div className="flex space-x-2 mb-2">
                  <Camera className="h-5 w-5 text-gray-400" />
                  <Upload className="h-5 w-5 text-gray-400" />
                </div>
                <span className="text-sm text-gray-500">{t('photoUpload.addPhoto')}</span>
                <span className="text-xs text-gray-400 mt-1">
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
        <div className="text-xs text-gray-500 space-y-1">
          <p>📸 {t('photoUpload.info.photoCount', { count: photos.length, max: maxPhotos })}</p>
          {photos.some(p => p.location) && (
            <p>📍 {t('photoUpload.info.photosWithLocation', { count: photos.filter(p => p.location).length })}</p>
          )}
          <p>💾 {t('photoUpload.info.totalSize', { size: (photos.reduce((sum, p) => sum + p.file.size, 0) / 1024 / 1024).toFixed(1) })}</p>
        </div>
      )}

      {/* Mobile Camera Button for better UX */}
      <div className="flex space-x-3">
        <button
          onClick={triggerFileInput}
          className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
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
          className="flex-1 px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center justify-center"
        >
          <FileImage className="h-5 w-5 mr-2" />
          {t('photoUpload.fromGallery')}
        </button>
      </div>
    </div>
  );
};

export default EnhancedPhotoUpload;