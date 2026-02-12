import { Request, Response, NextFunction } from 'express';
import { z, ZodError, ZodSchema } from 'zod';
import { ValidationError } from '../utils/errors.js';

/**
 * Validation middleware factory
 * Validates request body, query, or params against a Zod schema
 */
export function validate(schema: ZodSchema, source: 'body' | 'query' | 'params' = 'body') {
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            const data = req[source];
            schema.parse(data);
            next();
        } catch (error) {
            if (error instanceof ZodError) {
                const details = error.errors.map((err) => ({
                    path: err.path.join('.'),
                    message: err.message,
                }));

                next(new ValidationError('Validation failed', details));
            } else {
                next(error);
            }
        }
    };
}

/**
 * Chat request validation schema
 */
export const chatRequestSchema = z.object({
    sessionId: z.string().uuid('Invalid session ID format'),
    message: z.string()
        .min(1, 'Message cannot be empty')
        .max(4000, 'Message too long (max 4000 characters)'),
    userId: z.string().optional(),
});

/**
 * Session creation schema
 */
export const createSessionSchema = z.object({
    userId: z.string().optional(),
    metadata: z.record(z.unknown()).optional(),
});

/**
 * UUID parameter schema
 */
export const uuidParamSchema = z.object({
    id: z.string().uuid('Invalid UUID format'),
});
