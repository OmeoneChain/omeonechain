/**
 * Authentication Middleware
 *
 * Handles authentication for protected API routes
 */
import { Request, Response, NextFunction } from 'express';
/**
 * User authentication information
 */
export interface AuthUser {
    /**
     * User ID
     */
    id: string;
    /**
     * User's wallet address
     */
    walletAddress: string;
    /**
     * User's pseudonym or handle (if provided)
     */
    pseudonym?: string;
    /**
     * Optional user roles
     */
    roles?: string[];
}
declare global {
    namespace Express {
        interface Request {
            user?: AuthUser;
        }
    }
}
/**
 * Authentication options
 */
export interface AuthOptions {
    /**
     * JWT secret key
     */
    secret: string;
    /**
     * Token expiration in seconds
     */
    expiresIn?: number;
    /**
     * Allow unauthenticated access (for development)
     */
    allowUnauthenticated?: boolean;
    /**
     * Required roles for access
     */
    requiredRoles?: string[];
}
/**
 * Generate a JWT token for a user
 *
 * @param user User authentication information
 * @param options Authentication options
 * @returns JWT token
 */
export declare function generateToken(user: AuthUser, options?: Partial<AuthOptions>): string;
/**
 * Verify a JWT token
 *
 * @param token JWT token
 * @param options Authentication options
 * @returns Decoded user information
 */
export declare function verifyToken(token: string, options?: Partial<AuthOptions>): AuthUser;
/**
 * Authentication middleware
 *
 * @param options Authentication options
 * @returns Express middleware function
 */
export declare function authenticate(options?: Partial<AuthOptions>): (req: Request, res: Response, next: NextFunction) => void | Response<any, Record<string, any>>;
/**
 * Require specific roles for route access
 *
 * @param roles Required roles
 * @returns Express middleware function
 */
export declare function requireRoles(roles: string[]): (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
/**
 * Create authentication routes for Express
 *
 * @param router Express router
 * @param options Authentication options
 */
export declare function createAuthRoutes(router: any, options?: Partial<AuthOptions>): any;
export default authenticate;
