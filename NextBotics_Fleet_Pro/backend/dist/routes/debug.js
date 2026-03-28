"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = require("../database");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const Company_1 = require("../models/Company");
const router = (0, express_1.Router)();
// GET /api/debug/users - List all users
router.get('/users', async (req, res) => {
    try {
        const users = await (0, database_1.query)('SELECT id, email, first_name, last_name, role, is_active, company_id FROM users LIMIT 20');
        res.json({
            success: true,
            count: users.length,
            users: users
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// GET /api/debug/companies - List all companies
router.get('/companies', async (req, res) => {
    try {
        const companies = await (0, database_1.query)('SELECT id, name, slug, email FROM companies LIMIT 20');
        res.json({
            success: true,
            count: companies.length,
            companies: companies
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// POST /api/debug/trace-login - Trace through login step by step
router.post('/trace-login', async (req, res) => {
    try {
        const { email, password, companySlug } = req.body;
        const trace = { steps: [] };
        trace.input = { email, companySlug, passwordProvided: !!password };
        // Step 1: Check if company exists
        let company = null;
        if (companySlug) {
            company = await Company_1.CompanyModel.findBySlug(companySlug);
            trace.steps.push({
                step: 'findCompanyBySlug',
                slug: companySlug,
                found: !!company,
                companyId: company?.id
            });
        }
        if (!company && email) {
            company = await Company_1.CompanyModel.findByEmail(email);
            trace.steps.push({
                step: 'findCompanyByEmail',
                email,
                found: !!company,
                companyId: company?.id
            });
        }
        if (!company) {
            // List available companies for debugging
            const allCompanies = await (0, database_1.query)('SELECT slug, name FROM companies LIMIT 10');
            trace.steps.push({
                step: 'noCompanyFound',
                availableCompanies: allCompanies.map((c) => ({ slug: c.slug, name: c.name }))
            });
            return res.json({ success: false, trace, error: 'Company not found' });
        }
        // Step 2: Find user by email in company
        const userRows = await (0, database_1.query)('SELECT * FROM users WHERE email = $1 AND company_id = $2', [email.toLowerCase(), company.id]);
        trace.steps.push({
            step: 'findUser',
            email: email.toLowerCase(),
            companyId: company.id,
            found: userRows.length > 0
        });
        if (userRows.length === 0) {
            // Check if user exists in ANY company
            const anyUser = await (0, database_1.query)('SELECT email, company_id FROM users WHERE email = $1', [email.toLowerCase()]);
            trace.steps.push({
                step: 'checkAnyCompany',
                foundInOtherCompanies: anyUser.length,
                otherCompanies: anyUser.map((u) => ({ companyId: u.company_id }))
            });
            return res.json({ success: false, trace, error: 'User not found in this company' });
        }
        const user = userRows[0];
        trace.user = {
            id: user.id,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            role: user.role,
            isActive: user.is_active,
            hasPasswordHash: !!user.password_hash,
            passwordHashLength: user.password_hash?.length
        };
        // Step 3: Verify password
        const passwordValid = await bcryptjs_1.default.compare(password, user.password_hash);
        trace.steps.push({
            step: 'verifyPassword',
            valid: passwordValid,
            passwordProvided: password,
            hashPrefix: user.password_hash?.substring(0, 20) + '...'
        });
        if (!passwordValid) {
            // Try to debug password issue
            const testHash = await bcryptjs_1.default.hash(password, 10);
            trace.steps.push({
                step: 'generateTestHash',
                testHash: testHash.substring(0, 30) + '...',
                originalHashPrefix: user.password_hash?.substring(0, 30) + '...'
            });
            // Check if it's a plaintext password issue
            trace.steps.push({
                step: 'plaintextCheck',
                storedEqualsProvided: user.password_hash === password
            });
            return res.json({ success: false, trace, error: 'Invalid password' });
        }
        // Step 4: Check if user is active
        trace.steps.push({
            step: 'checkActive',
            isActive: user.is_active
        });
        if (!user.is_active) {
            return res.json({ success: false, trace, error: 'User is not active' });
        }
        trace.steps.push({ step: 'success' });
        res.json({
            success: true,
            trace,
            user: {
                id: user.id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                role: user.role
            }
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message, stack: error.stack });
    }
});
// POST /api/debug/create-working-user - Create a guaranteed working user
router.post('/create-working-user', async (req, res) => {
    try {
        const { v4: uuidv4 } = require('uuid');
        // 1. Create company
        const companyId = uuidv4();
        await (0, database_1.query)(`INSERT INTO companies (id, name, slug, subscription_plan, subscription_status)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (slug) DO UPDATE SET name = $2
       RETURNING id`, [companyId, 'Debug Company', 'debug', 'basic', 'active']);
        // Get the company ID (in case of conflict)
        const companyResult = await (0, database_1.query)('SELECT id FROM companies WHERE slug = $1', ['debug']);
        const actualCompanyId = companyResult[0].id;
        // 2. Delete old debug user
        await (0, database_1.query)("DELETE FROM users WHERE email = 'test@debug.com'");
        // 3. Create user with known password hash
        // Using bcrypt hash for 'test123'
        const passwordHash = '$2a$10$N9qo8uLOickgx2ZMRZoMy.MqrqQzBZN0UfGNEsKYGsFqPpP9QNXTG'; // hash for 'test123'
        const userId = uuidv4();
        await (0, database_1.query)(`INSERT INTO users (id, company_id, email, password_hash, first_name, last_name, role, is_active, must_change_password)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`, [userId, actualCompanyId, 'test@debug.com', passwordHash, 'Test', 'User', 'manager', true, false]);
        // 4. Verify the user was created
        const verifyUser = await (0, database_1.query)('SELECT * FROM users WHERE email = $1', ['test@debug.com']);
        // 5. Test password
        const passwordValid = await bcryptjs_1.default.compare('test123', verifyUser[0].password_hash);
        res.json({
            success: true,
            credentials: {
                email: 'test@debug.com',
                password: 'test123',
                companySlug: 'debug'
            },
            user: {
                id: verifyUser[0].id,
                email: verifyUser[0].email,
                firstName: verifyUser[0].first_name,
                lastName: verifyUser[0].last_name,
                role: verifyUser[0].role,
                companyId: verifyUser[0].company_id
            },
            passwordTest: passwordValid,
            message: 'Use these credentials to test login'
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// POST /api/debug/test-bcrypt - Test bcrypt directly
router.post('/test-bcrypt', async (req, res) => {
    try {
        const { password } = req.body;
        // Generate hash
        const hash = await bcryptjs_1.default.hash(password, 10);
        // Verify immediately
        const valid = await bcryptjs_1.default.compare(password, hash);
        res.json({
            success: true,
            password,
            hash,
            hashValid: valid
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
exports.default = router;
//# sourceMappingURL=debug.js.map