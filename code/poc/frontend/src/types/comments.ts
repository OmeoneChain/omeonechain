// types/comments.ts
export interface Comment {
  id: string;
  recommendation_id: string;
  user_id: string;
  parent_comment_id?: string | null;
  content: string;
  created_at: string;
  updated_at?: string;
  deleted_at?: string | null;
  edited_at?: string | null;
  
  // Author information (from backend - changed from 'user' to 'author')
  author: {
    id: string;
    name: string;  // Changed from display_name
    username: string;
    avatar: string;  // Changed from avatar? to required (backend sends default)
    reputation?: number;  // Changed from reputation_score
    verificationLevel?: 'basic' | 'verified' | 'expert';  // Changed from verification_level
  };
  
  // Engagement stats
  likes_count: number;
  replies_count: number;
  has_liked: boolean;
  is_edited: boolean;
  is_deleted: boolean;
  
  // User permissions
  user_has_liked?: boolean;  // Alias for has_liked (backend sends both)
  
  // Nested replies
  replies?: Comment[];
}

export interface CreateCommentPayload {
  content: string;
  recommendation_id?: string;  // Optional since it's in URL
  parent_comment_id?: string;
}

export interface UpdateCommentPayload {
  content: string;
}

export interface CommentsResponse {
  success: boolean;
  comments: Comment[];
  total_comments?: number;
  top_level_count?: number;
  pagination?: {
    limit: number;
    offset: number;
    has_more: boolean;
  };
  sort?: string;
}

export interface CommentResponse {
  success: boolean;
  comment: Comment;
  message?: string;
  parent_comment_id?: string;
}

// Sort options
export type CommentSortOption = 'newest' | 'oldest' | 'most_liked';

export const COMMENT_SORT_OPTIONS: Array<{value: CommentSortOption, label: string}> = [
  { value: 'newest', label: 'Mais recentes' },
  { value: 'oldest', label: 'Mais antigos' },
  { value: 'most_liked', label: 'Mais curtidos' }
];

// Constants
export const MAX_COMMENT_LENGTH = 1000;
export const MAX_NESTING_LEVEL = 3;
export const EDIT_TIME_LIMIT = 5 * 60 * 1000; // 5 minutes in milliseconds