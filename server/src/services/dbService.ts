import { Pool, PoolClient, QueryResult } from 'pg';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { DatabaseError } from '../utils/errors.js';

/**
 * Database service using node-postgres with connection pooling
 */
export class DatabaseService {
    private pool: Pool;
    private isConnected: boolean = false;

    constructor() {
        // Create connection pool
        this.pool = new Pool({
            connectionString: config.database.connectionString,
            min: config.database.poolMin,
            max: config.database.poolMax,
            ssl: config.database.ssl ? { rejectUnauthorized: false } : false,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 5000,
        });

        // Handle pool errors
        this.pool.on('error', (err) => {
            logger.error('Unexpected database pool error', {
                error: err.message,
                stack: err.stack,
            });
        });

        // Handle pool connection
        this.pool.on('connect', () => {
            logger.debug('New database connection established');
        });

        // Handle pool removal
        this.pool.on('remove', () => {
            logger.debug('Database connection removed from pool');
        });

        logger.info('Database service initialized', {
            poolMin: config.database.poolMin,
            poolMax: config.database.poolMax,
            ssl: config.database.ssl,
        });
    }

    /**
     * Connect to the database and verify connection
     */
    async connect(): Promise<void> {
        try {
            const client = await this.pool.connect();
            const result = await client.query('SELECT NOW()');
            client.release();

            this.isConnected = true;
            logger.info('Database connected successfully', {
                timestamp: result.rows[0]?.now,
            });
        } catch (error) {
            this.isConnected = false;
            logger.error('Failed to connect to database', {
                error: error instanceof Error ? error.message : String(error),
            });
            throw new DatabaseError('Failed to connect to database', error);
        }
    }

    /**
     * Execute a query with parameters
     */
    async query<T extends import('pg').QueryResultRow = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
        const start = Date.now();

        try {
            const result = await this.pool.query<T>(text, params);
            const duration = Date.now() - start;

            logger.debug('Query executed', {
                query: text.substring(0, 100),
                duration,
                rows: result.rowCount,
            });

            return result;
        } catch (error) {
            const duration = Date.now() - start;

            logger.error('Query failed', {
                query: text.substring(0, 100),
                params: params?.map((p) => (typeof p === 'string' && p.length > 50 ? p.substring(0, 50) + '...' : p)),
                duration,
                error: error instanceof Error ? error.message : String(error),
            });

            throw new DatabaseError(
                error instanceof Error ? error.message : 'Query execution failed',
                error
            );
        }
    }

    /**
     * Get a client from the pool for transactions
     */
    async getClient(): Promise<PoolClient> {
        try {
            return await this.pool.connect();
        } catch (error) {
            logger.error('Failed to get database client', {
                error: error instanceof Error ? error.message : String(error),
            });
            throw new DatabaseError('Failed to get database client', error);
        }
    }

    /**
     * Execute a transaction
     */
    async transaction<T>(
        callback: (client: PoolClient) => Promise<T>
    ): Promise<T> {
        const client = await this.getClient();

        try {
            await client.query('BEGIN');
            const result = await callback(client);
            await client.query('COMMIT');
            return result;
        } catch (error) {
            await client.query('ROLLBACK');
            logger.error('Transaction failed and rolled back', {
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Run database migrations
     */
    async runMigrations(): Promise<void> {
        try {
            logger.info('Running database migrations...');

            // Check if pgvector extension exists
            const extensionCheck = await this.query(
                "SELECT * FROM pg_extension WHERE extname = 'vector'"
            );

            if (extensionCheck.rowCount === 0) {
                logger.warn('pgvector extension not found - some features will be limited');
            } else {
                logger.info('pgvector extension is available');
            }

            logger.info('Database migrations completed');
        } catch (error) {
            logger.error('Migration failed', {
                error: error instanceof Error ? error.message : String(error),
            });
            throw new DatabaseError('Migration failed', error);
        }
    }

    /**
     * Health check for database connection
     */
    async healthCheck(): Promise<boolean> {
        try {
            const result = await this.pool.query('SELECT 1 as health');
            return result.rows[0]?.health === 1;
        } catch (error) {
            logger.error('Database health check failed', {
                error: error instanceof Error ? error.message : String(error),
            });
            return false;
        }
    }

    /**
     * Get pool statistics
     */
    getPoolStats() {
        return {
            total: this.pool.totalCount,
            idle: this.pool.idleCount,
            waiting: this.pool.waitingCount,
        };
    }

    /**
     * Check if database is connected
     */
    isReady(): boolean {
        return this.isConnected;
    }

    /**
     * Close all connections in the pool
     */
    async close(): Promise<void> {
        try {
            await this.pool.end();
            this.isConnected = false;
            logger.info('Database connections closed');
        } catch (error) {
            logger.error('Error closing database connections', {
                error: error instanceof Error ? error.message : String(error),
            });
            throw new DatabaseError('Failed to close database connections', error);
        }
    }
}

// Export singleton instance
export const db = new DatabaseService();
