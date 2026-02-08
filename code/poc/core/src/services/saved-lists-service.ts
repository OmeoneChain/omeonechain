// File: code/poc/core/src/services/saved-lists-service.ts
// Saved Lists Service - Handles all saved list operations and token rewards

import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { getRewardService, RewardResult } from './reward-service';

interface SavedList {
  id: string;
  userId: string;
  name: string;
  description?: string;
  listType: 'places' | 'bookmarks' | 'mixed';
  isDefault: boolean;
  icon: string;
  sortOrder: number;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
  itemCount?: number;
}

interface SavedListItem {
  id: string;
  listId: string;
  itemType: 'restaurant' | 'recommendation' | 'guide';
  itemId: string;
  notes?: string;
  priority: number;
  addedAt: Date;
  visited: boolean;
  visitedAt?: Date;
  opened: boolean;
  openedAt?: Date;
  engagementCount: number;
}

interface CreateListData {
  userId: string;
  name: string;
  description?: string;
  listType?: 'places' | 'bookmarks' | 'mixed';
  icon?: string;
}

interface AddItemData {
  listId: string;
  itemType: 'restaurant' | 'recommendation' | 'guide';
  itemId: string | number;
  notes?: string;
  priority?: number;
  userId: string; // User doing the saving
}

class SavedListsService {
  private db: Pool;

  constructor(db: Pool) {
    this.db = db;
  }

  // ========================================
  // List Management
  // ========================================

  /**
   * Get user's default "Bookmarks" list, create if doesn't exist
   */
  async getOrCreateDefaultList(userId: string): Promise<SavedList> {
    // Check if default list exists
    const result = await this.db.query(
      `SELECT * FROM user_saved_lists 
       WHERE user_id = $1 AND is_default = true 
       LIMIT 1`,
      [userId]
    );

    if (result.rows.length > 0) {
      return this.formatList(result.rows[0]);
    }

    // Create default list
    return this.createList({
      userId,
      name: 'Bookmarks',
      listType: 'bookmarks',
      icon: '🔖'
    }, true);
  }

  /**
   * Get all lists for a user
   */
  async getUserLists(userId: string): Promise<SavedList[]> {
    const result = await this.db.query(
      `SELECT sl.*, COUNT(sli.id) as item_count
       FROM user_saved_lists sl
       LEFT JOIN saved_list_items sli ON sli.list_id = sl.id
       WHERE sl.user_id = $1
       GROUP BY sl.id
       ORDER BY sl.is_default DESC, sl.sort_order ASC, sl.created_at DESC`,
      [userId]
    );

    return result.rows.map(row => this.formatList(row));
  }

/**
   * Get a specific list by ID with items
   */
  async getListById(listId: string, userId: string): Promise<SavedList | null> {
    // First get the list
    const listResult = await this.db.query(
      `SELECT sl.*, COUNT(sli.id) as item_count
       FROM user_saved_lists sl
       LEFT JOIN saved_list_items sli ON sli.list_id = sl.id
       WHERE sl.id = $1 AND sl.user_id = $2
       GROUP BY sl.id`,
      [listId, userId]
    );

    if (listResult.rows.length === 0) return null;
    
    const list = this.formatList(listResult.rows[0]);

    // Fetch items WITHOUT complex joins
    const itemsResult = await this.db.query(
      `SELECT 
        id,
        item_type,
        item_id,
        notes,
        priority,
        added_at,
        visited,
        visited_at
       FROM saved_list_items
       WHERE list_id = $1
       ORDER BY priority ASC, added_at DESC`,
      [listId]
    );

    // Simple item mapping
    list.items = itemsResult.rows.map(row => ({
      id: row.id,
      itemType: row.item_type,
      itemId: row.item_id,
      notes: row.notes,
      priority: row.priority,
      addedAt: row.added_at,
      visited: row.visited,
      visitedAt: row.visited_at,
      details: null
    }));

    return list;
  }

