"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImportExportModel = void 0;
const database_1 = require("../database");
class ImportExportModel {
    // ============================================
    // IMPORT JOBS
    // ============================================
    static async createImportJob(companyId, createdBy, importType, fileName, previewData) {
        const rows = await (0, database_1.query)(`INSERT INTO import_jobs (company_id, import_type, file_name, total_rows, preview_data, created_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`, [companyId, importType, fileName, previewData?.length || 0,
            previewData ? JSON.stringify(previewData) : null, createdBy]);
        return this.mapImportJobRow(rows[0]);
    }
    static async updateImportJob(id, companyId, updates) {
        const setClause = [];
        const values = [];
        let paramIndex = 1;
        if (updates.status) {
            setClause.push(`status = $${paramIndex++}`);
            values.push(updates.status);
        }
        if (updates.processedRows !== undefined) {
            setClause.push(`processed_rows = $${paramIndex++}`);
            values.push(updates.processedRows);
        }
        if (updates.successfulRows !== undefined) {
            setClause.push(`successful_rows = $${paramIndex++}`);
            values.push(updates.successfulRows);
        }
        if (updates.failedRows !== undefined) {
            setClause.push(`failed_rows = $${paramIndex++}`);
            values.push(updates.failedRows);
        }
        if (updates.errors) {
            setClause.push(`errors = $${paramIndex++}`);
            values.push(JSON.stringify(updates.errors));
        }
        if (updates.status === 'completed' || updates.status === 'failed') {
            setClause.push(`completed_at = NOW()`);
        }
        if (setClause.length === 0)
            return null;
        values.push(id, companyId);
        const rows = await (0, database_1.query)(`UPDATE import_jobs SET ${setClause.join(', ')} 
       WHERE id = $${paramIndex++} AND company_id = $${paramIndex++}
       RETURNING *`, values);
        return rows.length > 0 ? this.mapImportJobRow(rows[0]) : null;
    }
    static async findImportJobById(id, companyId) {
        const rows = await (0, database_1.query)('SELECT * FROM import_jobs WHERE id = $1 AND company_id = $2', [id, companyId]);
        return rows.length > 0 ? this.mapImportJobRow(rows[0]) : null;
    }
    static async findImportJobsByCompany(companyId, limit = 50) {
        const rows = await (0, database_1.query)('SELECT * FROM import_jobs WHERE company_id = $1 ORDER BY created_at DESC LIMIT $2', [companyId, limit]);
        return rows.map(this.mapImportJobRow);
    }
    // ============================================
    // EXPORT JOBS
    // ============================================
    static async createExportJob(companyId, createdBy, exportType, format, filters) {
        const rows = await (0, database_1.query)(`INSERT INTO export_jobs (company_id, export_type, format, filters, created_by)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`, [companyId, exportType, format, filters ? JSON.stringify(filters) : null, createdBy]);
        return this.mapExportJobRow(rows[0]);
    }
    static async updateExportJob(id, companyId, updates) {
        const setClause = [];
        const values = [];
        let paramIndex = 1;
        if (updates.status) {
            setClause.push(`status = $${paramIndex++}`);
            values.push(updates.status);
        }
        if (updates.rowCount !== undefined) {
            setClause.push(`row_count = $${paramIndex++}`);
            values.push(updates.rowCount);
        }
        if (updates.fileUrl) {
            setClause.push(`file_url = $${paramIndex++}`);
            values.push(updates.fileUrl);
        }
        if (updates.status === 'completed' || updates.status === 'failed') {
            setClause.push(`completed_at = NOW()`);
        }
        if (setClause.length === 0)
            return null;
        values.push(id, companyId);
        const rows = await (0, database_1.query)(`UPDATE export_jobs SET ${setClause.join(', ')} 
       WHERE id = $${paramIndex++} AND company_id = $${paramIndex++}
       RETURNING *`, values);
        return rows.length > 0 ? this.mapExportJobRow(rows[0]) : null;
    }
    static async findExportJobById(id, companyId) {
        const rows = await (0, database_1.query)('SELECT * FROM export_jobs WHERE id = $1 AND company_id = $2', [id, companyId]);
        return rows.length > 0 ? this.mapExportJobRow(rows[0]) : null;
    }
    static async findExportJobsByCompany(companyId, limit = 50) {
        const rows = await (0, database_1.query)('SELECT * FROM export_jobs WHERE company_id = $1 ORDER BY created_at DESC LIMIT $2', [companyId, limit]);
        return rows.map(this.mapExportJobRow);
    }
    // ============================================
    // CSV PARSING & VALIDATION
    // ============================================
    static parseCSV(csvContent) {
        const lines = csvContent.split('\n').filter(line => line.trim());
        if (lines.length < 2)
            throw new Error('CSV must have at least a header row and one data row');
        const headers = this.parseCSVLine(lines[0]);
        const rows = [];
        for (let i = 1; i < lines.length; i++) {
            const values = this.parseCSVLine(lines[i]);
            const row = {};
            headers.forEach((header, index) => {
                row[header.trim()] = values[index]?.trim() || '';
            });
            rows.push(row);
        }
        return { headers, rows };
    }
    static parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        for (const char of line) {
            if (char === '"') {
                inQuotes = !inQuotes;
            }
            else if (char === ',' && !inQuotes) {
                result.push(current);
                current = '';
            }
            else {
                current += char;
            }
        }
        result.push(current);
        return result;
    }
    // ============================================
    // VALIDATION HELPERS
    // ============================================
    static validateVehicleRow(row, index) {
        const errors = [];
        if (!row.registration_number?.trim()) {
            errors.push({ row: index + 2, field: 'registration_number', value: row.registration_number, message: 'Registration number is required' });
        }
        if (!row.make?.trim()) {
            errors.push({ row: index + 2, field: 'make', value: row.make, message: 'Make is required' });
        }
        if (!row.model?.trim()) {
            errors.push({ row: index + 2, field: 'model', value: row.model, message: 'Model is required' });
        }
        if (row.year && (isNaN(parseInt(row.year)) || parseInt(row.year) < 1900 || parseInt(row.year) > new Date().getFullYear() + 1)) {
            errors.push({ row: index + 2, field: 'year', value: row.year, message: 'Invalid year' });
        }
        if (row.fuel_capacity && isNaN(parseFloat(row.fuel_capacity))) {
            errors.push({ row: index + 2, field: 'fuel_capacity', value: row.fuel_capacity, message: 'Fuel capacity must be a number' });
        }
        return errors;
    }
    static validateDriverRow(row, index) {
        const errors = [];
        if (!row.first_name?.trim()) {
            errors.push({ row: index + 2, field: 'first_name', value: row.first_name, message: 'First name is required' });
        }
        if (!row.last_name?.trim()) {
            errors.push({ row: index + 2, field: 'last_name', value: row.last_name, message: 'Last name is required' });
        }
        if (!row.license_number?.trim()) {
            errors.push({ row: index + 2, field: 'license_number', value: row.license_number, message: 'License number is required' });
        }
        if (row.license_expiry && !this.isValidDate(row.license_expiry)) {
            errors.push({ row: index + 2, field: 'license_expiry', value: row.license_expiry, message: 'Invalid date format (use YYYY-MM-DD)' });
        }
        return errors;
    }
    static validateInventoryRow(row, index) {
        const errors = [];
        if (!row.sku?.trim()) {
            errors.push({ row: index + 2, field: 'sku', value: row.sku, message: 'SKU is required' });
        }
        if (!row.name?.trim()) {
            errors.push({ row: index + 2, field: 'name', value: row.name, message: 'Name is required' });
        }
        if (row.current_stock && isNaN(parseInt(row.current_stock))) {
            errors.push({ row: index + 2, field: 'current_stock', value: row.current_stock, message: 'Current stock must be a number' });
        }
        if (row.unit_price && isNaN(parseFloat(row.unit_price))) {
            errors.push({ row: index + 2, field: 'unit_price', value: row.unit_price, message: 'Unit price must be a number' });
        }
        return errors;
    }
    static validateMaintenanceRecordRow(row, index) {
        const errors = [];
        if (!row.vehicle_registration?.trim()) {
            errors.push({ row: index + 2, field: 'vehicle_registration', value: row.vehicle_registration, message: 'Vehicle registration is required' });
        }
        if (!row.service_type?.trim()) {
            errors.push({ row: index + 2, field: 'service_type', value: row.service_type, message: 'Service type is required (preventive, repair, breakdown, emergency)' });
        }
        else {
            const validTypes = ['preventive', 'repair', 'breakdown', 'emergency'];
            if (!validTypes.includes(row.service_type.toLowerCase())) {
                errors.push({ row: index + 2, field: 'service_type', value: row.service_type, message: 'Service type must be: preventive, repair, breakdown, or emergency' });
            }
        }
        if (!row.category?.trim()) {
            errors.push({ row: index + 2, field: 'category', value: row.category, message: 'Category is required' });
        }
        if (!row.title?.trim()) {
            errors.push({ row: index + 2, field: 'title', value: row.title, message: 'Title is required' });
        }
        if (row.scheduled_date && !this.isValidDate(row.scheduled_date)) {
            errors.push({ row: index + 2, field: 'scheduled_date', value: row.scheduled_date, message: 'Invalid date format (use YYYY-MM-DD)' });
        }
        if (row.completed_date && !this.isValidDate(row.completed_date)) {
            errors.push({ row: index + 2, field: 'completed_date', value: row.completed_date, message: 'Invalid date format (use YYYY-MM-DD)' });
        }
        if (row.service_mileage && isNaN(parseFloat(row.service_mileage))) {
            errors.push({ row: index + 2, field: 'service_mileage', value: row.service_mileage, message: 'Service mileage must be a number' });
        }
        if (row.labor_cost && isNaN(parseFloat(row.labor_cost))) {
            errors.push({ row: index + 2, field: 'labor_cost', value: row.labor_cost, message: 'Labor cost must be a number' });
        }
        if (row.parts_cost && isNaN(parseFloat(row.parts_cost))) {
            errors.push({ row: index + 2, field: 'parts_cost', value: row.parts_cost, message: 'Parts cost must be a number' });
        }
        return errors;
    }
    static validateFuelRecordRow(row, index) {
        const errors = [];
        if (!row.vehicle_registration?.trim()) {
            errors.push({ row: index + 2, field: 'vehicle_registration', value: row.vehicle_registration, message: 'Vehicle registration is required' });
        }
        if (!row.date?.trim()) {
            errors.push({ row: index + 2, field: 'date', value: row.date, message: 'Date is required' });
        }
        else if (!this.isValidDate(row.date)) {
            errors.push({ row: index + 2, field: 'date', value: row.date, message: 'Invalid date format (use YYYY-MM-DD)' });
        }
        if (!row.liters?.trim()) {
            errors.push({ row: index + 2, field: 'liters', value: row.liters, message: 'Liters is required' });
        }
        else if (isNaN(parseFloat(row.liters))) {
            errors.push({ row: index + 2, field: 'liters', value: row.liters, message: 'Liters must be a number' });
        }
        if (!row.cost?.trim()) {
            errors.push({ row: index + 2, field: 'cost', value: row.cost, message: 'Cost is required' });
        }
        else if (isNaN(parseFloat(row.cost))) {
            errors.push({ row: index + 2, field: 'cost', value: row.cost, message: 'Cost must be a number' });
        }
        if (row.odometer && isNaN(parseFloat(row.odometer))) {
            errors.push({ row: index + 2, field: 'odometer', value: row.odometer, message: 'Odometer must be a number' });
        }
        return errors;
    }
    static validateRouteRow(row, index) {
        const errors = [];
        if (!row.vehicle_registration?.trim()) {
            errors.push({ row: index + 2, field: 'vehicle_registration', value: row.vehicle_registration, message: 'Vehicle registration is required' });
        }
        if (!row.route_date?.trim()) {
            errors.push({ row: index + 2, field: 'route_date', value: row.route_date, message: 'Route date is required' });
        }
        else if (!this.isValidDate(row.route_date)) {
            errors.push({ row: index + 2, field: 'route_date', value: row.route_date, message: 'Invalid date format (use YYYY-MM-DD)' });
        }
        if (!row.route_name?.trim()) {
            errors.push({ row: index + 2, field: 'route_name', value: row.route_name, message: 'Route name is required' });
        }
        if (row.actual_km && isNaN(parseFloat(row.actual_km))) {
            errors.push({ row: index + 2, field: 'actual_km', value: row.actual_km, message: 'Actual KM must be a number' });
        }
        if (row.actual_fuel && isNaN(parseFloat(row.actual_fuel))) {
            errors.push({ row: index + 2, field: 'actual_fuel', value: row.actual_fuel, message: 'Actual fuel must be a number' });
        }
        return errors;
    }
    static validateAccidentRow(row, index) {
        const errors = [];
        if (!row.vehicle_registration?.trim()) {
            errors.push({ row: index + 2, field: 'vehicle_registration', value: row.vehicle_registration, message: 'Vehicle registration is required' });
        }
        if (!row.accident_date?.trim()) {
            errors.push({ row: index + 2, field: 'accident_date', value: row.accident_date, message: 'Accident date is required' });
        }
        else if (!this.isValidDate(row.accident_date)) {
            errors.push({ row: index + 2, field: 'accident_date', value: row.accident_date, message: 'Invalid date format (use YYYY-MM-DD)' });
        }
        if (!row.location?.trim()) {
            errors.push({ row: index + 2, field: 'location', value: row.location, message: 'Location is required' });
        }
        if (!row.description?.trim()) {
            errors.push({ row: index + 2, field: 'description', value: row.description, message: 'Description is required' });
        }
        if (row.damage_cost && isNaN(parseFloat(row.damage_cost))) {
            errors.push({ row: index + 2, field: 'damage_cost', value: row.damage_cost, message: 'Damage cost must be a number' });
        }
        return errors;
    }
    static validateStaffRow(row, index) {
        const errors = [];
        if (!row.staff_no?.trim()) {
            errors.push({ row: index + 2, field: 'staff_no', value: row.staff_no, message: 'Staff number is required' });
        }
        if (!row.staff_name?.trim()) {
            errors.push({ row: index + 2, field: 'staff_name', value: row.staff_name, message: 'Staff name is required' });
        }
        if (row.email && !row.email.includes('@')) {
            errors.push({ row: index + 2, field: 'email', value: row.email, message: 'Invalid email format' });
        }
        return errors;
    }
    static validateServiceProviderRow(row, index) {
        const errors = [];
        if (!row.name?.trim()) {
            errors.push({ row: index + 2, field: 'name', value: row.name, message: 'Provider name is required' });
        }
        if (row.type) {
            const validTypes = ['general', 'specialist', 'dealership', 'emergency'];
            if (!validTypes.includes(row.type.toLowerCase())) {
                errors.push({ row: index + 2, field: 'type', value: row.type, message: 'Type must be: general, specialist, dealership, or emergency' });
            }
        }
        return errors;
    }
    static validateSparePartRow(row, index) {
        const errors = [];
        if (!row.part_number?.trim()) {
            errors.push({ row: index + 2, field: 'part_number', value: row.part_number, message: 'Part number is required' });
        }
        if (!row.name?.trim()) {
            errors.push({ row: index + 2, field: 'name', value: row.name, message: 'Part name is required' });
        }
        if (!row.category?.trim()) {
            errors.push({ row: index + 2, field: 'category', value: row.category, message: 'Category is required' });
        }
        if (row.unit_cost && isNaN(parseFloat(row.unit_cost))) {
            errors.push({ row: index + 2, field: 'unit_cost', value: row.unit_cost, message: 'Unit cost must be a number' });
        }
        if (row.quantity_in_stock && isNaN(parseInt(row.quantity_in_stock))) {
            errors.push({ row: index + 2, field: 'quantity_in_stock', value: row.quantity_in_stock, message: 'Quantity must be a number' });
        }
        return errors;
    }
    static validateMaintenanceScheduleRow(row, index) {
        const errors = [];
        if (!row.vehicle_registration?.trim()) {
            errors.push({ row: index + 2, field: 'vehicle_registration', value: row.vehicle_registration, message: 'Vehicle registration is required' });
        }
        if (!row.schedule_type?.trim()) {
            errors.push({ row: index + 2, field: 'schedule_type', value: row.schedule_type, message: 'Schedule type is required (mileage_based, time_based, both)' });
        }
        else {
            const validTypes = ['mileage_based', 'time_based', 'both'];
            if (!validTypes.includes(row.schedule_type.toLowerCase())) {
                errors.push({ row: index + 2, field: 'schedule_type', value: row.schedule_type, message: 'Schedule type must be: mileage_based, time_based, or both' });
            }
        }
        if (!row.service_type?.trim()) {
            errors.push({ row: index + 2, field: 'service_type', value: row.service_type, message: 'Service type is required' });
        }
        if (!row.title?.trim()) {
            errors.push({ row: index + 2, field: 'title', value: row.title, message: 'Title is required' });
        }
        if (row.interval_mileage && isNaN(parseInt(row.interval_mileage))) {
            errors.push({ row: index + 2, field: 'interval_mileage', value: row.interval_mileage, message: 'Interval mileage must be a number' });
        }
        if (row.interval_months && isNaN(parseInt(row.interval_months))) {
            errors.push({ row: index + 2, field: 'interval_months', value: row.interval_months, message: 'Interval months must be a number' });
        }
        return errors;
    }
    static isValidDate(dateString) {
        const regex = /^\d{4}-\d{2}-\d{2}$/;
        if (!regex.test(dateString))
            return false;
        const date = new Date(dateString);
        return date instanceof Date && !isNaN(date.getTime());
    }
    // ============================================
    // MAPPERS
    // ============================================
    static mapImportJobRow(row) {
        return {
            id: row.id,
            companyId: row.company_id,
            importType: row.import_type,
            status: row.status,
            fileName: row.file_name,
            totalRows: parseInt(row.total_rows),
            processedRows: parseInt(row.processed_rows),
            successfulRows: parseInt(row.successful_rows),
            failedRows: parseInt(row.failed_rows),
            errors: row.errors ? JSON.parse(row.errors) : [],
            previewData: row.preview_data ? JSON.parse(row.preview_data) : undefined,
            createdBy: row.created_by,
            createdAt: new Date(row.created_at),
            completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
        };
    }
    static mapExportJobRow(row) {
        return {
            id: row.id,
            companyId: row.company_id,
            exportType: row.export_type,
            format: row.format,
            status: row.status,
            filters: row.filters ? JSON.parse(row.filters) : undefined,
            fileUrl: row.file_url,
            rowCount: parseInt(row.row_count),
            createdBy: row.created_by,
            createdAt: new Date(row.created_at),
            completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
        };
    }
}
exports.ImportExportModel = ImportExportModel;
//# sourceMappingURL=ImportExport.js.map