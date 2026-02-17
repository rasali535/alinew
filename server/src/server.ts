import { createApp } from './app.js';
import { config } from './config/index.js';
import { logger } from './utils/logger.js';
import { db } from './services/dbService.js';
import fs from 'fs';
import path from 'path';

/**
 * Start the server
 */
async function startServer(): Promise<void> {
    try {
        // Ensure logs directory exists
        const logsDir = path.join(process.cwd(), 'logs');
        if (!fs.existsSync(logsDir)) {
            fs.mkdirSync(logsDir, { recursive: true });
        }

        // Validate configuration
        logger.info('Validating configuration...');
        // validateConfig();

        // Connect to database
        logger.info('Connecting to database...');
        try {
            await db.connect();
        } catch (error) {
            logger.warn('Failed to connect to database. Continuing without DB connection. API endpoints requiring DB will fail.', {
                error: error instanceof Error ? error.message : String(error)
            });
        }

        // Run migrations
        if (db.isReady()) {
            // Always run migrations if RUN_MIGRATIONS is true, ignoring NODE_ENV
            const runMigrations = process.env.RUN_MIGRATIONS === 'true';

            if (runMigrations) {
                logger.info('Running database migrations...');
                await db.runMigrations();
            } else {
                logger.info('Skipping migrations (RUN_MIGRATIONS != true)');
            }
        }

        // Create Express app
        const app = createApp();

        // Start listening
        const server = app.listen(config.port, config.host, () => {
            logger.info('Server started successfully', {
                host: config.host,
                port: config.port,
                environment: config.nodeEnv,
                nodeVersion: process.version,
            });

            logger.info('API endpoints available:', {
                health: `http://${config.host}:${config.port}/health`,
                chat: `http://${config.host}:${config.port}/api/chat`,
                sessions: `http://${config.host}:${config.port}/api/sessions`,
            });
        });

        // Handle server startup errors (e.g., EADDRINUSE)
        server.on('error', (error: NodeJS.ErrnoException) => {
            if (error.code === 'EADDRINUSE') {
                logger.error(`Port ${config.port} is already in use`, { error });
            } else {
                logger.error('Server error', { error });
            }
            process.exit(1);
        });

        // Graceful shutdown handlers
        const gracefulShutdown = async (signal: string) => {
            logger.info(`${signal} received, starting graceful shutdown...`);

            server.close(async () => {
                logger.info('HTTP server closed');

                try {
                    await db.close();
                    logger.info('Database connections closed');
                } catch (dbError) {
                    logger.error('Error closing database connections', {
                        error: dbError instanceof Error ? dbError.message : String(dbError)
                    });
                }

                logger.info('Graceful shutdown completed');
                process.exit(0);
            });

            // Force shutdown after 30 seconds
            setTimeout(() => {
                logger.error('Forced shutdown after timeout');
                process.exit(1);
            }, 30000);
        };

        // Handle shutdown signals
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));

        // Handle uncaught errors
        process.on('uncaughtException', (error: Error) => {
            logger.error('Uncaught exception', {
                error: error.message,
                stack: error.stack,
            });
            process.exit(1);
        });

        process.on('unhandledRejection', (reason: unknown) => {
            logger.error('Unhandled rejection', {
                reason: reason instanceof Error ? reason.message : String(reason),
                stack: reason instanceof Error ? reason.stack : undefined,
            });
            process.exit(1);
        });

    } catch (error) {
        logger.error('Failed to start server', {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
        });
        process.exit(1);
    }
}

// Start the server
startServer();
