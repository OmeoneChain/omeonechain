// File: components/comments/index.ts
// Central export point for all comment-related components

export { default as CommentSection } from './CommentSection';
export { default as CommentList } from './CommentList';
export { default as CommentItem } from './CommentItem';
export { default as CommentInput } from './CommentInput';

// Re-export types for convenience
export type {
  Comment,
  CommentAuthor,
  CreateCommentRequest,
  UpdateCommentRequest,
  CommentSortOption
} from '@/src/types/comments';

export {
  COMMENT_SORT_OPTIONS,
  MAX_COMMENT_LENGTH,
  MAX_NESTING_LEVEL,
  EDIT_TIME_LIMIT
} from '@/src/types/comments';