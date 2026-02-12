import { db } from '../services/dbService.js';
import { logger } from '../utils/logger.js';
import { DatabaseError } from '../utils/errors.js';
import { ChatMessage } from '../types/index.js';

/**
 * Message data from database
 */
interface MessageRow {
    id: string;
    session_id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    tokens_used: number | null;
    metadata: Record<string, unknown>;
    created_at: Date;
}

/**
 * Repository for message data access
 */
export class MessageRepository {
    /**
     * Save a new message
     */
    async create(
        sessionId: string,
        role: 'user' | 'assistant' | 'system',
        content: string,
        tokensUsed?: number,
        metadata?: Record<string, unknown>
    ): Promise<ChatMessage> {
        try {
            const result = await db.query<MessageRow>(
                `INSERT INTO messages (session_id, role, content, tokens_used, metadata)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
                [
                    sessionId,
                    role,
                    content,
                    tokensUsed || null,
                    JSON.stringify(metadata || {}),
                ]
            );

            const row = result.rows[0];
            if (!row) {
                throw new DatabaseError('Failed to create message');
            }

            logger.debug('Message saved', {
                sessionId,
                role,
                messageId: row.id,
                contentLength: content.length,
            });

            return this.mapRowToMessage(row);
        } catch (error) {
            logger.error('Failed to save message', { error, sessionId, role });
            throw error instanceof DatabaseError
                ? error
                : new DatabaseError('Failed to save message', error);
        }
    }

    /**
     * Save multiple messages in a transaction
     */
    async createMany(
        sessionId: string,
        messages: Array<{
            role: 'user' | 'assistant' | 'system';
            content: string;
            tokensUsed?: number;
        }>
    ): Promise<ChatMessage[]> {
        try {
            return await db.transaction(async (client) => {
                const savedMessages: ChatMessage[] = [];

                for (const msg of messages) {
                    const result = await client.query<MessageRow>(
                        `INSERT INTO messages (session_id, role, content, tokens_used)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
                        [sessionId, msg.role, msg.content, msg.tokensUsed || null]
                    );

                    if (result.rows[0]) {
                        savedMessages.push(this.mapRowToMessage(result.rows[0]));
                    }
                }

                logger.info('Multiple messages saved', {
                    sessionId,
                    count: savedMessages.length,
                });

                return savedMessages;
            });
        } catch (error) {
            logger.error('Failed to save multiple messages', { error, sessionId });
            throw new DatabaseError('Failed to save multiple messages', error);
        }
    }

    /**
     * Get recent messages for a session (for conversation context)
     */
    async getRecentBySessionId(
        sessionId: string,
        limit: number = 20
    ): Promise<ChatMessage[]> {
        try {
            const result = await db.query<MessageRow>(
                `SELECT * FROM messages
         WHERE session_id = $1
         ORDER BY created_at DESC
         LIMIT $2`,
                [sessionId, limit]
            );

            // Reverse to get chronological order (oldest first)
            const messages = result.rows
                .reverse()
                .map((row) => this.mapRowToMessage(row));

            logger.debug('Retrieved recent messages', {
                sessionId,
                count: messages.length,
            });

            return messages;
        } catch (error) {
            logger.error('Failed to get recent messages', { error, sessionId });
            throw new DatabaseError('Failed to get recent messages', error);
        }
    }

    /**
     * Get all messages for a session
     */
    async getAllBySessionId(sessionId: string): Promise<ChatMessage[]> {
        try {
            const result = await db.query<MessageRow>(
                `SELECT * FROM messages
         WHERE session_id = $1
         ORDER BY created_at ASC`,
                [sessionId]
            );

            return result.rows.map((row) => this.mapRowToMessage(row));
        } catch (error) {
            logger.error('Failed to get all messages', { error, sessionId });
            throw new DatabaseError('Failed to get all messages', error);
        }
    }

    /**
     * Get message count for a session
     */
    async getCountBySessionId(sessionId: string): Promise<number> {
        try {
            const result = await db.query<{ count: string }>(
                'SELECT COUNT(*) as count FROM messages WHERE session_id = $1',
                [sessionId]
            );

            return parseInt(result.rows[0]?.count || '0', 10);
        } catch (error) {
            logger.error('Failed to get message count', { error, sessionId });
            throw new DatabaseError('Failed to get message count', error);
        }
    }

    /**
     * Delete all messages for a session
     */
    async deleteBySessionId(sessionId: string): Promise<number> {
        try {
            const result = await db.query(
                'DELETE FROM messages WHERE session_id = $1',
                [sessionId]
            );

            const deletedCount = result.rowCount || 0;

            if (deletedCount > 0) {
                logger.info('Messages deleted', { sessionId, count: deletedCount });
            }

            return deletedCount;
        } catch (error) {
            logger.error('Failed to delete messages', { error, sessionId });
            throw new DatabaseError('Failed to delete messages', error);
        }
    }

    /**
     * Get total token usage for a session
     */
    async getTotalTokensBySessionId(sessionId: string): Promise<number> {
        try {
            const result = await db.query<{ total: string | null }>(
                `SELECT SUM(tokens_used) as total 
         FROM messages 
         WHERE session_id = $1`,
                [sessionId]
            );

            return parseInt(result.rows[0]?.total || '0', 10);
        } catch (error) {
            logger.error('Failed to get total tokens', { error, sessionId });
            throw new DatabaseError('Failed to get total tokens', error);
        }
    }

    /**
     * Get conversation history formatted for Gemini
     * Excludes system messages and returns in chronological order
     */
    async getConversationHistory(
        sessionId: string,
        limit: number = 20
    ): Promise<ChatMessage[]> {
        try {
            const result = await db.query<MessageRow>(
                `SELECT * FROM messages
         WHERE session_id = $1 AND role != 'system'
         ORDER BY created_at DESC
         LIMIT $2`,
                [sessionId, limit]
            );

            // Reverse to get chronological order
            return result.rows
                .reverse()
                .map((row) => this.mapRowToMessage(row));
        } catch (error) {
            logger.error('Failed to get conversation history', { error, sessionId });
            throw new DatabaseError('Failed to get conversation history', error);
        }
    }

    /**
     * Map database row to ChatMessage object
     */
    private mapRowToMessage(row: MessageRow): ChatMessage {
        return {
            role: row.role,
            content: row.content,
            timestamp: row.created_at,
        };
    }
}

// Export singleton instance
export const messageRepository = new MessageRepository();