  /**
   * Create a new list
   */
  async createList(data: CreateListData, isDefault: boolean = false): Promise<SavedList> {
    const id = uuidv4();
    
    const result = await this.db.query(
      `INSERT INTO user_saved_lists 
       (id, user_id, name, description, list_type, icon, is_default)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        id,
        data.userId,
        data.name,
        data.description || null,
        data.listType || 'mixed',
        data.icon || '📚',
        isDefault
      ]
    );

    return this.formatList(result.rows[0]);
  }

  /**
   * Update a list
   */
  async updateList(
    listId: string, 
    userId: string, 
    updates: Partial<Pick<SavedList, 'name' | 'description' | 'icon' | 'sortOrder'>>
  ): Promise<SavedList | null> {
    const setClauses: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.name !== undefined) {
      setClauses.push(`name = $${paramIndex++}`);
      values.push(updates.name);
    }
    if (updates.description !== undefined) {
      setClauses.push(`description = $${paramIndex++}`);
      values.push(updates.description);
    }
    if (updates.icon !== undefined) {
      setClauses.push(`icon = $${paramIndex++}`);
      values.push(updates.icon);
    }
    if (updates.sortOrder !== undefined) {
      setClauses.push(`sort_order = $${paramIndex++}`);
      values.push(updates.sortOrder);
    }

    if (setClauses.length === 0) {
      return this.getListById(listId, userId);
    }

    setClauses.push(`updated_at = NOW()`);
    values.push(listId, userId);

    const result = await this.db.query(
      `UPDATE user_saved_lists 
       SET ${setClauses.join(', ')}
       WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) return null;
    return this.formatList(result.rows[0]);
  }

  /**
   * Delete a list (cannot delete default list)
   */
  async deleteList(listId: string, userId: string): Promise<boolean> {
    const result = await this.db.query(
      `DELETE FROM user_saved_lists 
       WHERE id = $1 AND user_id = $2 AND is_default = false
       RETURNING id`,
      [listId, userId]
    );

    return result.rows.length > 0;
  }

  /**
   * Check and award list milestone rewards
   * White Paper v1.02:
   * - Create list with 5+ items: 5.0 BOCA
   * - List reaches 10 saves: +10.0 BOCA
   * - List reaches 50 saves: +20.0 BOCA
   */
  async checkListRewards(listId: string, userId: string): Promise<{
    awarded: string[];
    totalBoca: number;
  }> {
    const { getRewardService } = require('./reward-service');
    const rewardService = getRewardService();
    const awarded: string[] = [];
    let totalBoca = 0;
    
    // Get list with item count and save count
    const result = await this.db.query(
      `SELECT sl.*, 
              COUNT(DISTINCT sli.id) as item_count
       FROM user_saved_lists sl
       LEFT JOIN saved_list_items sli ON sli.list_id = sl.id
       WHERE sl.id = $1 AND sl.user_id = $2
       GROUP BY sl.id`,
      [listId, userId]
    );
    
    if (result.rows.length === 0) return { awarded, totalBoca };
    
    const list = result.rows[0];
    const itemCount = parseInt(list.item_count) || 0;
    const savesCount = list.saves_count || 0;
    
    // Check 5+ items reward (one-time)
    if (itemCount >= 5 && !list.reward_5_items_awarded) {
      console.log(`🏆 [LIST REWARD] List "${list.name}" has 5+ items! Awarding 5.0 BOCA...`);
      
      try {
        const result = await rewardService.awardListCreation(userId, listId);
        
        if (result.success) {
          await this.db.query(
            `UPDATE user_saved_lists SET reward_5_items_awarded = true WHERE id = $1`,
            [listId]
          );
          awarded.push('5_items');
          totalBoca += result.displayAmount;
          console.log(`✅ [LIST REWARD] 5-item bonus: ${result.displayAmount} BOCA`);
        }
      } catch (error) {
        console.error('❌ [LIST REWARD] 5-item bonus error:', error);
      }
    }
    
    // Check 10 saves reward (one-time)
    if (savesCount >= 10 && !list.reward_10_saves_awarded) {
      console.log(`🏆 [LIST REWARD] List "${list.name}" reached 10 saves! Awarding +10.0 BOCA...`);
      
      try {
        const result = await rewardService.awardList10Saves(userId, listId);
        
        if (result.success) {
          await this.db.query(
            `UPDATE user_saved_lists SET reward_10_saves_awarded = true WHERE id = $1`,
            [listId]
          );
          awarded.push('10_saves');
          totalBoca += result.displayAmount;
          console.log(`✅ [LIST REWARD] 10-saves bonus: ${result.displayAmount} BOCA`);
        }
      } catch (error) {
        console.error('❌ [LIST REWARD] 10-saves bonus error:', error);
      }
    }
    
    // Check 50 saves reward (one-time)  
    if (savesCount >= 50 && !list.reward_50_saves_awarded) {
      console.log(`🏆 [LIST REWARD] List "${list.name}" reached 50 saves! Awarding +20.0 BOCA...`);
      
      try {
        const result = await rewardService.awardList50Saves(userId, listId);
        
        if (result.success) {
          await this.db.query(
            `UPDATE user_saved_lists SET reward_50_saves_awarded = true WHERE id = $1`,
            [listId]
          );
          awarded.push('50_saves');
          totalBoca += result.displayAmount;
          console.log(`✅ [LIST REWARD] 50-saves bonus: ${result.displayAmount} BOCA`);
        }
      } catch (error) {
        console.error('❌ [LIST REWARD] 50-saves bonus error:', error);
      }
    }
    
    return { awarded, totalBoca };
  }

