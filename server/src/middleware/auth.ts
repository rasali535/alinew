import { Request, Response, NextFunction } from 'express';
import { config } from '../config/index.js';
import { AuthenticationError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

/**
 * Simple API key authentication middleware
 * Checks for X-API-Key header
 */
export function authenticateApiKey(req: Request, _res: Response, next: NextFunction): void {
    // Skip authentication if no API key is configured
    if (!config.apiKey) {
        if (config.nodeEnv === 'production') {
            logger.warn('API key authentication skipped: No API_KEY configured on server.');
        }
        return next();
    }

    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
        logger.warn('Missing API key', {
            path: req.path,
            ip: req.ip,
        });
        return next(new AuthenticationError('API key required'));
    }

    if (apiKey !== config.apiKey) {
        logger.warn('Invalid API key', {
            path: req.path,
            ip: req.ip,
        });
        return next(new AuthenticationError('Invalid API key'));
    }

    logger.debug('API key authenticated', {
        path: req.path,
    });

    next();
}

/**
 * Optional authentication - doesn't fail if no auth provided
 * Useful for endpoints that work with or without authentication
 */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
    const apiKey = req.headers['x-api-key'];

    if (apiKey && apiKey === config.apiKey) {
        // Valid API key provided
        logger.debug('Optional auth: authenticated');
    } else {
        // No auth or invalid auth - continue anyway
        logger.debug('Optional auth: unauthenticated');
    }

    next();
}
