// File: code/poc/frontend/lib/services/saved-lists-service.ts
// Frontend API Client for Saved Lists - Makes HTTP calls to backend
// ✅ FIXED: Now uses correct token key 'omeone_auth_token'

export interface SavedList {
  id: string;
  userId: string;
  name: string;
  description?: string;
  listType: 'places' | 'bookmarks' | 'mixed';
  isDefault: boolean;
  icon: string;
  sortOrder: number;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  itemCount?: number;
}

export interface SavedListItem {
  id: string;
  listId: string;
  itemType: 'restaurant' | 'recommendation' | 'guide';
  itemId: string;
  notes?: string;
  priority: number;
  addedAt: string;
  visited: boolean;
  visitedAt?: string;
  opened: boolean;
  openedAt?: string;
  engagementCount: number;
}

export interface CreateListData {
  name: string;
  description?: string;
  listType?: 'places' | 'bookmarks' | 'mixed';
  icon?: string;
}

export interface AddItemData {
  itemType: 'restaurant' | 'recommendation' | 'guide';
  itemId: string | number;
  notes?: string;
  priority?: number;
}

export interface UpdateListData {
  name?: string;
  description?: string;
  icon?: string;
  sortOrder?: number;
}

export interface CheckSavedResponse {
  isSaved: boolean;
  lists: Array<{ id: string; name: string }>;
}

class SavedListsService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  }

  // ✅ FIXED: Use correct token key 'omeone_auth_token'
  private getAuthToken(): string | null {
    if (typeof window === 'undefined') return null;
    
    // Try the correct key first
    const token = localStorage.getItem('omeone_auth_token');
    
    if (!token) {
      console.warn('⚠️ No auth token found in localStorage. User may not be logged in.');
    }
    
    return token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = this.getAuthToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    } else {
      console.warn('⚠️ Making request without authentication token:', endpoint);
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || error.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    
    // FIXED: Handle multiple backend response formats
    if (data.success !== undefined) {
      if (!data.success) {
        throw new Error(data.error || 'Request failed');
      }
      
      // Try different response formats:
      // 1. { success: true, data: {...} }
      // 2. { success: true, list: {...} }
      // 3. { success: true, lists: [...] }
      // 4. { success: true, item: {...} }
      return data.data || data.list || data.lists || data.item || data;
    }
    
    return data;
  }

  async getUserLists(): Promise<SavedList[]> {
    const response = await this.request<any>('/api/saved-lists');
    // Handle wrapped response: { success: true, lists: [...] }
    return Array.isArray(response) ? response : (response.lists || response);
  }

  async getListById(listId: string): Promise<SavedList> {
    return this.request<SavedList>(`/api/saved-lists/${listId}`);
  }

  async createList(data: CreateListData): Promise<SavedList> {
    console.log('Creating list with data:', data);
    const response = await this.request<SavedList>('/api/saved-lists', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    console.log('Create list response:', response);
    
    // Validate that we got a proper list with an ID
    if (!response || typeof response !== 'object') {
      throw new Error('Invalid response from server');
    }
    
    const list = response as SavedList;
    if (!list.id) {
      console.error('List created but no ID returned:', list);
      throw new Error('List created but no ID returned from server');
    }
    
    return list;
  }

  async updateList(listId: string, data: UpdateListData): Promise<SavedList> {
    return this.request<SavedList>(`/api/saved-lists/${listId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteList(listId: string): Promise<void> {
    await this.request<void>(`/api/saved-lists/${listId}`, {
      method: 'DELETE',
    });
  }

  async getListItems(listId: string): Promise<SavedListItem[]> {
    return this.request<SavedListItem[]>(`/api/saved-lists/${listId}/items`);
  }

  async addItemToList(listId: string, data: AddItemData): Promise<SavedListItem> {
    console.log('Adding item to list:', listId, data);
    const response = await this.request<SavedListItem>(`/api/saved-lists/${listId}/items`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    console.log('Add item response:', response);
    return response;
  }

  async removeItemFromList(listId: string, itemId: string): Promise<void> {
    await this.request<void>(`/api/saved-lists/${listId}/items/${itemId}`, {
      method: 'DELETE',
    });
  }

  async markAsVisited(
    listId: string,
    itemId: string,
    visited: boolean = true
  ): Promise<SavedListItem> {
    return this.request<SavedListItem>(
      `/api/saved-lists/${listId}/items/${itemId}/visited`,
      {
        method: 'PATCH',
        body: JSON.stringify({ visited }),
      }
    );
  }

  async trackOpened(listId: string, itemId: string): Promise<SavedListItem> {
    return this.request<SavedListItem>(
      `/api/saved-lists/${listId}/items/${itemId}/opened`,
      {
        method: 'PATCH',
      }
    );
  }

  async checkItemSaved(
    itemType: 'restaurant' | 'recommendation' | 'guide',
    itemId: string | number
  ): Promise<CheckSavedResponse> {
    const params = new URLSearchParams({
      itemType,
      itemId: itemId.toString(),
    });

    return this.request<CheckSavedResponse>(
      `/api/saved-lists/check?${params.toString()}`
    );
  }

  async checkItemInList(
    listId: string,
    itemType: 'restaurant' | 'recommendation' | 'guide',
    itemId: string | number
  ): Promise<boolean> {
    const params = new URLSearchParams({
      itemType,
      itemId: itemId.toString(),
    });

    const response = await this.request<{ exists: boolean }>(
      `/api/saved-lists/${listId}/check?${params.toString()}`
    );

    return response.exists;
  }

  async quickSave(
    itemType: 'restaurant' | 'recommendation' | 'guide',
    itemId: string | number,
    notes?: string
  ): Promise<SavedListItem> {
    return this.request<SavedListItem>('/api/saved-lists/quick-save', {
      method: 'POST',
      body: JSON.stringify({ itemType, itemId, notes }),
    });
  }
}

const savedListsService = new SavedListsService();
export default savedListsService;