  // ========================================
  // List Items Management
  // ========================================

  /**
  * Get all items in a list
  * ✅ FIXED: Now handles both direct restaurants AND recommendations (with correct column names)
  */
  async getListItems(listId: string, userId: string): Promise<SavedListItem[]> {
    // Verify user owns the list
    const list = await this.getListById(listId, userId);
    if (!list) throw new Error('List not found');

    const result = await this.db.query(
      `SELECT 
        sli.*,
        -- Get restaurant data either directly or through recommendation
        COALESCE(r.id, rec_r.id) as restaurant_id,
        COALESCE(r.name, rec_r.name) as restaurant_name,
        COALESCE(r.address, rec_r.address) as restaurant_address,
        COALESCE(r.city, rec_r.city) as restaurant_city,
        COALESCE(r.cuisine_type, rec_r.cuisine_type) as restaurant_cuisine_type,
        COALESCE(r.category, rec_r.category) as restaurant_category,
        COALESCE(r.latitude, rec_r.latitude) as restaurant_latitude,
        COALESCE(r.longitude, rec_r.longitude) as restaurant_longitude,
        -- Also include recommendation data when available
        rec.id as recommendation_id,
        rec.title as recommendation_title,
        rec.content as recommendation_content,
        rec.overall_rating as recommendation_rating
      FROM saved_list_items sli
      -- Join directly to restaurants when item_type = 'restaurant'
      LEFT JOIN restaurants r ON sli.item_type = 'restaurant' AND sli.item_id = r.id::text
      -- Join to recommendations when item_type = 'recommendation'
      LEFT JOIN recommendations rec ON sli.item_type = 'recommendation' AND sli.item_id = rec.id::text
      -- Then join from recommendations to their restaurants
      LEFT JOIN restaurants rec_r ON rec.restaurant_id = rec_r.id
      WHERE sli.list_id = $1
      ORDER BY sli.priority ASC, sli.added_at ASC`,
      [listId]
    );

    return result.rows.map(row => this.formatItemWithData(row));
  }

  /**
   * Add item to list with token reward
   */
  async addItemToList(data: AddItemData): Promise<SavedListItem> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');

      // 1. Add item to list
      const itemId = uuidv4();
      const itemIdStr = data.itemId.toString();

