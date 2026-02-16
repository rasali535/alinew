import { db } from './dbService.js';
import { logger } from '../utils/logger.js';
import { emailService } from './emailService.js';

export interface LeadData {
    name: string;
    email: string;
    phone?: string;
    sessionId?: string;
    source?: string;
}

export class LeadService {
    /**
     * Create a new lead: Save to DB and Send Email
     */
    async createLead(data: LeadData) {
        const { name, email, phone, sessionId, source = 'chatbot' } = data;

        logger.info('Creating new lead', { name, email, sessionId });

        if (!name || !email) {
            throw new Error('Name and Email are required for lead collection');
        }

        let leadId = null;
        let isNew = true;

        // 1. Save to Database
        if (db.isReady()) {
            try {
                // Check if lead already exists for this email
                const existingLead = await db.query(
                    'SELECT id FROM leads WHERE email = $1',
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
                        [sessionId || null, name, email, phone || null, source]
                    );
                    leadId = result.rows[0].id;
                    logger.info('New lead saved to DB', { leadId });
                }
            } catch (error) {
                logger.error('Failed to save lead to database', {
                    error: error instanceof Error ? error.message : String(error)
                });
                // Continue to email even if DB fails
            }
        }

        // 2. Send Email Notification
        try {
            await emailService.sendLeadNotification({ name, email, phone, source });
        } catch (emailError) {
            logger.error('Failed to send lead email', {
                error: emailError instanceof Error ? emailError.message : String(emailError)
            });
        }

        return {
            id: leadId,
            isNew,
            message: 'Lead processed successfully'
        };
    }
}

export const leadService = new LeadService();
