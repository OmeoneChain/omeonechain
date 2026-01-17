// File: code/poc/core/src/api/routes/find-by-phones.ts
// Backend endpoint to find BocaBoca users by phone numbers
// Add this route to your server.ts or users routes file

import { Router, Request, Response } from 'express';
import { supabase } from '../../lib/supabase';
import { authenticateToken } from '../../middleware/auth';

const router = Router();

/**
 * POST /api/users/find-by-phones
 * 
 * Find registered users whose phone numbers match the provided list.
 * Used for "Find Friends from Contacts" feature.
 * 
 * Request body:
 * {
 *   phones: string[]  // Array of normalized phone numbers
 * }
 * 
 * Response:
 * {
 *   success: boolean,
 *   users: Array<{
 *     id: string,
 *     username: string,
 *     display_name: string,
 *     avatar_url: string | null,
 *     followers_count: number,
 *     total_recommendations: number,
 *     is_following: boolean,
 *     matched_phone: string  // The phone number that matched (for client reference)
 *   }>
 * }
 */
router.post('/find-by-phones', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { phones } = req.body;
    const currentUserId = (req as any).user?.id;

    // Validate input
    if (!phones || !Array.isArray(phones)) {
      return res.status(400).json({
        success: false,
        error: 'phones array is required'
      });
    }

    if (phones.length === 0) {
      return res.json({
        success: true,
        users: []
      });
    }

    // Limit to prevent abuse
    if (phones.length > 5000) {
      return res.status(400).json({
        success: false,
        error: 'Too many phone numbers. Maximum is 5000.'
      });
    }

    // Normalize phones for matching
    // We need to handle multiple formats:
    // - Full international: +5511999999999
    // - Without +: 5511999999999
    // - Without country code: 11999999999
    
    // Create variations for each phone number
    const phoneVariations: string[] = [];
    const phoneToOriginal: Record<string, string> = {};

    for (const phone of phones) {
      const cleaned = phone.replace(/\D/g, '');
      
      // Add original
      phoneVariations.push(phone);
      phoneToOriginal[phone] = phone;
      
      // Add with + prefix if not present
      if (!phone.startsWith('+') && cleaned.length > 10) {
        const withPlus = `+${cleaned}`;
        phoneVariations.push(withPlus);
        phoneToOriginal[withPlus] = phone;
      }
      
      // Add without + if present
      if (phone.startsWith('+')) {
        phoneVariations.push(cleaned);
        phoneToOriginal[cleaned] = phone;
      }
      
      // For Brazilian numbers, try with and without country code
      if (cleaned.length === 11 && cleaned.match(/^[1-9][1-9]9/)) {
        // Looks like Brazilian mobile without country code
        const withBrazil = `+55${cleaned}`;
        phoneVariations.push(withBrazil);
        phoneToOriginal[withBrazil] = phone;
      }
      
      if (cleaned.startsWith('55') && cleaned.length === 13) {
        // Has Brazilian country code, also try without
        const withoutCountry = cleaned.slice(2);
        phoneVariations.push(withoutCountry);
        phoneToOriginal[withoutCountry] = phone;
      }
    }

    // Remove duplicates
    const uniquePhones = [...new Set(phoneVariations)];

    // Query users table
    // Note: Adjust column name if your phone column is named differently
    const { data: matchedUsers, error: matchError } = await supabase
      .from('users')
      .select(`
        id,
        username,
        display_name,
        avatar_url,
        phone,
        followers_count,
        total_recommendations
      `)
      .in('phone', uniquePhones)
      .neq('id', currentUserId); // Exclude current user

    if (matchError) {
      console.error('Error finding users by phone:', matchError);
      return res.status(500).json({
        success: false,
        error: 'Database error while searching for users'
      });
    }

    if (!matchedUsers || matchedUsers.length === 0) {
      return res.json({
        success: true,
        users: []
      });
    }

    // Get follow status for each matched user
    const matchedUserIds = matchedUsers.map(u => u.id);
    
    const { data: followingData, error: followError } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', currentUserId)
      .in('following_id', matchedUserIds);

    const followingSet = new Set(
      (followingData || []).map(f => f.following_id)
    );

    // Format response
    const users = matchedUsers.map(user => ({
      id: user.id,
      username: user.username,
      display_name: user.display_name || user.username,
      avatar_url: user.avatar_url,
      followers_count: user.followers_count || 0,
      recommendations_count: user.total_recommendations || 0,
      is_following: followingSet.has(user.id),
      matched_phone: phoneToOriginal[user.phone] || user.phone
    }));

    return res.json({
      success: true,
      users
    });

  } catch (error: any) {
    console.error('Error in find-by-phones:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

export default router;