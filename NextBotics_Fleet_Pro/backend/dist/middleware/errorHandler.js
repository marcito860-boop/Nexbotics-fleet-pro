"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.asyncHandler = exports.notFoundHandler = exports.errorHandler = exports.Errors = exports.AppError = void 0;
// Custom error class for API errors
class AppError extends Error {
    statusCode;
    code;
    details;
    constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;
// Common error types
exports.Errors = {
    BadRequest: (message, details) => new AppError(message, 400, 'BAD_REQUEST', details),
    Unauthorized: (message = 'Unauthorized') => new AppError(message, 401, 'UNAUTHORIZED'),
    Forbidden: (message = 'Forbidden') => new AppError(message, 403, 'FORBIDDEN'),
    NotFound: (resource) => new AppError(`${resource} not found`, 404, 'NOT_FOUND'),
    Conflict: (message) => new AppError(message, 409, 'CONFLICT'),
    ValidationError: (message, details) => new AppError(message, 422, 'VALIDATION_ERROR', details),
    TooManyRequests: (message = 'Too many requests') => new AppError(message, 429, 'TOO_MANY_REQUESTS'),
    InternalError: (message = 'Internal server error') => new AppError(message, 500, 'INTERNAL_ERROR')
};
// Global error handler middleware
const errorHandler = (err, req, res, next) => {
    const requestId = req.requestId || 'unknown';
    // Determine status code
    const statusCode = err.statusCode || 500;
    // Build error response
    const errorResponse = {
        error: true,
        code: err.code || 'INTERNAL_ERROR',
        message: err.message,
        requestId
    };
    // Include details for validation errors and 4xx errors
    if (err.details && statusCode < 500) {
        errorResponse.details = err.details;
    }
    // Include stack trace in development
    if (process.env.NODE_ENV === 'development') {
        errorResponse.stack = err.stack;
    }
    // Log error
    if (statusCode >= 500) {
        console.error(`[${requestId}] Server Error:`, err);
    }
    else {
        console.warn(`[${requestId}] Client Error:`, { code: err.code, message: err.message });
    }
    res.status(statusCode).json(errorResponse);
};
exports.errorHandler = errorHandler;
// 404 handler for undefined routes
const notFoundHandler = (req, res) => {
    const requestId = req.requestId || 'unknown';
    res.status(404).json({
        error: true,
        code: 'NOT_FOUND',
        message: `Route ${req.method} ${req.path} not found`,
        requestId
    });
};
exports.notFoundHandler = notFoundHandler;
// Async handler wrapper to catch errors
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
exports.asyncHandler = asyncHandler;
//# sourceMappingURL=errorHandler.js.map