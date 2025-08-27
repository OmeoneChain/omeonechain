import { Request, Response, NextFunction } from 'express';
declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                address: string;
                username?: string;
                display_name?: string;
                verification_status?: 'basic' | 'verified' | 'expert';
            };
        }
    }
}
export declare const authenticateToken: (req: Request, res: Response, next: NextFunction) => void;
export declare const optionalAuth: (req: Request, res: Response, next: NextFunction) => void;
export declare const createAuthRoutes: () => any;
