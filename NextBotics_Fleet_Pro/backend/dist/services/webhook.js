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
exports.verifySignature = exports.triggerWebhook = exports.getWebhookLogs = exports.testWebhook = exports.deleteWebhook = exports.updateWebhook = exports.getWebhookById = exports.getWebhooks = exports.createWebhook = exports.getDeliveryHistory = exports.unregisterWebhook = exports.registerWebhook = exports.retryFailedDeliveries = exports.emitWebhookEvent = void 0;
const database_1 = require("../database");
const uuid_1 = require("uuid");
/**
 * Emit a webhook event to all registered listeners
 */
const emitWebhookEvent = async (eventType, data) => {
    try {
        // Find all active webhooks subscribed to this event
        const webhooks = await (0, database_1.query)(`
      SELECT * FROM webhooks 
      WHERE is_active = true 
      AND (event_types @> $1::jsonb OR event_types = '["*"]')
    `, [JSON.stringify([eventType])]);
        for (const webhook of webhooks) {
            try {
                await deliverWebhook(webhook, {
                    event: eventType,
                    timestamp: new Date().toISOString(),
                    data
                });
            }
            catch (error) {
                console.error(`Failed to deliver webhook ${webhook.id}:`, error);
            }
        }
    }
    catch (error) {
        console.error('Error emitting webhook event:', error);
    }
};
exports.emitWebhookEvent = emitWebhookEvent;
/**
 * Deliver a webhook to its endpoint
 */
