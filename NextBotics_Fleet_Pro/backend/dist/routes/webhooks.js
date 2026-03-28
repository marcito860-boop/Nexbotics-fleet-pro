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
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const database_1 = require("../database");
const webhookService = __importStar(require("../services/webhook"));
const router = (0, express_1.Router)();
// Apply authentication
router.use(auth_1.authenticateToken);
/**
 * List all webhooks for the current user
 * GET /webhooks
 */
router.get('/', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user?.userId;
    const userRole = req.user?.role;
    let sql = `
    SELECT 
      w.*,
      COUNT(wd.id) as total_deliveries,
      COUNT(CASE WHEN wd.delivered_at IS NOT NULL THEN 1 END) as successful_deliveries
    FROM webhooks w
    LEFT JOIN webhook_deliveries wd ON wd.webhook_id = w.id
    WHERE 1=1
  `;
    const params = [];
    // Non-admins can only see their own webhooks
    if (userRole !== 'admin') {
        sql += ` AND w.user_id = $1`;
        params.push(userId);
    }
    sql += ` GROUP BY w.id ORDER BY w.created_at DESC`;
    const webhooks = await (0, database_1.query)(sql, params);
    res.json({ data: webhooks });
}));
/**
 * Create a new webhook
 * POST /webhooks
 */
router.post('/', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user?.userId;
    const { url, event_types, secret, description, headers } = req.body;
    // Validate required fields
    if (!url || !event_types || !Array.isArray(event_types)) {
        return res.status(400).json({
            error: 'URL and event_types array are required'
        });
    }
    // Validate URL format
    try {
        new URL(url);
    }
    catch {
        return res.status(400).json({ error: 'Invalid URL format' });
    }
    // Validate event types
    const validEvents = [
        'training.completed',
        'training.failed',
        'inventory.low_stock',
        'inventory.out_of_stock',
        'maintenance.overdue',
        'maintenance.due_soon',
        'vehicle.accident',
        'vehicle.defect_reported',
        'driver.behavior_alert',
        '*'
    ];
    const invalidEvents = event_types.filter((e) => !validEvents.includes(e));
    if (invalidEvents.length > 0) {
        return res.status(400).json({
            error: `Invalid event types: ${invalidEvents.join(', ')}`,
            valid_events: validEvents
        });
    }
    const webhookId = await webhookService.registerWebhook(userId, url, event_types, {
        secret,
        description,
        headers
    });
    res.status(201).json({
        id: webhookId,
        message: 'Webhook registered successfully'
    });
}));
/**
 * Get webhook details
 * GET /webhooks/:id
 */
router.get('/:id', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const userId = req.user?.userId;
    const userRole = req.user?.role;
    let sql = `SELECT * FROM webhooks WHERE id = $1`;
    const params = [id];
    if (userRole !== 'admin') {
        sql += ` AND user_id = $2`;
        params.push(userId);
    }
    const webhooks = await (0, database_1.query)(sql, params);
    if (webhooks.length === 0) {
        return res.status(404).json({ error: 'Webhook not found' });
    }
    res.json({ data: webhooks[0] });
}));
/**
 * Update a webhook
 * PUT /webhooks/:id
 */
router.put('/:id', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const userId = req.user?.userId;
    const userRole = req.user?.role;
    const { url, event_types, secret, description, headers, is_active } = req.body;
    // Check ownership
    let checkSql = `SELECT * FROM webhooks WHERE id = $1`;
    const checkParams = [id];
    if (userRole !== 'admin') {
        checkSql += ` AND user_id = $2`;
        checkParams.push(userId);
    }
    const existing = await (0, database_1.query)(checkSql, checkParams);
    if (existing.length === 0) {
        return res.status(404).json({ error: 'Webhook not found' });
    }
    // Build update query
    const updates = [];
    const values = [];
    let paramIndex = 1;
    if (url !== undefined) {
        try {
            new URL(url);
        }
        catch {
            return res.status(400).json({ error: 'Invalid URL format' });
        }
        updates.push(`url = $${paramIndex++}`);
        values.push(url);
    }
    if (event_types !== undefined) {
        updates.push(`event_types = $${paramIndex++}`);
        values.push(JSON.stringify(event_types));
    }
    if (secret !== undefined) {
        updates.push(`secret = $${paramIndex++}`);
        values.push(secret);
    }
    if (description !== undefined) {
        updates.push(`description = $${paramIndex++}`);
        values.push(description);
    }
    if (headers !== undefined) {
        updates.push(`headers = $${paramIndex++}`);
        values.push(JSON.stringify(headers));
    }
    if (is_active !== undefined) {
        updates.push(`is_active = $${paramIndex++}`);
        values.push(is_active);
        // Reset failure count when reactivating
        if (is_active === true) {
            updates.push(`failure_count = 0`);
        }
    }
    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);
    await (0, database_1.query)(`
    UPDATE webhooks 
    SET ${updates.join(', ')}
    WHERE id = $${paramIndex}
  `, values);
    res.json({ message: 'Webhook updated successfully' });
}));
/**
 * Delete a webhook
 * DELETE /webhooks/:id
 */
router.delete('/:id', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const userId = req.user?.userId;
    const userRole = req.user?.role;
    try {
        await webhookService.unregisterWebhook(id, userRole === 'admin' ? '' : userId);
        res.json({ message: 'Webhook deleted successfully' });
    }
    catch (error) {
        res.status(404).json({ error: 'Webhook not found' });
    }
}));
/**
 * Get webhook delivery history
 * GET /webhooks/:id/deliveries
 */
router.get('/:id/deliveries', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const userId = req.user?.userId;
    const userRole = req.user?.role;
    const { limit = 50 } = req.query;
    // Check ownership
    let checkSql = `SELECT * FROM webhooks WHERE id = $1`;
    const checkParams = [id];
    if (userRole !== 'admin') {
        checkSql += ` AND user_id = $2`;
        checkParams.push(userId);
    }
    const existing = await (0, database_1.query)(checkSql, checkParams);
    if (existing.length === 0) {
        return res.status(404).json({ error: 'Webhook not found' });
    }
    const deliveries = await webhookService.getDeliveryHistory(id, parseInt(limit));
    res.json({ data: deliveries });
}));
/**
 * Test a webhook
 * POST /webhooks/:id/test
 */
router.post('/:id/test', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const userId = req.user?.userId;
    const userRole = req.user?.role;
    // Check ownership
    let checkSql = `SELECT * FROM webhooks WHERE id = $1`;
    const checkParams = [id];
    if (userRole !== 'admin') {
        checkSql += ` AND user_id = $2`;
        checkParams.push(userId);
    }
    const webhooks = await (0, database_1.query)(checkSql, checkParams);
    if (webhooks.length === 0) {
        return res.status(404).json({ error: 'Webhook not found' });
    }
    const webhook = webhooks[0];
    // Send test event
    try {
        await webhookService.emitWebhookEvent('webhook.test', {
            webhook_id: id,
            url: webhook.url,
            timestamp: new Date().toISOString(),
            message: 'This is a test event from NextBotics Fleet Management'
        });
        res.json({ message: 'Test event sent successfully' });
    }
    catch (error) {
        res.status(500).json({
            error: 'Failed to send test event',
            details: error.message
        });
    }
}));
exports.default = router;
//# sourceMappingURL=webhooks.js.map