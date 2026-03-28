"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = require("../database");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const uuid_1 = require("uuid");
const router = (0, express_1.Router)();
// GET /api/health/db - Check database status (no auth)
router.get('/db', async (req, res) => {
    const checks = {};
    try {
        // Check if we can connect
        await (0, database_1.query)('SELECT 1');
        checks.databaseConnection = 'OK';
        // Check if tables exist
        const tables = await (0, database_1.query)(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
        checks.tablesFound = tables.map((t) => t.table_name);
        // Check companies
        const companies = await (0, database_1.query)('SELECT COUNT(*) as count FROM companies');
        checks.companiesCount = parseInt(companies[0].count);
        // Check users
        const users = await (0, database_1.query)('SELECT COUNT(*) as count FROM users');
        checks.usersCount = parseInt(users[0].count);
        res.json({
            success: true,
            status: 'healthy',
            checks
        });
    }
    catch (error) {
        checks.error = error.message;
        res.status(500).json({
            success: false,
            status: 'unhealthy',
            checks
        });
    }
});
// POST /api/health/reset-db - Initialize database with emergency user (no auth)
router.post('/reset-db', async (req, res) => {
    try {
        // 1. Create companies table if not exists
        await (0, database_1.query)(`
      CREATE TABLE IF NOT EXISTS companies (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(100) UNIQUE NOT NULL,
        subscription_plan VARCHAR(50) DEFAULT 'basic',
        subscription_status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
        // 2. Create users table if not exists
        await (0, database_1.query)(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
        email VARCHAR(255) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        role VARCHAR(50) DEFAULT 'staff',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(company_id, email)
      )
    `);
        // 3. Clean and create emergency company
        await (0, database_1.query)("DELETE FROM companies WHERE slug = 'emergency'");
        const companyId = (0, uuid_1.v4)();
        await (0, database_1.query)(`INSERT INTO companies (id, name, slug, subscription_plan, subscription_status)
       VALUES ($1, $2, $3, $4, $5)`, [companyId, 'Emergency Test', 'emergency', 'basic', 'active']);
        // 4. Clean and create emergency user
        await (0, database_1.query)("DELETE FROM users WHERE email = 'emergency@fleet.com'");
        const passwordHash = await bcryptjs_1.default.hash('test123', 10);
        await (0, database_1.query)(`INSERT INTO users (id, company_id, email, password_hash, first_name, last_name, role, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`, [(0, uuid_1.v4)(), companyId, 'emergency@fleet.com', passwordHash, 'Emergency', 'Test', 'manager', true]);
        res.json({
            success: true,
            message: 'Database initialized with emergency user',
            credentials: {
                email: 'emergency@fleet.com',
                password: 'test123',
                companySlug: 'emergency'
            }
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
// GET /api/health/tables - Show all tables
router.get('/tables', async (req, res) => {
    try {
        const tables = await (0, database_1.query)(`
      SELECT table_name, column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position
    `);
        const grouped = {};
        tables.forEach((row) => {
            if (!grouped[row.table_name])
                grouped[row.table_name] = [];
            grouped[row.table_name].push(`${row.column_name} (${row.data_type})`);
        });
        res.json({ success: true, tables: grouped });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
exports.default = router;
//# sourceMappingURL=health.js.map