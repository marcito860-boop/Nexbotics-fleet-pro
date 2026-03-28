"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getApiUsageStats = exports.getApiKeyById = exports.getApiKeys = exports.revokeApiKey = exports.generateApiKey = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const database_1 = require("../database");
const uuid_1 = require("uuid");
const API_KEY_PREFIX = 'fp_live_';
const SALT_ROUNDS = 10;
// Generate a new API key
const generateApiKey = async (data) => {
    // Generate random key
    const randomPart = Buffer.from((0, uuid_1.v4)() + (0, uuid_1.v4)()).toString('base64url').substring(0, 32);
    const key = `${API_KEY_PREFIX}${randomPart}`;
    const keyPrefix = key.substring(0, 20);
    // Hash the key for storage
    const keyHash = await bcryptjs_1.default.hash(key, SALT_ROUNDS);
    // Store in database
    const result = await (0, database_1.query)(`INSERT INTO api_keys (id, key_hash, key_prefix, name, description, created_by, expires_at, permissions, rate_limit_per_minute)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`, [
        data.id || (0, uuid_1.v4)(),
        keyHash,
        keyPrefix,
        data.name,
        data.description || null,
        data.createdBy || null,
        data.expiresAt || null,
        JSON.stringify(data.permissions || ['read']),
        data.rateLimitPerMinute || 60
    ]);
    return { key, id: result[0].id };
};
exports.generateApiKey = generateApiKey;
// Revoke an API key
const revokeApiKey = async (keyId) => {
    const result = await (0, database_1.query)('UPDATE api_keys SET is_active = false WHERE id = $1 RETURNING id', [keyId]);
    return result.length > 0;
};
exports.revokeApiKey = revokeApiKey;
// Get all active API keys
const getApiKeys = async () => {
    return await (0, database_1.query)(`SELECT id, key_prefix, name, description, is_active, created_at, last_used_at, expires_at, permissions, rate_limit_per_minute
     FROM api_keys WHERE deleted_at IS NULL ORDER BY created_at DESC`);
};
exports.getApiKeys = getApiKeys;
// Get API key by ID
const getApiKeyById = async (keyId) => {
    const result = await (0, database_1.query)(`SELECT id, key_prefix, name, description, is_active, created_at, last_used_at, expires_at, permissions, rate_limit_per_minute
     FROM api_keys WHERE id = $1 AND deleted_at IS NULL`, [keyId]);
    return result.length > 0 ? result[0] : null;
};
exports.getApiKeyById = getApiKeyById;
// Get API usage statistics
const getApiUsageStats = async (keyId, days = 7) => {
    const params = [];
    let whereClause = '';
    if (keyId) {
        whereClause = 'WHERE api_key_id = $1';
        params.push(keyId);
    }
    // Total requests
    const totalRequests = await (0, database_1.query)(`SELECT COUNT(*) as total FROM api_usage_logs ${whereClause} AND created_at > NOW() - INTERVAL '${days} days'`, params);
    // Requests by endpoint
    const byEndpoint = await (0, database_1.query)(`SELECT endpoint, method, COUNT(*) as count 
     FROM api_usage_logs ${whereClause} AND created_at > NOW() - INTERVAL '${days} days'
     GROUP BY endpoint, method ORDER BY count DESC LIMIT 20`, params);
    // Requests by day
    const byDay = await (0, database_1.query)(`SELECT DATE(created_at) as date, COUNT(*) as count 
     FROM api_usage_logs ${whereClause} AND created_at > NOW() - INTERVAL '${days} days'
     GROUP BY DATE(created_at) ORDER BY date`, params);
    // Error rate
    const errorRate = await (0, database_1.query)(`SELECT 
       COUNT(*) FILTER (WHERE status_code >= 400) as errors,
       COUNT(*) as total
     FROM api_usage_logs ${whereClause} AND created_at > NOW() - INTERVAL '${days} days'`, params);
    return {
        period: `${days} days`,
        totalRequests: parseInt(totalRequests[0]?.total || 0),
        byEndpoint,
        byDay,
        errorRate: {
            errors: parseInt(errorRate[0]?.errors || 0),
            total: parseInt(errorRate[0]?.total || 0),
            percentage: errorRate[0]?.total > 0
                ? ((parseInt(errorRate[0].errors) / parseInt(errorRate[0].total)) * 100).toFixed(2)
                : 0
        }
    };
};
exports.getApiUsageStats = getApiUsageStats;
//# sourceMappingURL=apiKey.js.map