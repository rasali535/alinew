import { Router } from 'express';
import { chatController } from '../controllers/chatController.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { validate, chatRequestSchema, createSessionSchema, uuidParamSchema } from '../middleware/validation.js';
import { authenticateApiKey } from '../middleware/auth.js';

const router = Router();

/**
 * POST /api/chat
 * Send a message and receive AI response
 */
router.post(
    '/chat',
    authenticateApiKey,
    validate(chatRequestSchema, 'body'),
    asyncHandler(chatController.sendMessage.bind(chatController))
);

/**
 * GET /api/chat/:id
 * Get chat history for a session
 */
router.get(
    '/chat/:id',
    authenticateApiKey,
    validate(uuidParamSchema, 'params'),
    asyncHandler(chatController.getChatHistory.bind(chatController))
);

/**
 * DELETE /api/chat/:id
 * Clear chat history for a session
 */
router.delete(
    '/chat/:id',
    authenticateApiKey,
    validate(uuidParamSchema, 'params'),
    asyncHandler(chatController.clearChatHistory.bind(chatController))
);

/**
 * POST /api/sessions
 * Create a new chat session
 */
router.post(
    '/sessions',
    authenticateApiKey,
    validate(createSessionSchema, 'body'),
    asyncHandler(chatController.createSession.bind(chatController))
);

/**
 * GET /api/sessions/:id
 * Get session details
 */
router.get(
    '/sessions/:id',
    authenticateApiKey,
    validate(uuidParamSchema, 'params'),
    asyncHandler(chatController.getSession.bind(chatController))
);

/**
 * DELETE /api/sessions/:id
 * Delete a session
 */
router.delete(
    '/sessions/:id',
    authenticateApiKey,
    validate(uuidParamSchema, 'params'),
    asyncHandler(chatController.deleteSession.bind(chatController))
);

import { leadController } from '../controllers/leadController.js';

/**
 * POST /api/leads
 * Capture lead information
 */
router.post(
    '/leads',
    authenticateApiKey,
    asyncHandler(leadController.createLead.bind(leadController))
);

export default router;
