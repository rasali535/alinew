import express, { Application } from 'express';
import axios from 'axios';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import fs from 'fs';
import path from 'path';
import { config } from './config/index.js';
import { logger } from './utils/logger.js';
import { db } from './services/dbService.js';
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

    // Simple DB test
    app.get('/test-db', async (_req, res) => {
        try {
            const start = Date.now();
            const result = await db.query('SELECT NOW()');
            res.json({ status: 'ok', time: result.rows[0], duration: Date.now() - start });
        } catch (err: any) {
            res.status(500).json({ status: 'error', message: err.message });
        }
    });

    // Temporary logs endpoint for debugging
    app.get('/debug-logs', (req, res) => {
        const type = (req.query.type as string) === 'combined' ? 'combined.log' : 'error.log';
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

    // Creative asset delivery endpoint backed by Supabase Storage
    app.get([
        '/api/creatives/file/:filename',
        '/ralion/api/creatives/file/:filename',
        '/api/creatives/uploads/:filename',
        '/ralion/api/creatives/uploads/:filename',
        '/creatives/file/:filename'
    ], async (req, res) => {
        try {
            const rawFilename = req.params.filename || '';
            const filename = path.basename(rawFilename);
            if (!filename || filename.includes('..')) {
                return res.status(400).json({ error: 'Invalid filename' });
            }

            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || 'https://yidsfihagwttlmhfynmf.supabase.co';
            const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpZHNmaWhhZ3d0dGxtaGZ5bm1mIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ3ODIzOSwiZXhwIjoyMDg4MDU0MjM5fQ.J3Y348_TksyQ6fXw-b5N148rI5U5Y1tWpU6V4sJpEwM';

            // 1. Download directly from Supabase Storage authenticated endpoint
            const storageUrl = `${supabaseUrl}/storage/v1/object/creatives/${filename}`;
            const authEndpoint = `${supabaseUrl}/storage/v1/object/authenticated/creatives/${filename}`;

            let response;
            try {
                response = await axios.get(storageUrl, {
                    headers: {
                        'Authorization': `Bearer ${supabaseKey}`,
                        'apikey': supabaseKey,
                    },
                    responseType: 'arraybuffer',
                    validateStatus: () => true,
                });
            } catch {
                // Ignore and try fallback
            }

            if (!response || response.status !== 200) {
                try {
                    response = await axios.get(authEndpoint, {
                        headers: {
                            'Authorization': `Bearer ${supabaseKey}`,
                            'apikey': supabaseKey,
                        },
                        responseType: 'arraybuffer',
                        validateStatus: () => true,
                    });
                } catch {
                    // Ignore
                }
            }

            if (response && response.status === 200 && response.data) {
                const dataBuffer = Buffer.from(response.data as ArrayBuffer);
                const ext = path.extname(filename).toLowerCase();
                let contentType = response.headers['content-type'] || 'image/jpeg';
                if (!contentType || contentType === 'application/octet-stream') {
                    if (ext === '.png') contentType = 'image/png';
                    else if (ext === '.svg') contentType = 'image/svg+xml';
                    else if (ext === '.webp') contentType = 'image/webp';
                    else if (ext === '.mp4') contentType = 'video/mp4';
                    else contentType = 'image/jpeg';
                }

                res.setHeader('Content-Type', contentType);
                res.setHeader('Content-Length', dataBuffer.length);
                res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
                return res.status(200).send(dataBuffer);
            }

            return res.status(404).json({
                error: 'ASSET_NOT_FOUND',
                filename,
                message: 'Creative asset not found in durable storage',
            });
        } catch (err: any) {
            logger.error('Error delivering creative file:', err);
            return res.status(500).json({ error: 'INTERNAL_SERVER_ERROR', message: err.message });
        }
    });

    // Platform Admin API Proxy / Fallback to Next.js Ralion Backend
    app.use(['/api/admin', '/ralion/api/admin'], async (req, res) => {
        try {
            const nextBase = process.env.RALION_UPSTREAM_URL || 
                             (process.env.NODE_ENV === 'production' 
                                ? 'https://ralion-dynamic-backend.onrender.com' 
                                : 'http://localhost:6509');
            const targetUrl = `${nextBase.replace(/\/+$/, '')}/api/admin${req.url}`;
            
            const response = await axios({
                method: req.method,
                url: targetUrl,
                data: req.body,
                headers: {
                    ...req.headers,
                    host: undefined,
                },
                validateStatus: () => true,
            });

            res.status(response.status).json(response.data);
        } catch (err: any) {
            logger.error('[Express Proxy] Error proxying platform admin request to Next.js:', err);
            res.status(500).json({
                success: false,
                error: 'Platform admin proxy failure',
                details: err.message,
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
