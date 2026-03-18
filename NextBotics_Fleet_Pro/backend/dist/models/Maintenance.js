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
exports.MaintenanceReminderModel = exports.VehicleDowntimeModel = exports.MaintenanceRecordModel = exports.MaintenanceScheduleModel = exports.SparePartModel = exports.ServiceProviderModel = void 0;
const database_1 = require("../database");
// Get pool for transactions
const getPool = async () => {
    const { pool } = await Promise.resolve().then(() => __importStar(require('../database')));
    return pool;
};
// ==================== Mapping Functions ====================
function mapRowToServiceProvider(row) {
    return {
        id: row.id,
        companyId: row.company_id,
        name: row.name,
        type: row.type,
        contactPerson: row.contact_person,
        phone: row.phone,
        email: row.email,
        address: row.address,
        city: row.city,
        country: row.country,
        taxId: row.tax_id,
        bankAccount: row.bank_account,
        isApproved: row.is_approved,
        rating: parseFloat(row.rating || 0),
        reviewCount: parseInt(row.review_count || 0),
        specialties: row.specialties || [],
        workingHours: row.working_hours,
        isActive: row.is_active,
        notes: row.notes,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
    };
}
function mapRowToSparePart(row) {
    return {
        id: row.id,
        companyId: row.company_id,
        partNumber: row.part_number,
        name: row.name,
        description: row.description,
        category: row.category,
        manufacturer: row.manufacturer,
        compatibleVehicles: row.compatible_vehicles || [],
        unitCost: parseFloat(row.unit_cost || 0),
        sellingPrice: parseFloat(row.selling_price || 0),
        quantityInStock: parseInt(row.quantity_in_stock || 0),
        reorderLevel: parseInt(row.reorder_level || 0),
        reorderQuantity: parseInt(row.reorder_quantity || 0),
        unitOfMeasure: row.unit_of_measure,
        locationCode: row.location_code,
        supplierId: row.supplier_id,
        leadTimeDays: parseInt(row.lead_time_days || 0),
        isActive: row.is_active,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
    };
}
function mapRowToSchedule(row) {
    return {
        id: row.id,
        companyId: row.company_id,
        vehicleId: row.vehicle_id,
        scheduleType: row.schedule_type,
        serviceType: row.service_type,
        title: row.title,
        description: row.description,
        intervalMileage: row.interval_mileage ? parseInt(row.interval_mileage) : undefined,
        lastServiceMileage: parseFloat(row.last_service_mileage || 0),
        nextServiceMileage: row.next_service_mileage ? parseFloat(row.next_service_mileage) : undefined,
        intervalMonths: row.interval_months ? parseInt(row.interval_months) : undefined,
        lastServiceDate: row.last_service_date ? new Date(row.last_service_date) : undefined,
        nextServiceDate: row.next_service_date ? new Date(row.next_service_date) : undefined,
        status: row.status,
        priority: row.priority,
        estimatedCost: row.estimated_cost ? parseFloat(row.estimated_cost) : undefined,
        estimatedDurationHours: row.estimated_duration_hours ? parseFloat(row.estimated_duration_hours) : undefined,
        assignedProviderId: row.assigned_provider_id,
        reminderDaysBefore: parseInt(row.reminder_days_before || 7),
        reminderMileageBefore: parseInt(row.reminder_mileage_before || 500),
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
        vehicleRegistration: row.vehicle_registration,
        vehicleMake: row.vehicle_make,
        vehicleModel: row.vehicle_model,
        assignedProviderName: row.provider_name,
    };
}
function mapRowToRecord(row) {
    return {
        id: row.id,
        companyId: row.company_id,
        vehicleId: row.vehicle_id,
        scheduleId: row.schedule_id,
        serviceType: row.service_type,
        category: row.category,
        title: row.title,
        description: row.description,
        providerId: row.provider_id,
        providerName: row.provider_name,
        scheduledDate: row.scheduled_date ? new Date(row.scheduled_date) : undefined,
        startedDate: row.started_date ? new Date(row.started_date) : undefined,
        completedDate: row.completed_date ? new Date(row.completed_date) : undefined,
        serviceMileage: row.service_mileage ? parseFloat(row.service_mileage) : undefined,
        nextServiceMileage: row.next_service_mileage ? parseFloat(row.next_service_mileage) : undefined,
        laborCost: parseFloat(row.labor_cost || 0),
        partsCost: parseFloat(row.parts_cost || 0),
        otherCost: parseFloat(row.other_cost || 0),
        totalCost: parseFloat(row.total_cost || 0),
        status: row.status,
        breakdownLocation: row.breakdown_location,
        breakdownCause: row.breakdown_cause,
        isEmergency: row.is_emergency,
        technicianName: row.technician_name,
        driverId: row.driver_id,
        warrantyMonths: row.warranty_months ? parseInt(row.warranty_months) : undefined,
        warrantyExpiry: row.warranty_expiry ? new Date(row.warranty_expiry) : undefined,
        invoiceNumber: row.invoice_number,
        documents: row.documents,
        notes: row.notes,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
        vehicleRegistration: row.vehicle_registration,
        vehicleMake: row.vehicle_make,
        vehicleModel: row.vehicle_model,
    };
}
function mapRowToMaintenancePart(row) {
    return {
        id: row.id,
        recordId: row.record_id,
        partId: row.part_id,
        partNumber: row.part_number,
        partName: row.part_name,
        quantity: parseInt(row.quantity),
        unitCost: parseFloat(row.unit_cost),
        totalCost: parseFloat(row.total_cost),
        createdAt: new Date(row.created_at),
    };
}
function mapRowToDowntime(row) {
    return {
        id: row.id,
        companyId: row.company_id,
        vehicleId: row.vehicle_id,
        recordId: row.record_id,
        downtimeType: row.downtime_type,
        startDate: new Date(row.start_date),
        endDate: row.end_date ? new Date(row.end_date) : undefined,
        startTime: row.start_time,
        endTime: row.end_time,
        durationHours: row.duration_hours ? parseFloat(row.duration_hours) : undefined,
        durationDays: row.duration_days ? parseInt(row.duration_days) : undefined,
        reason: row.reason,
        impact: row.impact,
        replacementVehicleId: row.replacement_vehicle_id,
        notes: row.notes,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
        vehicleRegistration: row.vehicle_registration,
        replacementVehicleRegistration: row.replacement_vehicle_registration,
    };
}
function mapRowToReminder(row) {
    return {
        id: row.id,
        companyId: row.company_id,
        scheduleId: row.schedule_id,
        vehicleId: row.vehicle_id,
        reminderType: row.reminder_type,
        title: row.title,
        message: row.message,
        dueMileage: row.due_mileage ? parseFloat(row.due_mileage) : undefined,
        dueDate: row.due_date ? new Date(row.due_date) : undefined,
        status: row.status,
        severity: row.severity,
        notifiedAt: row.notified_at ? new Date(row.notified_at) : undefined,
        acknowledgedAt: row.acknowledged_at ? new Date(row.acknowledged_at) : undefined,
        acknowledgedBy: row.acknowledged_by,
        createdAt: new Date(row.created_at),
        vehicleRegistration: row.vehicle_registration,
        vehicleMake: row.vehicle_make,
        vehicleModel: row.vehicle_model,
        scheduleTitle: row.schedule_title,
    };
}
// ==================== Service Provider Model ====================
class ServiceProviderModel {
    static async findById(id, companyId) {
        const rows = await (0, database_1.query)('SELECT * FROM service_providers WHERE id = $1 AND company_id = $2', [id, companyId]);
        return rows.length > 0 ? mapRowToServiceProvider(rows[0]) : null;
    }
    static async findByCompany(companyId, options) {
        let sql = 'SELECT * FROM service_providers WHERE company_id = $1';
        let countSql = 'SELECT COUNT(*) as total FROM service_providers WHERE company_id = $1';
        const params = [companyId];
        if (options?.type) {
            sql += ` AND type = $${params.length + 1}`;
            countSql += ` AND type = $${params.length + 1}`;
            params.push(options.type);
        }
        if (options?.isApproved !== undefined) {
            sql += ` AND is_approved = $${params.length + 1}`;
            countSql += ` AND is_approved = $${params.length + 1}`;
            params.push(options.isApproved);
        }
        if (options?.isActive !== undefined) {
            sql += ` AND is_active = $${params.length + 1}`;
            countSql += ` AND is_active = $${params.length + 1}`;
            params.push(options.isActive);
        }
        if (options?.search) {
            const searchTerm = `%${options.search}%`;
            sql += ` AND (name ILIKE $${params.length + 1} OR contact_person ILIKE $${params.length + 1} OR phone ILIKE $${params.length + 1})`;
            countSql += ` AND (name ILIKE $${params.length + 1} OR contact_person ILIKE $${params.length + 1} OR phone ILIKE $${params.length + 1})`;
            params.push(searchTerm);
        }
        sql += ' ORDER BY name ASC';
        if (options?.limit) {
            sql += ` LIMIT $${params.length + 1}`;
            params.push(options.limit);
            if (options?.offset) {
                sql += ` OFFSET $${params.length + 1}`;
                params.push(options.offset);
            }
        }
        const [providerRows, countRows] = await Promise.all([
            (0, database_1.query)(sql, params),
            (0, database_1.query)(countSql, params.slice(0, options?.limit ? params.length - (options.offset ? 2 : 1) : params.length))
        ]);
        return {
            providers: providerRows.map(mapRowToServiceProvider),
            total: parseInt(countRows[0].total)
        };
    }
    static async create(companyId, input) {
        const rows = await (0, database_1.query)(`INSERT INTO service_providers (
        company_id, name, type, contact_person, phone, email, address, city, country,
        tax_id, bank_account, specialties, working_hours, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *`, [
            companyId,
            input.name,
            input.type || 'general',
            input.contactPerson || null,
            input.phone || null,
            input.email || null,
            input.address || null,
            input.city || null,
            input.country || 'China',
            input.taxId || null,
            input.bankAccount || null,
            input.specialties || [],
            input.workingHours ? JSON.stringify(input.workingHours) : null,
            input.notes || null,
        ]);
        return mapRowToServiceProvider(rows[0]);
    }
    static async update(id, companyId, input) {
        const updates = [];
        const params = [];
        const fieldMap = {
            name: 'name',
            type: 'type',
            contactPerson: 'contact_person',
            phone: 'phone',
            email: 'email',
            address: 'address',
            city: 'city',
            country: 'country',
            taxId: 'tax_id',
            bankAccount: 'bank_account',
            specialties: 'specialties',
            workingHours: 'working_hours',
            isApproved: 'is_approved',
            isActive: 'is_active',
            notes: 'notes',
        };
        for (const [key, value] of Object.entries(input)) {
            if (value !== undefined && fieldMap[key]) {
                if (key === 'specialties') {
                    updates.push(`${fieldMap[key]} = $${params.length + 1}`);
                    params.push(Array.isArray(value) ? value : [value]);
                }
                else if (key === 'workingHours') {
                    updates.push(`${fieldMap[key]} = $${params.length + 1}`);
                    params.push(JSON.stringify(value));
                }
                else {
                    updates.push(`${fieldMap[key]} = $${params.length + 1}`);
                    params.push(value);
                }
            }
        }
        if (updates.length === 0)
            return this.findById(id, companyId);
        params.push(id, companyId);
        const rows = await (0, database_1.query)(`UPDATE service_providers SET ${updates.join(', ')} WHERE id = $${params.length - 1} AND company_id = $${params.length} RETURNING *`, params);
        return rows.length > 0 ? mapRowToServiceProvider(rows[0]) : null;
    }
    static async delete(id, companyId) {
        const result = await (0, database_1.query)('DELETE FROM service_providers WHERE id = $1 AND company_id = $2 RETURNING id', [id, companyId]);
        return result.length > 0;
    }
}
exports.ServiceProviderModel = ServiceProviderModel;
// ==================== Spare Part Model ====================
class SparePartModel {
    static async findById(id, companyId) {
        const rows = await (0, database_1.query)('SELECT * FROM spare_parts WHERE id = $1 AND company_id = $2', [id, companyId]);
        return rows.length > 0 ? mapRowToSparePart(rows[0]) : null;
    }
    static async findByPartNumber(partNumber, companyId) {
        const rows = await (0, database_1.query)('SELECT * FROM spare_parts WHERE part_number = $1 AND company_id = $2', [partNumber.toUpperCase(), companyId]);
        return rows.length > 0 ? mapRowToSparePart(rows[0]) : null;
    }
    static async findByCompany(companyId, options) {
        let sql = 'SELECT sp.*, p.name as supplier_name FROM spare_parts sp LEFT JOIN service_providers p ON sp.supplier_id = p.id WHERE sp.company_id = $1';
        let countSql = 'SELECT COUNT(*) as total FROM spare_parts WHERE company_id = $1';
        const params = [companyId];
        if (options?.category) {
            sql += ` AND sp.category = $${params.length + 1}`;
            countSql += ` AND category = $${params.length + 1}`;
            params.push(options.category);
        }
        if (options?.lowStockOnly) {
            sql += ` AND sp.quantity_in_stock <= sp.reorder_level`;
            countSql += ` AND quantity_in_stock <= reorder_level`;
        }
        if (options?.search) {
            const searchTerm = `%${options.search}%`;
            sql += ` AND (sp.name ILIKE $${params.length + 1} OR sp.part_number ILIKE $${params.length + 1} OR sp.description ILIKE $${params.length + 1})`;
            countSql += ` AND (name ILIKE $${params.length + 1} OR part_number ILIKE $${params.length + 1} OR description ILIKE $${params.length + 1})`;
            params.push(searchTerm);
        }
        sql += ' ORDER BY sp.name ASC';
        if (options?.limit) {
            sql += ` LIMIT $${params.length + 1}`;
            params.push(options.limit);
            if (options?.offset) {
                sql += ` OFFSET $${params.length + 1}`;
                params.push(options.offset);
            }
        }
        const [partRows, countRows] = await Promise.all([
            (0, database_1.query)(sql, params),
            (0, database_1.query)(countSql, params.slice(0, options?.limit ? params.length - (options.offset ? 2 : 1) : params.length))
        ]);
        return {
            parts: partRows.map(mapRowToSparePart),
            total: parseInt(countRows[0].total)
        };
    }
    static async create(companyId, input) {
        const rows = await (0, database_1.query)(`INSERT INTO spare_parts (
        company_id, part_number, name, description, category, manufacturer,
        compatible_vehicles, unit_cost, selling_price, quantity_in_stock,
        reorder_level, reorder_quantity, unit_of_measure, location_code,
        supplier_id, lead_time_days
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *`, [
            companyId,
            input.partNumber.toUpperCase(),
            input.name,
            input.description || null,
            input.category,
            input.manufacturer || null,
            input.compatibleVehicles || [],
            input.unitCost || 0,
            input.sellingPrice || 0,
            input.quantityInStock || 0,
            input.reorderLevel || 10,
            input.reorderQuantity || 50,
            input.unitOfMeasure || 'piece',
            input.locationCode || null,
            input.supplierId || null,
            input.leadTimeDays || 7,
        ]);
        return mapRowToSparePart(rows[0]);
    }
    static async update(id, companyId, input) {
        const updates = [];
        const params = [];
        const fieldMap = {
            partNumber: 'part_number',
            name: 'name',
            description: 'description',
            category: 'category',
            manufacturer: 'manufacturer',
            compatibleVehicles: 'compatible_vehicles',
            unitCost: 'unit_cost',
            sellingPrice: 'selling_price',
            quantityInStock: 'quantity_in_stock',
            reorderLevel: 'reorder_level',
            reorderQuantity: 'reorder_quantity',
            unitOfMeasure: 'unit_of_measure',
            locationCode: 'location_code',
            supplierId: 'supplier_id',
            leadTimeDays: 'lead_time_days',
            isActive: 'is_active',
        };
        for (const [key, value] of Object.entries(input)) {
            if (value !== undefined && fieldMap[key]) {
                updates.push(`${fieldMap[key]} = $${params.length + 1}`);
                params.push(value);
            }
        }
        if (updates.length === 0)
            return this.findById(id, companyId);
        params.push(id, companyId);
        const rows = await (0, database_1.query)(`UPDATE spare_parts SET ${updates.join(', ')} WHERE id = $${params.length - 1} AND company_id = $${params.length} RETURNING *`, params);
        return rows.length > 0 ? mapRowToSparePart(rows[0]) : null;
    }
    static async adjustStock(id, companyId, quantity, reason) {
        const rows = await (0, database_1.query)(`UPDATE spare_parts 
       SET quantity_in_stock = quantity_in_stock + $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2 AND company_id = $3 
       RETURNING *`, [quantity, id, companyId]);
        return rows.length > 0 ? mapRowToSparePart(rows[0]) : null;
    }
    static async delete(id, companyId) {
        const result = await (0, database_1.query)('DELETE FROM spare_parts WHERE id = $1 AND company_id = $2 RETURNING id', [id, companyId]);
        return result.length > 0;
    }
}
exports.SparePartModel = SparePartModel;
// ==================== Maintenance Schedule Model ====================
class MaintenanceScheduleModel {
    static async findById(id, companyId) {
        const rows = await (0, database_1.query)(`SELECT ms.*, v.registration_number as vehicle_registration, v.make as vehicle_make, v.model as vehicle_model,
              p.name as provider_name
       FROM maintenance_schedules ms
       JOIN vehicles v ON ms.vehicle_id = v.id
       LEFT JOIN service_providers p ON ms.assigned_provider_id = p.id
       WHERE ms.id = $1 AND ms.company_id = $2`, [id, companyId]);
        return rows.length > 0 ? mapRowToSchedule(rows[0]) : null;
    }
    static async findByCompany(companyId, options) {
        let sql = `
      SELECT ms.*, v.registration_number as vehicle_registration, v.make as vehicle_make, v.model as vehicle_model,
             p.name as provider_name
      FROM maintenance_schedules ms
      JOIN vehicles v ON ms.vehicle_id = v.id
      LEFT JOIN service_providers p ON ms.assigned_provider_id = p.id
      WHERE ms.company_id = $1`;
        let countSql = 'SELECT COUNT(*) as total FROM maintenance_schedules WHERE company_id = $1';
        const params = [companyId];
        if (options?.vehicleId) {
            sql += ` AND ms.vehicle_id = $${params.length + 1}`;
            countSql += ` AND vehicle_id = $${params.length + 1}`;
            params.push(options.vehicleId);
        }
        if (options?.status) {
            sql += ` AND ms.status = $${params.length + 1}`;
            countSql += ` AND status = $${params.length + 1}`;
            params.push(options.status);
        }
        if (options?.priority) {
            sql += ` AND ms.priority = $${params.length + 1}`;
            countSql += ` AND priority = $${params.length + 1}`;
            params.push(options.priority);
        }
        if (options?.upcoming) {
            sql += ` AND ms.next_service_date <= CURRENT_DATE + INTERVAL '30 days' AND ms.status = 'active'`;
            countSql += ` AND next_service_date <= CURRENT_DATE + INTERVAL '30 days' AND status = 'active'`;
        }
        if (options?.overdue) {
            sql += ` AND ms.next_service_date < CURRENT_DATE AND ms.status = 'active'`;
            countSql += ` AND next_service_date < CURRENT_DATE AND status = 'active'`;
        }
        sql += ' ORDER BY ms.next_service_date ASC NULLS LAST, ms.priority DESC';
        if (options?.limit) {
            sql += ` LIMIT $${params.length + 1}`;
            params.push(options.limit);
            if (options?.offset) {
                sql += ` OFFSET $${params.length + 1}`;
                params.push(options.offset);
            }
        }
        const [scheduleRows, countRows] = await Promise.all([
            (0, database_1.query)(sql, params),
            (0, database_1.query)(countSql, params.slice(0, options?.limit ? params.length - (options.offset ? 2 : 1) : params.length))
        ]);
        return {
            schedules: scheduleRows.map(mapRowToSchedule),
            total: parseInt(countRows[0].total)
        };
    }
    static async create(companyId, input) {
        // Calculate next service date/mileage based on inputs
        let nextServiceDate;
        let nextServiceMileage;
        if (input.intervalMonths && input.lastServiceDate) {
            const date = new Date(input.lastServiceDate);
            date.setMonth(date.getMonth() + input.intervalMonths);
            nextServiceDate = date;
        }
        if (input.intervalMileage && input.lastServiceMileage !== undefined) {
            nextServiceMileage = input.lastServiceMileage + input.intervalMileage;
        }
        const rows = await (0, database_1.query)(`INSERT INTO maintenance_schedules (
        company_id, vehicle_id, schedule_type, service_type, title, description,
        interval_mileage, last_service_mileage, next_service_mileage,
        interval_months, last_service_date, next_service_date,
        estimated_cost, estimated_duration_hours, assigned_provider_id,
        reminder_days_before, reminder_mileage_before, priority
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING *`, [
            companyId,
            input.vehicleId,
            input.scheduleType,
            input.serviceType,
            input.title,
            input.description || null,
            input.intervalMileage || null,
            input.lastServiceMileage || 0,
            nextServiceMileage || null,
            input.intervalMonths || null,
            input.lastServiceDate || null,
            nextServiceDate || null,
            input.estimatedCost || null,
            input.estimatedDurationHours || null,
            input.assignedProviderId || null,
            input.reminderDaysBefore || 7,
            input.reminderMileageBefore || 500,
            input.priority || 'normal',
        ]);
        return mapRowToSchedule(rows[0]);
    }
    static async update(id, companyId, input) {
        const updates = [];
        const params = [];
        const fieldMap = {
            scheduleType: 'schedule_type',
            serviceType: 'service_type',
            title: 'title',
            description: 'description',
            intervalMileage: 'interval_mileage',
            lastServiceMileage: 'last_service_mileage',
            intervalMonths: 'interval_months',
            lastServiceDate: 'last_service_date',
            estimatedCost: 'estimated_cost',
            estimatedDurationHours: 'estimated_duration_hours',
            assignedProviderId: 'assigned_provider_id',
            reminderDaysBefore: 'reminder_days_before',
            reminderMileageBefore: 'reminder_mileage_before',
            priority: 'priority',
            status: 'status',
        };
        for (const [key, value] of Object.entries(input)) {
            if (value !== undefined && fieldMap[key]) {
                updates.push(`${fieldMap[key]} = $${params.length + 1}`);
                params.push(value);
            }
        }
        if (updates.length === 0)
            return this.findById(id, companyId);
        params.push(id, companyId);
        const rows = await (0, database_1.query)(`UPDATE maintenance_schedules SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $${params.length - 1} AND company_id = $${params.length} 
       RETURNING *`, params);
        return rows.length > 0 ? mapRowToSchedule(rows[0]) : null;
    }
    static async delete(id, companyId) {
        const result = await (0, database_1.query)('DELETE FROM maintenance_schedules WHERE id = $1 AND company_id = $2 RETURNING id', [id, companyId]);
        return result.length > 0;
    }
    static async getStats(companyId) {
        const rows = await (0, database_1.query)(`SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
        COUNT(CASE WHEN status = 'active' AND next_service_date < CURRENT_DATE THEN 1 END) as overdue,
        COUNT(CASE WHEN status = 'active' AND next_service_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days' THEN 1 END) as due_soon
       FROM maintenance_schedules WHERE company_id = $1`, [companyId]);
        return {
            total: parseInt(rows[0].total),
            active: parseInt(rows[0].active),
            overdue: parseInt(rows[0].overdue),
            dueSoon: parseInt(rows[0].due_soon),
        };
    }
}
exports.MaintenanceScheduleModel = MaintenanceScheduleModel;
// ==================== Maintenance Record Model ====================
class MaintenanceRecordModel {
    static async findById(id, companyId) {
        const rows = await (0, database_1.query)(`SELECT mr.*, v.registration_number as vehicle_registration, v.make as vehicle_make, v.model as vehicle_model
       FROM maintenance_records mr
       JOIN vehicles v ON mr.vehicle_id = v.id
       WHERE mr.id = $1 AND mr.company_id = $2`, [id, companyId]);
        if (rows.length === 0)
            return null;
        const record = mapRowToRecord(rows[0]);
        record.parts = await this.getParts(id);
        return record;
    }
    static async getParts(recordId) {
        const rows = await (0, database_1.query)('SELECT * FROM maintenance_parts WHERE record_id = $1', [recordId]);
        return rows.map(mapRowToMaintenancePart);
    }
    static async findByCompany(companyId, options) {
        let sql = `
      SELECT mr.*, v.registration_number as vehicle_registration, v.make as vehicle_make, v.model as vehicle_model
      FROM maintenance_records mr
      JOIN vehicles v ON mr.vehicle_id = v.id
      WHERE mr.company_id = $1`;
        let countSql = 'SELECT COUNT(*) as total FROM maintenance_records WHERE company_id = $1';
        const params = [companyId];
        if (options?.vehicleId) {
            sql += ` AND mr.vehicle_id = $${params.length + 1}`;
            countSql += ` AND vehicle_id = $${params.length + 1}`;
            params.push(options.vehicleId);
        }
        if (options?.status) {
            sql += ` AND mr.status = $${params.length + 1}`;
            countSql += ` AND status = $${params.length + 1}`;
            params.push(options.status);
        }
        if (options?.serviceType) {
            sql += ` AND mr.service_type = $${params.length + 1}`;
            countSql += ` AND service_type = $${params.length + 1}`;
            params.push(options.serviceType);
        }
        if (options?.category) {
            sql += ` AND mr.category = $${params.length + 1}`;
            countSql += ` AND category = $${params.length + 1}`;
            params.push(options.category);
        }
        if (options?.dateFrom) {
            sql += ` AND mr.completed_date >= $${params.length + 1}`;
            countSql += ` AND completed_date >= $${params.length + 1}`;
            params.push(options.dateFrom);
        }
        if (options?.dateTo) {
            sql += ` AND mr.completed_date <= $${params.length + 1}`;
            countSql += ` AND completed_date <= $${params.length + 1}`;
            params.push(options.dateTo);
        }
        sql += ' ORDER BY mr.created_at DESC';
        if (options?.limit) {
            sql += ` LIMIT $${params.length + 1}`;
            params.push(options.limit);
            if (options?.offset) {
                sql += ` OFFSET $${params.length + 1}`;
                params.push(options.offset);
            }
        }
        const [recordRows, countRows] = await Promise.all([
            (0, database_1.query)(sql, params),
            (0, database_1.query)(countSql, params.slice(0, options?.limit ? params.length - (options.offset ? 2 : 1) : params.length))
        ]);
        return {
            records: recordRows.map(mapRowToRecord),
            total: parseInt(countRows[0].total)
        };
    }
    static async create(companyId, input) {
        // Start transaction
        const client = await (await Promise.resolve().then(() => __importStar(require('../database')))).pool.connect();
        try {
            await client.query('BEGIN');
            // Calculate warranty expiry
            let warrantyExpiry;
            if (input.warrantyMonths && input.completedDate) {
                warrantyExpiry = new Date(input.completedDate);
                warrantyExpiry.setMonth(warrantyExpiry.getMonth() + input.warrantyMonths);
            }
            // Create record
            const recordRows = await client.query(`INSERT INTO maintenance_records (
          company_id, vehicle_id, schedule_id, service_type, category, title, description,
          provider_id, provider_name, scheduled_date, started_date, completed_date,
          service_mileage, next_service_mileage, labor_cost, parts_cost, other_cost,
          status, breakdown_location, breakdown_cause, is_emergency,
          technician_name, driver_id, warranty_months, warranty_expiry,
          invoice_number, documents, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28)
        RETURNING *`, [
                companyId,
                input.vehicleId,
                input.scheduleId || null,
                input.serviceType,
                input.category,
                input.title,
                input.description || null,
                input.providerId || null,
                input.providerName || null,
                input.scheduledDate || null,
                input.startedDate || null,
                input.completedDate || null,
                input.serviceMileage || null,
                input.nextServiceMileage || null,
                input.laborCost || 0,
                input.partsCost || 0,
                input.otherCost || 0,
                input.status || 'scheduled',
                input.breakdownLocation || null,
                input.breakdownCause || null,
                input.isEmergency || false,
                input.technicianName || null,
                input.driverId || null,
                input.warrantyMonths || null,
                warrantyExpiry || null,
                input.invoiceNumber || null,
                input.documents ? JSON.stringify(input.documents) : null,
                input.notes || null,
            ]);
            const record = recordRows.rows[0];
            // Add parts if provided
            if (input.parts && input.parts.length > 0) {
                for (const part of input.parts) {
                    await client.query(`INSERT INTO maintenance_parts (record_id, part_id, part_number, part_name, quantity, unit_cost)
             VALUES ($1, $2, $3, $4, $5, $6)`, [record.id, part.partId || null, part.partNumber, part.partName, part.quantity, part.unitCost]);
                    // Update stock if partId provided
                    if (part.partId) {
                        await client.query('UPDATE spare_parts SET quantity_in_stock = quantity_in_stock - $1 WHERE id = $2', [part.quantity, part.partId]);
                    }
                }
            }
            // Update vehicle mileage if service completed
            if (input.status === 'completed' && input.serviceMileage) {
                await client.query('UPDATE vehicles SET current_mileage = $1, last_service_date = $2 WHERE id = $3', [input.serviceMileage, input.completedDate || new Date(), input.vehicleId]);
            }
            // Update schedule if linked
            if (input.scheduleId && input.status === 'completed') {
                await client.query(`UPDATE maintenance_schedules 
           SET last_service_date = $1, last_service_mileage = $2,
               next_service_date = CASE WHEN interval_months IS NOT NULL THEN $1 + INTERVAL '1 month' * interval_months ELSE next_service_date END,
               next_service_mileage = CASE WHEN interval_mileage IS NOT NULL THEN $2 + interval_mileage ELSE next_service_mileage END
           WHERE id = $3`, [input.completedDate || new Date(), input.serviceMileage || 0, input.scheduleId]);
            }
            await client.query('COMMIT');
            const fullRecord = mapRowToRecord(record);
            fullRecord.parts = await this.getParts(record.id);
            return fullRecord;
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
    static async update(id, companyId, input) {
        const updates = [];
        const params = [];
        const fieldMap = {
            serviceType: 'service_type',
            category: 'category',
            title: 'title',
            description: 'description',
            providerId: 'provider_id',
            providerName: 'provider_name',
            scheduledDate: 'scheduled_date',
            startedDate: 'started_date',
            completedDate: 'completed_date',
            serviceMileage: 'service_mileage',
            nextServiceMileage: 'next_service_mileage',
            laborCost: 'labor_cost',
            partsCost: 'parts_cost',
            otherCost: 'other_cost',
            status: 'status',
            breakdownLocation: 'breakdown_location',
            breakdownCause: 'breakdown_cause',
            isEmergency: 'is_emergency',
            technicianName: 'technician_name',
            driverId: 'driver_id',
            warrantyMonths: 'warranty_months',
            invoiceNumber: 'invoice_number',
            documents: 'documents',
            notes: 'notes',
        };
        for (const [key, value] of Object.entries(input)) {
            if (value !== undefined && fieldMap[key]) {
                if (key === 'documents') {
                    updates.push(`${fieldMap[key]} = $${params.length + 1}`);
                    params.push(JSON.stringify(value));
                }
                else {
                    updates.push(`${fieldMap[key]} = $${params.length + 1}`);
                    params.push(value);
                }
            }
        }
        if (updates.length === 0)
            return this.findById(id, companyId);
        params.push(id, companyId);
        const rows = await (0, database_1.query)(`UPDATE maintenance_records SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $${params.length - 1} AND company_id = $${params.length} 
       RETURNING *`, params);
        if (rows.length === 0)
            return null;
        const record = mapRowToRecord(rows[0]);
        record.parts = await this.getParts(id);
        return record;
    }
    static async delete(id, companyId) {
        const result = await (0, database_1.query)('DELETE FROM maintenance_records WHERE id = $1 AND company_id = $2 RETURNING id', [id, companyId]);
        return result.length > 0;
    }
    static async getStats(companyId, dateFrom, dateTo) {
        let sql = `
      SELECT 
        COUNT(*) as total_records,
        COALESCE(SUM(total_cost), 0) as total_cost,
        COUNT(CASE WHEN service_type = 'preventive' THEN 1 END) as preventive_count,
        COUNT(CASE WHEN service_type = 'repair' THEN 1 END) as repair_count,
        COUNT(CASE WHEN service_type = 'breakdown' THEN 1 END) as breakdown_count,
        COUNT(CASE WHEN service_type = 'emergency' THEN 1 END) as emergency_count
       FROM maintenance_records WHERE company_id = $1`;
        const params = [companyId];
        if (dateFrom) {
            sql += ` AND completed_date >= $${params.length + 1}`;
            params.push(dateFrom);
        }
        if (dateTo) {
            sql += ` AND completed_date <= $${params.length + 1}`;
            params.push(dateTo);
        }
        const rows = await (0, database_1.query)(sql, params);
        return {
            totalRecords: parseInt(rows[0].total_records),
            totalCost: parseFloat(rows[0].total_cost),
            preventiveCount: parseInt(rows[0].preventive_count),
            repairCount: parseInt(rows[0].repair_count),
            breakdownCount: parseInt(rows[0].breakdown_count),
            emergencyCount: parseInt(rows[0].emergency_count),
        };
    }
}
exports.MaintenanceRecordModel = MaintenanceRecordModel;
// ==================== Vehicle Downtime Model ====================
class VehicleDowntimeModel {
    static async findById(id, companyId) {
        const rows = await (0, database_1.query)(`SELECT vd.*, v.registration_number as vehicle_registration,
              rv.registration_number as replacement_vehicle_registration
       FROM vehicle_downtime vd
       JOIN vehicles v ON vd.vehicle_id = v.id
       LEFT JOIN vehicles rv ON vd.replacement_vehicle_id = rv.id
       WHERE vd.id = $1 AND vd.company_id = $2`, [id, companyId]);
        return rows.length > 0 ? mapRowToDowntime(rows[0]) : null;
    }
    static async findByCompany(companyId, options) {
        let sql = `
      SELECT vd.*, v.registration_number as vehicle_registration,
             rv.registration_number as replacement_vehicle_registration
      FROM vehicle_downtime vd
      JOIN vehicles v ON vd.vehicle_id = v.id
      LEFT JOIN vehicles rv ON vd.replacement_vehicle_id = rv.id
      WHERE vd.company_id = $1`;
        let countSql = 'SELECT COUNT(*) as total FROM vehicle_downtime WHERE company_id = $1';
        const params = [companyId];
        if (options?.vehicleId) {
            sql += ` AND vd.vehicle_id = $${params.length + 1}`;
            countSql += ` AND vehicle_id = $${params.length + 1}`;
            params.push(options.vehicleId);
        }
        if (options?.downtimeType) {
            sql += ` AND vd.downtime_type = $${params.length + 1}`;
            countSql += ` AND downtime_type = $${params.length + 1}`;
            params.push(options.downtimeType);
        }
        if (options?.active) {
            sql += ` AND vd.end_date IS NULL`;
            countSql += ` AND end_date IS NULL`;
        }
        if (options?.dateFrom) {
            sql += ` AND vd.start_date >= $${params.length + 1}`;
            countSql += ` AND start_date >= $${params.length + 1}`;
            params.push(options.dateFrom);
        }
        if (options?.dateTo) {
            sql += ` AND vd.start_date <= $${params.length + 1}`;
            countSql += ` AND start_date <= $${params.length + 1}`;
            params.push(options.dateTo);
        }
        sql += ' ORDER BY vd.start_date DESC';
        if (options?.limit) {
            sql += ` LIMIT $${params.length + 1}`;
            params.push(options.limit);
            if (options?.offset) {
                sql += ` OFFSET $${params.length + 1}`;
                params.push(options.offset);
            }
        }
        const [downtimeRows, countRows] = await Promise.all([
            (0, database_1.query)(sql, params),
            (0, database_1.query)(countSql, params.slice(0, options?.limit ? params.length - (options.offset ? 2 : 1) : params.length))
        ]);
        return {
            downtimes: downtimeRows.map(mapRowToDowntime),
            total: parseInt(countRows[0].total)
        };
    }
    static async create(companyId, input) {
        const rows = await (0, database_1.query)(`INSERT INTO vehicle_downtime (
        company_id, vehicle_id, record_id, downtime_type, start_date, end_date,
        start_time, end_time, duration_hours, reason, impact,
        replacement_vehicle_id, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`, [
            companyId,
            input.vehicleId,
            input.recordId || null,
            input.downtimeType,
            input.startDate,
            input.endDate || null,
            input.startTime || null,
            input.endTime || null,
            input.durationHours || null,
            input.reason || null,
            input.impact || null,
            input.replacementVehicleId || null,
            input.notes || null,
        ]);
        // Update vehicle status if downtime is active
        if (!input.endDate) {
            await (0, database_1.query)("UPDATE vehicles SET status = 'maintenance' WHERE id = $1", [input.vehicleId]);
        }
        return mapRowToDowntime(rows[0]);
    }
    static async endDowntime(id, companyId, endDate, endTime, durationHours) {
        const rows = await (0, database_1.query)(`UPDATE vehicle_downtime 
       SET end_date = $1, end_time = $2, duration_hours = $3, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $4 AND company_id = $5 
       RETURNING *`, [endDate, endTime || null, durationHours || null, id, companyId]);
        if (rows.length === 0)
            return null;
        // Update vehicle status back to available
        await (0, database_1.query)("UPDATE vehicles SET status = 'available' WHERE id = $1", [rows[0].vehicle_id]);
        return this.findById(id, companyId);
    }
    static async getStats(companyId, dateFrom, dateTo) {
        let sql = `
      SELECT 
        COALESCE(SUM(duration_days), 0) as total_days,
        COUNT(CASE WHEN end_date IS NULL THEN 1 END) as active_count,
        COALESCE(AVG(duration_days), 0) as avg_duration,
        downtime_type,
        COUNT(*) as type_count
       FROM vehicle_downtime WHERE company_id = $1`;
        const params = [companyId];
        if (dateFrom) {
            sql += ` AND start_date >= $${params.length + 1}`;
            params.push(dateFrom);
        }
        if (dateTo) {
            sql += ` AND start_date <= $${params.length + 1}`;
            params.push(dateTo);
        }
        sql += ' GROUP BY downtime_type';
        const rows = await (0, database_1.query)(sql, params);
        const downtimeByType = {};
        rows.forEach((row) => {
            downtimeByType[row.downtime_type] = parseInt(row.type_count);
        });
        return {
            totalDowntimeDays: rows.length > 0 ? parseInt(rows[0].total_days) : 0,
            activeDowntimeCount: rows.length > 0 ? parseInt(rows[0].active_count) : 0,
            averageDurationDays: rows.length > 0 ? parseFloat(rows[0].avg_duration) : 0,
            downtimeByType,
        };
    }
}
exports.VehicleDowntimeModel = VehicleDowntimeModel;
// ==================== Maintenance Reminder Model ====================
class MaintenanceReminderModel {
    static async findById(id, companyId) {
        const rows = await (0, database_1.query)(`SELECT mr.*, v.registration_number as vehicle_registration, v.make as vehicle_make, v.model as vehicle_model,
              ms.title as schedule_title
       FROM maintenance_reminders mr
       JOIN vehicles v ON mr.vehicle_id = v.id
       LEFT JOIN maintenance_schedules ms ON mr.schedule_id = ms.id
       WHERE mr.id = $1 AND mr.company_id = $2`, [id, companyId]);
        return rows.length > 0 ? mapRowToReminder(rows[0]) : null;
    }
    static async findByCompany(companyId, options) {
        let sql = `
      SELECT mr.*, v.registration_number as vehicle_registration, v.make as vehicle_make, v.model as vehicle_model,
             ms.title as schedule_title
      FROM maintenance_reminders mr
      JOIN vehicles v ON mr.vehicle_id = v.id
      LEFT JOIN maintenance_schedules ms ON mr.schedule_id = ms.id
      WHERE mr.company_id = $1`;
        let countSql = 'SELECT COUNT(*) as total FROM maintenance_reminders WHERE company_id = $1';
        const params = [companyId];
        if (options?.status) {
            sql += ` AND mr.status = $${params.length + 1}`;
            countSql += ` AND status = $${params.length + 1}`;
            params.push(options.status);
        }
        if (options?.severity) {
            sql += ` AND mr.severity = $${params.length + 1}`;
            countSql += ` AND severity = $${params.length + 1}`;
            params.push(options.severity);
        }
        if (options?.vehicleId) {
            sql += ` AND mr.vehicle_id = $${params.length + 1}`;
            countSql += ` AND vehicle_id = $${params.length + 1}`;
            params.push(options.vehicleId);
        }
        if (options?.upcoming) {
            sql += ` AND mr.due_date <= CURRENT_DATE + INTERVAL '30 days'`;
            countSql += ` AND due_date <= CURRENT_DATE + INTERVAL '30 days'`;
        }
        sql += ' ORDER BY mr.due_date ASC NULLS LAST, mr.severity DESC';
        if (options?.limit) {
            sql += ` LIMIT $${params.length + 1}`;
            params.push(options.limit);
            if (options?.offset) {
                sql += ` OFFSET $${params.length + 1}`;
                params.push(options.offset);
            }
        }
        const [reminderRows, countRows] = await Promise.all([
            (0, database_1.query)(sql, params),
            (0, database_1.query)(countSql, params.slice(0, options?.limit ? params.length - (options.offset ? 2 : 1) : params.length))
        ]);
        return {
            reminders: reminderRows.map(mapRowToReminder),
            total: parseInt(countRows[0].total)
        };
    }
    static async create(companyId, scheduleId, vehicleId, input) {
        const rows = await (0, database_1.query)(`INSERT INTO maintenance_reminders (
        company_id, schedule_id, vehicle_id, reminder_type, title, message,
        due_mileage, due_date, severity
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`, [
            companyId,
            scheduleId,
            vehicleId,
            input.reminderType,
            input.title,
            input.message || null,
            input.dueMileage || null,
            input.dueDate || null,
            input.severity || 'info',
        ]);
        return mapRowToReminder(rows[0]);
    }
    static async acknowledge(id, companyId, userId) {
        const rows = await (0, database_1.query)(`UPDATE maintenance_reminders 
       SET status = 'acknowledged', acknowledged_at = CURRENT_TIMESTAMP, acknowledged_by = $1 
       WHERE id = $2 AND company_id = $3 
       RETURNING *`, [userId, id, companyId]);
        return rows.length > 0 ? mapRowToReminder(rows[0]) : null;
    }
    static async dismiss(id, companyId) {
        const rows = await (0, database_1.query)(`UPDATE maintenance_reminders 
       SET status = 'dismissed' 
       WHERE id = $1 AND company_id = $2 
       RETURNING *`, [id, companyId]);
        return rows.length > 0 ? mapRowToReminder(rows[0]) : null;
    }
    static async generateFromSchedules(companyId) {
        // Find schedules that need reminders and create them
        const result = await (0, database_1.query)(`INSERT INTO maintenance_reminders (company_id, schedule_id, vehicle_id, reminder_type, title, message, due_mileage, due_date, severity)
       SELECT 
         ms.company_id,
         ms.id as schedule_id,
         ms.vehicle_id,
         CASE 
           WHEN ms.next_service_date IS NOT NULL AND ms.next_service_mileage IS NOT NULL THEN 'both'
           WHEN ms.next_service_date IS NOT NULL THEN 'time_due'
           ELSE 'mileage_due'
         END as reminder_type,
         'Maintenance Due: ' || ms.title as title,
         'Vehicle ' || v.registration_number || ' requires ' || ms.service_type || ' service' as message,
         ms.next_service_mileage,
         ms.next_service_date,
         CASE 
           WHEN ms.next_service_date < CURRENT_DATE OR ms.next_service_mileage <= v.current_mileage THEN 'critical'
           WHEN ms.next_service_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'warning'
           ELSE 'info'
         END as severity
       FROM maintenance_schedules ms
       JOIN vehicles v ON ms.vehicle_id = v.id
       LEFT JOIN maintenance_reminders mr ON ms.id = mr.schedule_id AND mr.status = 'pending'
       WHERE ms.company_id = $1 
         AND ms.status = 'active'
         AND mr.id IS NULL
         AND (
           (ms.next_service_date IS NOT NULL AND ms.next_service_date <= CURRENT_DATE + INTERVAL '30 days')
           OR (ms.next_service_mileage IS NOT NULL AND ms.next_service_mileage <= v.current_mileage + ms.reminder_mileage_before)
         )`, [companyId]);
        return result.length || 0;
    }
    static async getStats(companyId) {
        const rows = await (0, database_1.query)(`SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'acknowledged' THEN 1 END) as acknowledged,
        COUNT(CASE WHEN severity = 'critical' AND status = 'pending' THEN 1 END) as critical,
        COUNT(CASE WHEN severity = 'warning' AND status = 'pending' THEN 1 END) as warning
       FROM maintenance_reminders WHERE company_id = $1`, [companyId]);
        return {
            total: parseInt(rows[0].total),
            pending: parseInt(rows[0].pending),
            acknowledged: parseInt(rows[0].acknowledged),
            critical: parseInt(rows[0].critical),
            warning: parseInt(rows[0].warning),
        };
    }
}
exports.MaintenanceReminderModel = MaintenanceReminderModel;
//# sourceMappingURL=Maintenance.js.map