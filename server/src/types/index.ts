/**
 * Type definitions for the chatbot application
 */

export interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp?: Date;
}

export interface ChatRequest {
    sessionId: string;
    message: string;
    userId?: string;
}

export interface ChatResponse {
    sessionId: string;
    message: string;
    response: string;
    timestamp: Date;
    tokensUsed?: number;
}

export interface Session {
    id: string;
    userId?: string;
    createdAt: Date;
    updatedAt: Date;
    expiresAt: Date;
    metadata?: Record<string, unknown>;
}

export interface GeminiConfig {
    projectId: string;
    location: string;
    apiKey?: string;
    model: string;
    maxOutputTokens: number;
    temperature: number;
    topP: number;
    topK: number;
}

export interface DatabaseConfig {
    connectionString: string;
    poolMin: number;
    poolMax: number;
    ssl: boolean;
}

export interface AppConfig {
    nodeEnv: string;
    port: number;
    host: string;
    gemini: GeminiConfig;
    database: DatabaseConfig;
    jwtSecret: string;
    apiKey?: string;
    rateLimit: {
        windowMs: number;
        maxRequests: number;
    };
    logLevel: string;
    session: {
        expiryHours: number;
        maxContextMessages: number;
    };
    email: {
        service?: string;
        host?: string;
        port?: number;
        user: string;
        pass: string;
        notificationEmail: string;
    };
}

export interface ApiError {
    status: number;
    message: string;
    code?: string | undefined;
    details?: unknown;
}

export interface GeminiResponse {
    text: string;
    tokensUsed?: number;
    finishReason?: string;
    safetyRatings?: Array<{
        category: string;
        probability: string;
    }>;
}
