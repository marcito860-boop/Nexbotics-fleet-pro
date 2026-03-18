"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvoiceModel = exports.InvoiceCategoryModel = void 0;
const database_1 = require("../database");
class InvoiceCategoryModel {
    static async findByCompany(companyId) {
        const rows = await (0, database_1.query)('SELECT * FROM invoice_categories WHERE company_id = $1 ORDER BY name ASC', [companyId]);
        return rows.map((row) => ({
            id: row.id,
            companyId: row.company_id,
            name: row.name,
            description: row.description,
            createdAt: new Date(row.created_at),
        }));
    }
    static async create(companyId, name, description) {
        const rows = await (0, database_1.query)('INSERT INTO invoice_categories (company_id, name, description) VALUES ($1, $2, $3) RETURNING *', [companyId, name, description]);
        return {
            id: rows[0].id,
            companyId: rows[0].company_id,
            name: rows[0].name,
            description: rows[0].description,
            createdAt: new Date(rows[0].created_at),
        };
    }
}
exports.InvoiceCategoryModel = InvoiceCategoryModel;
class InvoiceModel {
    static async findById(id, companyId) {
        const rows = await (0, database_1.query)(`SELECT i.*, c.name as category_name,
        u1.first_name as u1_fname, u1.last_name as u1_lname,
        u2.first_name as u2_fname, u2.last_name as u2_lname,
        u3.first_name as u3_fname, u3.last_name as u3_lname
       FROM invoices i
       LEFT JOIN invoice_categories c ON i.category_id = c.id
       LEFT JOIN users u1 ON i.created_by = u1.id
       LEFT JOIN users u2 ON i.validated_by = u2.id
       LEFT JOIN users u3 ON i.approved_by = u3.id
       WHERE i.id = $1 AND i.company_id = $2`, [id, companyId]);
        if (rows.length === 0)
            return null;
        const invoice = this.mapInvoiceRow(rows[0]);
        invoice.items = await this.getItems(id, companyId);
        return invoice;
    }
    static async findByCompany(companyId, options) {
        let sql = `
      SELECT i.*, c.name as category_name,
        u1.first_name as u1_fname, u1.last_name as u1_lname
      FROM invoices i
      LEFT JOIN invoice_categories c ON i.category_id = c.id
      LEFT JOIN users u1 ON i.created_by = u1.id
      WHERE i.company_id = $1
    `;
        let countSql = 'SELECT COUNT(*) as total FROM invoices WHERE company_id = $1';
        const params = [companyId];
        if (options?.status) {
            sql += ` AND i.status = $${params.length + 1}`;
            countSql += ` AND status = $${params.length + 1}`;
            params.push(options.status);
        }
        if (options?.invoiceType) {
            sql += ` AND i.invoice_type = $${params.length + 1}`;
            countSql += ` AND invoice_type = $${params.length + 1}`;
            params.push(options.invoiceType);
        }
        if (options?.vendorName) {
            sql += ` AND i.vendor_name ILIKE $${params.length + 1}`;
            countSql += ` AND vendor_name ILIKE $${params.length + 1}`;
            params.push(`%${options.vendorName}%`);
        }
        if (options?.dateFrom) {
            sql += ` AND i.invoice_date >= $${params.length + 1}`;
            countSql += ` AND invoice_date >= $${params.length + 1}`;
            params.push(options.dateFrom);
        }
        if (options?.dateTo) {
            sql += ` AND i.invoice_date <= $${params.length + 1}`;
            countSql += ` AND invoice_date <= $${params.length + 1}`;
            params.push(options.dateTo);
        }
        if (options?.overdueOnly) {
            sql += ` AND i.due_date < CURRENT_DATE AND i.status IN ('pending', 'validated', 'approved')`;
            countSql += ` AND due_date < CURRENT_DATE AND status IN ('pending', 'validated', 'approved')`;
        }
        sql += ' ORDER BY i.created_at DESC';
        if (options?.limit) {
            sql += ` LIMIT $${params.length + 1}`;
            params.push(options.limit);
            if (options?.offset) {
                sql += ` OFFSET $${params.length + 1}`;
                params.push(options.offset);
            }
        }
        const [rows, countRows] = await Promise.all([
            (0, database_1.query)(sql, params),
            (0, database_1.query)(countSql, params.slice(0, options?.limit ? params.length - (options.offset ? 2 : 1) : params.length))
        ]);
        return {
            invoices: rows.map(this.mapInvoiceRow),
            total: parseInt(countRows[0].total)
        };
    }
    static async create(companyId, createdBy, data, items) {
        const validation = await this.validateInvoice(companyId, data, items);
        const rows = await (0, database_1.query)(`INSERT INTO invoices (company_id, invoice_number, category_id, invoice_type, vendor_name,
       vendor_tax_id, vendor_address, vendor_contact, invoice_date, due_date, subtotal,
       tax_amount, total_amount, validation_errors, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) RETURNING *`, [companyId, data.invoiceNumber, data.categoryId, data.invoiceType, data.vendorName,
            data.vendorTaxId, data.vendorAddress, data.vendorContact, data.invoiceDate, data.dueDate,
            data.subtotal, data.taxAmount || 0, data.totalAmount,
            JSON.stringify(validation.errors), data.notes, createdBy]);
        const invoiceId = rows[0].id;
        for (const item of items) {
            await (0, database_1.query)(`INSERT INTO invoice_items (company_id, invoice_id, description, quantity, unit_price, total_price)
         VALUES ($1, $2, $3, $4, $5, $6)`, [companyId, invoiceId, item.description, item.quantity, item.unitPrice, item.totalPrice]);
        }
        await this.logAudit(companyId, invoiceId, 'created', createdBy, null, { invoice: rows[0] });
        return this.findById(invoiceId, companyId);
    }
    static async validate(id, companyId, validatedBy) {
        const rows = await (0, database_1.query)(`UPDATE invoices 
       SET status = 'validated', validated_by = $1, validated_at = NOW()
       WHERE id = $2 AND company_id = $3 AND status = 'pending'
       RETURNING *`, [validatedBy, id, companyId]);
        if (rows.length === 0)
            return null;
        await this.logAudit(companyId, id, 'validated', validatedBy, { status: 'pending' }, { status: 'validated' });
        return this.findById(id, companyId);
    }
    static async approve(id, companyId, approvedBy) {
        const rows = await (0, database_1.query)(`UPDATE invoices 
       SET status = 'approved', approved_by = $1, approved_at = NOW()
       WHERE id = $2 AND company_id = $3 AND status = 'validated'
       RETURNING *`, [approvedBy, id, companyId]);
        if (rows.length === 0)
            return null;
        await this.logAudit(companyId, id, 'approved', approvedBy, { status: 'validated' }, { status: 'approved' });
        return this.findById(id, companyId);
    }
    static async markPaid(id, companyId, paidBy, data) {
        const rows = await (0, database_1.query)(`UPDATE invoices 
       SET status = 'paid', payment_method = $1, payment_date = $2, payment_reference = $3
       WHERE id = $4 AND company_id = $5 AND status IN ('validated', 'approved')
       RETURNING *`, [data.paymentMethod, data.paymentDate, data.paymentReference, id, companyId]);
        if (rows.length === 0)
            return null;
        await this.logAudit(companyId, id, 'paid', paidBy, { status: 'approved' }, { status: 'paid' });
        return this.findById(id, companyId);
    }
    static async cancel(id, companyId, cancelledBy, reason) {
        const rows = await (0, database_1.query)(`UPDATE invoices 
       SET status = 'cancelled'
       WHERE id = $1 AND company_id = $2 AND status != 'paid'
       RETURNING *`, [id, companyId]);
        if (rows.length === 0)
            return null;
        await this.logAudit(companyId, id, 'cancelled', cancelledBy, { status: rows[0].status }, { status: 'cancelled' }, reason);
        return this.findById(id, companyId);
    }
    static async getItems(invoiceId, companyId) {
        const rows = await (0, database_1.query)('SELECT * FROM invoice_items WHERE invoice_id = $1 AND company_id = $2 ORDER BY created_at ASC', [invoiceId, companyId]);
        return rows.map((row) => ({
            id: row.id,
            companyId: row.company_id,
            invoiceId: row.invoice_id,
            description: row.description,
            quantity: parseFloat(row.quantity),
            unitPrice: parseFloat(row.unit_price),
            totalPrice: parseFloat(row.total_price),
            referenceType: row.reference_type,
            referenceId: row.reference_id,
            createdAt: new Date(row.created_at),
        }));
    }
    static async getStats(companyId) {
        const rows = await (0, database_1.query)(`SELECT 
        status,
        invoice_type,
        COALESCE(SUM(total_amount), 0) as total,
        COUNT(*) as count
       FROM invoices 
       WHERE company_id = $1
       GROUP BY status, invoice_type`, [companyId]);
        const overdueRows = await (0, database_1.query)(`SELECT 
        COALESCE(SUM(total_amount), 0) as total,
        COUNT(*) as count
       FROM invoices 
       WHERE company_id = $1 AND due_date < CURRENT_DATE 
       AND status IN ('pending', 'validated', 'approved')`, [companyId]);
        const stats = {
            total: 0,
            byStatus: {},
            byType: {},
            totalAmount: 0,
            paidAmount: 0,
            overdueAmount: parseFloat(overdueRows[0].total),
            overdueCount: parseInt(overdueRows[0].count),
        };
        for (const row of rows) {
            const count = parseInt(row.count);
            const amount = parseFloat(row.total);
            stats.total += count;
            stats.totalAmount += amount;
            if (!stats.byStatus[row.status])
                stats.byStatus[row.status] = 0;
            stats.byStatus[row.status] += count;
            if (!stats.byType[row.invoice_type])
                stats.byType[row.invoice_type] = 0;
            stats.byType[row.invoice_type] += count;
            if (row.status === 'paid') {
                stats.paidAmount += amount;
            }
        }
        return stats;
    }
    static async validateInvoice(companyId, data, items) {
        const errors = [];
        // Check required fields
        if (!data.invoiceNumber)
            errors.push('Invoice number is required');
        if (!data.vendorName)
            errors.push('Vendor name is required');
        if (!data.invoiceDate)
            errors.push('Invoice date is required');
        if (!data.totalAmount || data.totalAmount <= 0)
            errors.push('Total amount must be greater than 0');
        // Check for duplicate invoice number
        if (data.invoiceNumber) {
            const existing = await (0, database_1.query)('SELECT id FROM invoices WHERE company_id = $1 AND invoice_number = $2', [companyId, data.invoiceNumber]);
            if (existing.length > 0)
                errors.push('Invoice number already exists');
        }
        // Validate line items
        if (!items || items.length === 0) {
            errors.push('At least one line item is required');
        }
        else {
            const itemsTotal = items.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
            if (Math.abs(itemsTotal - (data.subtotal || 0)) > 0.01) {
                errors.push('Line items total does not match invoice subtotal');
            }
        }
        // Check max amount rule
        const maxAmount = 1000000; // KSH 1,000,000 - could be configurable
        if (data.totalAmount && data.totalAmount > maxAmount) {
            errors.push(`Invoice amount exceeds maximum allowed (${maxAmount} KSH)`);
        }
        return { isValid: errors.length === 0, errors };
    }
    static async logAudit(companyId, invoiceId, action, actionBy, oldValues, newValues, notes) {
        await (0, database_1.query)(`INSERT INTO invoice_audit_log (company_id, invoice_id, action, action_by, old_values, new_values, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`, [companyId, invoiceId, action, actionBy, JSON.stringify(oldValues), JSON.stringify(newValues), notes]);
    }
    static mapInvoiceRow(row) {
        const invoice = {
            id: row.id,
            companyId: row.company_id,
            invoiceNumber: row.invoice_number,
            categoryId: row.category_id,
            invoiceType: row.invoice_type,
            vendorName: row.vendor_name,
            vendorTaxId: row.vendor_tax_id,
            vendorAddress: row.vendor_address,
            vendorContact: row.vendor_contact,
            invoiceDate: new Date(row.invoice_date),
            dueDate: row.due_date ? new Date(row.due_date) : undefined,
            subtotal: parseFloat(row.subtotal),
            taxAmount: parseFloat(row.tax_amount),
            totalAmount: parseFloat(row.total_amount),
            currency: row.currency,
            status: row.status,
            paymentMethod: row.payment_method,
            paymentDate: row.payment_date ? new Date(row.payment_date) : undefined,
            paymentReference: row.payment_reference,
            validationErrors: row.validation_errors || [],
            validatedBy: row.validated_by,
            validatedAt: row.validated_at ? new Date(row.validated_at) : undefined,
            approvedBy: row.approved_by,
            approvedAt: row.approved_at ? new Date(row.approved_at) : undefined,
            notes: row.notes,
            attachmentUrl: row.attachment_url,
            createdBy: row.created_by,
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at),
        };
        if (row.category_name) {
            invoice.category = { name: row.category_name };
        }
        if (row.u1_fname) {
            invoice.creator = { firstName: row.u1_fname, lastName: row.u1_lname };
        }
        if (row.u2_fname) {
            invoice.validator = { firstName: row.u2_fname, lastName: row.u2_lname };
        }
        if (row.u3_fname) {
            invoice.approver = { firstName: row.u3_fname, lastName: row.u3_lname };
        }
        return invoice;
    }
}
exports.InvoiceModel = InvoiceModel;
//# sourceMappingURL=Invoice.js.map