import nodemailer from 'nodemailer';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

export class EmailService {
    private transporter;

    constructor() {
        if (config.email.user && config.email.pass) {
            const transportConfig: any = {
                auth: {
                    user: config.email.user,
                    pass: config.email.pass,
                },
            };

            if (config.email.service) {
                transportConfig.service = config.email.service;
            } else if (config.email.host) {
                transportConfig.host = config.email.host;
                transportConfig.port = config.email.port;
                transportConfig.secure = config.email.port === 465;
            }

            this.transporter = nodemailer.createTransport(transportConfig);
            logger.info('Email service initialized', {
                service: config.email.service || 'custom',
                host: config.email.host
            });
        } else {
            logger.warn('Email service NOT initialized: Missing credentials (EMAIL_USER/EMAIL_PASS)');
        }
    }

    /**
     * Send new lead notification
     */
    async sendLeadNotification(lead: { name: string; email: string; phone?: string; source?: string }): Promise<boolean> {
        if (!this.transporter) {
            logger.warn('Cannot send email: Transporter not initialized');
            return false;
        }

        if (!config.email.notificationEmail) {
            logger.warn('Cannot send email: No notification email configured');
            return false;
        }

        try {
            const mailOptions = {
                from: `"Chatbot Lead" <${config.email.user}>`,
                to: config.email.notificationEmail,
                subject: `New Lead: ${lead.name}`,
                html: `
                    <h2>New Lead Recovered</h2>
                    <p><strong>Name:</strong> ${lead.name}</p>
                    <p><strong>Email:</strong> ${lead.email}</p>
                    <p><strong>Phone:</strong> ${lead.phone || 'N/A'}</p>
                    <p><strong>Source:</strong> ${lead.source || 'Chatbot'}</p>
                    <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
                `,
            };

            const info = await this.transporter.sendMail(mailOptions);
            logger.info('Lead notification email sent', { messageId: info.messageId });
            return true;
        } catch (error) {
            logger.error('Failed to send lead notification email', {
                error: error instanceof Error ? error.message : String(error),
            });
            return false;
        }
    }
}

export const emailService = new EmailService();
