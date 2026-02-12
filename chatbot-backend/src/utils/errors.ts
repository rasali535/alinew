import { ApiError } from '../types/index.js';

/**
 * Base application error class
 */
export class AppError extends Error implements ApiError {
    public readonly status: number;
    public readonly code?: string | undefined;
    public readonly details?: unknown;
    public readonly isOperational: boolean;

    constructor(
        message: string,
        status: number = 500,
        code?: string | undefined,
        details?: unknown,
        isOperational: boolean = true
    ) {
        super(message);
        this.status = status;
        this.code = code;
        this.details = details;
        this.isOperational = isOperational;

        // Set the prototype explicitly
        Object.setPrototypeOf(this, AppError.prototype);
    }
}

/**
 * Validation error (400)
 */
export class ValidationError extends AppError {
    constructor(message: string, details?: unknown) {
        super(message, 400, 'VALIDATION_ERROR', details);
        Object.setPrototypeOf(this, ValidationError.prototype);
    }
}

/**
 * Authentication error (401)
 */
export class AuthenticationError extends AppError {
    constructor(message: string = 'Authentication required') {
        super(message, 401, 'AUTHENTICATION_ERROR');
        Object.setPrototypeOf(this, AuthenticationError.prototype);
    }
}

/**
 * Authorization error (403)
 */
export class AuthorizationError extends AppError {
    constructor(message: string = 'Access forbidden') {
        super(message, 403, 'AUTHORIZATION_ERROR');
        Object.setPrototypeOf(this, AuthorizationError.prototype);
    }
}

/**
 * Not found error (404)
 */
export class NotFoundError extends AppError {
    constructor(resource: string = 'Resource') {
        super(`${resource} not found`, 404, 'NOT_FOUND');
        Object.setPrototypeOf(this, NotFoundError.prototype);
    }
}

/**
 * Gemini API error (502)
 */
export class GeminiAPIError extends AppError {
    constructor(message: string, details?: unknown) {
        super(`Gemini API Error: ${message}`, 502, 'GEMINI_API_ERROR', details);
        Object.setPrototypeOf(this, GeminiAPIError.prototype);
    }
}

/**
 * Gemini safety filter error (422)
 */
export class GeminiSafetyError extends AppError {
    constructor(message: string = 'Content blocked by safety filters', details?: unknown) {
        super(message, 422, 'SAFETY_FILTER_TRIGGERED', details);
        Object.setPrototypeOf(this, GeminiSafetyError.prototype);
    }
}

/**
 * Database error (500)
 */
export class DatabaseError extends AppError {
    constructor(message: string, details?: unknown) {
        super(`Database Error: ${message}`, 500, 'DATABASE_ERROR', details);
        Object.setPrototypeOf(this, DatabaseError.prototype);
    }
}

/**
 * Timeout error (408)
 */
export class TimeoutError extends AppError {
    constructor(message: string = 'Request timeout') {
        super(message, 408, 'TIMEOUT_ERROR');
        Object.setPrototypeOf(this, TimeoutError.prototype);
    }
}

/**
 * Rate limit error (429)
 */
export class RateLimitError extends AppError {
    constructor(message: string = 'Too many requests') {
        super(message, 429, 'RATE_LIMIT_EXCEEDED');
        Object.setPrototypeOf(this, RateLimitError.prototype);
    }
}
