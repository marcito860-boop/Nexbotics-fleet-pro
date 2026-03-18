"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../utils/auth");
const database_1 = require("../database");
const uuid_1 = require("uuid");
const router = (0, express_1.Router)();
router.use(auth_1.authMiddleware);
// ==========================================
// INTEGRATION PROVIDERS (ERP, Telematics, etc.)
// ==========================================
// Get all integrations for company
router.get('/', async (req, res) => {
    try {
        const companyId = req.user?.companyId;
        const result = await (0, database_1.query)(`
      SELECT * FROM integration_providers
      WHERE company_id = $1
      ORDER BY created_at DESC
    `, [companyId]);
        res.json(result);
    }
    catch (error) {
        console.error('Error fetching integrations:', error);
        res.status(500).json({ error: 'Failed to fetch integrations' });
    }
});
// Get integration by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await (0, database_1.query)(`
      SELECT * FROM integration_providers
      WHERE id = $1
    `, [id]);
        if (!result || result.length === 0) {
            return res.status(404).json({ error: 'Integration not found' });
        }
        res.json(result[0]);
    }
    catch (error) {
        console.error('Error fetching integration:', error);
        res.status(500).json({ error: 'Failed to fetch integration' });
    }
});
// Create new integration
router.post('/', (0, auth_1.requireRole)(['admin', 'manager']), async (req, res) => {
    try {
        const companyId = req.user?.companyId;
        const { name, type, provider, description, config, features } = req.body;
        const result = await (0, database_1.query)(`
      INSERT INTO integration_providers (
        id, company_id, name, type, provider, description, config, features, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'disconnected')
      RETURNING *
    `, [(0, uuid_1.v4)(), companyId, name, type, provider, description, JSON.stringify(config), features]);
        res.status(201).json(result[0]);
    }
    catch (error) {
        console.error('Error creating integration:', error);
        res.status(500).json({ error: 'Failed to create integration' });
    }
});
// Update integration
router.put('/:id', (0, auth_1.requireRole)(['admin', 'manager']), async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, config, features, status } = req.body;
        const result = await (0, database_1.query)(`
      UPDATE integration_providers
      SET name = $1, description = $2, config = $3, features = $4, status = $5, updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
      RETURNING *
    `, [name, description, JSON.stringify(config), features, status, id]);
        if (!result || result.length === 0) {
            return res.status(404).json({ error: 'Integration not found' });
        }
        res.json(result[0]);
    }
    catch (error) {
        console.error('Error updating integration:', error);
        res.status(500).json({ error: 'Failed to update integration' });
    }
});
// Delete integration
router.delete('/:id', (0, auth_1.requireRole)(['admin']), async (req, res) => {
    try {
        const { id } = req.params;
        await (0, database_1.query)('DELETE FROM integration_providers WHERE id = $1', [id]);
        res.json({ success: true });
    }
    catch (error) {
        console.error('Error deleting integration:', error);
        res.status(500).json({ error: 'Failed to delete integration' });
    }
});
// ==========================================
// API KEYS
// ==========================================
router.get('/api-keys', async (req, res) => {
    try {
        const companyId = req.user?.companyId;
        const result = await (0, database_1.query)(`
      SELECT id, name, key_prefix, permissions, rate_limit, usage_count, 
             last_used_at, expires_at, is_active, created_at
      FROM api_keys
      WHERE company_id = $1
      ORDER BY created_at DESC
    `, [companyId]);
        res.json(result);
    }
    catch (error) {
        console.error('Error fetching API keys:', error);
        res.status(500).json({ error: 'Failed to fetch API keys' });
    }
});
router.post('/api-keys', (0, auth_1.requireRole)(['admin', 'manager']), async (req, res) => {
    try {
        const companyId = req.user?.companyId;
        const userId = req.user?.userId;
        const { name, permissions, rateLimit, expiresAt } = req.body;
        // Generate API key
        const keyPrefix = 'pk_' + Math.random().toString(36).substring(2, 8);
        const keySecret = Math.random().toString(36).substring(2, 34);
        const fullKey = keyPrefix + '_' + keySecret;
        // Hash the key for storage
        const keyHash = await Promise.resolve().then(() => __importStar(require('crypto'))).then(c => c.createHash('sha256').update(fullKey).digest('hex'));
        const result = await (0, database_1.query)(`
      INSERT INTO api_keys (
        id, company_id, name, key_hash, key_prefix, permissions, rate_limit, expires_at, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, name, key_prefix, permissions, rate_limit, expires_at, created_at
    `, [(0, uuid_1.v4)(), companyId, name, keyHash, keyPrefix, permissions, rateLimit, expiresAt, userId]);
        // Return the full key only once
        res.status(201).json({
            ...result[0],
            fullKey
        });
    }
    catch (error) {
        console.error('Error creating API key:', error);
        res.status(500).json({ error: 'Failed to create API key' });
    }
});
router.delete('/api-keys/:id', (0, auth_1.requireRole)(['admin']), async (req, res) => {
    try {
        const { id } = req.params;
        await (0, database_1.query)('DELETE FROM api_keys WHERE id = $1', [id]);
        res.json({ success: true });
    }
    catch (error) {
        console.error('Error deleting API key:', error);
        res.status(500).json({ error: 'Failed to delete API key' });
    }
});
// ==========================================
// WEBHOOKS
// ==========================================
router.get('/webhooks', async (req, res) => {
    try {
        const companyId = req.user?.companyId;
        const result = await (0, database_1.query)(`
      SELECT * FROM webhooks
      WHERE company_id = $1
      ORDER BY created_at DESC
    `, [companyId]);
        res.json(result);
    }
    catch (error) {
        console.error('Error fetching webhooks:', error);
        res.status(500).json({ error: 'Failed to fetch webhooks' });
    }
});
router.post('/webhooks', (0, auth_1.requireRole)(['admin', 'manager']), async (req, res) => {
    try {
        const companyId = req.user?.companyId;
        const userId = req.user?.userId;
        const { name, url, secret, events, retryCount, timeoutSeconds } = req.body;
        const result = await (0, database_1.query)(`
      INSERT INTO webhooks (
        id, company_id, name, url, secret, events, retry_count, timeout_seconds, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [(0, uuid_1.v4)(), companyId, name, url, secret, events, retryCount || 3, timeoutSeconds || 30, userId]);
        res.status(201).json(result[0]);
    }
    catch (error) {
        console.error('Error creating webhook:', error);
        res.status(500).json({ error: 'Failed to create webhook' });
    }
});
router.put('/webhooks/:id', (0, auth_1.requireRole)(['admin', 'manager']), async (req, res) => {
    try {
        const { id } = req.params;
        const { name, url, secret, events, isActive, retryCount, timeoutSeconds } = req.body;
        const result = await (0, database_1.query)(`
      UPDATE webhooks
      SET name = $1, url = $2, secret = $3, events = $4, is_active = $5,
          retry_count = $6, timeout_seconds = $7, updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
      RETURNING *
    `, [name, url, secret, events, isActive, retryCount, timeoutSeconds, id]);
        res.json(result[0]);
    }
    catch (error) {
        console.error('Error updating webhook:', error);
        res.status(500).json({ error: 'Failed to update webhook' });
    }
});
router.delete('/webhooks/:id', (0, auth_1.requireRole)(['admin']), async (req, res) => {
    try {
        const { id } = req.params;
        await (0, database_1.query)('DELETE FROM webhooks WHERE id = $1', [id]);
        res.json({ success: true });
    }
    catch (error) {
        console.error('Error deleting webhook:', error);
        res.status(500).json({ error: 'Failed to delete webhook' });
    }
});
// Get webhook logs
router.get('/webhooks/:id/logs', async (req, res) => {
    try {
        const { id } = req.params;
        const limit = parseInt(req.query.limit) || 20;
        const result = await (0, database_1.query)(`
      SELECT * FROM webhook_logs
      WHERE webhook_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `, [id, limit]);
        res.json(result);
    }
    catch (error) {
        console.error('Error fetching webhook logs:', error);
        res.status(500).json({ error: 'Failed to fetch webhook logs' });
    }
});
exports.default = router;
//# sourceMappingURL=integration-providers.js.map