"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorLogger = exports.requestLogger = void 0;
const uuid_1 = require("uuid");
// Logger middleware - adds request ID and timing
const requestLogger = (req, res, next) => {
    const requestId = (0, uuid_1.v4)().split('-')[0]; // Short ID for readability
    req.requestId = requestId;
    req.startTime = Date.now();
    // Add request ID to response headers
    res.setHeader('X-Request-ID', requestId);
    // Log request
    console.log(`[${requestId}] ${req.method} ${req.path} - ${req.ip}`);
    // Log response time on finish
    res.on('finish', () => {
        const duration = Date.now() - req.startTime;
        const status = res.statusCode;
        const statusColor = status >= 500 ? '\x1b[31m' : status >= 400 ? '\x1b[33m' : '\x1b[32m';
        const resetColor = '\x1b[0m';
        console.log(`[${requestId}] ${req.method} ${req.path} - ${statusColor}${status}${resetColor} - ${duration}ms`);
    });
    next();
};
exports.requestLogger = requestLogger;
// Error logger middleware
const errorLogger = (err, req, res, next) => {
    const requestId = req.requestId || 'unknown';
    console.error(`[${requestId}] ERROR:`, {
        message: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
        body: req.body,
        query: req.query,
        params: req.params
    });
    next(err);
};
exports.errorLogger = errorLogger;
//# sourceMappingURL=logger.js.map