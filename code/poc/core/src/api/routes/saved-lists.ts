// File: code/poc/core/src/api/routes/saved-lists.ts
// API Routes for Saved Lists functionality
// ✅ COMPLETE VERSION - All endpoints included with items enhancement
// ✅ FIXED: Now correctly filters by itemData presence instead of itemType

import { Router, Request, Response } from 'express';
import SavedListsService from '../../services/saved-lists-service';

const router = Router();

// Helper to get authenticated user ID
const getUserId = (req: Request): string => {
  const userId = (req as any).user?.id || (req as any).userId;
  
  if (!userId) {
    throw new Error('Authentication required');
  }
  
  return userId;
};

/**
 * GET /api/saved-lists
 * Get all saved lists for authenticated user WITH items
 * ✅ ENHANCED: Now includes restaurant data for preview
 * ✅ FIXED: Filters by itemData presence (works for both restaurants and recommendations)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const savedListsService = new SavedListsService(req.app.locals.db);

    // Get all lists for user
    const lists = await savedListsService.getUserLists(userId);

    console.log('🔍 Fetching items for lists. UserId:', userId);
    console.log('🔍 Number of lists:', lists.length);

    // For each list, fetch the items (restaurants)
    const listsWithItems = await Promise.all(
      lists.map(async (list) => {
        try {
          const items = await savedListsService.getListItems(list.id, userId);
          
          // Transform items to restaurant format for preview
          // ✅ FIXED: Filter by itemData presence instead of itemType
          const restaurants = items
            .filter(item => item.itemData) // Works for both direct restaurants and recommendations
            .slice(0, 4) // Get first 4 for preview
            .map(item => ({
              itemId: item.id,
              id: item.itemData?.id || item.itemId,
              name: item.itemData?.name || 'Restaurant',
              image: item.itemData?.image || undefined,
              cuisine: item.itemData?.cuisine_type || item.itemData?.category || 'Restaurant',
              location: item.itemData?.city || '',
              address: item.itemData?.address || ''
            }));

          return {
            ...list,
            items: restaurants,
            restaurant_count: items.filter(item => item.itemData).length
          };
        } catch (error) {
          console.error(`Error fetching items for list ${list.id}:`, error);
          return {
            ...list,
            items: [],
            restaurant_count: 0
          };
        }
      })
    );

    res.json({
      success: true,
      lists: listsWithItems,
      total: listsWithItems.length
    });
  } catch (error) {
    console.error('Error fetching saved lists:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch saved lists'
    });
  }
});

/**
 * GET /api/saved-lists/check
 * Check if an item is saved by the user (in any list)
 * Query params: itemType, itemId
 * Returns: { isSaved: boolean, lists: Array<{id, name}> }
 */
router.get('/check', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { itemType, itemId } = req.query;

    if (!itemType || !itemId) {
      return res.status(400).json({
        success: false,
        error: 'itemType and itemId query parameters are required'
      });
    }

    const savedListsService = new SavedListsService(req.app.locals.db);
    const savedLists = await savedListsService.checkItemSaved(
      userId,
      itemType as string,
      itemId as string
    );

    res.json({
      success: true,
      isSaved: savedLists.length > 0,
      lists: savedLists
    });
  } catch (error) {
    console.error('Error checking save status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check save status'
    });
  }
});

/**
 * GET /api/saved-lists/:id
 * Get specific saved list with items
 * ✅ ENHANCED: Now includes full item details
 * ✅ FIXED: Filters by itemData presence
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;
    const savedListsService = new SavedListsService(req.app.locals.db);

    const list = await savedListsService.getListById(id, userId);

    if (!list) {
      return res.status(404).json({
        success: false,
        error: 'List not found'
      });
    }

    // Get items for this list
    const items = await savedListsService.getListItems(id, userId);
    
    // Transform items for display
    // ✅ FIXED: Filter by itemData presence instead of itemType
    const restaurants = items
      .filter(item => item.itemData) // Works for both direct restaurants and recommendations
      .map(item => ({
        itemId: item.id,
        id: item.itemData?.id || item.itemId,
        name: item.itemData?.name || 'Restaurant',
        image: item.itemData?.image || undefined,
        cuisine: item.itemData?.cuisine_type || item.itemData?.category || 'Restaurant',
        location: item.itemData?.city || '',
        address: item.itemData?.address || ''
      }));

    res.json({
      success: true,
      list: {
        ...list,
        items: restaurants,
        restaurant_count: restaurants.length
      }
    });
  } catch (error) {
    console.error('Error fetching saved list:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch saved list'
    });
  }
});

/**
 * GET /api/saved-lists/:listId/check
 * Check if a specific item exists in a specific list
 * Query params: itemType, itemId
 * Returns: { exists: boolean }
 */
