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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const dotenv_1 = __importDefault(require("dotenv"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const database_1 = require("./database");
const auth_1 = require("./middleware/auth");
const logger_1 = require("./middleware/logger");
const rateLimiter_1 = require("./middleware/rateLimiter");
const errorHandler_1 = require("./middleware/errorHandler");
// Import routes
const auth_2 = __importDefault(require("./routes/auth"));
const vehicles_1 = __importDefault(require("./routes/vehicles"));
const staff_1 = __importDefault(require("./routes/staff"));
const routes_1 = __importDefault(require("./routes/routes"));
const fuel_1 = __importDefault(require("./routes/fuel"));
const repairs_1 = __importDefault(require("./routes/repairs"));
const upload_1 = __importDefault(require("./routes/upload"));
const dashboard_1 = __importDefault(require("./routes/dashboard"));
const admin_1 = __importDefault(require("./routes/admin"));
const analytics_1 = __importDefault(require("./routes/analytics"));
const requisitions_1 = __importDefault(require("./routes/requisitions"));
const accidents_1 = __importDefault(require("./routes/accidents"));
const audits_1 = __importDefault(require("./routes/audits"));
const training_1 = __importDefault(require("./routes/training"));
const audit_schedules_1 = __importDefault(require("./routes/audit-schedules"));
const integrations_1 = __importDefault(require("./routes/integrations"));
const integration_providers_1 = __importDefault(require("./routes/integration-providers"));
const settings_1 = __importDefault(require("./routes/settings"));
const operations_1 = __importDefault(require("./routes/operations"));
const workshop_1 = __importDefault(require("./routes/workshop"));
const riskIntelligence_1 = __importDefault(require("./routes/riskIntelligence"));
const photos_1 = __importDefault(require("./routes/photos"));
const webhooks_1 = __importDefault(require("./routes/webhooks"));
const inspections_1 = __importDefault(require("./routes/inspections"));
const v1_1 = __importDefault(require("./routes/api/v1"));
const seed_demo_1 = __importDefault(require("./routes/seed-demo"));
const operationsAI = __importStar(require("./services/operationsAI"));
dotenv_1.default.config();
// Debug: Log environment variables (without secrets)
console.log('🔧 Environment Check:');
console.log('  DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'NOT SET');
console.log('  JWT_SECRET:', process.env.JWT_SECRET ? 'Set' : 'NOT SET');
console.log('  FRONTEND_URL:', process.env.FRONTEND_URL || 'Not set (using *)');
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: process.env.FRONTEND_URL || "*",
        methods: ["GET", "POST"]
    }
});
exports.io = io;
const PORT = process.env.PORT || 3001;
// Security middleware
app.use((0, helmet_1.default)({
    contentSecurityPolicy: false, // Disable for API
    crossOriginEmbedderPolicy: false
}));
// CORS configuration - allow multiple origins
const allowedOrigins = [
    process.env.FRONTEND_URL,
    'https://masaitrevis.github.io',
    'https://masaitrevis.github.io/fleet-system',
    'https://fleet-pro-git-master-masaitrevis-projects.vercel.app',
    'https://fleet-pro.vercel.app'
].filter(Boolean);
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl, etc.)
        if (!origin)
            return callback(null, true);
        // Allow all localhost for development
        if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
            return callback(null, true);
        }
        // Check against allowed origins
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        // Allow all Vercel preview deployments (for mobile testing)
        if (origin.includes('vercel.app')) {
            return callback(null, true);
        }
        // Log rejected origins for debugging (but don't crash)
        console.log('🚫 CORS rejected origin:', origin);
        console.log('📋 Allowed origins:', allowedOrigins);
        callback(null, true); // Temporarily allow all for debugging
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
    credentials: true
}));
// Compression
app.use((0, compression_1.default)());
// Body parsing
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// Request logging (adds requestId)
app.use(logger_1.requestLogger);
// Rate limiting for all routes
app.use((0, rateLimiter_1.rateLimiter)({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 200
}));
// Socket.io connection
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});
// Make io accessible to routes
app.locals.io = io;
// Handle OPTIONS preflight for all routes (important for mobile)
app.options('*', (0, cors_1.default)());
// Health check (public)
app.get('/', (req, res) => {
    res.json({ status: 'ok', message: 'Fleet API is running', timestamp: new Date().toISOString() });
});
app.get('/api/health', async (req, res) => {
    let dbStatus = 'unknown';
    let adminUser = null;
    try {
        const { query } = await Promise.resolve().then(() => __importStar(require('./database')));
        const result = await query('SELECT COUNT(*) as count FROM users');
        dbStatus = 'connected';
        const adminResult = await query('SELECT email, role FROM users WHERE email = $1', ['admin@fleet.local']);
        adminUser = adminResult.length > 0 ? adminResult[0] : null;
    }
    catch (err) {
        dbStatus = 'error: ' + err.message;
    }
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        database: dbStatus,
        adminUser: adminUser ? { email: adminUser.email, role: adminUser.role } : null
    });
});
// Demo data seeder (public endpoint)
app.use('/api/seed-demo', seed_demo_1.default);
// Public routes
app.use('/api/auth', rateLimiter_1.authRateLimiter, auth_2.default);
// Protected routes
app.use('/api/vehicles', auth_1.authenticateToken, vehicles_1.default);
app.use('/api/staff', auth_1.authenticateToken, staff_1.default);
app.use('/api/routes', auth_1.authenticateToken, routes_1.default);
app.use('/api/fuel', auth_1.authenticateToken, fuel_1.default);
app.use('/api/repairs', auth_1.authenticateToken, repairs_1.default);
app.use('/api/upload', auth_1.authenticateToken, upload_1.default);
app.use('/api/dashboard', auth_1.authenticateToken, dashboard_1.default);
app.use('/api/admin', auth_1.authenticateToken, admin_1.default);
app.use('/api/analytics', auth_1.authenticateToken, analytics_1.default);
app.use('/api/requisitions', auth_1.authenticateToken, requisitions_1.default);
app.use('/api/accidents', auth_1.authenticateToken, accidents_1.default);
app.use('/api/audits', auth_1.authenticateToken, audits_1.default);
app.use('/api/training', auth_1.authenticateToken, training_1.default);
app.use('/api/audit-schedules', auth_1.authenticateToken, audit_schedules_1.default);
// Integration routes (includes public API with API key auth)
app.use('/api/integrations', integrations_1.default);
// Integration providers (ERP, telematics, fuel cards, etc.)
app.use('/api/integrations/providers', auth_1.authenticateToken, integration_providers_1.default);
// Settings routes
app.use('/api/settings', auth_1.authenticateToken, settings_1.default);
// Operations routes (AI features, live status, fleet health)
app.use('/api/operations', auth_1.authenticateToken, operations_1.default);
// Workshop routes (stock, invoices, workshop management)
app.use('/api/workshop', auth_1.authenticateToken, workshop_1.default);
// Risk Intelligence routes (AI-powered fleet risk analysis)
app.use('/api/risk-intelligence', auth_1.authenticateToken, riskIntelligence_1.default);
// Photo evidence routes (audit & inspection photos)
app.use('/api/photos', auth_1.authenticateToken, photos_1.default);
// Webhook management routes
app.use('/api/webhooks', auth_1.authenticateToken, webhooks_1.default);
// Vehicle Inspection routes
app.use('/api/inspections', auth_1.authenticateToken, inspections_1.default);
// REST API v1 (with API key auth support)
app.use('/api/v1', v1_1.default);
// Static file serving for uploads
app.use('/uploads', express_1.default.static(process.env.UPLOAD_DIR || './uploads'));
// Error logging (before error handler)
app.use(logger_1.errorLogger);
// 404 handler
app.use(errorHandler_1.notFoundHandler);
// Global error handler
app.use(errorHandler_1.errorHandler);
// Start server
const startServer = async () => {
    try {
        await (0, database_1.initDatabase)();
        // Run migrations but don't crash on failure
        try {
            await (0, database_1.runMigrations)();
        }
        catch (migrationError) {
            console.error('⚠️  Migration failed but continuing:', migrationError.message);
            // Continue starting server even if migrations fail
        }
        httpServer.listen(PORT, () => {
            console.log(`🚀 Fleet API + WebSocket running on http://localhost:${PORT}`);
            console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`🔒 JWT Secret: ${process.env.JWT_SECRET ? 'Configured' : 'NOT SET'}`);
            console.log(`🤖 Operations AI: Enabled`);
        });
        // Broadcast operations updates every 30 seconds
        setInterval(() => {
            operationsAI.broadcastOperationsUpdate().catch(console.error);
        }, 30000);
    }
    catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};
startServer();
// Render deploy trigger: Sat Mar 28 03:38:10 PM CST 2026
//# sourceMappingURL=index.js.map