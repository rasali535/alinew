import { Request, Response } from 'express';
import { db } from '../services/dbService.js';
import { logger } from '../utils/logger.js';


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

        logger.info('Create lead request', { email, sessionId });

        // Simple validation (can be enhanced with Zod)
        if (!name || !email) {
            return res.status(400).json({ error: 'Name and Email are required' });
        }

        try {
            // Check if lead already exists for this email
            const existingLead = await db.query(
                'SELECT * FROM leads WHERE email = $1',
                [email]
            );

            if (existingLead.rowCount && existingLead.rowCount > 0) {
                // Update existing lead? Or just return success
                logger.info('Lead already exists', { email });
                return res.status(200).json({
                    id: existingLead.rows[0].id,
                    message: 'Lead information updated',
                    isNew: false
                });
            }

            const result = await db.query(
                `INSERT INTO leads (session_id, name, email, phone, source)
                 VALUES ($1, $2, $3, $4, $5)
                 RETURNING id, name, email, created_at`,
                [sessionId || null, name, email, phone || null, source || 'chatbot']
            );

            const newLead = result.rows[0];

            logger.info('New lead created', { leadId: newLead.id });

            return res.status(201).json({
                ...newLead,
                isNew: true
            });

        } catch (error) {
            logger.error('Failed to create lead', { error });
            return res.status(500).json({ error: 'Failed to save lead information' });
        }
    }
}

export const leadController = new LeadController();