router.get('/:listId/check', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { listId } = req.params;
    const { itemType, itemId } = req.query;

    if (!itemType || !itemId) {
      return res.status(400).json({
        success: false,
        error: 'itemType and itemId query parameters are required'
      });
    }

    const savedListsService = new SavedListsService(req.app.locals.db);
    const exists = await savedListsService.checkItemInList(
      listId,
      userId,
      itemType as string,
      itemId as string
    );

    res.json({
      success: true,
      exists
    });
  } catch (error) {
    console.error('Error checking list item:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check list item'
    });
  }
});

/**
 * POST /api/saved-lists
 * Create new saved list
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { name, description, listType, icon } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'List name is required'
      });
    }

    const savedListsService = new SavedListsService(req.app.locals.db);

    const list = await savedListsService.createList({
      userId,
      name: name.trim(),
      description: description?.trim(),
      listType: listType || 'mixed',
      icon: icon || '📚'
    });

    res.status(201).json({
      success: true,
      list: {
        ...list,
        items: [], // New lists start empty
        restaurant_count: 0
      }
    });
  } catch (error) {
    console.error('Error creating saved list:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create saved list'
    });
  }
});

/**
 * PUT /api/saved-lists/:id
 * Update saved list
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;
    const { name, description, icon, sortOrder } = req.body;

    const savedListsService = new SavedListsService(req.app.locals.db);

    const updates: any = {};
    if (name !== undefined) updates.name = name.trim();
    if (description !== undefined) updates.description = description?.trim();
    if (icon !== undefined) updates.icon = icon;
    if (sortOrder !== undefined) updates.sortOrder = sortOrder;

    const list = await savedListsService.updateList(id, userId, updates);

    if (!list) {
      return res.status(404).json({
        success: false,
        error: 'List not found'
      });
    }

    res.json({
      success: true,
      list
    });
  } catch (error) {
    console.error('Error updating saved list:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update saved list'
    });
  }
});

/**
 * PUT /api/saved-lists/:id/reorder
 * Reorder items in a saved list
 */
router.put('/:id/reorder', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;
    const { items } = req.body;

    if (!items || !Array.isArray(items)) {
      return res.status(400).json({
        success: false,
        error: 'items array is required with { itemId, position } objects'
      });
    }

    const savedListsService = new SavedListsService(req.app.locals.db);
    await savedListsService.reorderItems(id, userId, items);

    res.json({
      success: true,
      message: 'Items reordered successfully'
    });
  } catch (error) {
    console.error('Error reordering list items:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reorder items'
    });
  }
});

/**
 * DELETE /api/saved-lists/:id
 * Delete saved list (cannot delete default list)
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;

    const savedListsService = new SavedListsService(req.app.locals.db);

    const deleted = await savedListsService.deleteList(id, userId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'List not found or cannot delete default list'
      });
    }

    res.json({
      success: true,
      message: 'List deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting saved list:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete saved list'
    });
  }
});

/**
 * GET /api/saved-lists/:id/items
 * Get all items in a saved list
 */
router.get('/:id/items', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;

    const savedListsService = new SavedListsService(req.app.locals.db);

    const items = await savedListsService.getListItems(id, userId);

    res.json({
      success: true,
      items,
      total: items.length
    });
  } catch (error) {
    console.error('Error fetching list items:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch list items'
    });
  }
});

/**
 * POST /api/saved-lists/:id/items
 * Add item to saved list
 * NOTE: Token rewards are automatically handled by SavedListsService.addItemToList()
 */
