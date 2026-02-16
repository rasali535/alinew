import { Request, Response } from 'express';
import { db } from '../services/dbService.js';
import { logger } from '../utils/logger.js';
import { emailService } from '../services/emailService.js';


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

        let leadId = null;
        let isNew = true;

        // Try to save to database if connected
        if (db.isReady()) {
            try {
                // Check if lead already exists for this email
                const existingLead = await db.query(
                    'SELECT * FROM leads WHERE email = $1',
                    [email]
                );

                if (existingLead.rowCount && existingLead.rowCount > 0) {
                    leadId = existingLead.rows[0].id;
                    isNew = false;
                    logger.info('Lead already exists in DB', { email });
                } else {
                    const result = await db.query(
                        `INSERT INTO leads (session_id, name, email, phone, source)
                         VALUES ($1, $2, $3, $4, $5)
                         RETURNING id`,
                        [sessionId || null, name, email, phone || null, source || 'chatbot']
                    );
                    leadId = result.rows[0].id;
                    logger.info('New lead saved to DB', { leadId });
                }
            } catch (error) {
                logger.error('Failed to save lead to database', { error });
                // Continue to send email even if DB fails
            }
        } else {
            logger.warn('Database not connected, skipping DB save for lead');
        }

        // Send email notification
        try {
            await emailService.sendLeadNotification({ name, email, phone, source });
        } catch (emailError) {
            logger.error('Failed to send lead email', { error: emailError });
        }

        return res.status(201).json({
            id: leadId,
            message: 'Lead received',
            isNew
        });
    }
}

export const leadController = new LeadController();
