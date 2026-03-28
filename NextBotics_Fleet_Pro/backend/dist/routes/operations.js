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
const operationsAI = __importStar(require("../services/operationsAI"));
const aiService = __importStar(require("../services/ai"));
const router = (0, express_1.Router)();
// Get live fleet status (for operations dashboard)
router.get('/live-status', auth_1.authenticateToken, (0, auth_1.requireRole)(['admin', 'manager', 'transport_supervisor', 'hod']), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const status = await operationsAI.getLiveFleetStatus();
    res.json(status);
}));
// Get fleet health summary with AI predictions
router.get('/fleet-health', auth_1.authenticateToken, (0, auth_1.requireRole)(['admin', 'manager', 'transport_supervisor', 'hod']), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const health = await operationsAI.getFleetHealthSummary();
    res.json(health);
}));
// Get specific vehicle health
router.get('/fleet-health/:vehicleId', auth_1.authenticateToken, (0, auth_1.requireRole)(['admin', 'manager', 'transport_supervisor', 'hod']), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const health = await operationsAI.analyzeVehicleHealth(req.params.vehicleId);
    if (!health) {
        throw errorHandler_1.Errors.NotFound('Vehicle health data');
    }
    res.json(health);
}));
// Route optimization endpoint
router.post('/optimize-route', auth_1.authenticateToken, (0, auth_1.requireRole)(['admin', 'manager', 'transport_supervisor']), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { stops, startLocation, endLocation, constraints } = req.body;
    if (!stops || !Array.isArray(stops) || stops.length === 0) {
        throw errorHandler_1.Errors.BadRequest('Stops array is required');
    }
    if (!startLocation || typeof startLocation.lat !== 'number') {
        throw errorHandler_1.Errors.BadRequest('Valid startLocation with lat/lng is required');
    }
    const optimization = await operationsAI.optimizeRoute({
        vehicleId: req.body.vehicleId,
        stops,
        startLocation,
        endLocation,
        constraints
    });
    res.json(optimization);
}));
// Get today's critical alerts
router.get('/alerts', auth_1.authenticateToken, (0, auth_1.requireRole)(['admin', 'manager', 'transport_supervisor', 'hod']), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { severity = 'all' } = req.query;
    // Get fleet health to generate alerts
    const health = await operationsAI.getFleetHealthSummary();
    const status = await operationsAI.getLiveFleetStatus();
    const alerts = [];
    // Generate alerts from health data
    for (const vehicle of health.atRiskVehicles) {
        if (vehicle.riskLevel === 'critical') {
            alerts.push({
                id: `health-${vehicle.vehicleId}`,
                type: 'maintenance',
                severity: 'critical',
                title: 'Critical Vehicle Health',
                message: `${vehicle.registrationNum} has health score of ${vehicle.healthScore}/100. ${vehicle.predictedIssues.join(', ')}`,
                vehicleId: vehicle.vehicleId,
                vehicleReg: vehicle.registrationNum,
                timestamp: new Date().toISOString(),
                actionRequired: true
            });
        }
        else if (vehicle.riskLevel === 'high') {
            alerts.push({
                id: `health-${vehicle.vehicleId}`,
                type: 'maintenance',
                severity: 'high',
                title: 'Vehicle Health Warning',
                message: `${vehicle.registrationNum} requires attention. ${vehicle.predictedIssues[0] || 'Check maintenance status'}`,
                vehicleId: vehicle.vehicleId,
                vehicleReg: vehicle.registrationNum,
                timestamp: new Date().toISOString(),
                actionRequired: true
            });
        }
    }
    // Add system alerts
    for (const alert of status.criticalAlerts) {
        if (parseInt(alert.count) > 0) {
            alerts.push({
                id: `system-${alert.type}`,
                type: alert.type,
                severity: alert.type === 'defective_vehicles' ? 'critical' : 'high',
                title: alert.title,
                message: `${alert.count} item(s) require attention`,
                timestamp: new Date().toISOString(),
                actionRequired: true
            });
        }
    }
    // Add recent accidents as alerts
    for (const accident of status.recentAccidents) {
        alerts.push({
            id: `accident-${accident.id}`,
            type: 'accident',
            severity: accident.severity === 'Fatal' ? 'critical' : accident.severity === 'Major' ? 'high' : 'medium',
            title: `Accident: ${accident.case_number}`,
            message: `${accident.registration_num} - Driver: ${accident.driver_name || 'N/A'}`,
            vehicleId: accident.vehicle_id,
            vehicleReg: accident.registration_num,
            timestamp: accident.accident_date,
            actionRequired: accident.status === 'Reported'
        });
    }
    // Filter by severity if requested
    let filtered = alerts;
    if (severity !== 'all') {
        filtered = alerts.filter(a => a.severity === severity);
    }
    // Sort by severity and timestamp
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    filtered.sort((a, b) => {
        const sevDiff = severityOrder[a.severity] - severityOrder[b.severity];
        return sevDiff !== 0 ? sevDiff : new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
    res.json({
        count: filtered.length,
        criticalCount: filtered.filter(a => a.severity === 'critical').length,
        highCount: filtered.filter(a => a.severity === 'high').length,
        alerts: filtered.slice(0, 20) // Limit to 20 most urgent
    });
}));
// Get AI recommendations for operations
router.get('/ai-recommendations', auth_1.authenticateToken, (0, auth_1.requireRole)(['admin', 'manager', 'transport_supervisor']), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    // Get AI-generated recommendations
    const aiRecommendations = await aiService.generateFleetRecommendations();
    // Get rule-based recommendations as fallback/enhancement
    const health = await operationsAI.getFleetHealthSummary();
    const status = await operationsAI.getLiveFleetStatus();
    const recommendations = [];
    // Add AI-generated recommendations
    aiRecommendations.forEach((rec, index) => {
        recommendations.push({
            category: 'AI Insight',
            priority: index < 2 ? 'high' : 'medium',
            title: rec.substring(0, 50) + (rec.length > 50 ? '...' : ''),
            description: rec,
            impact: 'Data-driven recommendation',
            action: 'Review and implement as appropriate',
            aiPowered: true
        });
    });
    // Fleet health recommendations
    if (health.critical > 0) {
        recommendations.push({
            category: 'Maintenance',
            priority: 'critical',
            title: `Address ${health.critical} Critical Vehicle(s)`,
            description: 'Vehicles with critical health scores require immediate attention to prevent breakdowns.',
            impact: 'Prevents costly roadside failures and delays',
            action: 'Schedule immediate inspections for critical vehicles'
        });
    }
    if (health.averageHealth < 70) {
        recommendations.push({
            category: 'Fleet Health',
            priority: 'high',
            title: 'Fleet Health Below Target',
            description: `Current fleet average health is ${health.averageHealth}/100. Consider implementing preventive maintenance program.`,
            impact: 'Improves vehicle reliability and reduces long-term costs',
            action: 'Review maintenance schedules and driver training programs'
        });
    }
    // Route efficiency recommendations
    const completedRoutes = status.todaysRoutes.filter((r) => r.status === 'Completed');
    const incompleteRoutes = status.todaysRoutes.filter((r) => r.status !== 'Completed');
    if (incompleteRoutes.length > completedRoutes.length && new Date().getHours() > 14) {
        recommendations.push({
            category: 'Operations',
            priority: 'high',
            title: 'Delayed Routes Detected',
            description: `${incompleteRoutes.length} routes are still pending after 2 PM.`,
            impact: 'Risk of missing delivery windows',
            action: 'Contact drivers for status updates, consider reallocation'
        });
    }
    // Pending requisitions
    if (status.summary.pendingRequisitions > 5) {
        recommendations.push({
            category: 'Workflow',
            priority: 'medium',
            title: 'Requisition Backlog',
            description: `${status.summary.pendingRequisitions} requisitions awaiting approval.`,
            impact: 'Delays in vehicle allocation',
            action: 'Review and approve pending requisitions'
        });
    }
    res.json({
        generatedAt: new Date().toISOString(),
        count: recommendations.length,
        aiEnabled: aiService.AI_ENABLED,
        recommendations: recommendations.sort((a, b) => {
            const priorityOrder = { critical: 0, high: 1, medium: 2 };
            return priorityOrder[a.priority] - priorityOrder[b.priority];
        })
    });
}));
// Get dashboard summary stats
router.get('/dashboard-summary', auth_1.authenticateToken, (0, auth_1.requireRole)(['admin', 'manager', 'transport_supervisor', 'hod']), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    // Weekly stats
    const weeklyStats = await (0, database_1.query)(`
      SELECT 
        COUNT(DISTINCT r.id) as total_routes,
        COUNT(DISTINCT CASE WHEN r.actual_km IS NOT NULL THEN r.id END) as completed_routes,
        COALESCE(SUM(r.actual_km), 0) as total_distance,
        COALESCE(SUM(fr.quantity_liters), 0) as total_fuel,
        COUNT(DISTINCT a.id) as accidents,
        COUNT(DISTINCT jc.id) as job_cards
      FROM routes r
      LEFT JOIN fuel_records fr ON fr.fuel_date = r.route_date AND fr.vehicle_id = r.vehicle_id
      LEFT JOIN accidents a ON a.accident_date::date = r.route_date
      LEFT JOIN job_cards jc ON DATE(jc.created_at) = r.route_date
      WHERE r.route_date >= CURRENT_DATE - INTERVAL '7 days'
    `);
    // Monthly trend
    const monthlyTrend = await (0, database_1.query)(`
      SELECT 
        DATE_TRUNC('day', route_date) as date,
        COUNT(*) as routes,
        COALESCE(SUM(actual_km), 0) as distance
      FROM routes
      WHERE route_date >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY DATE_TRUNC('day', route_date)
      ORDER BY date
    `);
    // Vehicle utilization
    const vehicleUtilization = await (0, database_1.query)(`
      SELECT 
        COUNT(DISTINCT CASE WHEN status = 'Active' THEN id END) as active,
        COUNT(DISTINCT CASE WHEN status = 'Defective' THEN id END) as defective,
        COUNT(DISTINCT CASE WHEN status = 'Maintenance' THEN id END) as maintenance,
        COUNT(*) as total
      FROM vehicles
      WHERE deleted_at IS NULL
    `);
    // Driver performance snapshot
    const driverPerformance = await (0, database_1.query)(`
      SELECT 
        d.staff_name,
        COUNT(r.id) as routes_this_week,
        COALESCE(SUM(r.actual_km), 0) as distance,
        AVG(r.actual_km) as avg_route_distance,
        d.safety_score
      FROM staff d
      LEFT JOIN routes r ON r.driver1_id = d.id AND r.route_date >= CURRENT_DATE - INTERVAL '7 days'
      WHERE d.role = 'Driver' AND d.deleted_at IS NULL
      GROUP BY d.id, d.staff_name, d.safety_score
      ORDER BY routes_this_week DESC
      LIMIT 10
    `);
    res.json({
        weekly: weeklyStats[0],
        monthlyTrend,
        vehicleUtilization: vehicleUtilization[0],
        topDrivers: driverPerformance
    });
}));
// ==================== ADVANCED AI FEATURES ====================
// Driver behavior analysis
router.get('/driver-behavior', auth_1.authenticateToken, (0, auth_1.requireRole)(['admin', 'manager', 'transport_supervisor', 'hod']), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { driverId } = req.query;
    const analysis = await aiService.analyzeDriverBehavior(driverId);
    res.json({
        aiEnabled: aiService.AI_ENABLED,
        analysis
    });
}));
// Anomaly detection
router.get('/anomalies', auth_1.authenticateToken, (0, auth_1.requireRole)(['admin', 'manager', 'transport_supervisor']), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const anomalies = await aiService.detectAnomalies();
    res.json({
        aiEnabled: aiService.AI_ENABLED,
        count: anomalies.length,
        anomalies
    });
}));
// Predictive cost analysis
router.get('/cost-forecast', auth_1.authenticateToken, (0, auth_1.requireRole)(['admin', 'manager', 'hod']), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { vehicleId } = req.query;
    const forecasts = await aiService.predictMaintenanceCosts(vehicleId);
    res.json({
        aiEnabled: aiService.AI_ENABLED,
        forecasts
    });
}));
// AI Chatbot
router.post('/chat', auth_1.authenticateToken, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: 'Messages array required' });
    }
    const response = await aiService.processChatQuery(messages);
    res.json({
        aiEnabled: aiService.AI_ENABLED,
        response
    });
}));
// Fleet Copilot - Advanced AI Assistant
router.post('/copilot', auth_1.authenticateToken, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { question } = req.body;
    if (!question || typeof question !== 'string') {
        return res.status(400).json({ error: 'Question string required' });
    }
    console.log('🤖 Fleet Copilot query from user:', req.user?.email);
    const response = await aiService.processFleetCopilotQuery(question);
    res.json({
        aiEnabled: aiService.AI_ENABLED,
        response
    });
}));
exports.default = router;
//# sourceMappingURL=operations.js.map