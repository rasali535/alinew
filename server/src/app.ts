import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import fs from 'fs';
import path from 'path';
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
    app.use(cors({
        origin: true, // Allow all origins reflectively
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

    // Simple ping for connectivity tests
    app.get('/ping', (_req, res) => res.send('pong-v5'));

    // Health check endpoint (no auth required)
    app.get('/health', healthCheck);

    // Temporary logs endpoint for debugging
    app.get('/debug-logs', (req, res) => {
        const type = req.query.type === 'combined' ? 'combined.log' : 'error.log';
        const logPath = path.join(process.cwd(), 'logs', type);

        if (fs.existsSync(logPath)) {
            const content = fs.readFileSync(logPath, 'utf8');
            res.header('Content-Type', 'text/plain');
            res.send(content);
        } else {
            res.status(404).json({
                error: 'Log file not found',
                path: logPath,
                existingFiles: fs.existsSync(path.join(process.cwd(), 'logs'))
                    ? fs.readdirSync(path.join(process.cwd(), 'logs'))
                    : 'logs dir missing'
            });
        }
    });

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
