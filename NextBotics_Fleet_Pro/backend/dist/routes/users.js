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
const User_1 = require("../models/User");
const Company_1 = require("../models/Company");
const auth_1 = require("../utils/auth");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_1.authMiddleware);
// GET /api/users - List all users for company (admin/manager only)
router.get('/', (0, auth_1.requireRole)('admin', 'manager'), async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const page = parseInt(req.query.page) || 1;
        const perPage = parseInt(req.query.perPage) || 20;
        const role = req.query.role;
        const isActive = req.query.isActive === 'true' ? true :
            req.query.isActive === 'false' ? false : undefined;
        const offset = (page - 1) * perPage;
        const { users, total } = await User_1.UserModel.findByCompany(companyId, {
            role,
            isActive,
            limit: perPage,
            offset
        });
        const response = {
            success: true,
            data: {
                items: users.map(User_1.toSafeUser),
                total,
                page,
                perPage,
                totalPages: Math.ceil(total / perPage)
            }
        };
        res.json(response);
    }
    catch (error) {
        console.error('List users error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch users'
        });
    }
});
// GET /api/users/:id - Get user by ID
router.get('/:id', [
    (0, express_validator_1.param)('id').isUUID().withMessage('Valid user ID required')
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
        const companyId = req.user.companyId;
        const requesterRole = req.user.role;
        // Users can only view their own profile unless admin/manager
        const user = await User_1.UserModel.findByIdAndCompany(id, companyId);
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }
        if (requesterRole === 'staff' && user.id !== req.user.userId) {
            return res.status(403).json({ success: false, error: 'Access denied' });
        }
        res.json({
            success: true,
            data: (0, User_1.toSafeUser)(user)
        });
    }
    catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch user'
        });
    }
});
// POST /api/users - Create new user (admin/manager only)
router.post('/', [
    (0, auth_1.requireRole)('admin', 'manager'),
    (0, express_validator_1.body)('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    (0, express_validator_1.body)('firstName').trim().notEmpty().withMessage('First name required'),
    (0, express_validator_1.body)('lastName').trim().notEmpty().withMessage('Last name required'),
    (0, express_validator_1.body)('role').isIn(['admin', 'manager', 'staff']).withMessage('Valid role required'),
    (0, express_validator_1.body)('phone').optional().trim(),
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
        const companyId = req.user.companyId;
        const requesterRole = req.user.role;
        // Managers can only create staff, not other managers or admins
        if (requesterRole === 'manager' && req.body.role !== 'staff') {
            return res.status(403).json({
                success: false,
                error: 'Managers can only create staff users'
            });
        }
        // Check user limit
        const company = await Company_1.CompanyModel.findById(companyId);
        const currentUserCount = await User_1.UserModel.countByCompany(companyId);
        if (currentUserCount >= (company?.maxUsers || 10)) {
            return res.status(403).json({
                success: false,
                error: 'User limit reached for this company'
            });
        }
        const input = {
            email: req.body.email,
            firstName: req.body.firstName,
            lastName: req.body.lastName,
            phone: req.body.phone,
            role: req.body.role,
            companyId
        };
        const { user, tempPassword } = await User_1.UserModel.create(input);
        res.status(201).json({
            success: true,
            data: {
                user: (0, User_1.toSafeUser)(user),
                tempPassword // Only shown once at creation
            },
            message: 'User created successfully. Please share the temporary password securely.'
        });
    }
    catch (error) {
        console.error('Create user error:', error);
        if (error.message?.includes('already exists')) {
            return res.status(409).json({
                success: false,
                error: 'User with this email already exists'
            });
        }
        res.status(500).json({
            success: false,
            error: 'Failed to create user'
        });
    }
});
// PUT /api/users/:id - Update user (admin/manager only, or self for limited fields)
router.put('/:id', [
    (0, express_validator_1.param)('id').isUUID().withMessage('Valid user ID required'),
    (0, express_validator_1.body)('firstName').optional().trim().notEmpty(),
    (0, express_validator_1.body)('lastName').optional().trim().notEmpty(),
    (0, express_validator_1.body)('phone').optional().trim(),
    (0, express_validator_1.body)('role').optional().isIn(['admin', 'manager', 'staff']),
    (0, express_validator_1.body)('isActive').optional().isBoolean(),
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
        const companyId = req.user.companyId;
        const requesterId = req.user.userId;
        const requesterRole = req.user.role;
        const user = await User_1.UserModel.findByIdAndCompany(id, companyId);
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }
        // Staff can only update their own basic info
        if (requesterRole === 'staff') {
            if (id !== requesterId) {
                return res.status(403).json({ success: false, error: 'Access denied' });
            }
            // Staff can only update name and phone
            const input = {
                firstName: req.body.firstName,
                lastName: req.body.lastName,
                phone: req.body.phone
            };
            const updated = await User_1.UserModel.update(id, companyId, input);
            return res.json({
                success: true,
                data: (0, User_1.toSafeUser)(updated)
            });
        }
        // Managers have restrictions
        if (requesterRole === 'manager') {
            // Can't modify admins
            if (user.role === 'admin') {
                return res.status(403).json({
                    success: false,
                    error: 'Cannot modify admin users'
                });
            }
            // Can't promote to admin/manager
            if (req.body.role && req.body.role !== 'staff') {
                return res.status(403).json({
                    success: false,
                    error: 'Can only assign staff role'
                });
            }
        }
        const input = {
            firstName: req.body.firstName,
            lastName: req.body.lastName,
            phone: req.body.phone,
            role: req.body.role,
            isActive: req.body.isActive
        };
        const updated = await User_1.UserModel.update(id, companyId, input);
        res.json({
            success: true,
            data: (0, User_1.toSafeUser)(updated)
        });
    }
    catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update user'
        });
    }
});
// DELETE /api/users/:id - Deactivate/Delete user (admin only)
router.delete('/:id', [
    (0, auth_1.requireRole)('admin'),
    (0, express_validator_1.param)('id').isUUID().withMessage('Valid user ID required')
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
        const companyId = req.user.companyId;
        const requesterId = req.user.userId;
        if (id === requesterId) {
            return res.status(400).json({
                success: false,
                error: 'Cannot delete yourself'
            });
        }
        const user = await User_1.UserModel.findByIdAndCompany(id, companyId);
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }
        // Soft delete by default
        const hardDelete = req.query.hard === 'true';
        const deleted = await User_1.UserModel.delete(id, companyId, hardDelete);
        if (deleted) {
            res.json({
                success: true,
                message: hardDelete ? 'User permanently deleted' : 'User deactivated'
            });
        }
        else {
            res.status(500).json({
                success: false,
                error: 'Failed to delete user'
            });
        }
    }
    catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete user'
        });
    }
});
// POST /api/users/:id/reset-password - Reset user password (admin/manager only)
router.post('/:id/reset-password', [
    (0, auth_1.requireRole)('admin', 'manager'),
    (0, express_validator_1.param)('id').isUUID().withMessage('Valid user ID required')
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
        const companyId = req.user.companyId;
        const requesterRole = req.user.role;
        const user = await User_1.UserModel.findByIdAndCompany(id, companyId);
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }
        // Managers can't reset admin passwords
        if (requesterRole === 'manager' && user.role === 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Cannot reset admin password'
            });
        }
        // Generate new temporary password
        const { generateSecurePassword } = await Promise.resolve().then(() => __importStar(require('../utils/password')));
        const newPassword = generateSecurePassword();
        const { hashPassword } = await Promise.resolve().then(() => __importStar(require('../utils/password')));
        const passwordHash = await hashPassword(newPassword);
        await User_1.UserModel.changePassword(id, newPassword, companyId);
        res.json({
            success: true,
            data: { tempPassword: newPassword },
            message: 'Password reset successfully. Please share the temporary password securely.'
        });
    }
    catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to reset password'
        });
    }
});
exports.default = router;
//# sourceMappingURL=users.js.map