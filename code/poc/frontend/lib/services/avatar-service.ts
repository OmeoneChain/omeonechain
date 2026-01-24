// File: code/poc/frontend/lib/services/avatar-service.ts
// Service for uploading user avatars via the backend Pinata endpoint

// API configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://omeonechain-production.up.railway.app';

// Maximum file size (5MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// Allowed file types
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export interface AvatarUploadResult {
  success: boolean;
  url?: string;
  cid?: string;
  error?: string;
}

/**
 * Upload an avatar image via the backend API (which uses Pinata/IPFS)
 * @param file - The image file to upload
 * @param userId - Optional user ID for metadata tracking
 * @param authToken - Optional auth token for authenticated uploads
 * @returns Promise with upload result including IPFS URL
 */
export async function uploadAvatar(
  file: File,
  userId?: string,
  authToken?: string
): Promise<AvatarUploadResult> {
  try {
    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return {
        success: false,
        error: 'Invalid file type. Please use JPEG, PNG, WebP, or GIF.'
      };
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return {
        success: false,
        error: 'File too large. Maximum size is 5MB.'
      };
    }

    // Process image (resize/compress) before upload
    const processedFile = await processAvatarImage(file);

    // Create form data
    const formData = new FormData();
    formData.append('avatar', processedFile);

    // Build URL with optional userId query param
    let uploadUrl = `${API_BASE_URL}/api/upload/avatar`;
    if (userId) {
      uploadUrl += `?userId=${encodeURIComponent(userId)}`;
    }

    // Upload to backend
    const headers: Record<string, string> = {};
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers,
      body: formData
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      return {
        success: false,
        error: data.error || 'Failed to upload avatar'
      };
    }

    return {
      success: true,
      url: data.url,
      cid: data.cid
    };

  } catch (error) {
    console.error('Avatar upload error:', error);
    return {
      success: false,
      error: 'An unexpected error occurred while uploading'
    };
  }
}

/**
 * Check if the upload service is configured and available
 * @returns Promise<boolean>
 */
export async function checkUploadStatus(): Promise<{ configured: boolean; provider: string | null }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/upload/status`);
    const data = await response.json();
    return {
      configured: data.configured || false,
      provider: data.provider || null
    };
  } catch (error) {
    console.error('Upload status check failed:', error);
    return {
      configured: false,
      provider: null
    };
  }
}

/**
 * Resize/compress image before upload (client-side)
 * Creates a square crop centered on the image
 * @param file - Original file
 * @param maxSize - Maximum width/height (default 400px for avatars)
 * @param quality - JPEG quality (0-1, default 0.85)
 * @returns Promise<File> - Processed file
 */
export async function processAvatarImage(
  file: File,
  maxSize: number = 400,
  quality: number = 0.85
): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Could not get canvas context'));
      return;
    }

    img.onload = () => {
      // Calculate dimensions for center crop
      const sourceSize = Math.min(img.width, img.height);
      const sourceX = (img.width - sourceSize) / 2;
      const sourceY = (img.height - sourceSize) / 2;

      // Set canvas to target size
      const targetSize = Math.min(sourceSize, maxSize);
      canvas.width = targetSize;
      canvas.height = targetSize;

      // Draw with white background (for transparency)
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, targetSize, targetSize);

      // Draw centered and cropped
      ctx.drawImage(
        img,
        sourceX, sourceY, sourceSize, sourceSize, // Source rectangle (center crop)
        0, 0, targetSize, targetSize // Destination rectangle
      );

      // Convert to blob
      canvas.toBlob(
        (blob) => {
          if (blob) {
            // Determine file extension from original or default to jpg
            const ext = file.type === 'image/png' ? 'png' : 'jpg';
            const processedFile = new File(
              [blob], 
              `avatar.${ext}`,
              {
                type: file.type === 'image/png' ? 'image/png' : 'image/jpeg',
                lastModified: Date.now()
              }
            );
            resolve(processedFile);
          } else {
            reject(new Error('Failed to process image'));
          }
        },
        file.type === 'image/png' ? 'image/png' : 'image/jpeg',
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error('Failed to load image'));
    };

    img.src = URL.createObjectURL(file);
  });
}

/**
 * Get a placeholder avatar URL based on user's name
 * Uses UI Avatars service for consistent placeholders
 * @param name - User's display name
 * @param size - Avatar size in pixels (default 200)
 * @returns URL to a generated avatar
 */
export function getPlaceholderAvatar(name: string, size: number = 200): string {
  const initials = name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?';
  
  // BocaBoca coral color for placeholder background
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=F97066&color=fff&size=${size}&bold=true&format=png`;
}

/**
 * Validate avatar file before upload
 * @param file - File to validate
 * @returns { valid: boolean, error?: string }
 */
export function validateAvatarFile(file: File): { valid: boolean; error?: string } {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: 'Please select a JPEG, PNG, WebP, or GIF image.'
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `File is too large (${sizeMB}MB). Maximum size is 5MB.`
    };
  }

  return { valid: true };
}