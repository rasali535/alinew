import dotenv from 'dotenv';
import { AppConfig } from '../types/index.js';

// Load environment variables
dotenv.config();

/**
 * Parse environment variable as integer with fallback
 */
function getEnvAsInt(key: string, fallback: number): number {
    const value = process.env[key];
    if (!value) return fallback;
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? fallback : parsed;
}

/**
 * Parse environment variable as float with fallback
 */
function getEnvAsFloat(key: string, fallback: number): number {
    const value = process.env[key];
    if (!value) return fallback;
    const parsed = parseFloat(value);
    return isNaN(parsed) ? fallback : parsed;
}

/**
 * Parse environment variable as boolean with fallback
 */
function getEnvAsBool(key: string, fallback: boolean): boolean {
    const value = process.env[key];
    if (!value) return fallback;
    return value.toLowerCase() === 'true';
}



/**
 * Application configuration loaded from environment variables
 */
export const config: AppConfig = {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: getEnvAsInt('PORT', 8080),
    host: process.env.HOST || '0.0.0.0',

    gemini: {
        projectId: process.env.GOOGLE_CLOUD_PROJECT || '',
        location: process.env.VERTEX_AI_LOCATION || 'us-central1',
        model: process.env.GEMINI_MODEL || 'gemini-1.5-pro',
        maxOutputTokens: getEnvAsInt('GEMINI_MAX_OUTPUT_TOKENS', 2048),
        temperature: getEnvAsFloat('GEMINI_TEMPERATURE', 0.7),
        topP: getEnvAsFloat('GEMINI_TOP_P', 0.8),
        topK: getEnvAsInt('GEMINI_TOP_K', 40),
    },

    database: {
        connectionString: process.env.DATABASE_URL || '',
        poolMin: getEnvAsInt('DATABASE_POOL_MIN', 2),
        poolMax: getEnvAsInt('DATABASE_POOL_MAX', 10),
        ssl: getEnvAsBool('DATABASE_SSL', false),
    },

    jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
    apiKey: process.env.API_KEY,

    rateLimit: {
        windowMs: getEnvAsInt('RATE_LIMIT_WINDOW_MS', 60000),
        maxRequests: getEnvAsInt('RATE_LIMIT_MAX_REQUESTS', 100),
    },

    logLevel: process.env.LOG_LEVEL || 'info',

    session: {
        expiryHours: getEnvAsInt('SESSION_EXPIRY_HOURS', 24),
        maxContextMessages: getEnvAsInt('MAX_CONTEXT_MESSAGES', 10),
    },

    email: {
        service: process.env.EMAIL_SERVICE,
        host: process.env.EMAIL_HOST,
        port: getEnvAsInt('EMAIL_PORT', 587),
        user: process.env.EMAIL_USER || '',
        pass: process.env.EMAIL_PASS || '',
        notificationEmail: process.env.LEAD_NOTIFICATION_EMAIL || process.env.EMAIL_USER || 'hello@themaplin.com',
    },
};

/**
 * Validate critical configuration on startup
 */
export function validateConfig(): void {
    const errors: string[] = [];

    if (config.nodeEnv === 'production') {
        if (!config.gemini.projectId) {
            errors.push('GOOGLE_CLOUD_PROJECT is required in production');
        }
        if (!config.database.connectionString) {
            errors.push('DATABASE_URL is required in production');
        }
        if (config.jwtSecret === 'dev-secret-change-in-production') {
            errors.push('JWT_SECRET must be changed in production');
        }
    }

    if (errors.length > 0) {
        throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
    }
}
