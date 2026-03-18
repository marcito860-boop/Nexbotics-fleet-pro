"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const User_1 = require("../models/User");
const Company_1 = require("../models/Company");
const SuperAdmin_1 = require("../models/SuperAdmin");
const auth_1 = require("../utils/auth");
const router = (0, express_1.Router)();
// POST /api/auth/login - User login
router.post('/login', [
    (0, express_validator_1.body)('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    (0, express_validator_1.body)('password').notEmpty().withMessage('Password required'),
    (0, express_validator_1.body)('companySlug').optional().trim(),
], async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            error: 'Validation failed',
            details: errors.array()
        });
    }
    const { email, password, companySlug } = req.body;
    try {
        // First, check if it's a super admin login
        const superAdmin = await SuperAdmin_1.SuperAdminModel.verifyCredentials(email, password);
        if (superAdmin) {
            await SuperAdmin_1.SuperAdminModel.updateLastLogin(superAdmin.id);
            const token = (0, auth_1.generateToken)({
                userId: superAdmin.id,
                companyId: 'super_admin',
                email: superAdmin.email,
                firstName: superAdmin.firstName,
                lastName: superAdmin.lastName,
                role: 'admin',
                type: 'super_admin'
            });
            const response = {
                success: true,
                data: {
                    token,
                    user: {
                        id: superAdmin.id,
                        email: superAdmin.email,
                        firstName: superAdmin.firstName,
                        lastName: superAdmin.lastName,
                        role: 'admin',
                        mustChangePassword: false
                    }
                }
            };
            return res.json(response);
        }
        // Regular user login - need company context
        let company = null;
        if (companySlug) {
            company = await Company_1.CompanyModel.findBySlug(companySlug);
        }
        else {
            // Try to auto-discover by email domain
            company = await Company_1.CompanyModel.findByEmail(email);
        }
        if (!company) {
            return res.status(401).json({
                success: false,
                error: 'Company not found. Please specify your company.'
            });
        }
        // Find user in company and verify credentials
        const user = await User_1.UserModel.verifyCredentials(email, company.id, password);
        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials'
            });
        }
        // Update last login
        await User_1.UserModel.updateLastLogin(user.id);
        // Generate JWT
        const token = (0, auth_1.generateToken)({
            userId: user.id,
            companyId: user.companyId,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            type: 'user'
        });
        const response = {
            success: true,
            data: {
                token,
                user: (0, User_1.toSafeUser)(user),
                company: {
                    id: company.id,
                    name: company.name,
                    slug: company.slug,
                    logoUrl: company.logoUrl,
                    subscriptionPlan: company.subscriptionPlan,
                    subscriptionStatus: company.subscriptionStatus,
                    maxUsers: company.maxUsers,
                    settings: company.settings,
                    createdAt: company.createdAt,
                    updatedAt: company.updatedAt
                }
            }
        };
        res.json(response);
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            error: 'Login failed. Please try again.'
        });
    }
});
// POST /api/auth/change-password - Change password
router.post('/change-password', [
    auth_1.authMiddleware,
    (0, express_validator_1.body)('currentPassword').notEmpty().withMessage('Current password required'),
    (0, express_validator_1.body)('newPassword').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
], async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            error: 'Validation failed',
            details: errors.array()
        });
    }
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.userId;
    const isSuperAdmin = req.user.type === 'super_admin';
    try {
        if (isSuperAdmin) {
            // Verify current password for super admin
            const superAdmin = await SuperAdmin_1.SuperAdminModel.findByEmail(req.user.email);
            if (!superAdmin) {
                return res.status(404).json({ success: false, error: 'User not found' });
            }
            const valid = await SuperAdmin_1.SuperAdminModel.verifyCredentials(req.user.email, currentPassword);
            if (!valid) {
                return res.status(401).json({ success: false, error: 'Current password is incorrect' });
            }
            await SuperAdmin_1.SuperAdminModel.changePassword(userId, newPassword);
        }
        else {
            // Regular user - verify credentials using model method
            const user = await User_1.UserModel.findById(userId);
            if (!user) {
                return res.status(404).json({ success: false, error: 'User not found' });
            }
            const valid = await User_1.UserModel.verifyCredentials(user.email, user.companyId, currentPassword);
            if (!valid) {
                return res.status(401).json({ success: false, error: 'Current password is incorrect' });
            }
            await User_1.UserModel.changePassword(userId, newPassword, user.companyId);
        }
        res.json({
            success: true,
            message: 'Password changed successfully'
        });
    }
    catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to change password'
        });
    }
});
// GET /api/auth/me - Get current user
router.get('/me', auth_1.authMiddleware, async (req, res) => {
    try {
        const userId = req.user.userId;
        const isSuperAdmin = req.user.type === 'super_admin';
        if (isSuperAdmin) {
            const superAdmin = await SuperAdmin_1.SuperAdminModel.findByEmail(req.user.email);
            if (!superAdmin) {
                return res.status(404).json({ success: false, error: 'User not found' });
            }
            return res.json({
                success: true,
                data: {
                    user: {
                        id: superAdmin.id,
                        email: superAdmin.email,
                        firstName: superAdmin.firstName,
                        lastName: superAdmin.lastName,
                        role: 'admin',
                        mustChangePassword: false
                    },
                    type: 'super_admin'
                }
            });
        }
        const user = await User_1.UserModel.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }
        const company = await Company_1.CompanyModel.findById(user.companyId);
        res.json({
            success: true,
            data: {
                user: (0, User_1.toSafeUser)(user),
                company: company ? {
                    id: company.id,
                    name: company.name,
                    slug: company.slug
                } : null,
                type: 'user'
            }
        });
    }
    catch (error) {
        console.error('Get me error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get user info'
        });
    }
});
// POST /api/auth/refresh - Refresh token (optional implementation)
router.post('/refresh', auth_1.authMiddleware, async (req, res) => {
    // Generate new token with extended expiry
    const token = (0, auth_1.generateToken)({
        userId: req.user.userId,
        companyId: req.user.companyId,
        email: req.user.email,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        role: req.user.role,
        type: req.user.type
    });
    res.json({
        success: true,
        data: { token }
    });
});
exports.default = router;
//# sourceMappingURL=auth.js.map