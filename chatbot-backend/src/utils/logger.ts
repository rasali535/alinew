import winston from 'winston';
import { config } from '../config/index.js';

/**
 * Custom log format for structured logging
 */
const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
);

/**
 * Console format for development (human-readable)
 */
const consoleFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
        let msg = `${timestamp} [${level}]: ${message}`;
        if (Object.keys(meta).length > 0) {
            msg += ` ${JSON.stringify(meta)}`;
        }
        return msg;
    })
);

/**
 * Winston logger instance
 */
export const logger = winston.createLogger({
    level: config.logLevel,
    format: logFormat,
    defaultMeta: { service: 'chatbot-backend' },
    transports: [
        // Console transport
        new winston.transports.Console({
            format: config.nodeEnv === 'production' ? logFormat : consoleFormat,
        }),
    ],
});

/**
 * Log levels:
 * - error: Error events that might still allow the application to continue running
 * - warn: Warning events that are not errors but might indicate potential issues
 * - info: Informational messages that highlight the progress of the application
 * - http: HTTP request logging
 * - debug: Detailed information for debugging
 */

// Add file transport in production
if (config.nodeEnv === 'production') {
    logger.add(
        new winston.transports.File({
            filename: 'logs/error.log',
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        })
    );

    logger.add(
        new winston.transports.File({
            filename: 'logs/combined.log',
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        })
    );
}

/**
 * Stream for Morgan HTTP logging
 */
export const logStream = {
    write: (message: string) => {
        logger.http(message.trim());
    },
};
