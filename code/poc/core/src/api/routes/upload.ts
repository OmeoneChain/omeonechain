/**
 * IPFS Photo Upload Route
 * 
 * File: code/poc/core/src/api/routes/upload.ts
 * 
 * Uploads photos to IPFS via Pinata.
 * 
 * Required environment variables:
 *   PINATA_API_KEY
 *   PINATA_SECRET_KEY
 */

import { Router, Request, Response } from 'express';
import multer from 'multer';

const router = Router();

// ===========================================
// CONFIGURATION
// ===========================================

const PINATA_API_KEY = process.env.PINATA_API_KEY || '';
const PINATA_SECRET_KEY = process.env.PINATA_SECRET_KEY || '';

// Pinata gateway for public URLs
const PINATA_GATEWAY = 'https://gateway.pinata.cloud/ipfs/';

// Configure multer for memory storage (multiple photos)
const uploadPhotos = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max per file
    files: 5 // Max 5 files per upload
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Configure multer for avatar uploads (single file, smaller size)
const uploadAvatar = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max for avatars
    files: 1
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Avatar must be JPEG, PNG, WebP, or GIF'));
    }
  }
});

// ===========================================
// PINATA UPLOAD
// ===========================================

async function uploadToPinata(
  buffer: Buffer, 
  filename: string, 
  mimeType: string,
  metadata?: Record<string, string>
): Promise<string> {
  const FormData = (await import('form-data')).default;
  const axios = (await import('axios')).default;
  
  const formData = new FormData();
  formData.append('file', buffer, {
    filename: filename,
    contentType: mimeType
  });

  const pinataMetadata = JSON.stringify({
    name: filename,
    keyvalues: {
      platform: 'bocaboca',
      type: metadata?.type || 'photo',
      uploadedAt: new Date().toISOString(),
      ...metadata
    }
  });
  formData.append('pinataMetadata', pinataMetadata);

  const pinataOptions = JSON.stringify({ cidVersion: 0 });
  formData.append('pinataOptions', pinataOptions);

  try {
    const response = await axios.post(
      'https://api.pinata.cloud/pinning/pinFileToIPFS',
      formData,
      {
        maxBodyLength: Infinity,
        headers: {
          ...formData.getHeaders(),
          'pinata_api_key': PINATA_API_KEY,
          'pinata_secret_api_key': PINATA_SECRET_KEY,
        }
      }
    );

    return response.data.IpfsHash;
  } catch (error: any) {
    const errorMessage = error.response?.data?.error || error.message;
    console.error('Pinata error:', errorMessage);
    throw new Error(`Pinata upload failed: ${errorMessage}`);
  }
}

// ===========================================
// API ENDPOINTS
// ===========================================

/**
 * POST /api/upload/photos
 * 
 * Upload one or more photos to IPFS via Pinata
 * 
 * Request: multipart/form-data with 'photos' field containing image files
 * Response: { success: true, cids: ["Qm...", "Qm..."] }
 */
router.post('/photos', uploadPhotos.array('photos', 5), async (req: Request, res: Response) => {
  try {
    // Check if Pinata is configured
    if (!PINATA_API_KEY || !PINATA_SECRET_KEY) {
      console.error('📷 IPFS upload error: Pinata not configured');
      return res.status(500).json({
        success: false,
        error: 'IPFS storage not configured. Set PINATA_API_KEY and PINATA_SECRET_KEY in environment.'
      });
    }

    const files = req.files as Express.Multer.File[];
    
    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No photos provided'
      });
    }

    console.log(`📷 Uploading ${files.length} photo(s) to IPFS via Pinata...`);

    const results = await Promise.all(
      files.map(async (file, index) => {
        const filename = `bocaboca-${Date.now()}-${index}-${file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        try {
          const startTime = Date.now();
          const cid = await uploadToPinata(file.buffer, filename, file.mimetype);
          const duration = Date.now() - startTime;
          
          console.log(`  ✓ [${index + 1}/${files.length}] ${file.originalname} -> ${cid} (${duration}ms)`);
          
          return { 
            success: true, 
            cid,
            url: `${PINATA_GATEWAY}${cid}`,
            originalName: file.originalname,
            size: file.size,
            mimeType: file.mimetype
          };
        } catch (error: any) {
          console.error(`  ✗ [${index + 1}/${files.length}] ${file.originalname} failed:`, error.message);
          return { 
            success: false, 
            error: error.message,
            originalName: file.originalname 
          };
        }
      })
    );

    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    if (successful.length === 0) {
      console.error('📷 All photo uploads failed');
      return res.status(500).json({
        success: false,
        error: 'All photo uploads failed',
        details: failed
      });
    }

    console.log(`📷 Upload complete: ${successful.length} succeeded, ${failed.length} failed`);

    res.json({
      success: true,
      cids: successful.map(r => (r as any).cid),
      urls: successful.map(r => (r as any).url),
      uploaded: successful.length,
      failed: failed.length,
      details: results
    });

  } catch (error: any) {
    console.error('📷 Photo upload error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to upload photos'
    });
  }
});

/**
 * POST /api/upload/avatar
 * 
 * Upload a user avatar to IPFS via Pinata
 * 
 * Request: multipart/form-data with 'avatar' field containing single image file
 * Optional query param: ?userId=xxx (for metadata tracking)
 * Response: { success: true, cid: "Qm...", url: "https://..." }
 */
router.post('/avatar', uploadAvatar.single('avatar'), async (req: Request, res: Response) => {
  try {
    // Check if Pinata is configured
    if (!PINATA_API_KEY || !PINATA_SECRET_KEY) {
      console.error('🖼️ Avatar upload error: Pinata not configured');
      return res.status(500).json({
        success: false,
        error: 'IPFS storage not configured. Set PINATA_API_KEY and PINATA_SECRET_KEY in environment.'
      });
    }

    const file = req.file;
    
    if (!file) {
      return res.status(400).json({
        success: false,
        error: 'No avatar file provided'
      });
    }

    // Get optional userId from query or body
    const userId = req.query.userId || req.body?.userId || 'unknown';

    console.log(`🖼️ Uploading avatar for user ${userId} to IPFS via Pinata...`);

    const filename = `bocaboca-avatar-${userId}-${Date.now()}.${file.mimetype.split('/')[1] || 'jpg'}`;
    
    const startTime = Date.now();
    const cid = await uploadToPinata(
      file.buffer, 
      filename, 
      file.mimetype,
      { 
        type: 'avatar',
        userId: String(userId)
      }
    );
    const duration = Date.now() - startTime;

    const avatarUrl = `${PINATA_GATEWAY}${cid}`;
    
    console.log(`🖼️ Avatar uploaded: ${cid} (${duration}ms) -> ${avatarUrl}`);

    res.json({
      success: true,
      cid,
      url: avatarUrl,
      size: file.size,
      mimeType: file.mimetype
    });

  } catch (error: any) {
    console.error('🖼️ Avatar upload error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to upload avatar'
    });
  }
});

/**
 * GET /api/upload/status
 * 
 * Check if IPFS (Pinata) is configured
 */
router.get('/status', (req: Request, res: Response) => {
  const configured = !!(PINATA_API_KEY && PINATA_SECRET_KEY);
  
  res.json({
    success: true,
    configured,
    provider: configured ? 'pinata' : 'none',
    gateway: configured ? PINATA_GATEWAY : null
  });
});

export default router;