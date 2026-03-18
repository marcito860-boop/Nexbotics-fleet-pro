"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables
dotenv_1.default.config();
// Import routes
const auth_1 = __importDefault(require("./routes/auth"));
const users_1 = __importDefault(require("./routes/users"));
const companies_1 = __importDefault(require("./routes/companies"));
const vehicles_1 = __importDefault(require("./routes/vehicles"));
const drivers_1 = __importDefault(require("./routes/drivers"));
const assignments_1 = __importDefault(require("./routes/assignments"));
const alerts_1 = __importDefault(require("./routes/alerts"));
const trips_1 = __importDefault(require("./routes/trips"));
const fuel_1 = __importDefault(require("./routes/fuel"));
const requisitions_1 = __importDefault(require("./routes/requisitions"));
const training_1 = __importDefault(require("./routes/training"));
const audits_1 = __importDefault(require("./routes/audits"));
const risks_1 = __importDefault(require("./routes/risks"));
const inventory_1 = __importDefault(require("./routes/inventory"));
const analytics_1 = __importDefault(require("./routes/analytics"));
const reports_1 = __importDefault(require("./routes/reports"));
const invoices_1 = __importDefault(require("./routes/invoices"));
const importExport_1 = __importDefault(require("./routes/importExport"));
const integrations_1 = __importDefault(require("./routes/integrations"));
const suppliers_1 = __importDefault(require("./routes/suppliers"));
const documents_1 = __importDefault(require("./routes/documents"));
const routePlanning_1 = __importDefault(require("./routes/routePlanning"));
const maintenance_1 = __importDefault(require("./routes/maintenance"));
// GraphQL
const express_2 = require("graphql-http/lib/use/express");
const schema_1 = require("@graphql-tools/schema");
const schema_2 = require("./graphql/schema");
const resolvers_1 = require("./graphql/resolvers");
const auth_2 = require("./utils/auth");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
// Security middleware
app.use((0, helmet_1.default)());
// CORS configuration
const allowedOrigins = process.env.NODE_ENV === 'production'
    ? [
        process.env.FRONTEND_URL,
        'https://nexbotics-fleet-pro.vercel.app',
        'https://nexbotics-fleet-pro-git-master-marcito860-boops-projects.vercel.app',
        'https://nexbotics-fleet-9lcc234lf-marcito860-boops-projects.vercel.app',
        'https://nexbotics-fleet-nrg4z6gbo-marcito860-boops-projects.vercel.app',
        'https://nexbotics-fleet-ep4p7uwec-marcito860-boops-projects.vercel.app',
        'https://nexbotics-fleet-5fc0db38d-marcito860-boops-projects.vercel.app'
    ].filter((url) => !!url)
    : ['http://localhost:5173', 'http://localhost:3000'];
app.use((0, cors_1.default)({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
// Body parsing
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
// API routes
app.use('/api/auth', auth_1.default);
app.use('/api/users', users_1.default);
app.use('/api/companies', companies_1.default);
// Fleet management routes
app.use('/api/fleet/vehicles', vehicles_1.default);
app.use('/api/fleet/drivers', drivers_1.default);
app.use('/api/fleet/assignments', assignments_1.default);
app.use('/api/fleet/alerts', alerts_1.default);
app.use('/api/fleet/trips', trips_1.default);
app.use('/api/fleet/fuel', fuel_1.default);
app.use('/api/fleet/requisitions', requisitions_1.default);
app.use('/api/fleet/training', training_1.default);
app.use('/api/fleet/audits', audits_1.default);
app.use('/api/fleet/risks', risks_1.default);
app.use('/api/fleet/inventory', inventory_1.default);
app.use('/api/fleet/analytics', analytics_1.default);
app.use('/api/fleet/reports', reports_1.default);
app.use('/api/fleet/invoices', invoices_1.default);
app.use('/api/fleet/import', importExport_1.default);
app.use('/api/fleet/integrations', integrations_1.default);
app.use('/api/fleet/suppliers', suppliers_1.default);
app.use('/api/fleet/documents', documents_1.default);
app.use('/api/fleet/routes', routePlanning_1.default);
app.use('/api/fleet/maintenance', maintenance_1.default);
// Integrations and Settings routes
const integration_providers_1 = __importDefault(require("./routes/integration-providers"));
const settings_1 = __importDefault(require("./routes/settings"));
const admin_1 = __importDefault(require("./routes/admin"));
app.use('/api/fleet/integration-providers', integration_providers_1.default);
app.use('/api/settings', settings_1.default);
app.use('/api/admin', admin_1.default);
// Demo data seeder (no auth required)
const seed_demo_1 = __importDefault(require("./routes/seed-demo"));
app.use('/api', seed_demo_1.default);
// GraphQL endpoint
const schema = (0, schema_1.makeExecutableSchema)({ typeDefs: schema_2.typeDefs, resolvers: resolvers_1.resolvers });
app.use('/graphql', auth_2.authMiddleware, (0, express_2.createHandler)({
    schema,
    context: (req) => ({ user: req.raw.user }),
}));
// Root endpoint
app.get('/', (req, res) => {
    res.json({
        name: 'NextBotics Fleet Pro API',
        version: '1.0.0',
        status: 'running',
        modules: [
            'auth',
            'users',
            'companies',
            'fleet:vehicles',
            'fleet:drivers',
            'fleet:assignments',
            'fleet:alerts',
            'fleet:trips',
            'fleet:fuel',
            'fleet:requisitions',
            'fleet:training',
            'fleet:audits',
            'fleet:risks',
            'fleet:inventory',
            'fleet:analytics',
            'fleet:reports',
            'fleet:invoices',
            'fleet:import-export',
            'fleet:integrations',
            'fleet:suppliers',
            'fleet:documents',
            'fleet:route-planning',
            'fleet:maintenance',
            'graphql'
        ]
    });
});
// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found'
    });
});
// Error handler
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        success: false,
        error: 'Internal server error'
    });
});
// Start server
app.listen(PORT, () => {
    console.log(`🚀 NextBotics Fleet Pro API running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
});
exports.default = app;
// Build timestamp: Wed Mar 18 03:44:20 AM CST 2026
// Redeploy trigger Wed Mar 18 04:40:56 PM CST 2026
// Force redeploy 1773823487
//# sourceMappingURL=index.js.map