      const result = await client.query(
        `INSERT INTO saved_list_items 
         (id, list_id, item_type, item_id, notes, priority)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (list_id, item_type, item_id) DO NOTHING
         RETURNING *`,
        [
          itemId,
          data.listId,
          data.itemType,
          itemIdStr,
          data.notes || null,
          data.priority || 2
        ]
      );

      if (result.rows.length === 0) {
        // Item already exists in list
        await client.query('ROLLBACK');
        const existing = await client.query(
          `SELECT * FROM saved_list_items 
           WHERE list_id = $1 AND item_type = $2 AND item_id = $3`,
          [data.listId, data.itemType, itemIdStr]
        );
        return this.formatItem(existing.rows[0]);
      }
    
      const savedItem = result.rows[0];

      // 2. Calculate and award token reward
      await this.processInitialSaveReward(
        client,
        savedItem.id,
        data.itemType,
        itemIdStr,
        data.userId
      );

      await client.query('COMMIT');

      // await this.checkListRewards(data.listId, data.userId);
      
      return this.formatItem(savedItem);
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Remove item from list
   */
  async removeItemFromList(
    listId: string, 
    itemId: string, 
    userId: string
  ): Promise<boolean> {
    // Verify user owns the list
    const list = await this.getListById(listId, userId);
    if (!list) throw new Error('List not found');

    const result = await this.db.query(
      `DELETE FROM saved_list_items 
       WHERE id = $1 AND list_id = $2
       RETURNING id`,
      [itemId, listId]
    );

    return result.rows.length > 0;
  }

