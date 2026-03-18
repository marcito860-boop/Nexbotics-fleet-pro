"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = require("../database");
const auth_1 = require("../utils/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authMiddleware);
// ============================================
// SUPPLIERS
// ============================================
// GET /api/fleet/suppliers - List suppliers
router.get('/', async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { supplierType, isActive, limit = '50', offset = '0' } = req.query;
        let sql = `
      SELECT s.*, 
        COUNT(DISTINCT c.id) as contract_count,
        COALESCE(SUM(CASE WHEN c.status = 'active' THEN 1 ELSE 0 END), 0) as active_contracts
      FROM suppliers s
      LEFT JOIN supplier_contracts c ON s.id = c.supplier_id AND c.company_id = s.company_id
      WHERE s.company_id = $1
    `;
        let countSql = 'SELECT COUNT(*) as total FROM suppliers WHERE company_id = $1';
        const params = [companyId];
        if (supplierType) {
            sql += ` AND s.supplier_type = $${params.length + 1}`;
            countSql += ` AND supplier_type = $${params.length + 1}`;
            params.push(supplierType);
        }
        if (isActive !== undefined) {
            sql += ` AND s.is_active = $${params.length + 1}`;
            countSql += ` AND is_active = $${params.length + 1}`;
            params.push(isActive === 'true');
        }
        sql += ' GROUP BY s.id ORDER BY s.name ASC';
        if (limit) {
            sql += ` LIMIT $${params.length + 1}`;
            params.push(parseInt(limit));
            if (offset) {
                sql += ` OFFSET $${params.length + 1}`;
                params.push(parseInt(offset));
            }
        }
        const [rows, countRows] = await Promise.all([
            (0, database_1.query)(sql, params),
            (0, database_1.query)(countSql, params.slice(0, params.length - (limit ? (offset ? 2 : 1) : 0)))
        ]);
        res.json({
            success: true,
            data: rows.map((r) => ({
                id: r.id,
                name: r.name,
                supplierType: r.supplier_type,
                contactName: r.contact_name,
                email: r.email,
                phone: r.phone,
                address: r.address,
                taxId: r.tax_id,
                paymentTerms: r.payment_terms,
                isApproved: r.is_approved,
                isActive: r.is_active,
                rating: r.rating,
                contractCount: parseInt(r.contract_count),
                activeContracts: parseInt(r.active_contracts),
                createdAt: r.created_at,
            })),
            pagination: { total: parseInt(countRows[0].total), limit: parseInt(limit), offset: parseInt(offset) },
        });
    }
    catch (error) {
        console.error('Error fetching suppliers:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch suppliers' });
    }
});
// POST /api/fleet/suppliers - Create supplier
router.post('/', (0, auth_1.requireRole)(['admin', 'manager']), async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { name, supplierType, contactName, email, phone, address, taxId, paymentTerms, notes } = req.body;
        if (!name || !supplierType) {
            return res.status(400).json({ success: false, error: 'Name and supplier type are required' });
        }
        const rows = await (0, database_1.query)(`INSERT INTO suppliers (company_id, name, supplier_type, contact_name, email, phone, 
       address, tax_id, payment_terms, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`, [companyId, name, supplierType, contactName, email, phone, address, taxId, paymentTerms, notes]);
        res.status(201).json({ success: true, data: rows[0] });
    }
    catch (error) {
        console.error('Error creating supplier:', error);
        res.status(500).json({ success: false, error: 'Failed to create supplier' });
    }
});
// ============================================
// CONTRACTS
// ============================================
// GET /api/fleet/suppliers/contracts - List contracts
router.get('/contracts', async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const { supplierId, status, contractType, limit = '50' } = req.query;
        let sql = `
      SELECT c.*, s.name as supplier_name, s.supplier_type
      FROM supplier_contracts c
      JOIN suppliers s ON c.supplier_id = s.id
      WHERE c.company_id = $1
    `;
        const params = [companyId];
        if (supplierId) {
            sql += ` AND c.supplier_id = $${params.length + 1}`;
            params.push(supplierId);
        }
        if (status) {
            sql += ` AND c.status = $${params.length + 1}`;
            params.push(status);
        }
        if (contractType) {
            sql += ` AND c.contract_type = $${params.length + 1}`;
            params.push(contractType);
        }
        sql += ' ORDER BY c.end_date ASC NULLS LAST';
        if (limit) {
            sql += ` LIMIT $${params.length + 1}`;
            params.push(parseInt(limit));
        }
        const rows = await (0, database_1.query)(sql, params);
        res.json({
            success: true,
            data: rows.map((r) => ({
                id: r.id,
                supplierId: r.supplier_id,
                supplierName: r.supplier_name,
                contractType: r.contract_type,
                contractNumber: r.contract_number,
                title: r.title,
                startDate: r.start_date,
                endDate: r.end_date,
                value: parseFloat(r.value || 0),
                currency: r.currency,
                status: r.status,
                paymentTerms: r.payment_terms,
                autoRenewal: r.auto_renewal,
                renewalNoticeDays: r.renewal_notice_days,
                documentUrl: r.document_url,
                createdAt: r.created_at,
            })),
        });
    }
    catch (error) {
        console.error('Error fetching contracts:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch contracts' });
    }
});
// POST /api/fleet/suppliers/contracts - Create contract
router.post('/contracts', (0, auth_1.requireRole)(['admin', 'manager']), async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const userId = req.user.userId;
        const { supplierId, contractType, contractNumber, title, startDate, endDate, value, paymentTerms, autoRenewal, renewalNoticeDays, terms, documentUrl } = req.body;
        if (!supplierId || !contractType || !title) {
            return res.status(400).json({ success: false, error: 'Supplier, type, and title are required' });
        }
        const rows = await (0, database_1.query)(`INSERT INTO supplier_contracts (company_id, supplier_id, contract_type, contract_number,
       title, start_date, end_date, value, payment_terms, auto_renewal, renewal_notice_days,
       terms, document_url, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *`, [companyId, supplierId, contractType, contractNumber, title, startDate, endDate,
            value, paymentTerms, autoRenewal, renewalNoticeDays, terms, documentUrl, userId]);
        res.status(201).json({ success: true, data: rows[0] });
    }
    catch (error) {
        console.error('Error creating contract:', error);
        res.status(500).json({ success: false, error: 'Failed to create contract' });
    }
});
// GET /api/fleet/suppliers/expiring-contracts - Get contracts expiring soon
router.get('/expiring-contracts', async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const days = parseInt(req.query.days) || 30;
        const rows = await (0, database_1.query)(`SELECT c.*, s.name as supplier_name
       FROM supplier_contracts c
       JOIN suppliers s ON c.supplier_id = s.id
       WHERE c.company_id = $1 
       AND c.status = 'active'
       AND c.end_date IS NOT NULL
       AND c.end_date <= CURRENT_DATE + INTERVAL '${days} days'
       AND c.end_date >= CURRENT_DATE
       ORDER BY c.end_date ASC`, [companyId]);
        res.json({ success: true, data: rows });
    }
    catch (error) {
        console.error('Error fetching expiring contracts:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch contracts' });
    }
});
exports.default = router;
//# sourceMappingURL=suppliers.js.map