import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

export const validateRequest = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = schema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: result.error.errors
        });
      }
      next();
    } catch (error) {
      res.status(400).json({
        success: false,
        message: 'Invalid request format'
      });
    }
  };
};

// Validation schema for follow/unfollow requests
export const followUserSchema = z.object({
  following_id: z.string().min(1, 'User ID is required')
});

// Validation schema for pagination
export const paginationSchema = z.object({
  page: z.string().optional().transform((val) => val ? parseInt(val) : 1),
  per_page: z.string().optional().transform((val) => val ? Math.min(parseInt(val) || 20, 100) : 20)
});

// Validation schema for user search
export const userSearchSchema = z.object({
  query: z.string().optional(),
  min_reputation: z.number().optional(),
  location: z.string().optional(),
  verification_status: z.enum(['basic', 'verified', 'expert']).optional(),
  sort_by: z.enum(['reputation', 'followers', 'recent_activity', 'recommendations']).optional(),
  sort_order: z.enum(['asc', 'desc']).optional()
});