const deliverWebhook = async (webhook, payload) => {
    const deliveryId = (0, uuid_1.v4)();
    const startTime = Date.now();
    try {
        const headers = {
            'Content-Type': 'application/json',
            'X-Webhook-ID': webhook.id,
            'X-Webhook-Event': payload.event,
            'X-Webhook-Timestamp': payload.timestamp,
            ...webhook.headers
        };
        // Add signature if secret is configured
        if (webhook.secret) {
            const crypto = await Promise.resolve().then(() => __importStar(require('crypto')));
            const signature = crypto
                .createHmac('sha256', webhook.secret)
                .update(JSON.stringify(payload))
                .digest('hex');
            headers['X-Webhook-Signature'] = `sha256=${signature}`;
        }
        const response = await fetch(webhook.url, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
            timeout: 30000 // 30 second timeout
        });
        const responseTime = Date.now() - startTime;
        const responseBody = await response.text();
        // Log delivery
        await (0, database_1.query)(`
      INSERT INTO webhook_deliveries (
        id, webhook_id, event_type, payload, response_status, 
        response_body, delivered_at, attempt_number
      ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, 1)
    `, [
            deliveryId,
            webhook.id,
            payload.event,
            JSON.stringify(payload),
            response.status,
            responseBody.substring(0, 1000) // Limit response size
        ]);
        // Update webhook last triggered
        await (0, database_1.query)(`
      UPDATE webhooks 
      SET last_triggered_at = CURRENT_TIMESTAMP, failure_count = 0
      WHERE id = $1
    `, [webhook.id]);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${responseBody}`);
        }
    }
    catch (error) {
        // Log failed delivery
        await (0, database_1.query)(`
      INSERT INTO webhook_deliveries (
        id, webhook_id, event_type, payload, error_message, attempt_number
      ) VALUES ($1, $2, $3, $4, $5, 1)
    `, [
            deliveryId,
            webhook.id,
            payload.event,
            JSON.stringify(payload),
            error.message
        ]);
        // Increment failure count
        await (0, database_1.query)(`
      UPDATE webhooks 
      SET failure_count = failure_count + 1
      WHERE id = $1
    `, [webhook.id]);
        // Deactivate webhook after 5 consecutive failures
        await (0, database_1.query)(`
      UPDATE webhooks 
      SET is_active = false
      WHERE id = $1 AND failure_count >= 5
    `, [webhook.id]);
        throw error;
    }
};
/**
 * Retry failed webhook deliveries
 */
const retryFailedDeliveries = async () => {
    try {
        // Get failed deliveries from last 24 hours
        const failedDeliveries = await (0, database_1.query)(`
      SELECT wd.*, w.url, w.secret, w.headers
      FROM webhook_deliveries wd
      JOIN webhooks w ON w.id = wd.webhook_id
      WHERE wd.delivered_at IS NULL
      AND wd.attempt_number < 5
      AND wd.created_at > CURRENT_TIMESTAMP - INTERVAL '24 hours'
      ORDER BY wd.created_at DESC
      LIMIT 50
    `);
        for (const delivery of failedDeliveries) {
            try {
                const payload = JSON.parse(delivery.payload);
                await deliverWebhook({ ...delivery, id: delivery.webhook_id }, payload);
                // Update attempt count
                await (0, database_1.query)(`
          UPDATE webhook_deliveries 
          SET attempt_number = attempt_number + 1
          WHERE id = $1
        `, [delivery.id]);
            }
            catch (error) {
                console.error(`Retry failed for delivery ${delivery.id}:`, error);
            }
        }
    }
    catch (error) {
        console.error('Error retrying failed deliveries:', error);
    }
};
exports.retryFailedDeliveries = retryFailedDeliveries;
/**
 * Register a new webhook
 */
const registerWebhook = async (userId, url, eventTypes, options = {}) => {
    const webhookId = (0, uuid_1.v4)();
    await (0, database_1.query)(`
    INSERT INTO webhooks (
      id, user_id, url, event_types, secret, description, headers, is_active
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, true)
  `, [
        webhookId,
        userId,
        url,
        JSON.stringify(eventTypes),
        options.secret || null,
        options.description || null,
        JSON.stringify(options.headers || {})
    ]);
    return webhookId;
};
exports.registerWebhook = registerWebhook;
/**
 * Unregister a webhook
 */
const unregisterWebhook = async (webhookId, userId) => {
    await (0, database_1.query)(`
    DELETE FROM webhooks 
    WHERE id = $1 AND user_id = $2
  `, [webhookId, userId]);
};
exports.unregisterWebhook = unregisterWebhook;
/**
 * Get webhook delivery history
 */
const getDeliveryHistory = async (webhookId, limit = 50) => {
    return await (0, database_1.query)(`
    SELECT * FROM webhook_deliveries
    WHERE webhook_id = $1
    ORDER BY created_at DESC
    LIMIT $2
  `, [webhookId, limit]);
};
exports.getDeliveryHistory = getDeliveryHistory;
/**
 * Create a new webhook (for integrations module)
 */
const createWebhook = async (input) => {
    const webhookId = (0, uuid_1.v4)();
    const secret = generateWebhookSecret();
    const result = await (0, database_1.query)(`
    INSERT INTO webhooks (
      id, name, url, secret, event_types, created_by, headers, is_active, created_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, true, CURRENT_TIMESTAMP)
    RETURNING id, name, url, event_types, headers, is_active, created_at
  `, [
        webhookId,
        input.name,
        input.url,
        secret,
        JSON.stringify(input.events),
        input.createdBy,
        JSON.stringify(input.headers || {})
    ]);
    return {
        webhook: result[0],
        secret
    };
};
exports.createWebhook = createWebhook;
/**
 * Get all webhooks (for integrations module)
 */
const getWebhooks = async () => {
    return await (0, database_1.query)(`
    SELECT 
      id, name, url, event_types, headers, is_active, 
      last_triggered_at, failure_count, created_at
    FROM webhooks
    WHERE deleted_at IS NULL
    ORDER BY created_at DESC
  `);
};
exports.getWebhooks = getWebhooks;
/**
 * Get single webhook by ID
 */
const getWebhookById = async (webhookId) => {
    const result = await (0, database_1.query)(`
    SELECT * FROM webhooks
    WHERE id = $1 AND deleted_at IS NULL
  `, [webhookId]);
    return result.length > 0 ? result[0] : null;
};
exports.getWebhookById = getWebhookById;
/**
 * Update webhook
 */
const updateWebhook = async (webhookId, updates) => {
    const setClause = [];
    const values = [];
    let paramIndex = 1;
    if (updates.name !== undefined) {
        setClause.push(`name = $${paramIndex++}`);
        values.push(updates.name);
    }
    if (updates.url !== undefined) {
        setClause.push(`url = $${paramIndex++}`);
        values.push(updates.url);
    }
    if (updates.events !== undefined) {
        setClause.push(`event_types = $${paramIndex++}`);
        values.push(JSON.stringify(updates.events));
    }
    if (updates.headers !== undefined) {
        setClause.push(`headers = $${paramIndex++}`);
        values.push(JSON.stringify(updates.headers));
    }
    if (updates.is_active !== undefined) {
        setClause.push(`is_active = $${paramIndex++}`);
        values.push(updates.is_active);
    }
    if (setClause.length === 0) {
        return (0, exports.getWebhookById)(webhookId);
    }
    setClause.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(webhookId);
    const result = await (0, database_1.query)(`
    UPDATE webhooks
    SET ${setClause.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING id, name, url, event_types, headers, is_active, created_at, updated_at
  `, values);
    return result.length > 0 ? result[0] : null;
};
exports.updateWebhook = updateWebhook;
/**
 * Delete webhook
 */
const deleteWebhook = async (webhookId) => {
    const result = await (0, database_1.query)(`
    UPDATE webhooks
    SET deleted_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING id
  `, [webhookId]);
    return result.length > 0;
};
exports.deleteWebhook = deleteWebhook;
/**
 * Test webhook by sending a ping event
 */
const testWebhook = async (webhookId) => {
    const webhook = await (0, exports.getWebhookById)(webhookId);
    if (!webhook) {
        return { success: false, message: 'Webhook not found' };
    }
    const payload = {
        event: 'webhook.test',
        timestamp: new Date().toISOString(),
        data: { message: 'This is a test ping from Fleet Management System' }
    };
    try {
        await deliverWebhook(webhook, payload);
        return { success: true, message: 'Webhook test successful' };
    }
    catch (error) {
        return { success: false, message: `Webhook test failed: ${error.message}` };
    }
};
exports.testWebhook = testWebhook;
/**
 * Get webhook delivery logs
 */
const getWebhookLogs = async (webhookId, limit = 50) => {
    return await (0, database_1.query)(`
    SELECT 
      id, event_type, payload, response_status, error_message, 
      attempt_number, delivered_at, created_at
    FROM webhook_deliveries
    WHERE webhook_id = $1
    ORDER BY created_at DESC
    LIMIT $2
  `, [webhookId, limit]);
};
exports.getWebhookLogs = getWebhookLogs;
/**
 * Manually trigger a webhook event
 */
const triggerWebhook = async (eventType, data) => {
    let delivered = 0;
    let failed = 0;
    try {
        const webhooks = await (0, database_1.query)(`
      SELECT * FROM webhooks 
      WHERE is_active = true 
      AND (event_types @> $1::jsonb OR event_types = '["*"]')
    `, [JSON.stringify([eventType])]);
        for (const webhook of webhooks) {
            try {
                await deliverWebhook(webhook, {
                    event: eventType,
                    timestamp: new Date().toISOString(),
                    data
                });
                delivered++;
            }
            catch (error) {
                console.error(`Failed to deliver webhook ${webhook.id}:`, error);
                failed++;
            }
        }
        return { success: true, delivered, failed };
    }
    catch (error) {
        console.error('Error triggering webhook:', error);
        return { success: false, delivered, failed };
    }
};
exports.triggerWebhook = triggerWebhook;
/**
 * Verify webhook signature
 */
const verifySignature = (payload, signature, secret) => {
    try {
        const crypto = require('crypto');
        const expectedSignature = crypto
            .createHmac('sha256', secret)
            .update(payload)
            .digest('hex');
        // Support both raw hex and 'sha256=' prefixed signatures
        const sig = signature.startsWith('sha256=') ? signature.slice(7) : signature;
        // Use timing-safe comparison to prevent timing attacks
        return crypto.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expectedSignature, 'hex'));
    }
    catch (error) {
        return false;
    }
};
exports.verifySignature = verifySignature;
/**
 * Generate a secure webhook secret
 */
function generateWebhookSecret() {
    const crypto = require('crypto');
    return crypto.randomBytes(32).toString('hex');
}
// Schedule retry of failed deliveries every 5 minutes
setInterval(exports.retryFailedDeliveries, 5 * 60 * 1000);
//# sourceMappingURL=webhook.js.map