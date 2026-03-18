"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompanyModel = void 0;
const database_1 = require("../database");
const password_1 = require("../utils/password");
function mapRowToCompany(row) {
    return {
        id: row.id,
        name: row.name,
        slug: row.slug,
        logoUrl: row.logo_url,
        address: row.address,
        phone: row.phone,
        email: row.email,
        subscriptionPlan: row.subscription_plan,
        subscriptionStatus: row.subscription_status,
        maxUsers: row.max_users,
        settings: row.settings || {},
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
    };
}
class CompanyModel {
    // Find company by ID
    static async findById(id) {
        const rows = await (0, database_1.query)('SELECT * FROM companies WHERE id = $1', [id]);
        return rows.length > 0 ? mapRowToCompany(rows[0]) : null;
    }
    // Find company by slug (for login)
    static async findBySlug(slug) {
        const rows = await (0, database_1.query)('SELECT * FROM companies WHERE slug = $1', [slug.toLowerCase()]);
        return rows.length > 0 ? mapRowToCompany(rows[0]) : null;
    }
    // Find company by email domain (for auto-discovery)
    static async findByEmail(email) {
        const domain = email.split('@')[1];
        if (!domain)
            return null;
        const rows = await (0, database_1.query)('SELECT * FROM companies WHERE email LIKE $1 LIMIT 1', [`%@${domain}`]);
        return rows.length > 0 ? mapRowToCompany(rows[0]) : null;
    }
    // Get all companies (super admin only)
    static async findAll(options) {
        let sql = 'SELECT * FROM companies WHERE 1=1';
        let countSql = 'SELECT COUNT(*) as total FROM companies WHERE 1=1';
        const params = [];
        if (options?.status) {
            sql += ` AND subscription_status = $${params.length + 1}`;
            countSql += ` AND subscription_status = $${params.length + 1}`;
            params.push(options.status);
        }
        if (options?.plan) {
            sql += ` AND subscription_plan = $${params.length + 1}`;
            countSql += ` AND subscription_plan = $${params.length + 1}`;
            params.push(options.plan);
        }
        sql += ' ORDER BY created_at DESC';
        if (options?.limit) {
            sql += ` LIMIT $${params.length + 1}`;
            params.push(options.limit);
            if (options?.offset) {
                sql += ` OFFSET $${params.length + 1}`;
                params.push(options.offset);
            }
        }
        const [companyRows, countRows] = await Promise.all([
            (0, database_1.query)(sql, params),
            (0, database_1.query)(countSql, params.slice(0, options?.limit ? params.length - (options.offset ? 2 : 1) : params.length))
        ]);
        return {
            companies: companyRows.map(mapRowToCompany),
            total: parseInt(countRows[0].total)
        };
    }
    // Create new company
    static async create(input) {
        const slug = input.slug || (0, password_1.generateCompanySlug)(input.name);
        // Check if slug exists
        const existing = await this.findBySlug(slug);
        if (existing) {
            throw new Error(`Company with slug "${slug}" already exists`);
        }
        const rows = await (0, database_1.query)(`INSERT INTO companies (name, slug, address, phone, email)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`, [
            input.name,
            slug.toLowerCase(),
            input.address || null,
            input.phone || null,
            input.email || null
        ]);
        return mapRowToCompany(rows[0]);
    }
    // Update company
    static async update(id, updates) {
        const setClauses = [];
        const params = [];
        if (updates.name !== undefined) {
            setClauses.push(`name = $${params.length + 1}`);
            params.push(updates.name);
        }
        if (updates.address !== undefined) {
            setClauses.push(`address = $${params.length + 1}`);
            params.push(updates.address);
        }
        if (updates.phone !== undefined) {
            setClauses.push(`phone = $${params.length + 1}`);
            params.push(updates.phone);
        }
        if (updates.email !== undefined) {
            setClauses.push(`email = $${params.length + 1}`);
            params.push(updates.email);
        }
        if (setClauses.length === 0)
            return this.findById(id);
        params.push(id);
        const rows = await (0, database_1.query)(`UPDATE companies SET ${setClauses.join(', ')} WHERE id = $${params.length} RETURNING *`, params);
        return rows.length > 0 ? mapRowToCompany(rows[0]) : null;
    }
    // Update subscription
    static async updateSubscription(id, plan, status) {
        const rows = await (0, database_1.query)('UPDATE companies SET subscription_plan = $1, subscription_status = $2 WHERE id = $3 RETURNING *', [plan, status, id]);
        return rows.length > 0 ? mapRowToCompany(rows[0]) : null;
    }
    // Update settings
    static async updateSettings(id, settings) {
        const rows = await (0, database_1.query)('UPDATE companies SET settings = settings || $1 WHERE id = $2 RETURNING *', [JSON.stringify(settings), id]);
        return rows.length > 0 ? mapRowToCompany(rows[0]) : null;
    }
    // Delete company (cascades to users due to FK constraint)
    static async delete(id) {
        const result = await (0, database_1.query)('DELETE FROM companies WHERE id = $1 RETURNING id', [id]);
        return result.length > 0;
    }
    // Get company stats
    static async getStats(id) {
        const rows = await (0, database_1.query)(`SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN is_active THEN 1 END) as active_users,
        COUNT(CASE WHEN role = 'admin' THEN 1 END) as admin_count,
        COUNT(CASE WHEN role = 'manager' THEN 1 END) as manager_count,
        COUNT(CASE WHEN role = 'staff' THEN 1 END) as staff_count
       FROM users WHERE company_id = $1`, [id]);
        return {
            totalUsers: parseInt(rows[0].total_users),
            activeUsers: parseInt(rows[0].active_users),
            adminCount: parseInt(rows[0].admin_count),
            managerCount: parseInt(rows[0].manager_count),
            staffCount: parseInt(rows[0].staff_count),
        };
    }
}
exports.CompanyModel = CompanyModel;
//# sourceMappingURL=Company.js.map