  /**
   * Reorder items in a list
   */
  async reorderItems(
    listId: string,
    userId: string,
    items: Array<{ itemId: string; position: number }>
  ): Promise<boolean> {
    // Verify user owns the list
    const list = await this.db.query(
      'SELECT id FROM user_saved_lists WHERE id = $1 AND user_id = $2',
      [listId, userId]
    );
    if (list.rows.length === 0) throw new Error('List not found');

    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      for (const item of items) {
        await client.query(
          `UPDATE saved_list_items 
           SET priority = $1 
           WHERE id = $2 AND list_id = $3`,
          [item.position, item.itemId, listId]
        );
      }

      await client.query(
        'UPDATE user_saved_lists SET updated_at = NOW() WHERE id = $1',
        [listId]
      );

      await client.query('COMMIT');
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Mark restaurant as visited
   */
  async markAsVisited(
    listId: string,
    itemId: string,
    userId: string,
    visited: boolean = true
  ): Promise<SavedListItem | null> {
    const client = await this.db.connect();

    try {
      await client.query('BEGIN');

      // Update visited status
      const result = await client.query(
        `UPDATE saved_list_items sli
         SET visited = $1, visited_at = CASE WHEN $1 THEN NOW() ELSE NULL END
         FROM user_saved_lists sl
         WHERE sli.id = $2 AND sli.list_id = $3 
         AND sl.id = $3 AND sl.user_id = $4
         AND sli.item_type = 'restaurant'
         RETURNING sli.*`,
        [visited, itemId, listId, userId]
      );

      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        return null;
      }

      const item = result.rows[0];

      // Award visit bonus if marking as visited for first time
      if (visited && !item.visited) {
        await this.processVisitBonus(client, item.id, item.item_id, userId);
      }

      await client.query('COMMIT');
      return this.formatItem(item);

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Track that recommendation/guide was opened
   */
  async trackOpened(
    listId: string,
    itemId: string,
    userId: string
  ): Promise<SavedListItem | null> {
    const client = await this.db.connect();

    try {
      await client.query('BEGIN');

      // Update opened status and increment engagement count
      const result = await client.query(
        `UPDATE saved_list_items sli
         SET 
           opened = true,
           opened_at = COALESCE(opened_at, NOW()),
           engagement_count = engagement_count + 1
         FROM user_saved_lists sl
         WHERE sli.id = $1 AND sli.list_id = $2
         AND sl.id = $2 AND sl.user_id = $3
         AND sli.item_type IN ('recommendation', 'guide')
         RETURNING sli.*`,
        [itemId, listId, userId]
      );

      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        return null;
      }

      const item = result.rows[0];

      // Award open bonus if first time
      if (item.engagement_count === 1) {
        await this.processOpenBonus(client, item.id, item.item_type, item.item_id, userId);
      }

      await client.query('COMMIT');
      return this.formatItem(item);

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // ========================================
  // Check/Query Methods
  // ========================================

  /**
   * Check if an item is saved by user (in any list)
   * Returns array of lists containing the item
   */
  async checkItemSaved(
    userId: string, 
    itemType: string, 
    itemId: string
  ): Promise<Array<{ id: string; name: string }>> {
    const result = await this.db.query(
      `SELECT sli.list_id as id, sl.name
       FROM saved_list_items sli
       JOIN user_saved_lists sl ON sl.id = sli.list_id
       WHERE sl.user_id = $1 
         AND sli.item_type = $2 
         AND sli.item_id = $3`,
      [userId, itemType, itemId]
    );
    
    return result.rows.map(r => ({ id: r.id, name: r.name }));
  }

  /**
   * Check if item exists in specific list
   */
  async checkItemInList(
    listId: string, 
    userId: string, 
    itemType: string, 
    itemId: string
  ): Promise<boolean> {
    // Verify ownership
    const ownerCheck = await this.db.query(
      'SELECT user_id FROM user_saved_lists WHERE id = $1',
      [listId]
    );
    
    if (!ownerCheck.rows[0] || ownerCheck.rows[0].user_id !== userId) {
      throw new Error('Not authorized');
    }
    
    const result = await this.db.query(
      `SELECT id FROM saved_list_items
       WHERE list_id = $1 AND item_type = $2 AND item_id = $3`,
      [listId, itemType, itemId]
    );
    
    return result.rows.length > 0;
  }

  // ========================================
  // Token Reward Logic
  // ========================================

  /**
   * Process initial save reward
   */
  private async processInitialSaveReward(
    client: any,
    savedItemId: string,
    itemType: string,
    itemId: string,
    saverId: string
  ): Promise<void> {
    // Find content creator
    const creator = await this.findContentCreator(client, itemType, itemId, saverId);
    if (!creator || creator.id === saverId) {
      // No reward for saving own content
      return;
    }

    // Calculate reward
    const baseReward = this.getBaseReward(itemType);
    const multiplier = await this.calculateRewardMultiplier(
      client,
      saverId,
      creator.id,
      itemType,
      itemId
    );

    const finalReward = baseReward * multiplier;

    if (finalReward <= 0) return;

    // Award tokens (you'll need to implement awardTokens function)
    await this.awardTokens(client, {
      fromUserId: 'system',
      toUserId: creator.id,
      amount: finalReward,
      reason: 'content_saved'
    });

    // Track reward
    await client.query(
      `INSERT INTO save_rewards 
       (saved_list_item_id, reward_type, amount, recipient_user_id, saver_user_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [savedItemId, 'initial_save', finalReward, creator.id, saverId]
    );
  }

  /**
   * Process visit bonus reward
   */
  private async processVisitBonus(
    client: any,
    savedItemId: string,
    restaurantId: string,
    visitorId: string
  ): Promise<void> {
    // Check if already rewarded
    const existing = await client.query(
      `SELECT id FROM save_rewards 
       WHERE saved_list_item_id = $1 AND reward_type = 'visit_bonus'`,
      [savedItemId]
    );

    if (existing.rows.length > 0) return;

    // Find restaurant recommender
    const creator = await this.findContentCreator(client, 'restaurant', restaurantId, visitorId);
    if (!creator) return;

    const bonusAmount = 1.0; // Visit bonus

    await this.awardTokens(client, {
      fromUserId: 'system',
      toUserId: creator.id,
      amount: bonusAmount,
      reason: 'restaurant_visited'
    });

    await client.query(
      `INSERT INTO save_rewards 
       (saved_list_item_id, reward_type, amount, recipient_user_id, saver_user_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [savedItemId, 'visit_bonus', bonusAmount, creator.id, visitorId]
    );
  }

  /**
   * Process open bonus reward
   */
  private async processOpenBonus(
    client: any,
    savedItemId: string,
    itemType: string,
    itemId: string,
    openerId: string
  ): Promise<void> {
    // Check if already rewarded
    const existing = await client.query(
      `SELECT id FROM save_rewards 
       WHERE saved_list_item_id = $1 AND reward_type = 'engagement_bonus'`,
      [savedItemId]
    );

    if (existing.rows.length > 0) return;

    const creator = await this.findContentCreator(client, itemType, itemId, openerId);
    if (!creator) return;

    const bonusAmount = itemType === 'guide' ? 0.5 : 0.25;

    await this.awardTokens(client, {
      fromUserId: 'system',
      toUserId: creator.id,
      amount: bonusAmount,
      reason: 'content_opened'
    });

    await client.query(
      `INSERT INTO save_rewards 
       (saved_list_item_id, reward_type, amount, recipient_user_id, saver_user_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [savedItemId, 'engagement_bonus', bonusAmount, creator.id, openerId]
    );
  }

  /**
   * Find content creator based on item type
   */
  private async findContentCreator(
    client: any,
    itemType: string,
    itemId: string,
    saverId: string
  ): Promise<{ id: string } | null> {
    let query: string;
    
    switch (itemType) {
      case 'restaurant':
        // Find most recent recommender (or first person who added restaurant)
        query = `
          SELECT r.author_id as id
          FROM recommendations r
          WHERE r.restaurant_id = $1
          ORDER BY r.trust_score DESC, r.created_at DESC
          LIMIT 1
        `;
        break;
        
      case 'recommendation':
        query = `
          SELECT author_id as id
          FROM recommendations
          WHERE id = $1
        `;
        break;
        
      case 'guide':
        query = `
          SELECT author_id as id
          FROM food_guides
          WHERE id = $1
        `;
        break;
        
      default:
        return null;
    }

    const result = await client.query(query, [itemId]);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * Calculate reward multiplier based on various factors
   */
  private async calculateRewardMultiplier(
    client: any,
    saverId: string,
    creatorId: string,
    itemType: string,
    itemId: string
  ): Promise<number> {
    let multiplier = 1.0;

    // 1. Social distance multiplier
    const socialDistance = await this.getTrustDistance(client, saverId, creatorId);
    switch (socialDistance) {
      case 1: multiplier *= 1.0; break;   // Direct connection
      case 2: multiplier *= 0.75; break;  // 2-hop connection
      default: multiplier *= 0.25; break; // No connection
    }

    // 2. Account age multiplier
    const accountAge = await this.getAccountAgeDays(client, saverId);
    if (accountAge < 30) {
      multiplier *= 0.5;
    } else if (accountAge < 90) {
      multiplier *= 0.75;
    }
    // Else: 1.0 (no change)

    // 3. Diversity bonus
    const uniqueSavers = await this.countUniqueSavers(client, itemType, itemId);
    const diversityBonus = Math.min(1 + (uniqueSavers * 0.1), 2.0);
    multiplier *= diversityBonus;

    return multiplier;
  }

  /**
   * Get base reward amount for item type
   */
  private getBaseReward(itemType: string): number {
    switch (itemType) {
      case 'restaurant': return 0.5;
      case 'recommendation': return 0.25;
      case 'guide': return 0.5;
      default: return 0.25;
    }
  }

  /**
   * Get trust distance between two users (simplified - implement based on your social graph)
   */
  private async getTrustDistance(client: any, userId1: string, userId2: string): Promise<number> {
    // TODO: Implement actual social graph distance calculation
    // For now, return 3 (no connection) - you'll need to implement this based on your follows/connections table
    const result = await client.query(
      `SELECT 1 as distance FROM social_connections 
       WHERE follower_id = $1 AND following_id = $2
       UNION
       SELECT 2 as distance FROM social_connections f1
       JOIN social_connections f2 ON f1.following_id = f2.follower_id
       WHERE f1.follower_id = $1 AND f2.following_id = $2
       LIMIT 1`,
      [userId1, userId2]
    );

    return result.rows.length > 0 ? result.rows[0].distance : 3;
  }

  /**
   * Get account age in days
   */
  private async getAccountAgeDays(client: any, userId: string): Promise<number> {
    const result = await client.query(
      `SELECT EXTRACT(DAY FROM NOW() - created_at) as age_days 
       FROM users WHERE id = $1`,
      [userId]
    );

    return result.rows.length > 0 ? result.rows[0].age_days : 0;
  }

  /**
   * Count unique savers for an item
   */
  private async countUniqueSavers(
    client: any,
    itemType: string,
    itemId: string
  ): Promise<number> {
    const result = await client.query(
      `SELECT COUNT(DISTINCT sl.user_id) as unique_savers
       FROM saved_list_items sli
       JOIN user_saved_lists sl ON sl.id = sli.list_id
       WHERE sli.item_type = $1 AND sli.item_id = $2`,
      [itemType, itemId]
    );

    return result.rows.length > 0 ? result.rows[0].unique_savers : 0;
  }

  /**
   * Award tokens to user (stub - implement based on your token system)
   */
  private async awardTokens(
    client: any,
    data: {
      fromUserId: string;
      toUserId: string;
      amount: number;
      reason: string;
    }
  ): Promise<void> {
    // TODO: Implement actual token transfer logic
    // This should integrate with your existing token/reward system
    console.log(`Awarding ${data.amount} tokens to ${data.toUserId} for ${data.reason}`);
    
    // Example implementation (adjust based on your token table structure):
    /*
    await client.query(
      `INSERT INTO token_transactions 
       (from_user_id, to_user_id, amount, reason, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [data.fromUserId, data.toUserId, data.amount, data.reason]
    );
    
    await client.query(
      `UPDATE user_balances 
       SET balance = balance + $1 
       WHERE user_id = $2`,
      [data.amount, data.toUserId]
    );
    */
  }

  // ========================================
  // Utility Methods
  // ========================================

  private formatList(row: any): SavedList {
    return {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      description: row.description,
      listType: row.list_type,
      isDefault: row.is_default,
      icon: row.icon,
      sortOrder: row.sort_order,
      isPublic: row.is_public,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      itemCount: row.item_count ? parseInt(row.item_count) : 0
    };
  }

  private formatItem(row: any): SavedListItem {
    return {
      id: row.id,
      listId: row.list_id,
      itemType: row.item_type,
      itemId: row.item_id,
      notes: row.notes,
      priority: row.priority,
      addedAt: row.added_at,
      visited: row.visited || false,
      visitedAt: row.visited_at,
      opened: row.opened || false,
      openedAt: row.opened_at,
      engagementCount: row.engagement_count || 0
    };
  }

  private formatItemWithData(row: any): SavedListItem {
    const item = this.formatItem(row);

    // Add restaurant data if available (from either direct restaurant or recommendation)
    if (row.restaurant_id) {
      (item as any).itemData = {
        id: row.restaurant_id,
        name: row.restaurant_name,
        address: row.restaurant_address,
        city: row.restaurant_city,
        cuisine_type: row.restaurant_cuisine_type,
        category: row.restaurant_category,
        latitude: row.restaurant_latitude,
        longitude: row.restaurant_longitude
      };
    }

    // Add recommendation data if this is a saved recommendation
    if (row.recommendation_id) {
      (item as any).recommendationData = {
        id: row.recommendation_id,
        title: row.recommendation_title,
        content: row.recommendation_content,
        rating: row.recommendation_rating
      };
    }

    return item;
  }
}

export default SavedListsService;