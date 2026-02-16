import { Request, Response } from 'express';
import { logger } from '../utils/logger.js';
import { leadService } from '../services/leadService.js';


/**
 * Leads controller handling lead-related endpoints
 */
export class LeadController {

    /**
     * POST /api/leads
     * Create a new lead
     */
    async createLead(req: Request, res: Response): Promise<Response> {
        const { sessionId, name, email, phone, source } = req.body;

        try {
            const result = await leadService.createLead({
                sessionId,
                name,
                email,
                phone,
                source
            });

            return res.status(201).json(result);
        } catch (error) {
            logger.error('Controller lead creation failed', { error });
            return res.status(400).json({
                error: error instanceof Error ? error.message : 'Failed to create lead'
            });
        }
    }
}

export const leadController = new LeadController();
