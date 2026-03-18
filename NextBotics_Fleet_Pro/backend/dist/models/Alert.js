"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlertModel = void 0;
const database_1 = require("../database");
function mapRowToAlert(row) {
    return {
        id: row.id,
        companyId: row.company_id,
        vehicleId: row.vehicle_id,
        driverId: row.driver_id,
        alertType: row.alert_type,
        severity: row.severity,
        title: row.title,
        message: row.message,
        data: row.data || {},
        isRead: row.is_read,
        readAt: row.read_at ? new Date(row.read_at) : undefined,
        readBy: row.read_by,
        dismissedAt: row.dismissed_at ? new Date(row.dismissed_at) : undefined,
        dismissedBy: row.dismissed_by,
        createdAt: new Date(row.created_at),
    };
}
class AlertModel {
    static async findById(id, companyId) {
        const rows = await (0, database_1.query)(`SELECT a.*, 
        v.registration_number as v_reg,
        d.first_name as d_fname, d.last_name as d_lname
       FROM fleet_alerts a
       LEFT JOIN vehicles v ON a.vehicle_id = v.id
       LEFT JOIN drivers d ON a.driver_id = d.id
       WHERE a.id = $1 AND a.company_id = $2`, [id, companyId]);
        if (rows.length === 0)
            return null;
        const row = rows[0];
        const alert = mapRowToAlert(row);
        if (row.v_reg) {
            alert.vehicle = {
                id: row.vehicle_id,
                registrationNumber: row.v_reg,
            };
        }
        if (row.d_fname) {
            alert.driver = {
                id: row.driver_id,
                firstName: row.d_fname,
                lastName: row.d_lname,
            };
        }
        return alert;
    }
    static async findByCompany(companyId, options) {
        let sql = `
      SELECT a.*, 
        v.registration_number as v_reg,
        d.first_name as d_fname, d.last_name as d_lname
      FROM fleet_alerts a
      LEFT JOIN vehicles v ON a.vehicle_id = v.id
      LEFT JOIN drivers d ON a.driver_id = d.id
      WHERE a.company_id = $1
    `;
        let countSql = 'SELECT COUNT(*) as total FROM fleet_alerts WHERE company_id = $1';
        let unreadSql = 'SELECT COUNT(*) as count FROM fleet_alerts WHERE company_id = $1 AND is_read = false';
        const params = [companyId];
        if (options?.isRead !== undefined) {
            sql += ` AND a.is_read = $${params.length + 1}`;
            countSql += ` AND is_read = $${params.length + 1}`;
            params.push(options.isRead);
        }
        if (options?.severity) {
            sql += ` AND a.severity = $${params.length + 1}`;
            countSql += ` AND severity = $${params.length + 1}`;
            unreadSql += ` AND severity = $${params.length + 1}`;
            params.push(options.severity);
        }
        if (options?.alertType) {
            sql += ` AND a.alert_type = $${params.length + 1}`;
            countSql += ` AND alert_type = $${params.length + 1}`;
            params.push(options.alertType);
        }
        if (options?.vehicleId) {
            sql += ` AND a.vehicle_id = $${params.length + 1}`;
            countSql += ` AND vehicle_id = $${params.length + 1}`;
            params.push(options.vehicleId);
        }
        if (options?.driverId) {
            sql += ` AND a.driver_id = $${params.length + 1}`;
            countSql += ` AND driver_id = $${params.length + 1}`;
            params.push(options.driverId);
        }
        sql += ' ORDER BY a.created_at DESC';
        if (options?.limit) {
            sql += ` LIMIT $${params.length + 1}`;
            params.push(options.limit);
            if (options?.offset) {
                sql += ` OFFSET $${params.length + 1}`;
                params.push(options.offset);
            }
        }
        const [rows, countRows, unreadRows] = await Promise.all([
            (0, database_1.query)(sql, params),
            (0, database_1.query)(countSql, params.slice(0, options?.limit ? params.length - (options.offset ? 2 : 1) : params.length)),
            (0, database_1.query)(unreadSql, [companyId])
        ]);
        const alerts = rows.map((row) => {
            const alert = mapRowToAlert(row);
            if (row.v_reg) {
                alert.vehicle = {
                    id: row.vehicle_id,
                    registrationNumber: row.v_reg,
                };
            }
            if (row.d_fname) {
                alert.driver = {
                    id: row.driver_id,
                    firstName: row.d_fname,
                    lastName: row.d_lname,
                };
            }
            return alert;
        });
        return {
            alerts,
            total: parseInt(countRows[0].total),
            unreadCount: parseInt(unreadRows[0].count)
        };
    }
    static async create(companyId, input) {
        const rows = await (0, database_1.query)(`INSERT INTO fleet_alerts (
        company_id, vehicle_id, driver_id, alert_type, severity, title, message, data
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`, [
            companyId,
            input.vehicleId || null,
            input.driverId || null,
            input.alertType,
            input.severity || 'info',
            input.title,
            input.message || null,
            JSON.stringify(input.data || {}),
        ]);
        return mapRowToAlert(rows[0]);
    }
    static async markAsRead(id, companyId, userId) {
        await (0, database_1.query)(`UPDATE fleet_alerts 
       SET is_read = true, read_at = CURRENT_TIMESTAMP, read_by = $1
       WHERE id = $2 AND company_id = $3`, [userId, id, companyId]);
    }
    static async markAllAsRead(companyId, userId) {
        await (0, database_1.query)(`UPDATE fleet_alerts 
       SET is_read = true, read_at = CURRENT_TIMESTAMP, read_by = $1
       WHERE company_id = $2 AND is_read = false`, [userId, companyId]);
    }
    static async dismiss(id, companyId, userId) {
        await (0, database_1.query)(`UPDATE fleet_alerts 
       SET dismissed_at = CURRENT_TIMESTAMP, dismissed_by = $1
       WHERE id = $2 AND company_id = $3`, [userId, id, companyId]);
    }
    static async delete(id, companyId) {
        const result = await (0, database_1.query)('DELETE FROM fleet_alerts WHERE id = $1 AND company_id = $2 RETURNING id', [id, companyId]);
        return result.length > 0;
    }
    static async deleteOldAlerts(companyId, days) {
        const result = await (0, database_1.query)(`DELETE FROM fleet_alerts 
       WHERE company_id = $1 AND created_at < CURRENT_TIMESTAMP - INTERVAL '${days} days'
       RETURNING id`, [companyId]);
        return result.length;
    }
    // Generate alerts based on vehicle conditions
    static async generateMaintenanceAlerts(companyId) {
        // Find vehicles with maintenance due
        const vehicles = await (0, database_1.query)(`SELECT id, registration_number, next_service_due, current_mileage, service_interval_km
       FROM vehicles 
       WHERE company_id = $1 
       AND is_active = true
       AND (
         (next_service_due IS NOT NULL AND next_service_due <= CURRENT_DATE + INTERVAL '7 days')
         OR (service_interval_km IS NOT NULL AND current_mileage >= service_interval_km - 500)
       )`, [companyId]);
        for (const vehicle of vehicles) {
            // Check if alert already exists
            const existing = await (0, database_1.query)(`SELECT id FROM fleet_alerts 
         WHERE company_id = $1 AND vehicle_id = $2 AND alert_type = 'maintenance_due' AND is_read = false`, [companyId, vehicle.id]);
            if (existing.length === 0) {
                await this.create(companyId, {
                    vehicleId: vehicle.id,
                    alertType: 'maintenance_due',
                    severity: 'warning',
                    title: `Maintenance Due: ${vehicle.registration_number}`,
                    message: `Vehicle ${vehicle.registration_number} is due for maintenance.`,
                    data: {
                        nextServiceDue: vehicle.next_service_due,
                        currentMileage: vehicle.current_mileage,
                        serviceIntervalKm: vehicle.service_interval_km,
                    }
                });
            }
        }
    }
    static async generateExpiryAlerts(companyId) {
        // Insurance expiry alerts
        const insuranceExpiring = await (0, database_1.query)(`SELECT id, registration_number, insurance_expiry
       FROM vehicles 
       WHERE company_id = $1 
       AND is_active = true
       AND insurance_expiry IS NOT NULL
       AND insurance_expiry <= CURRENT_DATE + INTERVAL '30 days'`, [companyId]);
        for (const vehicle of insuranceExpiring) {
            const existing = await (0, database_1.query)(`SELECT id FROM fleet_alerts 
         WHERE company_id = $1 AND vehicle_id = $2 AND alert_type = 'insurance_expiry' AND is_read = false`, [companyId, vehicle.id]);
            if (existing.length === 0) {
                const daysUntil = Math.ceil((new Date(vehicle.insurance_expiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                await this.create(companyId, {
                    vehicleId: vehicle.id,
                    alertType: 'insurance_expiry',
                    severity: daysUntil <= 7 ? 'critical' : 'warning',
                    title: `Insurance Expiring: ${vehicle.registration_number}`,
                    message: `Insurance for ${vehicle.registration_number} expires in ${daysUntil} days.`,
                    data: { expiryDate: vehicle.insurance_expiry, daysUntil }
                });
            }
        }
        // License expiry alerts
        const licenseExpiring = await (0, database_1.query)(`SELECT id, registration_number, license_expiry
       FROM vehicles 
       WHERE company_id = $1 
       AND is_active = true
       AND license_expiry IS NOT NULL
       AND license_expiry <= CURRENT_DATE + INTERVAL '30 days'`, [companyId]);
        for (const vehicle of licenseExpiring) {
            const existing = await (0, database_1.query)(`SELECT id FROM fleet_alerts 
         WHERE company_id = $1 AND vehicle_id = $2 AND alert_type = 'license_expiry' AND is_read = false`, [companyId, vehicle.id]);
            if (existing.length === 0) {
                const daysUntil = Math.ceil((new Date(vehicle.license_expiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                await this.create(companyId, {
                    vehicleId: vehicle.id,
                    alertType: 'license_expiry',
                    severity: daysUntil <= 7 ? 'critical' : 'warning',
                    title: `License Expiring: ${vehicle.registration_number}`,
                    message: `Vehicle license for ${vehicle.registration_number} expires in ${daysUntil} days.`,
                    data: { expiryDate: vehicle.license_expiry, daysUntil }
                });
            }
        }
    }
}
exports.AlertModel = AlertModel;
//# sourceMappingURL=Alert.js.map