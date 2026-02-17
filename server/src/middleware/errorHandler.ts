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
    _next: NextFunction
): void {
    // Log the error
    const isAppError = (err as any).status !== undefined && (err as any).isOperational !== undefined;

    if (isAppError) {
        const appErr = err as AppError;
        if (appErr.status >= 500) {
            logger.error('Server error', {
                error: appErr.message,
                code: appErr.code,
                stack: appErr.stack,
                path: req.path,
                method: req.method,
            });
        } else {
            logger.warn('Client error', {
                error: appErr.message,
                code: appErr.code,
                path: req.path,
                method: req.method,
            });
        }
    } else {
        // Unknown error
        logger.error('Unexpected error', {
            name: err.name,
            error: err.message,
            stack: err.stack,
            path: req.path,
            method: req.method,
        });
    }

    // Send error response
    if (isAppError) {
        const appErr = err as AppError;
        res.status(appErr.status).json({
            status: 'error',
            message: appErr.message,
            code: appErr.code,
            ...(appErr.details ? { details: appErr.details } : {}),
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
