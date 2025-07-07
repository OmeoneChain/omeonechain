// src/types/common.ts - Standardized error types
export interface ApiError {
  message: string;
  code: string;
  status?: number;
  details?: any;
}

export interface ChainError extends ApiError {
  chainId?: string;
  transactionId?: string;
  blockHeight?: number;
}

export interface ValidationError extends ApiError {
  field?: string;
  value?: any;
  constraint?: string;
}

// Result wrapper type for consistent error handling
export type Result<T, E = ApiError> = {
  success: true;
  data: T;
} | {
  success: false;
  error: E;
};

// Helper functions for error handling
export function createError(message: string, code: string, status?: number): ApiError {
  return { message, code, status };
}

export function createSuccess<T>(data: T): Result<T> {
  return { success: true, data };
}

export function createFailure<E = ApiError>(error: E): Result<never, E> {
  return { success: false, error };
}

// Type guards
export function isApiError(obj: any): obj is ApiError {
  return obj && typeof obj.message === 'string' && typeof obj.code === 'string';
}

export function isResult<T>(obj: any): obj is Result<T> {
  return obj && typeof obj.success === 'boolean';
}