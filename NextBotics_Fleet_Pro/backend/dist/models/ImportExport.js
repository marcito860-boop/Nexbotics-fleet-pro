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
        const rawHeaders = this.parseCSVLine(lines[0]);
        // Normalize headers: lowercase, trim, replace spaces with underscores
        const headers = rawHeaders.map(h => h.trim());
        const normalizedHeaders = headers.map(h => this.normalizeColumnName(h));
        const rows = [];
        for (let i = 1; i < lines.length; i++) {
            const values = this.parseCSVLine(lines[i]);
            const row = {};
            headers.forEach((header, index) => {
                const value = values[index];
                row[header] = value !== undefined ? value.trim() : '';
                // Also add normalized version for easier access
                row[this.normalizeColumnName(header)] = value !== undefined ? value.trim() : '';
            });
            rows.push(row);
        }
        return { headers, rows, normalizedHeaders };
    }
    static normalizeColumnName(name) {
        return name.toLowerCase().trim().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    }
    static parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            const nextChar = line[i + 1];
            if (char === '"') {
                if (inQuotes && nextChar === '"') {
                    // Escaped quote
                    current += '"';
                    i++; // Skip next quote
                }
                else {
                    inQuotes = !inQuotes;
                }
            }
            else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            }
            else {
                current += char;
            }
        }
        result.push(current.trim());
        return result;
    }
    // Helper to find a value by multiple possible column names
    static getValue(row, possibleNames) {
        for (const name of possibleNames) {
            const normalized = this.normalizeColumnName(name);
            if (row[normalized] !== undefined && row[normalized] !== '') {
                return row[normalized];
            }
            // Also check original case
            if (row[name] !== undefined && row[name] !== '') {
                return row[name];
            }
        }
        return undefined;
    }
    // ============================================
    // VALIDATION HELPERS - with flexible column names
    // ============================================
    static validateVehicleRow(row, index) {
        const errors = [];
        const regNum = this.getValue(row, ['registration_number', 'reg_number', 'registration', 'reg_no', 'plate', 'license_plate']);
        if (!regNum?.trim()) {
            errors.push({ row: index + 2, field: 'registration_number', value: regNum, message: 'Registration number is required' });
        }
        const make = this.getValue(row, ['make', 'manufacturer', 'brand']);
        if (!make?.trim()) {
            errors.push({ row: index + 2, field: 'make', value: make, message: 'Make is required' });
        }
        const model = this.getValue(row, ['model', 'model_name', 'vehicle_model']);
        if (!model?.trim()) {
            errors.push({ row: index + 2, field: 'model', value: model, message: 'Model is required' });
        }
        const year = this.getValue(row, ['year', 'year_of_manufacture', 'manufacture_year', 'model_year']);
        if (year && (isNaN(parseInt(year)) || parseInt(year) < 1900 || parseInt(year) > new Date().getFullYear() + 1)) {
            errors.push({ row: index + 2, field: 'year', value: year, message: 'Invalid year' });
        }
        const fuelCapacity = this.getValue(row, ['fuel_capacity', 'fuel_tank_capacity', 'tank_capacity']);
        if (fuelCapacity && isNaN(parseFloat(fuelCapacity))) {
            errors.push({ row: index + 2, field: 'fuel_capacity', value: fuelCapacity, message: 'Fuel capacity must be a number' });
        }
        return errors;
    }
    static validateDriverRow(row, index) {
        const errors = [];
        const firstName = this.getValue(row, ['first_name', 'firstname', 'fname', 'given_name']);
        if (!firstName?.trim()) {
            errors.push({ row: index + 2, field: 'first_name', value: firstName, message: 'First name is required' });
        }
        const lastName = this.getValue(row, ['last_name', 'lastname', 'lname', 'surname', 'family_name']);
        if (!lastName?.trim()) {
            errors.push({ row: index + 2, field: 'last_name', value: lastName, message: 'Last name is required' });
        }
        const licenseNumber = this.getValue(row, ['license_number', 'license_no', 'licence_number', 'driving_license', 'dl_number']);
        if (!licenseNumber?.trim()) {
            errors.push({ row: index + 2, field: 'license_number', value: licenseNumber, message: 'License number is required' });
        }
        const licenseExpiry = this.getValue(row, ['license_expiry', 'license_expiry_date', 'licence_expiry']);
        if (licenseExpiry && !this.isValidDate(licenseExpiry)) {
            errors.push({ row: index + 2, field: 'license_expiry', value: licenseExpiry, message: 'Invalid date format (use YYYY-MM-DD)' });
        }
        return errors;
    }
    static validateInventoryRow(row, index) {
        const errors = [];
        const sku = this.getValue(row, ['sku', 'item_code', 'product_code', 'code', 'part_number']);
        if (!sku?.trim()) {
            errors.push({ row: index + 2, field: 'sku', value: sku, message: 'SKU is required' });
        }
        const name = this.getValue(row, ['name', 'item_name', 'product_name', 'description']);
        if (!name?.trim()) {
            errors.push({ row: index + 2, field: 'name', value: name, message: 'Name is required' });
        }
        const currentStock = this.getValue(row, ['current_stock', 'stock', 'quantity', 'qty', 'in_stock']);
        if (currentStock && isNaN(parseInt(currentStock))) {
            errors.push({ row: index + 2, field: 'current_stock', value: currentStock, message: 'Current stock must be a number' });
        }
        const unitPrice = this.getValue(row, ['unit_price', 'price', 'cost', 'unit_cost']);
        if (unitPrice && isNaN(parseFloat(unitPrice))) {
            errors.push({ row: index + 2, field: 'unit_price', value: unitPrice, message: 'Unit price must be a number' });
        }
        return errors;
    }
    static validateMaintenanceRecordRow(row, index) {
        const errors = [];
        const vehicleReg = this.getValue(row, ['vehicle_registration', 'registration', 'vehicle_reg', 'reg_number', 'plate']);
        if (!vehicleReg?.trim()) {
            errors.push({ row: index + 2, field: 'vehicle_registration', value: vehicleReg, message: 'Vehicle registration is required' });
        }
        const serviceType = this.getValue(row, ['service_type', 'type', 'maintenance_type', 'service_category']);
        if (!serviceType?.trim()) {
            errors.push({ row: index + 2, field: 'service_type', value: serviceType, message: 'Service type is required (preventive, repair, breakdown, emergency)' });
        }
        else {
            const validTypes = ['preventive', 'repair', 'breakdown', 'emergency'];
            if (!validTypes.includes(serviceType.toLowerCase())) {
                errors.push({ row: index + 2, field: 'service_type', value: serviceType, message: 'Service type must be: preventive, repair, breakdown, or emergency' });
            }
        }
        const category = this.getValue(row, ['category', 'maintenance_category']);
        if (!category?.trim()) {
            errors.push({ row: index + 2, field: 'category', value: category, message: 'Category is required' });
        }
        const title = this.getValue(row, ['title', 'service_title', 'job_title', 'work_title']);
        if (!title?.trim()) {
            errors.push({ row: index + 2, field: 'title', value: title, message: 'Title is required' });
        }
        const scheduledDate = this.getValue(row, ['scheduled_date', 'schedule_date', 'planned_date']);
        if (scheduledDate && !this.isValidDate(scheduledDate)) {
            errors.push({ row: index + 2, field: 'scheduled_date', value: scheduledDate, message: 'Invalid date format (use YYYY-MM-DD)' });
        }
        const completedDate = this.getValue(row, ['completed_date', 'completion_date', 'done_date']);
        if (completedDate && !this.isValidDate(completedDate)) {
            errors.push({ row: index + 2, field: 'completed_date', value: completedDate, message: 'Invalid date format (use YYYY-MM-DD)' });
        }
        const serviceMileage = this.getValue(row, ['service_mileage', 'mileage', 'odometer', 'km']);
        if (serviceMileage && isNaN(parseFloat(serviceMileage))) {
            errors.push({ row: index + 2, field: 'service_mileage', value: serviceMileage, message: 'Service mileage must be a number' });
        }
        const laborCost = this.getValue(row, ['labor_cost', 'labour_cost', 'labor']);
        if (laborCost && isNaN(parseFloat(laborCost))) {
            errors.push({ row: index + 2, field: 'labor_cost', value: laborCost, message: 'Labor cost must be a number' });
        }
        const partsCost = this.getValue(row, ['parts_cost', 'parts', 'spare_parts_cost']);
        if (partsCost && isNaN(parseFloat(partsCost))) {
            errors.push({ row: index + 2, field: 'parts_cost', value: partsCost, message: 'Parts cost must be a number' });
        }
        return errors;
    }
    static validateFuelRecordRow(row, index) {
        const errors = [];
        const vehicleReg = this.getValue(row, ['vehicle_registration', 'registration', 'vehicle_reg', 'reg_number', 'plate']);
        if (!vehicleReg?.trim()) {
            errors.push({ row: index + 2, field: 'vehicle_registration', value: vehicleReg, message: 'Vehicle registration is required' });
        }
        const date = this.getValue(row, ['date', 'fuel_date', 'transaction_date', 'fill_date']);
        if (!date?.trim()) {
            errors.push({ row: index + 2, field: 'date', value: date, message: 'Date is required' });
        }
        else if (!this.isValidDate(date)) {
            errors.push({ row: index + 2, field: 'date', value: date, message: 'Invalid date format (use YYYY-MM-DD)' });
        }
        const liters = this.getValue(row, ['liters', 'quantity', 'qty', 'volume', 'fuel_qty']);
        if (!liters?.trim()) {
            errors.push({ row: index + 2, field: 'liters', value: liters, message: 'Liters is required' });
        }
        else if (isNaN(parseFloat(liters))) {
            errors.push({ row: index + 2, field: 'liters', value: liters, message: 'Liters must be a number' });
        }
        const cost = this.getValue(row, ['cost', 'amount', 'total', 'price', 'fuel_cost']);
        if (!cost?.trim()) {
            errors.push({ row: index + 2, field: 'cost', value: cost, message: 'Cost is required' });
        }
        else if (isNaN(parseFloat(cost))) {
            errors.push({ row: index + 2, field: 'cost', value: cost, message: 'Cost must be a number' });
        }
        const odometer = this.getValue(row, ['odometer', 'mileage', 'km', 'odometer_reading']);
        if (odometer && isNaN(parseFloat(odometer))) {
            errors.push({ row: index + 2, field: 'odometer', value: odometer, message: 'Odometer must be a number' });
        }
        return errors;
    }
    static validateRouteRow(row, index) {
        const errors = [];
        const vehicleReg = this.getValue(row, ['vehicle_registration', 'registration', 'vehicle_reg', 'reg_number', 'plate']);
        if (!vehicleReg?.trim()) {
            errors.push({ row: index + 2, field: 'vehicle_registration', value: vehicleReg, message: 'Vehicle registration is required' });
        }
        const routeDate = this.getValue(row, ['route_date', 'date', 'trip_date', 'travel_date']);
        if (!routeDate?.trim()) {
            errors.push({ row: index + 2, field: 'route_date', value: routeDate, message: 'Route date is required' });
        }
        else if (!this.isValidDate(routeDate)) {
            errors.push({ row: index + 2, field: 'route_date', value: routeDate, message: 'Invalid date format (use YYYY-MM-DD)' });
        }
        const routeName = this.getValue(row, ['route_name', 'route', 'trip', 'destination']);
        if (!routeName?.trim()) {
            errors.push({ row: index + 2, field: 'route_name', value: routeName, message: 'Route name is required' });
        }
        const actualKm = this.getValue(row, ['actual_km', 'km', 'distance', 'mileage']);
        if (actualKm && isNaN(parseFloat(actualKm))) {
            errors.push({ row: index + 2, field: 'actual_km', value: actualKm, message: 'Actual KM must be a number' });
        }
        const actualFuel = this.getValue(row, ['actual_fuel', 'fuel_used', 'fuel_consumed', 'consumption']);
        if (actualFuel && isNaN(parseFloat(actualFuel))) {
            errors.push({ row: index + 2, field: 'actual_fuel', value: actualFuel, message: 'Actual fuel must be a number' });
        }
        return errors;
    }
    static validateAccidentRow(row, index) {
        const errors = [];
        const vehicleReg = this.getValue(row, ['vehicle_registration', 'registration', 'vehicle_reg', 'reg_number', 'plate']);
        if (!vehicleReg?.trim()) {
            errors.push({ row: index + 2, field: 'vehicle_registration', value: vehicleReg, message: 'Vehicle registration is required' });
        }
        const accidentDate = this.getValue(row, ['accident_date', 'date', 'incident_date', 'occurred_date']);
        if (!accidentDate?.trim()) {
            errors.push({ row: index + 2, field: 'accident_date', value: accidentDate, message: 'Accident date is required' });
        }
        else if (!this.isValidDate(accidentDate)) {
            errors.push({ row: index + 2, field: 'accident_date', value: accidentDate, message: 'Invalid date format (use YYYY-MM-DD)' });
        }
        const location = this.getValue(row, ['location', 'place', 'gps_location', 'address']);
        if (!location?.trim()) {
            errors.push({ row: index + 2, field: 'location', value: location, message: 'Location is required' });
        }
        const description = this.getValue(row, ['description', 'incident_description', 'details', 'narrative']);
        if (!description?.trim()) {
            errors.push({ row: index + 2, field: 'description', value: description, message: 'Description is required' });
        }
        const damageCost = this.getValue(row, ['damage_cost', 'cost', 'damage_amount']);
        if (damageCost && isNaN(parseFloat(damageCost))) {
            errors.push({ row: index + 2, field: 'damage_cost', value: damageCost, message: 'Damage cost must be a number' });
        }
        return errors;
    }
    static validateStaffRow(row, index) {
        const errors = [];
        const staffNo = this.getValue(row, ['staff_no', 'staff_number', 'employee_id', 'emp_id', 'employee_no']);
        if (!staffNo?.trim()) {
            errors.push({ row: index + 2, field: 'staff_no', value: staffNo, message: 'Staff number is required' });
        }
        const staffName = this.getValue(row, ['staff_name', 'name', 'employee_name', 'full_name']);
        if (!staffName?.trim()) {
            errors.push({ row: index + 2, field: 'staff_name', value: staffName, message: 'Staff name is required' });
        }
        const email = this.getValue(row, ['email', 'email_address', 'e-mail']);
        if (email && !email.includes('@')) {
            errors.push({ row: index + 2, field: 'email', value: email, message: 'Invalid email format' });
        }
        return errors;
    }
    static validateServiceProviderRow(row, index) {
        const errors = [];
        const name = this.getValue(row, ['name', 'provider_name', 'company_name', 'vendor_name']);
        if (!name?.trim()) {
            errors.push({ row: index + 2, field: 'name', value: name, message: 'Provider name is required' });
        }
        const type = this.getValue(row, ['type', 'provider_type', 'vendor_type', 'category']);
        if (type) {
            const validTypes = ['general', 'specialist', 'dealership', 'emergency'];
            if (!validTypes.includes(type.toLowerCase())) {
                errors.push({ row: index + 2, field: 'type', value: type, message: 'Type must be: general, specialist, dealership, or emergency' });
            }
        }
        return errors;
    }
    static validateSparePartRow(row, index) {
        const errors = [];
        const partNumber = this.getValue(row, ['part_number', 'part_no', 'part_id', 'sku', 'item_code']);
        if (!partNumber?.trim()) {
            errors.push({ row: index + 2, field: 'part_number', value: partNumber, message: 'Part number is required' });
        }
        const name = this.getValue(row, ['name', 'part_name', 'description', 'item_name']);
        if (!name?.trim()) {
            errors.push({ row: index + 2, field: 'name', value: name, message: 'Part name is required' });
        }
        const category = this.getValue(row, ['category', 'part_category', 'type', 'component_type']);
        if (!category?.trim()) {
            errors.push({ row: index + 2, field: 'category', value: category, message: 'Category is required' });
        }
        const unitCost = this.getValue(row, ['unit_cost', 'cost', 'price', 'unit_price']);
        if (unitCost && isNaN(parseFloat(unitCost))) {
            errors.push({ row: index + 2, field: 'unit_cost', value: unitCost, message: 'Unit cost must be a number' });
        }
        const quantity = this.getValue(row, ['quantity_in_stock', 'quantity', 'qty', 'in_stock', 'stock']);
        if (quantity && isNaN(parseInt(quantity))) {
            errors.push({ row: index + 2, field: 'quantity_in_stock', value: quantity, message: 'Quantity must be a number' });
        }
        return errors;
    }
    static validateMaintenanceScheduleRow(row, index) {
        const errors = [];
        const vehicleReg = this.getValue(row, ['vehicle_registration', 'registration', 'vehicle_reg', 'reg_number', 'plate']);
        if (!vehicleReg?.trim()) {
            errors.push({ row: index + 2, field: 'vehicle_registration', value: vehicleReg, message: 'Vehicle registration is required' });
        }
        const scheduleType = this.getValue(row, ['schedule_type', 'type', 'schedule']);
        if (!scheduleType?.trim()) {
            errors.push({ row: index + 2, field: 'schedule_type', value: scheduleType, message: 'Schedule type is required (mileage_based, time_based, both)' });
        }
        else {
            const validTypes = ['mileage_based', 'time_based', 'both'];
            if (!validTypes.includes(scheduleType.toLowerCase())) {
                errors.push({ row: index + 2, field: 'schedule_type', value: scheduleType, message: 'Schedule type must be: mileage_based, time_based, or both' });
            }
        }
        const serviceType = this.getValue(row, ['service_type', 'maintenance_type', 'service']);
        if (!serviceType?.trim()) {
            errors.push({ row: index + 2, field: 'service_type', value: serviceType, message: 'Service type is required' });
        }
        const title = this.getValue(row, ['title', 'service_name', 'schedule_name', 'name']);
        if (!title?.trim()) {
            errors.push({ row: index + 2, field: 'title', value: title, message: 'Title is required' });
        }
        const intervalMileage = this.getValue(row, ['interval_mileage', 'mileage_interval', 'km_interval']);
        if (intervalMileage && isNaN(parseInt(intervalMileage))) {
            errors.push({ row: index + 2, field: 'interval_mileage', value: intervalMileage, message: 'Interval mileage must be a number' });
        }
        const intervalMonths = this.getValue(row, ['interval_months', 'months_interval', 'time_interval']);
        if (intervalMonths && isNaN(parseInt(intervalMonths))) {
            errors.push({ row: index + 2, field: 'interval_months', value: intervalMonths, message: 'Interval months must be a number' });
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