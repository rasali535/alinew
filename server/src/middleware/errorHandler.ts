import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

/**
 * Global error handling middleware
 * Must be registered last in the middleware chain
 */
export function errorHandler(
    err: Error | AppError,
    req: Request,
    res: Response,
    next: NextFunction
): void {
    // Log the error
    if (err instanceof AppError) {
        if (err.status >= 500) {
            logger.error('Server error', {
                error: err.message,
                code: err.code,
                stack: err.stack,
                path: req.path,
                method: req.method,
            });
        } else {
            logger.warn('Client error', {
                error: err.message,
                code: err.code,
                path: req.path,
                method: req.method,
            });
        }
    } else {
        // Unknown error
        logger.error('Unexpected error', {
            error: err.message,
            stack: err.stack,
            path: req.path,
            method: req.method,
        });
    }

    // Send error response
    if (err instanceof AppError && err.isOperational) {
        res.status(err.status).json({
            status: 'error',
            message: err.message,
            code: err.code,
            ...(err.details && { details: err.details }),
        });
    } else {
        // Don't leak error details in production for unknown errors
        const message = process.env.NODE_ENV === 'production'
            ? 'Internal server error'
            : err.message;

        res.status(500).json({
            status: 'error',
            message,
            code: 'INTERNAL_ERROR',
        });
    }
}

/**
 * 404 Not Found handler
 */
export function notFoundHandler(req: Request, res: Response): void {
    logger.warn('Route not found', {
        path: req.path,
        method: req.method,
    });

    res.status(404).json({
        status: 'error',
        message: `Route ${req.method} ${req.path} not found`,
        code: 'NOT_FOUND',
    });
}

/**
 * Async handler wrapper to catch errors in async route handlers
 */
export function asyncHandler(
    fn: (req: Request, res: Response, next: NextFunction) => Promise<void | Response>
) {
    return (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}
