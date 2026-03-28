"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateAny = exports.requireApiPermission = exports.authenticateApiKey = void 0;
const database_1 = require("../database");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
// API key authentication middleware
const authenticateApiKey = async (req, res, next) => {
    const apiKeyHeader = req.headers['x-api-key'] || req.headers['authorization'];
    if (!apiKeyHeader) {
        return res.status(401).json({ error: 'API key required' });
    }
    // Extract key from header (handle "Bearer KEY" or just "KEY")
    let apiKey = apiKeyHeader.toString();
    if (apiKey.toLowerCase().startsWith('bearer ')) {
        apiKey = apiKey.substring(7);
    }
    try {
        // Extract prefix from key (format: fp_live_xxxxxxxx...)
        const keyParts = apiKey.split('_');
        const keyPrefix = keyParts.length >= 3 ? `${keyParts[0]}_${keyParts[1]}_` : apiKey.substring(0, 20);
        // Find API key by prefix
        const keys = await (0, database_1.query)('SELECT * FROM api_keys WHERE key_prefix = $1 AND is_active = true', [keyPrefix]);
        if (!keys || keys.length === 0) {
            return res.status(401).json({ error: 'Invalid API key' });
        }
        const keyRecord = keys[0];
        // Check if expired
        if (keyRecord.expires_at && new Date(keyRecord.expires_at) < new Date()) {
            return res.status(401).json({ error: 'API key expired' });
        }
        // Verify key hash
        const isValid = await bcryptjs_1.default.compare(apiKey, keyRecord.key_hash);
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid API key' });
        }
        // Update last used timestamp
        await (0, database_1.query)('UPDATE api_keys SET last_used_at = CURRENT_TIMESTAMP WHERE id = $1', [keyRecord.id]);
        // Attach API key info to request
        req.apiKey = {
            id: keyRecord.id,
            name: keyRecord.name,
            permissions: keyRecord.permissions || ['read'],
            rateLimit: keyRecord.rate_limit_per_minute || 60
        };
        // Log API usage
        await logApiUsage(keyRecord.id, null, req);
        next();
    }
    catch (error) {
        console.error('API key authentication error:', error);
        return res.status(500).json({ error: 'Authentication failed' });
    }
};
exports.authenticateApiKey = authenticateApiKey;
// Middleware to check API key permissions
const requireApiPermission = (permission) => {
    return (req, res, next) => {
        const apiReq = req;
        if (!apiReq.apiKey) {
            return res.status(401).json({ error: 'API key authentication required' });
        }
        const hasPermission = apiReq.apiKey.permissions.includes(permission) ||
            apiReq.apiKey.permissions.includes('admin');
        if (!hasPermission) {
            return res.status(403).json({
                error: 'Insufficient permissions',
                required: permission,
                granted: apiReq.apiKey.permissions
            });
        }
        next();
    };
};
exports.requireApiPermission = requireApiPermission;
// Combined authentication (JWT or API Key)
const authenticateAny = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const apiKeyHeader = req.headers['x-api-key'];
    // If API key present, use API key auth
    if (apiKeyHeader) {
        return (0, exports.authenticateApiKey)(req, res, next);
    }
    // Otherwise, fall back to JWT auth
    const jwtAuth = require('./auth').authenticateToken;
    return jwtAuth(req, res, next);
};
exports.authenticateAny = authenticateAny;
// Helper to log API usage
const logApiUsage = async (apiKeyId, userId, req) => {
    try {
        await (0, database_1.query)(`INSERT INTO api_usage_logs (api_key_id, user_id, endpoint, method, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6)`, [
            apiKeyId,
            userId,
            req.path,
            req.method,
            req.ip,
            req.headers['user-agent'] || null
        ]);
    }
    catch (err) {
        // Non-critical error, just log
        console.warn('Failed to log API usage:', err);
    }
};
//# sourceMappingURL=apiAuth.js.map