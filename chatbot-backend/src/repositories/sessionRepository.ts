import { db } from '../services/dbService.js';
import { logger } from '../utils/logger.js';
import { DatabaseError, NotFoundError } from '../utils/errors.js';
import { Session } from '../types/index.js';

/**
 * Session data from database
 */
interface SessionRow {
    id: string;
    user_id: string | null;
    session_token: string | null;
    metadata: Record<string, unknown>;
    created_at: Date;
    updated_at: Date;
    expires_at: Date;
}

/**
 * Repository for session data access
 */
export class SessionRepository {
    /**
     * Create a new session
     */
    async create(userId?: string, metadata?: Record<string, unknown>): Promise<Session> {
        try {
            const result = await db.query<SessionRow>(
                `INSERT INTO sessions (user_id, metadata, expires_at)
         VALUES ($1, $2, NOW() + INTERVAL '24 hours')
         RETURNING *`,
                [userId || null, JSON.stringify(metadata || {})]
            );

            const row = result.rows[0];
            if (!row) {
                throw new DatabaseError('Failed to create session');
            }

            logger.info('Session created', { sessionId: row.id, userId });

            return this.mapRowToSession(row);
        } catch (error) {
            logger.error('Failed to create session', { error, userId });
            throw error instanceof DatabaseError
                ? error
                : new DatabaseError('Failed to create session', error);
        }
    }

    /**
     * Get session by ID
     */
    async getById(sessionId: string): Promise<Session | null> {
        try {
            const result = await db.query<SessionRow>(
                'SELECT * FROM sessions WHERE id = $1',
                [sessionId]
            );

            if (result.rows.length === 0) {
                return null;
            }

            return this.mapRowToSession(result.rows[0]!);
        } catch (error) {
            logger.error('Failed to get session', { error, sessionId });
            throw new DatabaseError('Failed to get session', error);
        }
    }

    /**
     * Get session by user ID
     */
    async getByUserId(userId: string, limit: number = 10): Promise<Session[]> {
        try {
            const result = await db.query<SessionRow>(
                `SELECT * FROM sessions 
         WHERE user_id = $1 
         ORDER BY created_at DESC 
         LIMIT $2`,
                [userId, limit]
            );

            return result.rows.map((row) => this.mapRowToSession(row));
        } catch (error) {
            logger.error('Failed to get sessions by user', { error, userId });
            throw new DatabaseError('Failed to get sessions by user', error);
        }
    }

    /**
     * Update session metadata
     */
    async updateMetadata(
        sessionId: string,
        metadata: Record<string, unknown>
    ): Promise<Session> {
        try {
            const result = await db.query<SessionRow>(
                `UPDATE sessions 
         SET metadata = $1, updated_at = NOW()
         WHERE id = $2
         RETURNING *`,
                [JSON.stringify(metadata), sessionId]
            );

            if (result.rows.length === 0) {
                throw new NotFoundError('Session');
            }

            return this.mapRowToSession(result.rows[0]!);
        } catch (error) {
            logger.error('Failed to update session metadata', { error, sessionId });
            throw error instanceof NotFoundError
                ? error
                : new DatabaseError('Failed to update session metadata', error);
        }
    }

    /**
     * Delete session
     */
    async delete(sessionId: string): Promise<boolean> {
        try {
            const result = await db.query(
                'DELETE FROM sessions WHERE id = $1',
                [sessionId]
            );

            const deleted = (result.rowCount || 0) > 0;

            if (deleted) {
                logger.info('Session deleted', { sessionId });
            }

            return deleted;
        } catch (error) {
            logger.error('Failed to delete session', { error, sessionId });
            throw new DatabaseError('Failed to delete session', error);
        }
    }

    /**
     * Check if session exists and is not expired
     */
    async isValid(sessionId: string): Promise<boolean> {
        try {
            const result = await db.query<{ valid: boolean }>(
                `SELECT (expires_at > NOW()) as valid 
         FROM sessions 
         WHERE id = $1`,
                [sessionId]
            );

            return result.rows[0]?.valid || false;
        } catch (error) {
            logger.error('Failed to check session validity', { error, sessionId });
            return false;
        }
    }

    /**
     * Cleanup expired sessions
     */
    async cleanupExpired(): Promise<number> {
        try {
            const result = await db.query(
                'SELECT cleanup_expired_sessions() as deleted_count'
            );

            const deletedCount = result.rows[0]?.deleted_count || 0;

            if (deletedCount > 0) {
                logger.info('Cleaned up expired sessions', { count: deletedCount });
            }

            return deletedCount;
        } catch (error) {
            logger.error('Failed to cleanup expired sessions', { error });
            throw new DatabaseError('Failed to cleanup expired sessions', error);
        }
    }

    /**
     * Map database row to Session object
     */
    private mapRowToSession(row: SessionRow): Session {
        return {
            id: row.id,
            userId: row.user_id || undefined,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            expiresAt: row.expires_at,
            metadata: row.metadata,
        };
    }
}

// Export singleton instance
export const sessionRepository = new SessionRepository();
