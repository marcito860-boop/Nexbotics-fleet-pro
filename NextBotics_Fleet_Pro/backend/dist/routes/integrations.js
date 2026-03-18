"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../utils/auth");
const database_1 = require("../database");
const router = (0, express_1.Router)();
router.use(auth_1.authMiddleware);
// ============================================
// INTEGRATION STATUS & CONFIG
// ============================================
// GET /api/fleet/integrations - List available integrations
router.get('/', async (req, res) => {
    try {
        const companyId = req.user.companyId;
        // Get configured integrations
        const rows = await (0, database_1.query)('SELECT * FROM integrations WHERE company_id = $1 AND is_active = true', [companyId]);
        const integrations = [
            {
                id: 'ai-quiz',
                name: 'AI Quiz Generation',
                type: 'ai',
                description: 'Auto-generate training quizzes from course content',
                status: 'available',
                configured: rows.some((r) => r.integration_type === 'ai'),
                features: ['Question generation', 'Difficulty adjustment', 'Answer verification'],
            },
            {
                id: 'erp-sync',
                name: 'ERP Integration',
                type: 'erp',
                description: 'Sync fleet data with your ERP system',
                status: 'available',
                configured: rows.some((r) => r.integration_type === 'erp'),
                features: ['Invoice sync', 'Inventory sync', 'Cost center mapping'],
            },
            {
                id: 'telematics',
                name: 'GPS Telematics',
                type: 'telematics',
                description: 'Real-time vehicle tracking and telemetry',
                status: 'available',
                configured: rows.some((r) => r.integration_type === 'telematics'),
                features: ['Live location', 'Route tracking', 'Geofencing', 'Speed alerts'],
            },
            {
                id: 'fuel-cards',
                name: 'Fuel Card Integration',
                type: 'fuel',
                description: 'Automatic fuel transaction imports',
                status: 'available',
                configured: rows.some((r) => r.integration_type === 'fuel'),
                features: ['Transaction sync', 'Anomaly detection', 'Spend limits'],
            },
            {
                id: 'maintenance-api',
                name: 'Maintenance Systems',
                type: 'maintenance',
                description: 'Connect to external maintenance providers',
                status: 'available',
                configured: rows.some((r) => r.integration_type === 'maintenance'),
                features: ['Work order sync', 'Parts ordering', 'Service scheduling'],
            },
        ];
        res.json({ success: true, data: integrations });
    }
    catch (error) {
        console.error('Error fetching integrations:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch integrations' });
    }
});
// GET /api/fleet/integrations/:type/config - Get integration config
router.get('/:type/config', async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { type } = req.params;
        const rows = await (0, database_1.query)('SELECT * FROM integrations WHERE company_id = $1 AND integration_type = $2', [companyId, type]);
        if (rows.length === 0) {
            return res.json({
                success: true,
                data: {
                    configured: false,
                    defaultConfig: getDefaultConfig(type),
                }
            });
        }
        // Return config without sensitive data
        const config = rows[0].config;
        const sanitizedConfig = { ...config };
        delete sanitizedConfig.apiKey;
        delete sanitizedConfig.password;
        delete sanitizedConfig.secret;
        res.json({
            success: true,
            data: {
                configured: true,
                config: sanitizedConfig,
                lastSync: rows[0].last_sync_at,
                status: rows[0].status,
            },
        });
    }
    catch (error) {
        console.error('Error fetching integration config:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch config' });
    }
});
// POST /api/fleet/integrations/:type/config - Save integration config
router.post('/:type/config', (0, auth_1.requireRole)(['admin']), async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const userId = req.user.userId;
        const { type } = req.params;
        const { config } = req.body;
        // Validate config
        const validation = validateIntegrationConfig(type, config);
        if (!validation.valid) {
            return res.status(400).json({ success: false, error: validation.message });
        }
        // Test connection
        const testResult = await testIntegrationConnection(type, config);
        if (!testResult.success) {
            return res.status(400).json({ success: false, error: `Connection failed: ${testResult.message}` });
        }
        // Upsert config
        const existing = await (0, database_1.query)('SELECT id FROM integrations WHERE company_id = $1 AND integration_type = $2', [companyId, type]);
        if (existing.length > 0) {
            await (0, database_1.query)(`UPDATE integrations SET 
         config = $1, is_active = true, status = 'connected', updated_by = $2, updated_at = NOW()
         WHERE id = $3`, [JSON.stringify(config), userId, existing[0].id]);
        }
        else {
            await (0, database_1.query)(`INSERT INTO integrations (company_id, integration_type, name, config, is_active, status, created_by)
         VALUES ($1, $2, $3, $4, true, 'connected', $5)`, [companyId, type, `${type} Integration`, JSON.stringify(config), userId]);
        }
        res.json({ success: true, message: 'Integration configured successfully' });
    }
    catch (error) {
        console.error('Error saving integration config:', error);
        res.status(500).json({ success: false, error: 'Failed to save config' });
    }
});
// POST /api/fleet/integrations/:type/sync - Trigger manual sync
router.post('/:type/sync', (0, auth_1.requireRole)(['admin', 'manager']), async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { type } = req.params;
        const rows = await (0, database_1.query)('SELECT * FROM integrations WHERE company_id = $1 AND integration_type = $2 AND is_active = true', [companyId, type]);
        if (rows.length === 0) {
            return res.status(400).json({ success: false, error: 'Integration not configured' });
        }
        // Trigger sync based on type
        const syncResult = await triggerSync(type, companyId, rows[0].config);
        // Update last sync time
        await (0, database_1.query)('UPDATE integrations SET last_sync_at = NOW(), status = $1 WHERE id = $2', [syncResult.success ? 'connected' : 'error', rows[0].id]);
        res.json({
            success: syncResult.success,
            data: syncResult,
        });
    }
    catch (error) {
        console.error('Error triggering sync:', error);
        res.status(500).json({ success: false, error: 'Failed to trigger sync' });
    }
});
// DELETE /api/fleet/integrations/:type - Disable integration
router.delete('/:type', (0, auth_1.requireRole)(['admin']), async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { type } = req.params;
        await (0, database_1.query)('UPDATE integrations SET is_active = false, status = $1 WHERE company_id = $2 AND integration_type = $3', ['disconnected', companyId, type]);
        res.json({ success: true, message: 'Integration disabled' });
    }
    catch (error) {
        console.error('Error disabling integration:', error);
        res.status(500).json({ success: false, error: 'Failed to disable integration' });
    }
});
// ============================================
// WEBHOOK ENDPOINTS
// ============================================
// POST /api/fleet/integrations/webhooks/fuel-card - Fuel card webhook
router.post('/webhooks/fuel-card', async (req, res) => {
    try {
        // Verify webhook signature
        const signature = req.headers['x-webhook-signature'];
        if (!verifyWebhookSignature(req.body, signature)) {
            return res.status(401).json({ error: 'Invalid signature' });
        }
        const { companyId, transactions } = req.body;
        // Process fuel transactions
        for (const txn of transactions) {
            await processFuelCardTransaction(companyId, txn);
        }
        res.json({ success: true, processed: transactions.length });
    }
    catch (error) {
        console.error('Fuel card webhook error:', error);
        res.status(500).json({ error: 'Processing failed' });
    }
});
// POST /api/fleet/integrations/webhooks/telematics - Telematics webhook
router.post('/webhooks/telematics', async (req, res) => {
    try {
        const signature = req.headers['x-webhook-signature'];
        if (!verifyWebhookSignature(req.body, signature)) {
            return res.status(401).json({ error: 'Invalid signature' });
        }
        const { companyId, telemetry } = req.body;
        // Store telemetry data
        for (const data of telemetry) {
            await (0, database_1.query)(`INSERT INTO gps_telemetry (company_id, vehicle_id, latitude, longitude, speed, 
         heading, altitude, accuracy, odometer, fuel_level, timestamp, ignition_status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`, [companyId, data.vehicleId, data.latitude, data.longitude, data.speed,
                data.heading, data.altitude, data.accuracy, data.odometer, data.fuelLevel,
                data.timestamp, data.ignitionStatus]);
        }
        res.json({ success: true, processed: telemetry.length });
    }
    catch (error) {
        console.error('Telematics webhook error:', error);
        res.status(500).json({ error: 'Processing failed' });
    }
});
// ============================================
// API DOCUMENTATION
// ============================================
// GET /api/fleet/integrations/docs - Get API documentation
router.get('/docs', async (req, res) => {
    res.json({
        success: true,
        data: {
            version: '1.0.0',
            baseUrl: '/api/fleet',
            authentication: {
                type: 'Bearer Token',
                header: 'Authorization: Bearer {token}',
            },
            endpoints: [
                { method: 'GET', path: '/vehicles', description: 'List vehicles' },
                { method: 'POST', path: '/vehicles', description: 'Create vehicle' },
                { method: 'GET', path: '/drivers', description: 'List drivers' },
                { method: 'GET', path: '/trips', description: 'List trips' },
                { method: 'GET', path: '/audits/templates', description: 'Get audit templates' },
                { method: 'POST', path: '/audits/sessions', description: 'Create audit session' },
                { method: 'GET', path: '/requisitions', description: 'List requisitions' },
                { method: 'POST', path: '/requisitions', description: 'Create requisition' },
                { method: 'GET', path: '/inventory/items', description: 'List inventory items' },
                { method: 'GET', path: '/invoices', description: 'List invoices' },
                { method: 'GET', path: '/analytics/dashboard', description: 'Get dashboard analytics' },
                { method: 'GET', path: '/reports/audits', description: 'Generate audit reports' },
            ],
            webhooks: [
                { event: 'fuel.transaction', description: 'New fuel card transaction' },
                { event: 'telematics.location', description: 'Vehicle location update' },
                { event: 'vehicle.alert', description: 'Vehicle alert triggered' },
            ],
        },
    });
});
// ============================================
// HELPER FUNCTIONS
// ============================================
function getDefaultConfig(type) {
    const configs = {
        ai: {
            provider: 'openai',
            model: 'gpt-4',
            maxQuestionsPerQuiz: 10,
            difficulty: 'adaptive',
        },
        erp: {
            provider: 'custom',
            syncFrequency: 'hourly',
            syncItems: ['invoices', 'inventory', 'cost_centers'],
        },
        telematics: {
            provider: 'geotab',
            updateInterval: 30,
            geofencing: true,
            alerts: ['speeding', 'geofence', 'idle'],
        },
        fuel: {
            provider: 'custom',
            autoImport: true,
            anomalyDetection: true,
        },
        maintenance: {
            provider: 'custom',
            autoCreateWorkOrders: true,
        },
    };
    return configs[type] || {};
}
function validateIntegrationConfig(type, config) {
    switch (type) {
        case 'telematics':
            if (!config.apiKey)
                return { valid: false, message: 'API key is required' };
            if (!config.provider)
                return { valid: false, message: 'Provider is required' };
            break;
        case 'fuel':
            if (!config.provider)
                return { valid: false, message: 'Provider is required' };
            break;
        case 'erp':
            if (!config.endpoint)
                return { valid: false, message: 'Endpoint URL is required' };
            break;
    }
    return { valid: true };
}
async function testIntegrationConnection(type, config) {
    // Simulate connection test
    return { success: true };
}
async function triggerSync(type, companyId, config) {
    switch (type) {
        case 'fuel':
            // Simulate fuel card sync
            return { success: true, itemsSynced: 15, message: 'Fuel transactions synced' };
        case 'telematics':
            // Simulate telematics sync
            return { success: true, itemsSynced: 120, message: 'Telemetry records synced' };
        default:
            return { success: true, itemsSynced: 0 };
    }
}
function verifyWebhookSignature(body, signature) {
    // In production, implement proper HMAC verification
    return true;
}
async function processFuelCardTransaction(companyId, txn) {
    // Find vehicle by card number or registration
    const vehicle = await (0, database_1.query)(`SELECT v.id FROM vehicles v
     JOIN fuel_cards fc ON fc.vehicle_id = v.id
     WHERE fc.card_number = $1 AND v.company_id = $2`, [txn.cardNumber, companyId]);
    if (vehicle.length === 0)
        return;
    // Create fuel transaction
    await (0, database_1.query)(`INSERT INTO fuel_transactions (company_id, vehicle_id, transaction_date, 
     station_name, liters, price_per_liter, total_cost, odometer_reading, receipt_number)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT (receipt_number) DO NOTHING`, [companyId, vehicle[0].id, txn.timestamp, txn.station, txn.liters,
        txn.pricePerLiter, txn.totalCost, txn.odometer, txn.receiptNumber]);
}
exports.default = router;
//# sourceMappingURL=integrations.js.map