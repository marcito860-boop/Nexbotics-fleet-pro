"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ImportExport_1 = require("../models/ImportExport");
const auth_1 = require("../utils/auth");
const database_1 = require("../database");
const router = (0, express_1.Router)();
router.use(auth_1.authMiddleware);
// ============================================
// IMPORT ENDPOINTS
// ============================================
// POST /api/fleet/import/preview - Preview CSV data before import
router.post('/preview', (0, auth_1.requireRole)(['admin', 'manager']), async (req, res) => {
    try {
        const { importType, csvContent } = req.body;
        if (!importType || !csvContent) {
            return res.status(400).json({ success: false, error: 'Import type and CSV content are required' });
        }
        const { headers, rows } = ImportExport_1.ImportExportModel.parseCSV(csvContent);
        const previewData = rows.slice(0, 10); // First 10 rows for preview
        const errors = [];
        // Validate each row
        for (let i = 0; i < Math.min(rows.length, 100); i++) {
            let rowErrors = [];
            switch (importType) {
                case 'vehicles':
                    rowErrors = ImportExport_1.ImportExportModel.validateVehicleRow(rows[i], i);
                    break;
                case 'drivers':
                    rowErrors = ImportExport_1.ImportExportModel.validateDriverRow(rows[i], i);
                    break;
                case 'inventory':
                    rowErrors = ImportExport_1.ImportExportModel.validateInventoryRow(rows[i], i);
                    break;
                default:
                    return res.status(400).json({ success: false, error: 'Invalid import type' });
            }
            errors.push(...rowErrors);
        }
        res.json({
            success: true,
            data: {
                headers,
                preview: previewData,
                totalRows: rows.length,
                validationErrors: errors.slice(0, 50), // Limit errors shown
                canImport: errors.length === 0 || errors.length <= rows.length * 0.1, // Allow if <10% errors
            },
        });
    }
    catch (error) {
        console.error('Error previewing import:', error);
        res.status(400).json({ success: false, error: error.message || 'Failed to parse CSV' });
    }
});
// POST /api/fleet/import - Start import job
router.post('/', (0, auth_1.requireRole)(['admin', 'manager']), async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const userId = req.user.userId;
        const { importType, csvContent, fileName, skipValidation = false } = req.body;
        if (!importType || !csvContent) {
            return res.status(400).json({ success: false, error: 'Import type and CSV content are required' });
        }
        const { rows } = ImportExport_1.ImportExportModel.parseCSV(csvContent);
        // Create import job
        const job = await ImportExport_1.ImportExportModel.createImportJob(companyId, userId, importType, fileName || 'import.csv', rows.slice(0, 5));
        // Process import asynchronously
        processImportJob(job.id, companyId, userId, importType, rows, skipValidation);
        res.status(202).json({
            success: true,
            data: { jobId: job.id, message: 'Import job started' },
        });
    }
    catch (error) {
        console.error('Error starting import:', error);
        res.status(500).json({ success: false, error: error.message || 'Failed to start import' });
    }
});
// GET /api/fleet/import/jobs - List import jobs
router.get('/jobs', async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const jobs = await ImportExport_1.ImportExportModel.findImportJobsByCompany(companyId, 50);
        res.json({ success: true, data: jobs });
    }
    catch (error) {
        console.error('Error fetching import jobs:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch jobs' });
    }
});
// GET /api/fleet/import/jobs/:id - Get import job status
router.get('/jobs/:id', async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const job = await ImportExport_1.ImportExportModel.findImportJobById(req.params.id, companyId);
        if (!job) {
            return res.status(404).json({ success: false, error: 'Job not found' });
        }
        res.json({ success: true, data: job });
    }
    catch (error) {
        console.error('Error fetching import job:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch job' });
    }
});
// ============================================
// EXPORT ENDPOINTS
// ============================================
// POST /api/fleet/export - Start export job
router.post('/export', async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const userId = req.user.userId;
        const { exportType, format = 'csv', filters = {} } = req.body;
        if (!exportType) {
            return res.status(400).json({ success: false, error: 'Export type is required' });
        }
        const job = await ImportExport_1.ImportExportModel.createExportJob(companyId, userId, exportType, format, filters);
        // Process export asynchronously
        processExportJob(job.id, companyId, exportType, format, filters);
        res.status(202).json({
            success: true,
            data: { jobId: job.id, message: 'Export job started' },
        });
    }
    catch (error) {
        console.error('Error starting export:', error);
        res.status(500).json({ success: false, error: 'Failed to start export' });
    }
});
// GET /api/fleet/export/jobs - List export jobs
router.get('/export/jobs', async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const jobs = await ImportExport_1.ImportExportModel.findExportJobsByCompany(companyId, 50);
        res.json({ success: true, data: jobs });
    }
    catch (error) {
        console.error('Error fetching export jobs:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch jobs' });
    }
});
// GET /api/fleet/export/jobs/:id - Get export job status
router.get('/export/jobs/:id', async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const job = await ImportExport_1.ImportExportModel.findExportJobById(req.params.id, companyId);
        if (!job) {
            return res.status(404).json({ success: false, error: 'Job not found' });
        }
        res.json({ success: true, data: job });
    }
    catch (error) {
        console.error('Error fetching export job:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch job' });
    }
});
// GET /api/fleet/export/templates/:type - Download template CSV
router.get('/templates/:type', async (req, res) => {
    try {
        const { type } = req.params;
        let headers = [];
        switch (type) {
            case 'vehicles':
                headers = ['registration_number', 'make', 'model', 'year', 'type', 'fuel_type', 'fuel_capacity',
                    'engine_capacity', 'color', 'vin', 'engine_number', 'purchase_date', 'purchase_price',
                    'current_odometer', 'status', 'department', 'notes'];
                break;
            case 'drivers':
                headers = ['first_name', 'last_name', 'email', 'phone', 'employee_id', 'license_number',
                    'license_class', 'license_expiry', 'employment_status', 'department', 'notes'];
                break;
            case 'inventory':
                headers = ['sku', 'name', 'description', 'category', 'unit_of_measure', 'unit_price',
                    'current_stock', 'reorder_level', 'reorder_quantity', 'supplier_name',
                    'supplier_contact', 'location'];
                break;
            default:
                return res.status(400).json({ success: false, error: 'Invalid template type' });
        }
        const csv = headers.join(',');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${type}_template.csv"`);
        res.send(csv);
    }
    catch (error) {
        console.error('Error generating template:', error);
        res.status(500).json({ success: false, error: 'Failed to generate template' });
    }
});
// ============================================
// BACKGROUND PROCESSING
// ============================================
async function processImportJob(jobId, companyId, userId, importType, rows, skipValidation) {
    try {
        await ImportExport_1.ImportExportModel.updateImportJob(jobId, companyId, { status: 'processing' });
        let processed = 0;
        let successful = 0;
        let failed = 0;
        const errors = [];
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            processed++;
            try {
                // Validate row
                let rowErrors = [];
                if (!skipValidation) {
                    switch (importType) {
                        case 'vehicles':
                            rowErrors = ImportExport_1.ImportExportModel.validateVehicleRow(row, i);
                            break;
                        case 'drivers':
                            rowErrors = ImportExport_1.ImportExportModel.validateDriverRow(row, i);
                            break;
                        case 'inventory':
                            rowErrors = ImportExport_1.ImportExportModel.validateInventoryRow(row, i);
                            break;
                    }
                }
                if (rowErrors.length > 0) {
                    errors.push(...rowErrors);
                    failed++;
                    continue;
                }
                // Import row
                switch (importType) {
                    case 'vehicles':
                        await importVehicle(companyId, row);
                        break;
                    case 'drivers':
                        await importDriver(companyId, row);
                        break;
                    case 'inventory':
                        await importInventoryItem(companyId, userId, row);
                        break;
                }
                successful++;
            }
            catch (error) {
                errors.push({
                    row: i + 2,
                    field: 'general',
                    value: null,
                    message: error.message || 'Import failed',
                });
                failed++;
            }
            // Update progress every 10 rows
            if (processed % 10 === 0) {
                await ImportExport_1.ImportExportModel.updateImportJob(jobId, companyId, {
                    processedRows: processed,
                    successfulRows: successful,
                    failedRows: failed,
                    errors: errors.slice(-100), // Keep last 100 errors
                });
            }
        }
        // Final update
        await ImportExport_1.ImportExportModel.updateImportJob(jobId, companyId, {
            status: failed > 0 && failed === processed ? 'failed' : 'completed',
            processedRows: processed,
            successfulRows: successful,
            failedRows: failed,
            errors: errors.slice(-100),
        });
    }
    catch (error) {
        console.error('Import job failed:', error);
        await ImportExport_1.ImportExportModel.updateImportJob(jobId, companyId, {
            status: 'failed',
            errors: [{ row: 0, field: 'general', value: null, message: 'Job processing failed' }],
        });
    }
}
async function importVehicle(companyId, row) {
    // Check if vehicle exists
    const existing = await (0, database_1.query)('SELECT id FROM vehicles WHERE registration_number = $1 AND company_id = $2', [row.registration_number, companyId]);
    if (existing.length > 0) {
        // Update existing
        await (0, database_1.query)(`UPDATE vehicles SET 
        make = $1, model = $2, year = $3, type = $4, fuel_type = $5, 
        fuel_capacity = $6, engine_capacity = $7, color = $8, vin = $9,
        engine_number = $10, purchase_price = $11, updated_at = NOW()
       WHERE id = $12`, [row.make, row.model, row.year, row.type, row.fuel_type,
            row.fuel_capacity, row.engine_capacity, row.color, row.vin,
            row.engine_number, row.purchase_price, existing[0].id]);
    }
    else {
        // Create new
        await (0, database_1.query)(`INSERT INTO vehicles (company_id, registration_number, make, model, year, type, 
       fuel_type, fuel_capacity, engine_capacity, color, vin, engine_number, 
       purchase_date, purchase_price, current_odometer, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`, [companyId, row.registration_number, row.make, row.model, row.year, row.type || 'car',
            row.fuel_type, row.fuel_capacity, row.engine_capacity, row.color, row.vin,
            row.engine_number, row.purchase_date, row.purchase_price,
            row.current_odometer || 0, row.status || 'available']);
    }
}
async function importDriver(companyId, row) {
    const existing = await (0, database_1.query)('SELECT id FROM drivers WHERE license_number = $1 AND company_id = $2', [row.license_number, companyId]);
    if (existing.length > 0) {
        await (0, database_1.query)(`UPDATE drivers SET 
        first_name = $1, last_name = $2, email = $3, phone = $4,
        license_class = $5, license_expiry = $6, department = $7, updated_at = NOW()
       WHERE id = $8`, [row.first_name, row.last_name, row.email, row.phone,
            row.license_class, row.license_expiry, row.department, existing[0].id]);
    }
    else {
        await (0, database_1.query)(`INSERT INTO drivers (company_id, first_name, last_name, email, phone, employee_id,
       license_number, license_class, license_expiry, employment_status, department)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`, [companyId, row.first_name, row.last_name, row.email, row.phone, row.employee_id,
            row.license_number, row.license_class, row.license_expiry,
            row.employment_status || 'active', row.department]);
    }
}
async function importInventoryItem(companyId, userId, row) {
    // Get or create category
    let categoryId = null;
    if (row.category) {
        const catRows = await (0, database_1.query)('SELECT id FROM inventory_categories WHERE name = $1 AND company_id = $2', [row.category, companyId]);
        if (catRows.length > 0) {
            categoryId = catRows[0].id;
        }
    }
    const existing = await (0, database_1.query)('SELECT id FROM inventory_items WHERE sku = $1 AND company_id = $2', [row.sku, companyId]);
    if (existing.length > 0) {
        await (0, database_1.query)(`UPDATE inventory_items SET 
        name = $1, description = $2, category_id = $3, unit_of_measure = $4,
        unit_price = $5, reorder_level = $6, reorder_quantity = $7,
        supplier_name = $8, supplier_contact = $9, location = $10, updated_at = NOW()
       WHERE id = $11`, [row.name, row.description, categoryId, row.unit_of_measure,
            row.unit_price, row.reorder_level, row.reorder_quantity,
            row.supplier_name, row.supplier_contact, row.location, existing[0].id]);
    }
    else {
        await (0, database_1.query)(`INSERT INTO inventory_items (company_id, sku, name, description, category_id,
       unit_of_measure, unit_price, current_stock, reorder_level, reorder_quantity,
       supplier_name, supplier_contact, location, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`, [companyId, row.sku, row.name, row.description, categoryId,
            row.unit_of_measure, row.unit_price || 0, row.current_stock || 0,
            row.reorder_level || 0, row.reorder_quantity || 0,
            row.supplier_name, row.supplier_contact, row.location, userId]);
    }
}
async function processExportJob(jobId, companyId, exportType, format, filters) {
    try {
        await ImportExport_1.ImportExportModel.updateExportJob(jobId, companyId, { status: 'processing' });
        let data = [];
        let headers = [];
        switch (exportType) {
            case 'vehicles':
                const vehicles = await (0, database_1.query)('SELECT * FROM vehicles WHERE company_id = $1 ORDER BY created_at DESC', [companyId]);
                data = vehicles;
                headers = ['registration_number', 'make', 'model', 'year', 'type', 'fuel_type', 'status'];
                break;
            case 'drivers':
                const drivers = await (0, database_1.query)('SELECT * FROM drivers WHERE company_id = $1 ORDER BY created_at DESC', [companyId]);
                data = drivers;
                headers = ['first_name', 'last_name', 'email', 'license_number', 'employment_status'];
                break;
            case 'inventory':
                const items = await (0, database_1.query)(`SELECT i.*, c.name as category_name 
           FROM inventory_items i 
           LEFT JOIN inventory_categories c ON i.category_id = c.id 
           WHERE i.company_id = $1 ORDER BY i.created_at DESC`, [companyId]);
                data = items;
                headers = ['sku', 'name', 'category_name', 'current_stock', 'unit_price'];
                break;
            default:
                throw new Error('Invalid export type');
        }
        // Generate CSV
        let csv = headers.join(',') + '\n';
        for (const row of data) {
            const values = headers.map(h => {
                const val = row[h] || '';
                return `"${String(val).replace(/"/g, '""')}"`;
            });
            csv += values.join(',') + '\n';
        }
        // In production, upload to S3/cloud storage and store URL
        // For now, we'll store in a temp location
        const fileUrl = `/temp/exports/${jobId}.${format}`;
        await ImportExport_1.ImportExportModel.updateExportJob(jobId, companyId, {
            status: 'completed',
            rowCount: data.length,
            fileUrl,
        });
    }
    catch (error) {
        console.error('Export job failed:', error);
        await ImportExport_1.ImportExportModel.updateExportJob(jobId, companyId, { status: 'failed' });
    }
}
exports.default = router;
//# sourceMappingURL=importExport.js.map