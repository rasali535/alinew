import { Request, Response } from 'express';
import { geminiService } from '../services/geminiService.js';
import { db } from '../services/dbService.js';
import { logger } from '../utils/logger.js';

/**
 * GET /health
 * Health check endpoint
 */
export async function healthCheck(_req: Request, res: Response): Promise<Response> {
    const startTime = Date.now();

    // Check services concurrently
    const [geminiHealthy, dbHealthy] = await Promise.all([
        geminiService.healthCheck(),
        db.healthCheck()
    ]);

    const duration = Date.now() - startTime;
    const healthy = geminiHealthy && dbHealthy;
    const status = healthy ? 'ok' : 'degraded';

    // We return 200 even if degraded to let the orchestrator (Render/Cloud Run) 
    // keep the service alive while we investigate logs.
    const statusCode = 200;

    logger.info('Health check', {
        status,
        geminiHealthy,
        dbHealthy,
        durationMs: duration,
    });

    return res.status(statusCode).json({
        status,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        services: {
            gemini: geminiHealthy ? 'healthy' : 'unhealthy',
            database: dbHealthy ? 'healthy' : 'unhealthy',
        },
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
    });
}

/**
 * GET /
 * Root endpoint
 */
export function root(_req: Request, res: Response): Response {
    return res.status(200).json({
        name: 'Chatbot Backend API',
        version: '1.0.2',
        status: 'running-v6',
        documentation: '/api/docs',
    });
}
