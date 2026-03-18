"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SuperAdminModel = void 0;
const database_1 = require("../database");
const password_1 = require("../utils/password");
class SuperAdminModel {
    static async findByEmail(email) {
        const rows = await (0, database_1.query)('SELECT * FROM super_admins WHERE email = $1 AND is_active = true', [email.toLowerCase()]);
        if (rows.length === 0)
            return null;
        const row = rows[0];
        return {
            id: row.id,
            email: row.email,
            firstName: row.first_name,
            lastName: row.last_name,
            isActive: row.is_active,
            lastLoginAt: row.last_login_at ? new Date(row.last_login_at) : undefined,
            createdAt: new Date(row.created_at),
        };
    }
    static async verifyCredentials(email, password) {
        const rows = await (0, database_1.query)('SELECT * FROM super_admins WHERE email = $1 AND is_active = true', [email.toLowerCase()]);
        if (rows.length === 0)
            return null;
        const valid = await (0, password_1.verifyPassword)(password, rows[0].password_hash);
        if (!valid)
            return null;
        const row = rows[0];
        return {
            id: row.id,
            email: row.email,
            firstName: row.first_name,
            lastName: row.last_name,
            isActive: row.is_active,
            lastLoginAt: row.last_login_at ? new Date(row.last_login_at) : undefined,
            createdAt: new Date(row.created_at),
        };
    }
    static async updateLastLogin(id) {
        await (0, database_1.query)('UPDATE super_admins SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1', [id]);
    }
    static async changePassword(id, newPassword) {
        const passwordHash = await (0, password_1.hashPassword)(newPassword);
        await (0, database_1.query)('UPDATE super_admins SET password_hash = $1 WHERE id = $2', [passwordHash, id]);
    }
    static async create(email, password, firstName, lastName) {
        const passwordHash = await (0, password_1.hashPassword)(password);
        const rows = await (0, database_1.query)(`INSERT INTO super_admins (email, password_hash, first_name, last_name)
       VALUES ($1, $2, $3, $4)
       RETURNING *`, [email.toLowerCase(), passwordHash, firstName, lastName]);
        const row = rows[0];
        return {
            id: row.id,
            email: row.email,
            firstName: row.first_name,
            lastName: row.last_name,
            isActive: row.is_active,
            lastLoginAt: row.last_login_at ? new Date(row.last_login_at) : undefined,
            createdAt: new Date(row.created_at),
        };
    }
}
exports.SuperAdminModel = SuperAdminModel;
//# sourceMappingURL=SuperAdmin.js.map