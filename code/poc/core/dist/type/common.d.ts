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
export type Result<T, E = ApiError> = {
    success: true;
    data: T;
} | {
    success: false;
    error: E;
};
export declare function createError(message: string, code: string, status?: number): ApiError;
export declare function createSuccess<T>(data: T): Result<T>;
export declare function createFailure<E = ApiError>(error: E): Result<never, E>;
export declare function isApiError(obj: any): obj is ApiError;
export declare function isResult<T>(obj: any): obj is Result<T>;
