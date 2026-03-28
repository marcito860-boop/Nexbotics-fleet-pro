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
const apiAuth_1 = require("../middleware/apiAuth");
const rateLimiter_1 = require("../middleware/rateLimiter");
const database_1 = require("../database");
const apiKeyService = __importStar(require("../services/apiKey"));
const webhookService = __importStar(require("../services/webhook"));
const errorHandler_1 = require("../middleware/errorHandler");
// import swaggerUi from 'swagger-ui-express';
// import swaggerJsdoc from 'swagger-jsdoc';
const router = (0, express_1.Router)();
// ==================== API DOCUMENTATION (SWAGGER) ====================
// Commented out - swagger packages not installed
/*
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'NextBotics Fleet Management API',
      version: '1.0.0',
      description: 'REST API for fleet management system with vehicles, drivers, inventory, training, and more.',
      contact: {
        name: 'NextBotics Support',
        email: 'support@nextbotics.com'
      }
    },
    servers: [
      {
        url: process.env.API_BASE_URL || 'https://fleet-api-0272.onrender.com/api/v1',
        description: 'Production API'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        },
        apiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key'
        }
      }
    }
  },
  apis: ['./src/routes/api/v1/*.ts', './src/routes/*.ts']
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Serve Swagger UI
router.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Serve raw OpenAPI spec
router.get('/openapi.json', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});
*/
// ==================== API KEYS ====================
// Create API key (admin only)
router.post('/api-keys', auth_1.authenticateToken, (0, auth_1.requireRole)(['admin']), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { name, description, permissions, expiresInDays, rateLimitPerMinute } = req.body;
    if (!name) {
        throw errorHandler_1.Errors.BadRequest('Name is required');
    }
    const expiresAt = expiresInDays
        ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
        : undefined;
    const result = await apiKeyService.generateApiKey({
        id: undefined,
        keyPrefix: '',
        name,
        description,
        createdBy: req.user?.userId,
        expiresAt,
        permissions: permissions || ['read'],
        rateLimitPerMinute: rateLimitPerMinute || 60
    });
    res.status(201).json({
        message: 'API key created',
        id: result.id,
        key: result.key, // Only shown once!
        name
    });
}));
// List API keys (admin only)
router.get('/api-keys', auth_1.authenticateToken, (0, auth_1.requireRole)(['admin']), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const keys = await apiKeyService.getApiKeys();
    res.json(keys);
}));
// Revoke API key (admin only)
router.delete('/api-keys/:id', auth_1.authenticateToken, (0, auth_1.requireRole)(['admin']), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const success = await apiKeyService.revokeApiKey(req.params.id);
    if (!success) {
        throw errorHandler_1.Errors.NotFound('API key');
    }
    res.json({ message: 'API key revoked' });
}));
// Get API usage stats (admin only)
router.get('/api-keys/:id/usage', auth_1.authenticateToken, (0, auth_1.requireRole)(['admin']), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const days = parseInt(req.query.days) || 7;
    const stats = await apiKeyService.getApiUsageStats(req.params.id, days);
    res.json(stats);
}));
// ==================== WEBHOOKS ====================
// Create webhook (admin/manager)
router.post('/webhooks', auth_1.authenticateToken, (0, auth_1.requireRole)(['admin', 'manager']), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { name, url, events, headers } = req.body;
    if (!name || !url || !events || !Array.isArray(events)) {
        throw errorHandler_1.Errors.BadRequest('Name, URL, and events array are required');
    }
    // Validate URL
    try {
        new URL(url);
    }
    catch {
        throw errorHandler_1.Errors.BadRequest('Invalid URL format');
    }
    const result = await webhookService.createWebhook({
        name,
        url,
        events,
        createdBy: req.user?.userId || '',
        headers
    });
    res.status(201).json({
        message: 'Webhook created',
        webhook: result.webhook,
        secret: result.secret // Only shown once!
    });
}));
// List webhooks (admin/manager)
router.get('/webhooks', auth_1.authenticateToken, (0, auth_1.requireRole)(['admin', 'manager']), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const webhooks = await webhookService.getWebhooks();
    res.json(webhooks);
}));
// Update webhook (admin/manager)
router.put('/webhooks/:id', auth_1.authenticateToken, (0, auth_1.requireRole)(['admin', 'manager']), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const webhook = await webhookService.updateWebhook(req.params.id, req.body);
    if (!webhook) {
        throw errorHandler_1.Errors.NotFound('Webhook');
    }
    res.json(webhook);
}));
// Delete webhook (admin/manager)
router.delete('/webhooks/:id', auth_1.authenticateToken, (0, auth_1.requireRole)(['admin', 'manager']), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const success = await webhookService.deleteWebhook(req.params.id);
    if (!success) {
        throw errorHandler_1.Errors.NotFound('Webhook');
    }
    res.json({ message: 'Webhook deleted' });
}));
// Test webhook (admin/manager)
router.post('/webhooks/:id/test', auth_1.authenticateToken, (0, auth_1.requireRole)(['admin', 'manager']), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const result = await webhookService.testWebhook(req.params.id);
    res.json(result);
}));
// Get webhook logs (admin/manager)
router.get('/webhooks/:id/logs', auth_1.authenticateToken, (0, auth_1.requireRole)(['admin', 'manager']), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const limit = parseInt(req.query.limit) || 50;
    const logs = await webhookService.getWebhookLogs(req.params.id, limit);
    res.json(logs);
}));
// ==================== PUBLIC API (API KEY AUTH) ====================
// Get vehicles (public API)
router.get('/public/vehicles', (0, rateLimiter_1.apiKeyRateLimiter)(100), apiAuth_1.authenticateApiKey, (0, apiAuth_1.requireApiPermission)('read'), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const result = await (0, database_1.query)(`
      SELECT id, registration_num, make_model, status, department, branch, current_mileage
      FROM vehicles
      WHERE deleted_at IS NULL AND status = 'Active'
      ORDER BY registration_num
    `);
    res.json(result);
}));
// Get single vehicle (public API)
router.get('/public/vehicles/:id', (0, rateLimiter_1.apiKeyRateLimiter)(100), apiAuth_1.authenticateApiKey, (0, apiAuth_1.requireApiPermission)('read'), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const result = await (0, database_1.query)(`
      SELECT id, registration_num, make_model, status, department, branch, 
             current_mileage, next_service_due, year_of_manufacture
      FROM vehicles
      WHERE id = $1 AND deleted_at IS NULL
    `, [req.params.id]);
    if (!result || result.length === 0) {
        throw errorHandler_1.Errors.NotFound('Vehicle');
    }
    res.json(result[0]);
}));
// Get drivers (public API)
router.get('/public/drivers', (0, rateLimiter_1.apiKeyRateLimiter)(100), apiAuth_1.authenticateApiKey, (0, apiAuth_1.requireApiPermission)('read'), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const result = await (0, database_1.query)(`
      SELECT id, staff_name, email, phone, department, branch, role
      FROM staff
      WHERE deleted_at IS NULL AND role = 'Driver'
      ORDER BY staff_name
    `);
    res.json(result);
}));
// Create route entry (public API - write permission required)
router.post('/public/routes', (0, rateLimiter_1.apiKeyRateLimiter)(50), apiAuth_1.authenticateApiKey, (0, apiAuth_1.requireApiPermission)('write'), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { route_date, route_name, vehicle_id, actual_km, actual_fuel } = req.body;
    if (!route_date || !vehicle_id || !actual_km) {
        throw errorHandler_1.Errors.BadRequest('route_date, vehicle_id, and actual_km are required');
    }
    const result = await (0, database_1.query)(`
      INSERT INTO routes (id, route_date, route_name, vehicle_id, actual_km, actual_fuel, created_at)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
      RETURNING *
    `, [route_date, route_name || null, vehicle_id, actual_km, actual_fuel || null]);
    res.status(201).json(result[0]);
}));
// Record fuel transaction (public API - write permission required)
router.post('/public/fuel', (0, rateLimiter_1.apiKeyRateLimiter)(50), apiAuth_1.authenticateApiKey, (0, apiAuth_1.requireApiPermission)('write'), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { fuel_date, vehicle_id, quantity_liters, amount, current_mileage } = req.body;
    if (!fuel_date || !vehicle_id || !quantity_liters) {
        throw errorHandler_1.Errors.BadRequest('fuel_date, vehicle_id, and quantity_liters are required');
    }
    // Get past mileage for distance calculation
    const vehicleResult = await (0, database_1.query)('SELECT current_mileage FROM vehicles WHERE id = $1', [vehicle_id]);
    const pastMileage = vehicleResult[0]?.current_mileage || current_mileage || 0;
    const result = await (0, database_1.query)(`
      INSERT INTO fuel_records (id, fuel_date, vehicle_id, quantity_liters, amount, 
                               current_mileage, past_mileage, created_at)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
      RETURNING *
    `, [fuel_date, vehicle_id, quantity_liters, amount || null, current_mileage, pastMileage]);
    // Update vehicle mileage if newer
    if (current_mileage) {
        await (0, database_1.query)('UPDATE vehicles SET current_mileage = GREATEST(current_mileage, $1) WHERE id = $2', [current_mileage, vehicle_id]);
    }
    res.status(201).json(result[0]);
}));
// Report accident (public API - write permission required)
router.post('/public/accidents', (0, rateLimiter_1.apiKeyRateLimiter)(20), apiAuth_1.authenticateApiKey, (0, apiAuth_1.requireApiPermission)('write'), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { accident_date, vehicle_id, driver_id, location, description } = req.body;
    if (!accident_date || !vehicle_id || !description) {
        throw errorHandler_1.Errors.BadRequest('accident_date, vehicle_id, and description are required');
    }
    const result = await (0, database_1.query)(`
      INSERT INTO accidents (id, accident_date, vehicle_id, driver_id, location, 
                           description, status, created_at)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, 'Reported', CURRENT_TIMESTAMP)
      RETURNING *
    `, [accident_date, vehicle_id, driver_id || null, location || null, description]);
    // Trigger webhook
    await webhookService.triggerWebhook('accident.reported', result[0]);
    res.status(201).json(result[0]);
}));
// Get maintenance due (public API)
router.get('/public/maintenance/due', (0, rateLimiter_1.apiKeyRateLimiter)(100), apiAuth_1.authenticateApiKey, (0, apiAuth_1.requireApiPermission)('read'), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const days = parseInt(req.query.days) || 30;
    const result = await (0, database_1.query)(`
      SELECT id, registration_num, make_model, current_mileage, 
             next_service_due, last_service_date
      FROM vehicles
      WHERE deleted_at IS NULL
        AND (next_service_due IS NULL OR next_service_due <= CURRENT_DATE + INTERVAL '${days} days')
      ORDER BY next_service_due NULLS LAST
    `);
    res.json(result);
}));
// Webhook verification endpoint (public)
router.post('/public/webhooks/verify', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { payload, signature, secret } = req.body;
    if (!payload || !signature || !secret) {
        throw errorHandler_1.Errors.BadRequest('payload, signature, and secret are required');
    }
    const isValid = webhookService.verifySignature(payload, signature, secret);
    res.json({ valid: isValid });
}));
// ==================== USAGE STATS ====================
// Get overall API usage (admin only)
router.get('/usage', auth_1.authenticateToken, (0, auth_1.requireRole)(['admin']), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const days = parseInt(req.query.days) || 7;
    const stats = await apiKeyService.getApiUsageStats(undefined, days);
    res.json(stats);
}));
exports.default = router;
//# sourceMappingURL=integrations.js.map