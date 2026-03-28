"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiKeyRateLimiter = exports.authRateLimiter = exports.rateLimiter = void 0;
// In-memory store for rate limiting (consider Redis for production)
const store = {};
const defaultOptions = {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100,
    message: 'Too many requests, please try again later'
};
// Clean up old entries periodically
setInterval(() => {
    const now = Date.now();
    Object.keys(store).forEach(key => {
        if (store[key].resetTime < now) {
            delete store[key];
        }
    });
}, 60 * 1000); // Clean every minute
const rateLimiter = (options = {}) => {
    const opts = { ...defaultOptions, ...options };
    return (req, res, next) => {
        // Get identifier (API key, user ID, or IP)
        const identifier = req.headers['x-api-key']?.toString() ||
            req.user?.userId ||
            req.ip ||
            'unknown';
        const key = `${req.path}:${identifier}`;
        const now = Date.now();
        // Initialize or get existing entry
        if (!store[key] || store[key].resetTime < now) {
            store[key] = {
                count: 0,
                resetTime: now + opts.windowMs
            };
        }
        // Increment count
        store[key].count++;
        // Set rate limit headers
        res.setHeader('X-RateLimit-Limit', opts.maxRequests.toString());
        res.setHeader('X-RateLimit-Remaining', Math.max(0, opts.maxRequests - store[key].count).toString());
        res.setHeader('X-RateLimit-Reset', new Date(store[key].resetTime).toISOString());
        // Check if limit exceeded
        if (store[key].count > opts.maxRequests) {
            return res.status(429).json({
                error: 'Rate limit exceeded',
                message: opts.message,
                retryAfter: Math.ceil((store[key].resetTime - now) / 1000)
            });
        }
        next();
    };
};
exports.rateLimiter = rateLimiter;
// Stricter rate limiter for auth endpoints
exports.authRateLimiter = (0, exports.rateLimiter)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // 5 attempts per 15 minutes
    message: 'Too many authentication attempts, please try again later'
});
// API key rate limiter (higher limits)
const apiKeyRateLimiter = (maxRequests = 1000) => (0, exports.rateLimiter)({
    windowMs: 60 * 1000, // 1 minute
    maxRequests
});
exports.apiKeyRateLimiter = apiKeyRateLimiter;
//# sourceMappingURL=rateLimiter.js.map