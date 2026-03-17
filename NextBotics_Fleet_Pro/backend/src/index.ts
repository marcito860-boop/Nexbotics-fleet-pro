import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import routes
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import companyRoutes from './routes/companies';
import vehicleRoutes from './routes/vehicles';
import driverRoutes from './routes/drivers';
import assignmentRoutes from './routes/assignments';
import alertRoutes from './routes/alerts';
import tripRoutes from './routes/trips';
import fuelRoutes from './routes/fuel';
import requisitionRoutes from './routes/requisitions';
import trainingRoutes from './routes/training';
import auditRoutes from './routes/audits';
import riskRoutes from './routes/risks';
import inventoryRoutes from './routes/inventory';
import analyticsRoutes from './routes/analytics';
import reportRoutes from './routes/reports';
import invoiceRoutes from './routes/invoices';
import importExportRoutes from './routes/importExport';
import integrationRoutes from './routes/integrations';
import supplierRoutes from './routes/suppliers';
import documentRoutes from './routes/documents';
import routePlanningRoutes from './routes/routePlanning';

// GraphQL
import { createHandler } from 'graphql-http/lib/use/express';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { typeDefs } from './graphql/schema';
import { resolvers } from './graphql/resolvers';
import { authMiddleware } from './utils/auth';

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL 
    : ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/companies', companyRoutes);

// Fleet management routes
app.use('/api/fleet/vehicles', vehicleRoutes);
app.use('/api/fleet/drivers', driverRoutes);
app.use('/api/fleet/assignments', assignmentRoutes);
app.use('/api/fleet/alerts', alertRoutes);
app.use('/api/fleet/trips', tripRoutes);
app.use('/api/fleet/fuel', fuelRoutes);
app.use('/api/fleet/requisitions', requisitionRoutes);
app.use('/api/fleet/training', trainingRoutes);
app.use('/api/fleet/audits', auditRoutes);
app.use('/api/fleet/risks', riskRoutes);
app.use('/api/fleet/inventory', inventoryRoutes);
app.use('/api/fleet/analytics', analyticsRoutes);
app.use('/api/fleet/reports', reportRoutes);
app.use('/api/fleet/invoices', invoiceRoutes);
app.use('/api/fleet/import', importExportRoutes);
app.use('/api/fleet/integrations', integrationRoutes);
app.use('/api/fleet/suppliers', supplierRoutes);
app.use('/api/fleet/documents', documentRoutes);
app.use('/api/fleet/routes', routePlanningRoutes);

// GraphQL endpoint
const schema = makeExecutableSchema({ typeDefs, resolvers });
app.use('/graphql', authMiddleware, createHandler({
  schema,
  context: (req: any) => ({ user: req.raw.user }),
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
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
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

export default app;
