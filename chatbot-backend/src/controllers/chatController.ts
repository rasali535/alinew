import { Request, Response } from 'express';
import { geminiService } from '../services/geminiService.js';
import { sessionRepository } from '../repositories/sessionRepository.js';
import { messageRepository } from '../repositories/messageRepository.js';
import { logger } from '../utils/logger.js';
import { ChatResponse, ChatRequest, ChatMessage } from '../types/index.js';
import { NotFoundError } from '../utils/errors.js';

/**
 * Chat controller handling chat-related endpoints
 * Uses database repositories for persistence
 */
export class ChatController {

    /**
     * POST /api/chat
     * Send a message and get AI response
     */
    async sendMessage(req: Request, res: Response): Promise<Response> {
        const { sessionId, message, userId } = req.body as ChatRequest;

        logger.info('Chat request received', { sessionId, userId });

        // 1. Verify Session Exists and is valid
        const session = await sessionRepository.getById(sessionId);
        if (!session) {
            throw new NotFoundError('Session');
        }

        // Optional: Validate session expiry
        if (new Date() > session.expiresAt) {
            // Could create a new session or return forbidden
            logger.warn('Use of expired session', { sessionId });
            // For now, let's allow it or refresh expiry
        }

        // 2. Process Message via Gemini Service (Persistence handled inside service)
        const geminiResponse = await geminiService.generateChatResponse(
            sessionId,
            message
        );

        // 3. Construct Response
        const response: ChatResponse = {
            sessionId,
            message,
            response: geminiResponse.text,
            timestamp: new Date(),
            tokensUsed: geminiResponse.tokensUsed,
        };

        return res.status(200).json(response);
    }

    /**
     * GET /api/chat/:sessionId
     * Get chat history for a session
     */
    async getChatHistory(req: Request, res: Response): Promise<Response> {
        const { id: sessionId } = req.params;

        // Verify session exists
        const session = await sessionRepository.getById(sessionId);
        if (!session) {
            throw new NotFoundError('Session');
        }

        // Get messages using repository
        const messages = await messageRepository.getAllBySessionId(sessionId);

        return res.status(200).json({
            sessionId,
            messages,
            messageCount: messages.length,
        });
    }

    /**
     * DELETE /api/chat/:sessionId
     * Clear chat history for a session
     */
    async clearChatHistory(req: Request, res: Response): Promise<Response> {
        const { id: sessionId } = req.params;

        // Verify session
        const session = await sessionRepository.getById(sessionId);
        if (!session) {
            throw new NotFoundError('Session');
        }

        const deletedCount = await messageRepository.deleteBySessionId(sessionId);

        return res.status(200).json({
            sessionId,
            cleared: true,
            message: `${deletedCount} messages cleared`,
        });
    }

    /**
     * POST /api/sessions
     * Create a new chat session
     */
    async createSession(req: Request, res: Response): Promise<Response> {
        const { userId, metadata } = req.body;

        logger.info('Creating new session', { userId });

        const session = await sessionRepository.create(userId, metadata);

        return res.status(201).json(session);
    }

    /**
     * GET /api/sessions/:id
     * Get session details
     */
    async getSession(req: Request, res: Response): Promise<Response> {
        const { id: sessionId } = req.params;

        const session = await sessionRepository.getById(sessionId);

        if (!session) {
            throw new NotFoundError('Session');
        }

        const messageCount = await messageRepository.getCountBySessionId(sessionId);

        return res.status(200).json({
            ...session,
            messageCount
        });
    }

    /**
     * DELETE /api/sessions/:id
     * Delete a session
     */
    async deleteSession(req: Request, res: Response): Promise<Response> {
        const { id: sessionId } = req.params;

        const deleted = await sessionRepository.delete(sessionId);

        if (!deleted) {
            throw new NotFoundError('Session');
        }

        return res.status(200).json({
            sessionId,
            deleted: true,
            message: 'Session deleted successfully',
        });
    }
}

// Export singleton instance
export const chatController = new ChatController();
