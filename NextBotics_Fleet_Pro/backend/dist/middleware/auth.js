"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireRole = exports.authenticateApiKey = exports.authenticateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const database_1 = require("../database");
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    }
    catch (error) {
        return res.status(403).json({ error: 'Invalid or expired token' });
    }
};
exports.authenticateToken = authenticateToken;
/**
 * Authenticate using API key
 * Header: X-API-Key: your_api_key_here
 */
const authenticateApiKey = async (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey) {
        return next(); // No API key provided, let JWT auth handle it
    }
    try {
        // Look up API key in database
        const keys = await (0, database_1.query)(`
      SELECT ak.*, u.email, u.role, u.id as user_id
      FROM api_keys ak
      JOIN users u ON u.id = ak.user_id
      WHERE ak.key_hash = crypt($1, ak.key_hash)
      AND ak.is_active = true
      AND (ak.expires_at IS NULL OR ak.expires_at > CURRENT_TIMESTAMP)
    `, [apiKey]);
        if (keys.length === 0) {
            return res.status(401).json({ error: 'Invalid API key' });
        }
        const keyData = keys[0];
        // Update last used timestamp
        await (0, database_1.query)(`
      UPDATE api_keys 
      SET last_used_at = CURRENT_TIMESTAMP, usage_count = usage_count + 1
      WHERE id = $1
    `, [keyData.id]);
        // Set user on request
        req.user = {
            userId: keyData.user_id,
            email: keyData.email,
            role: keyData.role,
            companyId: keyData.company_id
        };
        next();
    }
    catch (error) {
        console.error('API key authentication error:', error);
        return res.status(500).json({ error: 'Authentication failed' });
    }
};
exports.authenticateApiKey = authenticateApiKey;
const requireRole = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }
        next();
    };
};
exports.requireRole = requireRole;
//# sourceMappingURL=auth.js.map