router.post('/:id/items', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { id: listId } = req.params;
    const { itemType, itemId, notes, priority } = req.body;

    // Validate request
    if (!itemType || !itemId) {
      return res.status(400).json({
        success: false,
        error: 'itemType and itemId are required'
      });
    }

    if (!['restaurant', 'recommendation', 'guide'].includes(itemType)) {
      return res.status(400).json({
        success: false,
        error: 'itemType must be restaurant, recommendation, or guide'
      });
    }

    const savedListsService = new SavedListsService(req.app.locals.db);

    // Service handles token rewards automatically
    const item = await savedListsService.addItemToList({
      listId,
      itemType,
      itemId,
      notes: notes?.trim(),
      priority: priority || 2,
      userId
    });

    res.status(201).json({
      success: true,
      item,
      message: 'Item saved successfully'
    });
  } catch (error) {
    console.error('Error adding item to list:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to add item to list'
    });
  }
});

/**
 * DELETE /api/saved-lists/:listId/items/:itemId
 * Remove item from saved list
 */
router.delete('/:listId/items/:itemId', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { listId, itemId } = req.params;

    const savedListsService = new SavedListsService(req.app.locals.db);

    const removed = await savedListsService.removeItemFromList(listId, itemId, userId);

    if (!removed) {
      return res.status(404).json({
        success: false,
        error: 'Item not found in list'
      });
    }

    res.json({
      success: true,
      message: 'Item removed from list'
    });
  } catch (error) {
    console.error('Error removing item from list:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to remove item from list'
    });
  }
});

/**
 * PATCH /api/saved-lists/:listId/items/:itemId/visited
 * Mark restaurant as visited
 * NOTE: Visit bonus reward is automatically handled by SavedListsService.markAsVisited()
 */
router.patch('/:listId/items/:itemId/visited', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { listId, itemId } = req.params;
    const { visited } = req.body;

    if (visited === undefined) {
      return res.status(400).json({
        success: false,
        error: 'visited field is required'
      });
    }

    const savedListsService = new SavedListsService(req.app.locals.db);

    // Service handles visit bonus automatically
    const item = await savedListsService.markAsVisited(listId, itemId, userId, visited);

    if (!item) {
      return res.status(404).json({
        success: false,
        error: 'Item not found or not a restaurant'
      });
    }

    res.json({
      success: true,
      item,
      message: visited ? 'Marked as visited' : 'Unmarked as visited'
    });
  } catch (error) {
    console.error('Error updating visited status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update visited status'
    });
  }
});

/**
 * PATCH /api/saved-lists/:listId/items/:itemId/opened
 * Track that recommendation/guide was opened
 * NOTE: Opened bonus reward is automatically handled by SavedListsService.trackOpened()
 */
router.patch('/:listId/items/:itemId/opened', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { listId, itemId } = req.params;

    const savedListsService = new SavedListsService(req.app.locals.db);

    // Service handles opened bonus automatically
    const item = await savedListsService.trackOpened(listId, itemId, userId);

    if (!item) {
      return res.status(404).json({
        success: false,
        error: 'Item not found or not a recommendation/guide'
      });
    }

    res.json({
      success: true,
      item,
      message: 'Engagement tracked'
    });
  } catch (error) {
    console.error('Error tracking engagement:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to track engagement'
    });
  }
});

/**
 * POST /api/saved-lists/quick-save
 * Quick save to default list (convenience endpoint)
 */
router.post('/quick-save', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { itemType, itemId } = req.body;

    if (!itemType || !itemId) {
      return res.status(400).json({
        success: false,
        error: 'itemType and itemId are required'
      });
    }

    const savedListsService = new SavedListsService(req.app.locals.db);

    // Get or create default list
    const defaultList = await savedListsService.getOrCreateDefaultList(userId);

    // Add item to default list (service handles token rewards)
    const item = await savedListsService.addItemToList({
      listId: defaultList.id,
      itemType,
      itemId,
      userId
    });

    res.status(201).json({
      success: true,
      item,
      list: defaultList,
      message: 'Saved to Bookmarks'
    });
  } catch (error) {
    console.error('Error quick-saving item:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save item'
    });
  }
});

export default router;