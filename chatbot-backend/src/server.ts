import { createApp } from './app.js';
import { config, validateConfig } from './config/index.js';
import { logger } from './utils/logger.js';
import { db } from './services/dbService.js';

/**
 * Start the server
 */
async function startServer(): Promise<void> {
    try {
        // Validate configuration
        logger.info('Validating configuration...');
        validateConfig();

        // Connect to database
        logger.info('Connecting to database...');
        await db.connect();

        // Run migrations (Phase 2 & 3)
        // Check if migrations should run (default: true in dev, false in prod unless forced)
        const shouldRunMigrations = config.nodeEnv !== 'production' || process.env.RUN_MIGRATIONS === 'true';

        if (shouldRunMigrations) {
            await db.runMigrations();
        } else {
            logger.info('Skipping migrations in production (set RUN_MIGRATIONS=true to enable)');
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
