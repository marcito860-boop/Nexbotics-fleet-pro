"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateToken = generateToken;
exports.verifyToken = verifyToken;
exports.authMiddleware = authMiddleware;
exports.requireRole = requireRole;
exports.requirePasswordChange = requirePasswordChange;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
function generateToken(payload) {
    return jsonwebtoken_1.default.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}
function verifyToken(token) {
    return jsonwebtoken_1.default.verify(token, JWT_SECRET);
}
function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        res.status(401).json({ success: false, error: 'No token provided' });
        return;
    }
    const token = authHeader.substring(7);
    try {
        const decoded = verifyToken(token);
        req.user = decoded;
        next();
    }
    catch (error) {
        res.status(401).json({ success: false, error: 'Invalid or expired token' });
    }
}
function requireRole(...roles) {
    // Flatten the roles array (handles both requireRole('admin', 'manager') and requireRole(['admin', 'manager']))
    const normalizedRoles = roles.flat();
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({ success: false, error: 'Not authenticated' });
            return;
        }
        if (!normalizedRoles.includes(req.user.role)) {
            res.status(403).json({ success: false, error: 'Insufficient permissions' });
            return;
        }
        next();
    };
}
function requirePasswordChange(req, res, next) {
    // Skip for password change endpoint
    if (req.path === '/auth/change-password') {
        next();
        return;
    }
    // This check is handled after login - user gets token but with mustChangePassword flag
    // Frontend should check this flag and redirect to password change
    next();
}
//# sourceMappingURL=auth.js.map