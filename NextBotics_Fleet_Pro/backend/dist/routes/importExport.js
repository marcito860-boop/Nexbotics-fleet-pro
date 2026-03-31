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
                case 'maintenance_records':
                    rowErrors = ImportExport_1.ImportExportModel.validateMaintenanceRecordRow(rows[i], i);
                    break;
                case 'fuel_records':
                    rowErrors = ImportExport_1.ImportExportModel.validateFuelRecordRow(rows[i], i);
                    break;
                case 'routes':
                    rowErrors = ImportExport_1.ImportExportModel.validateRouteRow(rows[i], i);
                    break;
                case 'accidents':
                    rowErrors = ImportExport_1.ImportExportModel.validateAccidentRow(rows[i], i);
                    break;
                case 'staff':
                    rowErrors = ImportExport_1.ImportExportModel.validateStaffRow(rows[i], i);
                    break;
                case 'service_providers':
                    rowErrors = ImportExport_1.ImportExportModel.validateServiceProviderRow(rows[i], i);
                    break;
                case 'spare_parts':
                    rowErrors = ImportExport_1.ImportExportModel.validateSparePartRow(rows[i], i);
                    break;
                case 'maintenance_schedules':
                    rowErrors = ImportExport_1.ImportExportModel.validateMaintenanceScheduleRow(rows[i], i);
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
            case 'maintenance_records':
                headers = ['vehicle_registration', 'service_type', 'category', 'title', 'description',
                    'provider_name', 'scheduled_date', 'completed_date', 'service_mileage',
                    'next_service_mileage', 'labor_cost', 'parts_cost', 'other_cost',
                    'status', 'technician_name', 'invoice_number', 'warranty_months', 'notes'];
                break;
            case 'fuel_records':
                headers = ['vehicle_registration', 'date', 'liters', 'cost', 'odometer', 'fuel_station', 'notes'];
                break;
            case 'routes':
                headers = ['vehicle_registration', 'route_date', 'route_name', 'driver1_name', 'driver2_name',
                    'target_km', 'actual_km', 'target_fuel_consumption', 'actual_fuel', 'comments'];
                break;
            case 'accidents':
                headers = ['vehicle_registration', 'accident_date', 'location', 'description', 'severity',
                    'damage_cost', 'insurance_claim_number', 'driver_name', 'status'];
                break;
            case 'staff':
                headers = ['staff_no', 'staff_name', 'email', 'phone', 'designation', 'department', 'branch', 'role', 'comments'];
                break;
            case 'service_providers':
                headers = ['name', 'type', 'contact_person', 'phone', 'email', 'address', 'city', 'country',
                    'tax_id', 'specialties', 'notes'];
                break;
            case 'spare_parts':
                headers = ['part_number', 'name', 'description', 'category', 'manufacturer', 'unit_cost',
                    'quantity_in_stock', 'reorder_level', 'unit_of_measure', 'supplier_name'];
                break;
            case 'maintenance_schedules':
                headers = ['vehicle_registration', 'schedule_type', 'service_type', 'title', 'description',
                    'interval_mileage', 'interval_months', 'estimated_cost', 'priority'];
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
// Helper function to get value from row with flexible column names
function getValue(row, possibleNames) {
    for (const name of possibleNames) {
        // Try normalized name first (lowercase, underscores)
        const normalized = name.toLowerCase().trim().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
        if (row[normalized] !== undefined && row[normalized] !== '') {
            return row[normalized];
        }
        // Also try exact match
        if (row[name] !== undefined && row[name] !== '') {
            return row[name];
        }
    }
    return undefined;
}
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
                        case 'maintenance_records':
                            rowErrors = ImportExport_1.ImportExportModel.validateMaintenanceRecordRow(row, i);
                            break;
                        case 'fuel_records':
                            rowErrors = ImportExport_1.ImportExportModel.validateFuelRecordRow(row, i);
                            break;
                        case 'routes':
                            rowErrors = ImportExport_1.ImportExportModel.validateRouteRow(row, i);
                            break;
                        case 'accidents':
                            rowErrors = ImportExport_1.ImportExportModel.validateAccidentRow(row, i);
                            break;
                        case 'staff':
                            rowErrors = ImportExport_1.ImportExportModel.validateStaffRow(row, i);
                            break;
                        case 'service_providers':
                            rowErrors = ImportExport_1.ImportExportModel.validateServiceProviderRow(row, i);
                            break;
                        case 'spare_parts':
                            rowErrors = ImportExport_1.ImportExportModel.validateSparePartRow(row, i);
                            break;
                        case 'maintenance_schedules':
                            rowErrors = ImportExport_1.ImportExportModel.validateMaintenanceScheduleRow(row, i);
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
                    case 'maintenance_records':
                        await importMaintenanceRecord(companyId, row);
                        break;
                    case 'fuel_records':
                        await importFuelRecord(companyId, row);
                        break;
                    case 'routes':
                        await importRoute(companyId, row);
                        break;
                    case 'accidents':
                        await importAccident(companyId, row);
                        break;
                    case 'staff':
                        await importStaff(companyId, row);
                        break;
                    case 'service_providers':
                        await importServiceProvider(companyId, row);
                        break;
                    case 'spare_parts':
                        await importSparePart(companyId, row);
                        break;
                    case 'maintenance_schedules':
                        await importMaintenanceSchedule(companyId, row);
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
    const regNumber = getValue(row, ['registration_number', 'reg_number', 'registration', 'reg_no', 'plate', 'license_plate']);
    const make = getValue(row, ['make', 'manufacturer', 'brand']) || '';
    const model = getValue(row, ['model', 'model_name', 'vehicle_model']) || '';
    const year = getValue(row, ['year', 'year_of_manufacture', 'manufacture_year', 'model_year']);
    const type = getValue(row, ['type', 'vehicle_type', 'category']) || 'car';
    const fuelType = getValue(row, ['fuel_type', 'fuel', 'fuel_category']);
    const fuelCapacity = getValue(row, ['fuel_capacity', 'fuel_tank_capacity', 'tank_capacity']);
    const engineCapacity = getValue(row, ['engine_capacity', 'engine_size', 'displacement']);
    const color = getValue(row, ['color', 'colour', 'paint']);
    const vin = getValue(row, ['vin', 'chassis_number', 'vehicle_id']);
    const engineNumber = getValue(row, ['engine_number', 'engine_no']);
    const purchaseDate = getValue(row, ['purchase_date', 'date_purchased', 'acquisition_date']);
    const purchasePrice = getValue(row, ['purchase_price', 'cost', 'price', 'value']);
    const currentOdometer = getValue(row, ['current_odometer', 'odometer', 'mileage', 'km']);
    const status = getValue(row, ['status', 'state', 'condition']) || 'available';
    // Check if vehicle exists
    const existing = await (0, database_1.query)('SELECT id FROM vehicles WHERE registration_number = $1 AND company_id = $2', [regNumber, companyId]);
    if (existing.length > 0) {
        // Update existing
        await (0, database_1.query)(`UPDATE vehicles SET 
        make = $1, model = $2, year = $3, type = $4, fuel_type = $5, 
        fuel_capacity = $6, engine_capacity = $7, color = $8, vin = $9,
        engine_number = $10, purchase_price = $11, updated_at = NOW()
       WHERE id = $12`, [make, model, year ? parseInt(year) : null, type, fuelType,
            fuelCapacity ? parseFloat(fuelCapacity) : null,
            engineCapacity ? parseFloat(engineCapacity) : null,
            color, vin, engineNumber,
            purchasePrice ? parseFloat(purchasePrice) : null,
            existing[0].id]);
    }
    else {
        // Create new
        await (0, database_1.query)(`INSERT INTO vehicles (company_id, registration_number, make, model, year, type, 
       fuel_type, fuel_capacity, engine_capacity, color, vin, engine_number, 
       purchase_date, purchase_price, current_odometer, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`, [companyId, regNumber, make, model, year ? parseInt(year) : null, type,
            fuelType,
            fuelCapacity ? parseFloat(fuelCapacity) : null,
            engineCapacity ? parseFloat(engineCapacity) : null,
            color, vin,
            engineNumber, purchaseDate,
            purchasePrice ? parseFloat(purchasePrice) : null,
            currentOdometer ? parseFloat(currentOdometer) : 0,
            status]);
    }
}
async function importDriver(companyId, row) {
    const firstName = getValue(row, ['first_name', 'firstname', 'fname', 'given_name']) || '';
    const lastName = getValue(row, ['last_name', 'lastname', 'lname', 'surname', 'family_name']) || '';
    const email = getValue(row, ['email', 'email_address', 'e-mail']);
    const phone = getValue(row, ['phone', 'mobile', 'telephone', 'contact']);
    const employeeId = getValue(row, ['employee_id', 'employee_no', 'emp_id', 'staff_id']);
    const licenseNumber = getValue(row, ['license_number', 'license_no', 'licence_number', 'driving_license', 'dl_number']) || '';
    const licenseClass = getValue(row, ['license_class', 'licence_class', 'dl_class']);
    const licenseExpiry = getValue(row, ['license_expiry', 'license_expiry_date', 'licence_expiry']);
    const employmentStatus = getValue(row, ['employment_status', 'status', 'employee_status']) || 'active';
    const department = getValue(row, ['department', 'dept', 'division']);
    const existing = await (0, database_1.query)('SELECT id FROM drivers WHERE license_number = $1 AND company_id = $2', [licenseNumber, companyId]);
    if (existing.length > 0) {
        await (0, database_1.query)(`UPDATE drivers SET 
        first_name = $1, last_name = $2, email = $3, phone = $4,
        license_class = $5, license_expiry = $6, department = $7, updated_at = NOW()
       WHERE id = $8`, [firstName, lastName, email, phone, licenseClass, licenseExpiry, department, existing[0].id]);
    }
    else {
        await (0, database_1.query)(`INSERT INTO drivers (company_id, first_name, last_name, email, phone, employee_id,
       license_number, license_class, license_expiry, employment_status, department)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`, [companyId, firstName, lastName, email, phone, employeeId,
            licenseNumber, licenseClass, licenseExpiry, employmentStatus, department]);
    }
}
async function importInventoryItem(companyId, userId, row) {
    const sku = getValue(row, ['sku', 'item_code', 'product_code', 'code', 'part_number']);
    const name = getValue(row, ['name', 'item_name', 'product_name', 'description']);
    const description = getValue(row, ['description', 'desc', 'details']);
    const category = getValue(row, ['category', 'item_category', 'product_category']);
    const unitOfMeasure = getValue(row, ['unit_of_measure', 'uom', 'unit', 'measure']);
    const unitPrice = getValue(row, ['unit_price', 'price', 'cost', 'unit_cost']);
    const currentStock = getValue(row, ['current_stock', 'stock', 'quantity', 'qty', 'in_stock']);
    const reorderLevel = getValue(row, ['reorder_level', 'reorder_point', 'min_stock']);
    const reorderQuantity = getValue(row, ['reorder_quantity', 'reorder_qty', 'order_qty']);
    const supplierName = getValue(row, ['supplier_name', 'supplier', 'vendor', 'provider']);
    const supplierContact = getValue(row, ['supplier_contact', 'supplier_phone', 'vendor_contact']);
    const location = getValue(row, ['location', 'storage_location', 'warehouse', 'bin']);
    // Get or create category
    let categoryId = null;
    if (category) {
        const catRows = await (0, database_1.query)('SELECT id FROM inventory_categories WHERE name = $1 AND company_id = $2', [category, companyId]);
        if (catRows.length > 0) {
            categoryId = catRows[0].id;
        }
    }
    const existing = await (0, database_1.query)('SELECT id FROM inventory_items WHERE sku = $1 AND company_id = $2', [sku, companyId]);
    if (existing.length > 0) {
        await (0, database_1.query)(`UPDATE inventory_items SET 
        name = $1, description = $2, category_id = $3, unit_of_measure = $4,
        unit_price = $5, reorder_level = $6, reorder_quantity = $7,
        supplier_name = $8, supplier_contact = $9, location = $10, updated_at = NOW()
       WHERE id = $11`, [name, description, categoryId, unitOfMeasure,
            unitPrice ? parseFloat(unitPrice) : 0,
            reorderLevel ? parseInt(reorderLevel) : 0,
            reorderQuantity ? parseInt(reorderQuantity) : 0,
            supplierName, supplierContact, location, existing[0].id]);
    }
    else {
        await (0, database_1.query)(`INSERT INTO inventory_items (company_id, sku, name, description, category_id,
       unit_of_measure, unit_price, current_stock, reorder_level, reorder_quantity,
       supplier_name, supplier_contact, location, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`, [companyId, sku, name, description, categoryId,
            unitOfMeasure, unitPrice ? parseFloat(unitPrice) : 0,
            currentStock ? parseInt(currentStock) : 0,
            reorderLevel ? parseInt(reorderLevel) : 0,
            reorderQuantity ? parseInt(reorderQuantity) : 0,
            supplierName, supplierContact, location, userId]);
    }
}
async function importMaintenanceRecord(companyId, row) {
    const vehicleReg = getValue(row, ['vehicle_registration', 'registration', 'vehicle_reg', 'reg_number', 'plate']);
    const serviceType = getValue(row, ['service_type', 'type', 'maintenance_type']) || 'preventive';
    const category = getValue(row, ['category', 'maintenance_category']);
    const title = getValue(row, ['title', 'service_title', 'job_title']);
    const description = getValue(row, ['description', 'desc', 'details']);
    const providerName = getValue(row, ['provider_name', 'provider', 'vendor', 'garage', 'workshop']);
    const scheduledDate = getValue(row, ['scheduled_date', 'schedule_date', 'planned_date']);
    const completedDate = getValue(row, ['completed_date', 'completion_date', 'done_date']);
    const serviceMileage = getValue(row, ['service_mileage', 'mileage', 'odometer', 'km']);
    const nextServiceMileage = getValue(row, ['next_service_mileage', 'next_mileage']);
    const laborCost = getValue(row, ['labor_cost', 'labour_cost', 'labor']);
    const partsCost = getValue(row, ['parts_cost', 'parts']);
    const otherCost = getValue(row, ['other_cost', 'other']);
    const status = getValue(row, ['status', 'state']) || 'completed';
    const technicianName = getValue(row, ['technician_name', 'technician', 'mechanic']);
    const warrantyMonths = getValue(row, ['warranty_months', 'warranty']);
    const invoiceNumber = getValue(row, ['invoice_number', 'invoice', 'receipt_no']);
    const notes = getValue(row, ['notes', 'comments', 'remarks']);
    // Look up vehicle by registration number
    const vehicleRows = await (0, database_1.query)('SELECT id FROM vehicles WHERE registration_number = $1 AND company_id = $2', [vehicleReg, companyId]);
    if (vehicleRows.length === 0) {
        throw new Error(`Vehicle with registration "${vehicleReg}" not found`);
    }
    const vehicleId = vehicleRows[0].id;
    // Calculate warranty expiry if provided
    let warrantyExpiry = null;
    if (warrantyMonths && completedDate) {
        warrantyExpiry = new Date(completedDate);
        warrantyExpiry.setMonth(warrantyExpiry.getMonth() + parseInt(warrantyMonths));
    }
    // Look up provider by name if provided
    let providerId = null;
    if (providerName) {
        const providerRows = await (0, database_1.query)('SELECT id FROM service_providers WHERE name = $1 AND company_id = $2', [providerName, companyId]);
        if (providerRows.length > 0) {
            providerId = providerRows[0].id;
        }
    }
    // Insert maintenance record
    const recordResult = await (0, database_1.query)(`INSERT INTO maintenance_records (
      company_id, vehicle_id, service_type, category, title, description,
      provider_id, provider_name, scheduled_date, completed_date,
      service_mileage, next_service_mileage, labor_cost, parts_cost, other_cost,
      status, technician_name, warranty_months, warranty_expiry, invoice_number, notes
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
    RETURNING id`, [
        companyId,
        vehicleId,
        serviceType.toLowerCase(),
        category,
        title,
        description || null,
        providerId,
        providerName || null,
        scheduledDate || null,
        completedDate || null,
        serviceMileage ? parseFloat(serviceMileage) : null,
        nextServiceMileage ? parseFloat(nextServiceMileage) : null,
        laborCost ? parseFloat(laborCost) : 0,
        partsCost ? parseFloat(partsCost) : 0,
        otherCost ? parseFloat(otherCost) : 0,
        status.toLowerCase() || 'completed',
        technicianName || null,
        warrantyMonths ? parseInt(warrantyMonths) : null,
        warrantyExpiry,
        invoiceNumber || null,
        notes || null,
    ]);
    // If completed, update vehicle mileage
    if (completedDate && serviceMileage) {
        await (0, database_1.query)('UPDATE vehicles SET current_mileage = $1, last_service_date = $2, updated_at = NOW() WHERE id = $3', [parseFloat(serviceMileage), completedDate, vehicleId]);
    }
}
async function importFuelRecord(companyId, row) {
    const vehicleReg = getValue(row, ['vehicle_registration', 'registration', 'vehicle_reg', 'reg_number', 'plate']);
    const date = getValue(row, ['date', 'fuel_date', 'transaction_date']);
    const liters = getValue(row, ['liters', 'quantity', 'qty', 'volume']);
    const cost = getValue(row, ['cost', 'amount', 'total', 'price']);
    const odometerVal = getValue(row, ['odometer', 'mileage', 'km']);
    const fuelStation = getValue(row, ['fuel_station', 'station', 'vendor', 'supplier']);
    const notes = getValue(row, ['notes', 'comments', 'remarks']);
    // Look up vehicle by registration number
    const vehicleRows = await (0, database_1.query)('SELECT id, current_mileage FROM vehicles WHERE registration_number = $1 AND company_id = $2', [vehicleReg, companyId]);
    if (vehicleRows.length === 0) {
        throw new Error(`Vehicle with registration "${vehicleReg}" not found`);
    }
    const vehicleId = vehicleRows[0].id;
    const odometer = odometerVal ? parseFloat(odometerVal) : vehicleRows[0].current_mileage;
    await (0, database_1.query)(`INSERT INTO fuel_records (company_id, vehicle_id, date, liters, cost, odometer, fuel_station, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`, [
        companyId,
        vehicleId,
        date,
        liters ? parseFloat(liters) : 0,
        cost ? parseFloat(cost) : 0,
        odometer,
        fuelStation || null,
        notes || null
    ]);
    // Update vehicle mileage if odometer provided
    if (odometerVal) {
        await (0, database_1.query)('UPDATE vehicles SET current_mileage = $1, updated_at = NOW() WHERE id = $2', [parseFloat(odometerVal), vehicleId]);
    }
}
async function importRoute(companyId, row) {
    const vehicleReg = getValue(row, ['vehicle_registration', 'registration', 'vehicle_reg', 'reg_number', 'plate']);
    const routeDate = getValue(row, ['route_date', 'date', 'trip_date']);
    const routeName = getValue(row, ['route_name', 'route', 'trip', 'destination']);
    const driver1Name = getValue(row, ['driver1_name', 'driver1', 'driver', 'primary_driver']);
    const driver2Name = getValue(row, ['driver2_name', 'driver2', 'secondary_driver']);
    const targetKm = getValue(row, ['target_km', 'expected_km', 'planned_km']);
    const actualKmVal = getValue(row, ['actual_km', 'km', 'distance']);
    const targetFuelConsumption = getValue(row, ['target_fuel_consumption', 'expected_fuel', 'fuel_target']);
    const actualFuelVal = getValue(row, ['actual_fuel', 'fuel_used', 'fuel_consumed']);
    const comments = getValue(row, ['comments', 'notes', 'remarks']);
    // Look up vehicle
    const vehicleRows = await (0, database_1.query)('SELECT id FROM vehicles WHERE registration_number = $1 AND company_id = $2', [vehicleReg, companyId]);
    if (vehicleRows.length === 0) {
        throw new Error(`Vehicle with registration "${vehicleReg}" not found`);
    }
    const vehicleId = vehicleRows[0].id;
    // Look up drivers by name if provided
    let driver1Id = null;
    let driver2Id = null;
    if (driver1Name) {
        const driverRows = await (0, database_1.query)(`SELECT id FROM staff WHERE staff_name = $1 AND company_id = $2 AND role = 'Driver'`, [driver1Name, companyId]);
        if (driverRows.length > 0)
            driver1Id = driverRows[0].id;
    }
    if (driver2Name) {
        const driverRows = await (0, database_1.query)(`SELECT id FROM staff WHERE staff_name = $1 AND company_id = $2 AND role = 'Driver'`, [driver2Name, companyId]);
        if (driverRows.length > 0)
            driver2Id = driverRows[0].id;
    }
    const actualKm = actualKmVal ? parseFloat(actualKmVal) : 0;
    const actualFuel = actualFuelVal ? parseFloat(actualFuelVal) : 0;
    const consumptionRate = actualFuel > 0 ? parseFloat((actualKm / actualFuel).toFixed(2)) : 0;
    await (0, database_1.query)(`INSERT INTO routes (company_id, vehicle_id, route_date, route_name, driver1_id, driver2_id,
     target_km, actual_km, target_fuel_consumption, actual_fuel, actual_consumption_rate, comments)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`, [
        companyId,
        vehicleId,
        routeDate,
        routeName,
        driver1Id,
        driver2Id,
        targetKm ? parseFloat(targetKm) : 0,
        actualKm,
        targetFuelConsumption ? parseFloat(targetFuelConsumption) : 0,
        actualFuel,
        consumptionRate,
        comments || null
    ]);
    // Update vehicle mileage
    if (actualKm > 0) {
        await (0, database_1.query)('UPDATE vehicles SET current_mileage = current_mileage + $1, updated_at = NOW() WHERE id = $2', [actualKm, vehicleId]);
    }
}
async function importAccident(companyId, row) {
    const vehicleReg = getValue(row, ['vehicle_registration', 'registration', 'vehicle_reg', 'reg_number', 'plate']);
    const accidentDate = getValue(row, ['accident_date', 'date', 'incident_date']);
    const location = getValue(row, ['location', 'place', 'gps_location']);
    const description = getValue(row, ['description', 'details', 'incident_description']);
    const severity = getValue(row, ['severity', 'severity_level']) || 'minor';
    const damageCost = getValue(row, ['damage_cost', 'cost', 'damage_amount']);
    const insuranceClaimNumber = getValue(row, ['insurance_claim_number', 'claim_number', 'claim_no']);
    const driverName = getValue(row, ['driver_name', 'driver']);
    const status = getValue(row, ['status', 'state']) || 'reported';
    // Look up vehicle
    const vehicleRows = await (0, database_1.query)('SELECT id FROM vehicles WHERE registration_number = $1 AND company_id = $2', [vehicleReg, companyId]);
    if (vehicleRows.length === 0) {
        throw new Error(`Vehicle with registration "${vehicleReg}" not found`);
    }
    const vehicleId = vehicleRows[0].id;
    // Look up driver if provided
    let driverId = null;
    if (driverName) {
        const driverRows = await (0, database_1.query)(`SELECT id FROM staff WHERE staff_name = $1 AND company_id = $2`, [driverName, companyId]);
        if (driverRows.length > 0)
            driverId = driverRows[0].id;
    }
    await (0, database_1.query)(`INSERT INTO accidents (company_id, vehicle_id, accident_date, location, description,
     severity, damage_cost, insurance_claim_number, driver_id, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`, [
        companyId,
        vehicleId,
        accidentDate,
        location,
        description,
        severity,
        damageCost ? parseFloat(damageCost) : 0,
        insuranceClaimNumber || null,
        driverId,
        status
    ]);
}
async function importStaff(companyId, row) {
    const staffNo = getValue(row, ['staff_no', 'staff_number', 'employee_id', 'emp_id', 'id']);
    const staffName = getValue(row, ['staff_name', 'name', 'employee_name', 'full_name']);
    const email = getValue(row, ['email', 'email_address']);
    const phone = getValue(row, ['phone', 'mobile', 'telephone', 'contact']);
    const designation = getValue(row, ['designation', 'position', 'title', 'job_title']);
    const department = getValue(row, ['department', 'dept', 'division']);
    const branch = getValue(row, ['branch', 'location', 'office']);
    const role = getValue(row, ['role', 'job_role', 'type']) || 'Staff';
    const comments = getValue(row, ['comments', 'notes', 'remarks']);
    const existing = await (0, database_1.query)('SELECT id FROM staff WHERE staff_no = $1 AND company_id = $2', [staffNo, companyId]);
    if (existing.length > 0) {
        await (0, database_1.query)(`UPDATE staff SET 
        staff_name = $1, email = $2, phone = $3, designation = $4,
        department = $5, branch = $6, role = $7, comments = $8, updated_at = NOW()
       WHERE id = $9`, [staffName, email || null, phone || null, designation || null,
            department || null, branch || null, role, comments || null, existing[0].id]);
    }
    else {
        await (0, database_1.query)(`INSERT INTO staff (company_id, staff_no, staff_name, email, phone, designation,
       department, branch, role, comments)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`, [companyId, staffNo, staffName, email || null, phone || null,
            designation || null, department || null, branch || null,
            role, comments || null]);
    }
}
async function importServiceProvider(companyId, row) {
    const name = getValue(row, ['name', 'provider_name', 'company_name', 'vendor_name']);
    const type = getValue(row, ['type', 'provider_type', 'category']) || 'general';
    const contactPerson = getValue(row, ['contact_person', 'contact', 'representative']);
    const phone = getValue(row, ['phone', 'mobile', 'telephone', 'contact_number']);
    const email = getValue(row, ['email', 'email_address']);
    const address = getValue(row, ['address', 'street', 'location']);
    const city = getValue(row, ['city', 'town']);
    const country = getValue(row, ['country', 'nation']) || 'China';
    const taxId = getValue(row, ['tax_id', 'tax_number', 'vat_id']);
    const specialtiesVal = getValue(row, ['specialties', 'specializations', 'services']);
    const notes = getValue(row, ['notes', 'comments', 'remarks']);
    const existing = await (0, database_1.query)('SELECT id FROM service_providers WHERE name = $1 AND company_id = $2', [name, companyId]);
    const specialties = specialtiesVal ? specialtiesVal.split(';').map((s) => s.trim()) : [];
    if (existing.length > 0) {
        await (0, database_1.query)(`UPDATE service_providers SET 
        type = $1, contact_person = $2, phone = $3, email = $4,
        address = $5, city = $6, country = $7, tax_id = $8,
        specialties = $9, notes = $10, updated_at = NOW()
       WHERE id = $11`, [type, contactPerson || null, phone || null, email || null,
            address || null, city || null, country, taxId || null,
            specialties, notes || null, existing[0].id]);
    }
    else {
        await (0, database_1.query)(`INSERT INTO service_providers (company_id, name, type, contact_person, phone, email,
       address, city, country, tax_id, specialties, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`, [companyId, name, type, contactPerson || null, phone || null,
            email || null, address || null, city || null, country,
            taxId || null, specialties, notes || null]);
    }
}
async function importSparePart(companyId, row) {
    const partNumber = getValue(row, ['part_number', 'part_no', 'sku', 'code']);
    const name = getValue(row, ['name', 'part_name', 'item_name']);
    const description = getValue(row, ['description', 'desc', 'details']);
    const category = getValue(row, ['category', 'part_category']);
    const manufacturer = getValue(row, ['manufacturer', 'brand', 'maker']);
    const unitCost = getValue(row, ['unit_cost', 'cost', 'price', 'unit_price']);
    const quantityInStock = getValue(row, ['quantity_in_stock', 'quantity', 'qty', 'stock']);
    const reorderLevel = getValue(row, ['reorder_level', 'reorder_point', 'min_stock']);
    const unitOfMeasure = getValue(row, ['unit_of_measure', 'uom', 'unit']) || 'piece';
    const supplierName = getValue(row, ['supplier_name', 'supplier', 'vendor']);
    // Look up supplier if provided
    let supplierId = null;
    if (supplierName) {
        const supplierRows = await (0, database_1.query)('SELECT id FROM service_providers WHERE name = $1 AND company_id = $2', [supplierName, companyId]);
        if (supplierRows.length > 0)
            supplierId = supplierRows[0].id;
    }
    const existing = await (0, database_1.query)('SELECT id FROM spare_parts WHERE part_number = $1 AND company_id = $2', [partNumber, companyId]);
    if (existing.length > 0) {
        await (0, database_1.query)(`UPDATE spare_parts SET 
        name = $1, description = $2, category = $3, manufacturer = $4,
        unit_cost = $5, quantity_in_stock = $6, reorder_level = $7,
        unit_of_measure = $8, supplier_id = $9, updated_at = NOW()
       WHERE id = $10`, [name, description || null, category, manufacturer || null,
            unitCost ? parseFloat(unitCost) : 0,
            quantityInStock ? parseInt(quantityInStock) : 0,
            reorderLevel ? parseInt(reorderLevel) : 10,
            unitOfMeasure, supplierId, existing[0].id]);
    }
    else {
        await (0, database_1.query)(`INSERT INTO spare_parts (company_id, part_number, name, description, category,
       manufacturer, unit_cost, quantity_in_stock, reorder_level, unit_of_measure, supplier_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`, [companyId, partNumber, name, description || null, category,
            manufacturer || null, unitCost ? parseFloat(unitCost) : 0,
            quantityInStock ? parseInt(quantityInStock) : 0,
            reorderLevel ? parseInt(reorderLevel) : 10,
            unitOfMeasure, supplierId]);
    }
}
async function importMaintenanceSchedule(companyId, row) {
    const vehicleReg = getValue(row, ['vehicle_registration', 'registration', 'vehicle_reg', 'plate']);
    const scheduleType = getValue(row, ['schedule_type', 'type']) || 'mileage_based';
    const serviceType = getValue(row, ['service_type', 'maintenance_type']);
    const serviceName = getValue(row, ['service_name', 'name', 'title']);
    const description = getValue(row, ['description', 'desc']);
    const intervalMileage = getValue(row, ['interval_mileage', 'mileage_interval']);
    const intervalMonths = getValue(row, ['interval_months', 'months_interval']);
    const estimatedCost = getValue(row, ['estimated_cost', 'cost', 'estimated_price']);
    const priority = getValue(row, ['priority', 'urgency']) || 'medium';
    // Look up vehicle
    const vehicleRows = await (0, database_1.query)('SELECT id, current_mileage FROM vehicles WHERE registration_number = $1 AND company_id = $2', [vehicleReg, companyId]);
    if (vehicleRows.length === 0) {
        throw new Error(`Vehicle with registration "${vehicleReg}" not found`);
    }
    const vehicleId = vehicleRows[0].id;
    const currentMileage = vehicleRows[0].current_mileage || 0;
    // Calculate next service date and mileage
    let nextServiceDate = null;
    let nextServiceMileage = null;
    if (intervalMonths) {
        const date = new Date();
        date.setMonth(date.getMonth() + parseInt(intervalMonths));
        nextServiceDate = date;
    }
    if (intervalMileage) {
        nextServiceMileage = currentMileage + parseInt(intervalMileage);
    }
    await (0, database_1.query)(`INSERT INTO maintenance_schedules (company_id, vehicle_id, schedule_type, service_type,
     service_name, description, interval_mileage, last_service_mileage, next_service_km,
     interval_months, next_service_date, estimated_cost, priority)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`, [
        companyId,
        vehicleId,
        scheduleType,
        serviceType,
        serviceName,
        description || null,
        intervalMileage ? parseInt(intervalMileage) : null,
        currentMileage,
        nextServiceMileage,
        intervalMonths ? parseInt(intervalMonths) : null,
        nextServiceDate,
        estimatedCost ? parseFloat(estimatedCost) : null,
        priority
    ]);
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
            case 'maintenance_records':
                const records = await (0, database_1.query)(`SELECT mr.*, v.registration_number as vehicle_registration
           FROM maintenance_records mr
           JOIN vehicles v ON mr.vehicle_id = v.id
           WHERE mr.company_id = $1 ORDER BY mr.created_at DESC`, [companyId]);
                data = records;
                headers = ['vehicle_registration', 'service_type', 'category', 'title', 'completed_date',
                    'service_mileage', 'total_cost', 'status', 'technician_name'];
                break;
            case 'fuel_records':
                const fuelRecords = await (0, database_1.query)(`SELECT fr.*, v.registration_number as vehicle_registration
           FROM fuel_records fr
           JOIN vehicles v ON fr.vehicle_id = v.id
           WHERE fr.company_id = $1 ORDER BY fr.date DESC`, [companyId]);
                data = fuelRecords;
                headers = ['vehicle_registration', 'date', 'liters', 'cost', 'odometer', 'fuel_station'];
                break;
            case 'routes':
                const routes = await (0, database_1.query)(`SELECT r.*, v.registration_number as vehicle_registration,
            d1.staff_name as driver1_name, d2.staff_name as driver2_name
           FROM routes r
           JOIN vehicles v ON r.vehicle_id = v.id
           LEFT JOIN staff d1 ON d1.id = r.driver1_id
           LEFT JOIN staff d2 ON d2.id = r.driver2_id
           WHERE r.company_id = $1 ORDER BY r.route_date DESC`, [companyId]);
                data = routes;
                headers = ['vehicle_registration', 'route_date', 'route_name', 'driver1_name', 'driver2_name',
                    'actual_km', 'actual_fuel', 'actual_consumption_rate'];
                break;
            case 'accidents':
                const accidents = await (0, database_1.query)(`SELECT a.*, v.registration_number as vehicle_registration,
            s.staff_name as driver_name
           FROM accidents a
           JOIN vehicles v ON a.vehicle_id = v.id
           LEFT JOIN staff s ON s.id = a.driver_id
           WHERE a.company_id = $1 ORDER BY a.accident_date DESC`, [companyId]);
                data = accidents;
                headers = ['vehicle_registration', 'accident_date', 'location', 'severity',
                    'damage_cost', 'driver_name', 'status'];
                break;
            case 'staff':
                const staff = await (0, database_1.query)('SELECT * FROM staff WHERE company_id = $1 ORDER BY created_at DESC', [companyId]);
                data = staff;
                headers = ['staff_no', 'staff_name', 'email', 'phone', 'designation', 'department', 'role'];
                break;
            case 'service_providers':
                const providers = await (0, database_1.query)('SELECT * FROM service_providers WHERE company_id = $1 ORDER BY name ASC', [companyId]);
                data = providers;
                headers = ['name', 'type', 'contact_person', 'phone', 'email', 'city', 'country', 'is_approved'];
                break;
            case 'spare_parts':
                const parts = await (0, database_1.query)(`SELECT sp.*, p.name as supplier_name
           FROM spare_parts sp
           LEFT JOIN service_providers p ON p.id = sp.supplier_id
           WHERE sp.company_id = $1 ORDER BY sp.name ASC`, [companyId]);
                data = parts;
                headers = ['part_number', 'name', 'category', 'quantity_in_stock', 'unit_cost', 'supplier_name'];
                break;
            case 'maintenance_schedules':
                const schedules = await (0, database_1.query)(`SELECT ms.*, v.registration_number as vehicle_registration
           FROM maintenance_schedules ms
           JOIN vehicles v ON ms.vehicle_id = v.id
           WHERE ms.company_id = $1 ORDER BY ms.next_service_date ASC`, [companyId]);
                data = schedules;
                headers = ['vehicle_registration', 'schedule_type', 'service_type', 'title',
                    'next_service_date', 'next_service_km', 'status', 'priority'];
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