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
const express_validator_1 = require("express-validator");
const database_1 = require("../database");
const Company_1 = require("../models/Company");
const auth_1 = require("../utils/auth");
const password_1 = require("../utils/password");
const uuid_1 = require("uuid");
const bcrypt = __importStar(require("bcryptjs"));
const router = (0, express_1.Router)();
router.use(auth_1.authMiddleware);
// GET /api/companies - List companies (super admin only, or current company for regular users)
router.get('/', async (req, res) => {
    try {
        const isSuperAdmin = req.user.type === 'super_admin';
        if (isSuperAdmin) {
            const page = parseInt(req.query.page) || 1;
            const perPage = parseInt(req.query.perPage) || 20;
            const offset = (page - 1) * perPage;
            const { companies, total } = await Company_1.CompanyModel.findAll({
                limit: perPage,
                offset
            });
            // Get stats for each company
            const companiesWithStats = await Promise.all(companies.map(async (company) => ({
                ...company,
                stats: await Company_1.CompanyModel.getStats(company.id)
            })));
            return res.json({
                success: true,
                data: {
                    items: companiesWithStats,
                    total,
                    page,
                    perPage,
                    totalPages: Math.ceil(total / perPage)
                }
            });
        }
        // Regular users - return only their company
        const company = await Company_1.CompanyModel.findById(req.user.companyId);
        if (!company) {
            return res.status(404).json({ success: false, error: 'Company not found' });
        }
        const stats = await Company_1.CompanyModel.getStats(company.id);
        res.json({
            success: true,
            data: {
                items: [{ ...company, stats }],
                total: 1,
                page: 1,
                perPage: 1,
                totalPages: 1
            }
        });
    }
    catch (error) {
        console.error('List companies error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch companies'
        });
    }
});
// GET /api/companies/:id - Get company by ID
router.get('/:id', [
    (0, express_validator_1.param)('id').isUUID().withMessage('Valid company ID required')
], async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            error: 'Validation failed',
            details: errors.array()
        });
    }
    try {
        const { id } = req.params;
        const isSuperAdmin = req.user.type === 'super_admin';
        // Regular users can only view their own company
        if (!isSuperAdmin && id !== req.user.companyId) {
            return res.status(403).json({ success: false, error: 'Access denied' });
        }
        const company = await Company_1.CompanyModel.findById(id);
        if (!company) {
            return res.status(404).json({ success: false, error: 'Company not found' });
        }
        const stats = await Company_1.CompanyModel.getStats(id);
        res.json({
            success: true,
            data: { ...company, stats }
        });
    }
    catch (error) {
        console.error('Get company error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch company'
        });
    }
});
// POST /api/companies - Create company (super admin only)
router.post('/', [
    (0, auth_1.requireRole)('admin'), // Only super admins have admin role without company
    (0, express_validator_1.body)('name').trim().notEmpty().withMessage('Company name required'),
    (0, express_validator_1.body)('slug').optional().trim().matches(/^[a-z0-9-]+$/).withMessage('Slug must be lowercase alphanumeric with hyphens'),
    (0, express_validator_1.body)('address').optional().trim(),
    (0, express_validator_1.body)('phone').optional().trim(),
    (0, express_validator_1.body)('email').optional().isEmail().normalizeEmail(),
], async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            error: 'Validation failed',
            details: errors.array()
        });
    }
    // Verify this is actually a super admin
    if (req.user.type !== 'super_admin') {
        return res.status(403).json({
            success: false,
            error: 'Only super admins can create companies'
        });
    }
    try {
        const input = {
            name: req.body.name,
            slug: req.body.slug,
            address: req.body.address,
            phone: req.body.phone,
            email: req.body.email
        };
        const company = await Company_1.CompanyModel.create(input);
        // Auto-create default admin user with generated password
        const adminEmail = `admin@${company.slug}.com`;
        const generatedPassword = (0, password_1.generateSecurePassword)(10); // Simple 10-char password
        const hashedPassword = bcrypt.hashSync(generatedPassword, 10);
        await (0, database_1.query)(`INSERT INTO users (id, company_id, email, password_hash, first_name, last_name, role, is_active, must_change_password) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`, [(0, uuid_1.v4)(), company.id, adminEmail, hashedPassword, 'Admin', 'User', 'admin', true, true]);
        // Also create staff record for the admin
        await (0, database_1.query)(`INSERT INTO staff (id, company_id, staff_no, staff_name, email, phone, department, branch, role, safety_score) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`, [(0, uuid_1.v4)(), company.id, 'ADM001', 'System Administrator', adminEmail,
            input.phone || '+254 700 000 000', 'Management', 'Head Office', 'Manager', 100]);
        res.status(201).json({
            success: true,
            data: company,
            adminCredentials: {
                email: adminEmail,
                password: generatedPassword,
                mustChangePassword: true
            },
            message: 'Company created successfully. Default admin user has been generated.'
        });
    }
    catch (error) {
        console.error('Create company error:', error);
        if (error.message?.includes('already exists')) {
            return res.status(409).json({
                success: false,
                error: error.message
            });
        }
        res.status(500).json({
            success: false,
            error: 'Failed to create company'
        });
    }
});
// PUT /api/companies/:id - Update company
router.put('/:id', [
    (0, express_validator_1.param)('id').isUUID().withMessage('Valid company ID required'),
    (0, express_validator_1.body)('name').optional().trim().notEmpty(),
    (0, express_validator_1.body)('address').optional().trim(),
    (0, express_validator_1.body)('phone').optional().trim(),
    (0, express_validator_1.body)('email').optional().isEmail().normalizeEmail(),
], async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            error: 'Validation failed',
            details: errors.array()
        });
    }
    try {
        const { id } = req.params;
        const isSuperAdmin = req.user.type === 'super_admin';
        // Regular admins can only update their own company
        if (!isSuperAdmin && id !== req.user.companyId) {
            return res.status(403).json({ success: false, error: 'Access denied' });
        }
        const company = await Company_1.CompanyModel.findById(id);
        if (!company) {
            return res.status(404).json({ success: false, error: 'Company not found' });
        }
        const updates = {};
        // Only super admin can change name (which affects slug)
        if (isSuperAdmin && req.body.name) {
            updates.name = req.body.name;
        }
        if (req.body.address !== undefined)
            updates.address = req.body.address;
        if (req.body.phone !== undefined)
            updates.phone = req.body.phone;
        if (req.body.email !== undefined)
            updates.email = req.body.email;
        const updated = await Company_1.CompanyModel.update(id, updates);
        res.json({
            success: true,
            data: updated
        });
    }
    catch (error) {
        console.error('Update company error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update company'
        });
    }
});
// PUT /api/companies/:id/subscription - Update subscription (super admin only)
router.put('/:id/subscription', [
    (0, auth_1.requireRole)('admin'),
    (0, express_validator_1.param)('id').isUUID().withMessage('Valid company ID required'),
    (0, express_validator_1.body)('plan').isIn(['basic', 'pro', 'enterprise']).withMessage('Valid plan required'),
    (0, express_validator_1.body)('status').isIn(['active', 'suspended', 'cancelled']).withMessage('Valid status required'),
], async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            error: 'Validation failed',
            details: errors.array()
        });
    }
    if (req.user.type !== 'super_admin') {
        return res.status(403).json({
            success: false,
            error: 'Only super admins can update subscriptions'
        });
    }
    try {
        const { id } = req.params;
        const { plan, status } = req.body;
        const company = await Company_1.CompanyModel.updateSubscription(id, plan, status);
        if (!company) {
            return res.status(404).json({ success: false, error: 'Company not found' });
        }
        res.json({
            success: true,
            data: company
        });
    }
    catch (error) {
        console.error('Update subscription error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update subscription'
        });
    }
});
// DELETE /api/companies/:id - Delete company (super admin only)
router.delete('/:id', [
    (0, auth_1.requireRole)('admin'),
    (0, express_validator_1.param)('id').isUUID().withMessage('Valid company ID required')
], async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            error: 'Validation failed',
            details: errors.array()
        });
    }
    if (req.user.type !== 'super_admin') {
        return res.status(403).json({
            success: false,
            error: 'Only super admins can delete companies'
        });
    }
    try {
        const { id } = req.params;
        const deleted = await Company_1.CompanyModel.delete(id);
        if (deleted) {
            res.json({
                success: true,
                message: 'Company and all associated data deleted'
            });
        }
        else {
            res.status(404).json({ success: false, error: 'Company not found' });
        }
    }
    catch (error) {
        console.error('Delete company error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete company'
        });
    }
});
exports.default = router;
//# sourceMappingURL=companies.js.map