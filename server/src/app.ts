import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config/index.js';
import { logger } from './utils/logger.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import chatRoutes from './routes/chatRoutes.js';
import { healthCheck, root } from './controllers/healthController.js';

/**
 * Create and configure Express application
 */
export function createApp(): Application {
    const app = express();

    // Trust proxy (required for Cloud Run and rate limiting)
    app.set('trust proxy', 1);

    // Security middleware
    app.use(helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
            },
        },
    }));

    // CORS configuration
    const corsOrigins = process.env.CORS_ORIGINS
        ? process.env.CORS_ORIGINS.split(',').flatMap(origin => {
            const trimmed = origin.trim();
            if (!trimmed.startsWith('http') && trimmed.includes('.')) {
                return [`https://${trimmed}`, `http://${trimmed}`];
            }
            return [trimmed];
        })
        : (config.nodeEnv === 'production' ? [] : '*');

    app.use(cors({
        origin: corsOrigins,
        credentials: true,
    }));

    // Body parsing middleware
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Rate limiting
    const limiter = rateLimit({
        windowMs: config.rateLimit.windowMs,
        max: config.rateLimit.maxRequests,
        message: {
            status: 'error',
            message: 'Too many requests, please try again later',
            code: 'RATE_LIMIT_EXCEEDED',
        },
        standardHeaders: true,
        legacyHeaders: false,
        // Skip rate limiting in development
        skip: () => config.nodeEnv === 'development',
    });

    app.use('/api/', limiter);

    // Request logging middleware
    app.use((req, _res, next) => {
        logger.http('Incoming request', {
            method: req.method,
            path: req.path,
            ip: req.ip,
            userAgent: req.get('user-agent'),
        });
        next();
    });

    // Root endpoint
    app.get('/', root);

    // Health check endpoint (no auth required)
    app.get('/health', healthCheck);

    // API routes
    app.use('/api', chatRoutes);

    // 404 handler (must be after all routes)
    app.use(notFoundHandler);

    // Global error handler (must be last)
    app.use(errorHandler);

    logger.info('Express app configured', {
        environment: config.nodeEnv,
        port: config.port,
    });

    return app;
}
