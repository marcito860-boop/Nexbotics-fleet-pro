"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExpenseModel = exports.FuelTransactionModel = exports.FuelCardModel = void 0;
const database_1 = require("../database");
class FuelCardModel {
    static async findById(id, companyId) {
        const rows = await (0, database_1.query)('SELECT * FROM fuel_cards WHERE id = $1 AND company_id = $2', [id, companyId]);
        return rows.length > 0 ? this.mapRow(rows[0]) : null;
    }
    static async findByCompany(companyId) {
        const rows = await (0, database_1.query)('SELECT * FROM fuel_cards WHERE company_id = $1 AND is_active = true ORDER BY created_at DESC', [companyId]);
        return rows.map(this.mapRow);
    }
    static async create(companyId, data) {
        const rows = await (0, database_1.query)(`INSERT INTO fuel_cards (company_id, card_number, card_provider, vehicle_id, driver_id, 
       monthly_limit, current_balance, expiry_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`, [companyId, data.cardNumber, data.cardProvider, data.vehicleId, data.driverId,
            data.monthlyLimit, data.currentBalance, data.expiryDate]);
        return this.mapRow(rows[0]);
    }
    static async updateBalance(id, companyId, amount) {
        await (0, database_1.query)('UPDATE fuel_cards SET current_balance = current_balance + $1 WHERE id = $2 AND company_id = $3', [amount, id, companyId]);
    }
    static mapRow(row) {
        return {
            id: row.id,
            companyId: row.company_id,
            cardNumber: row.card_number,
            cardProvider: row.card_provider,
            vehicleId: row.vehicle_id,
            driverId: row.driver_id,
            monthlyLimit: row.monthly_limit ? parseFloat(row.monthly_limit) : undefined,
            currentBalance: row.current_balance ? parseFloat(row.current_balance) : undefined,
            status: row.status,
            expiryDate: row.expiry_date ? new Date(row.expiry_date) : undefined,
            isActive: row.is_active,
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at),
        };
    }
}
exports.FuelCardModel = FuelCardModel;
class FuelTransactionModel {
    static async findByCompany(companyId, options) {
        let sql = `
      SELECT ft.*, v.registration_number as v_reg, d.first_name as d_fname, d.last_name as d_lname
      FROM fuel_transactions ft
      LEFT JOIN vehicles v ON ft.vehicle_id = v.id
      LEFT JOIN drivers d ON ft.driver_id = d.id
      WHERE ft.company_id = $1
    `;
        let countSql = 'SELECT COUNT(*) as total FROM fuel_transactions WHERE company_id = $1';
        const params = [companyId];
        if (options?.vehicleId) {
            sql += ` AND ft.vehicle_id = $${params.length + 1}`;
            countSql += ` AND vehicle_id = $${params.length + 1}`;
            params.push(options.vehicleId);
        }
        if (options?.isAnomaly !== undefined) {
            sql += ` AND ft.is_anomaly = $${params.length + 1}`;
            countSql += ` AND is_anomaly = $${params.length + 1}`;
            params.push(options.isAnomaly);
        }
        sql += ' ORDER BY ft.transaction_date DESC';
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
        const transactions = rows.map((row) => ({
            id: row.id,
            companyId: row.company_id,
            fuelCardId: row.fuel_card_id,
            vehicleId: row.vehicle_id,
            driverId: row.driver_id,
            transactionDate: new Date(row.transaction_date),
            stationName: row.station_name,
            liters: parseFloat(row.liters),
            pricePerLiter: row.price_per_liter ? parseFloat(row.price_per_liter) : undefined,
            totalCost: parseFloat(row.total_cost),
            odometerReading: row.odometer_reading ? parseFloat(row.odometer_reading) : undefined,
            isAnomaly: row.is_anomaly,
            anomalyReason: row.anomaly_reason,
            createdAt: new Date(row.created_at),
            vehicle: row.v_reg ? { registrationNumber: row.v_reg } : undefined,
            driver: row.d_fname ? { firstName: row.d_fname, lastName: row.d_lname } : undefined,
        }));
        return { transactions, total: parseInt(countRows[0].total) };
    }
    static async create(companyId, data) {
        // Check for anomalies (basic logic)
        const isAnomaly = await this.detectAnomaly(companyId, data);
        const rows = await (0, database_1.query)(`INSERT INTO fuel_transactions (company_id, fuel_card_id, vehicle_id, driver_id,
       transaction_date, station_name, liters, price_per_liter, total_cost,
       odometer_reading, is_anomaly, anomaly_reason, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`, [companyId, data.fuelCardId, data.vehicleId, data.driverId, data.transactionDate || new Date(),
            data.stationName, data.liters, data.pricePerLiter, data.totalCost,
            data.odometerReading, isAnomaly.isAnomaly, isAnomaly.reason, data.notes]);
        return this.mapRow(rows[0]);
    }
    static async getStats(companyId, dateFrom, dateTo) {
        let sql = `
      SELECT 
        COALESCE(SUM(total_cost), 0) as total_cost,
        COALESCE(SUM(liters), 0) as total_liters,
        COUNT(*) as transaction_count,
        COALESCE(AVG(price_per_liter), 0) as avg_price,
        COUNT(CASE WHEN is_anomaly THEN 1 END) as anomalies
      FROM fuel_transactions 
      WHERE company_id = $1
    `;
        const params = [companyId];
        if (dateFrom) {
            sql += ` AND transaction_date >= $${params.length + 1}`;
            params.push(dateFrom);
        }
        if (dateTo) {
            sql += ` AND transaction_date <= $${params.length + 1}`;
            params.push(dateTo);
        }
        const rows = await (0, database_1.query)(sql, params);
        return {
            totalCost: parseFloat(rows[0].total_cost),
            totalLiters: parseFloat(rows[0].total_liters),
            transactionCount: parseInt(rows[0].transaction_count),
            averagePricePerLiter: parseFloat(rows[0].avg_price),
            anomaliesCount: parseInt(rows[0].anomalies),
        };
    }
    static async detectAnomaly(companyId, data) {
        if (!data.vehicleId || !data.liters)
            return { isAnomaly: false };
        // Get vehicle fuel capacity
        const vehicleRows = await (0, database_1.query)('SELECT fuel_capacity FROM vehicles WHERE id = $1 AND company_id = $2', [data.vehicleId, companyId]);
        if (vehicleRows.length > 0 && vehicleRows[0].fuel_capacity) {
            const capacity = parseFloat(vehicleRows[0].fuel_capacity);
            if (data.liters > capacity * 1.1) {
                return { isAnomaly: true, reason: `Fuel amount exceeds tank capacity (${capacity}L)` };
            }
        }
        // Check for frequent transactions (more than 3 in same day)
        const frequentRows = await (0, database_1.query)(`SELECT COUNT(*) as count FROM fuel_transactions 
       WHERE vehicle_id = $1 AND company_id = $2 
       AND DATE(transaction_date) = DATE($3)`, [data.vehicleId, companyId, data.transactionDate || new Date()]);
        if (parseInt(frequentRows[0].count) >= 3) {
            return { isAnomaly: true, reason: 'Multiple fuel transactions on same day' };
        }
        return { isAnomaly: false };
    }
    static mapRow(row) {
        return {
            id: row.id,
            companyId: row.company_id,
            fuelCardId: row.fuel_card_id,
            vehicleId: row.vehicle_id,
            driverId: row.driver_id,
            transactionDate: new Date(row.transaction_date),
            stationName: row.station_name,
            liters: parseFloat(row.liters),
            pricePerLiter: row.price_per_liter ? parseFloat(row.price_per_liter) : undefined,
            totalCost: parseFloat(row.total_cost),
            odometerReading: row.odometer_reading ? parseFloat(row.odometer_reading) : undefined,
            isAnomaly: row.is_anomaly,
            anomalyReason: row.anomaly_reason,
            createdAt: new Date(row.created_at),
        };
    }
}
exports.FuelTransactionModel = FuelTransactionModel;
class ExpenseModel {
    static async findByCompany(companyId, options) {
        let sql = 'SELECT * FROM expenses WHERE company_id = $1';
        let countSql = 'SELECT COUNT(*) as total FROM expenses WHERE company_id = $1';
        const params = [companyId];
        if (options?.status) {
            sql += ` AND status = $${params.length + 1}`;
            countSql += ` AND status = $${params.length + 1}`;
            params.push(options.status);
        }
        if (options?.vehicleId) {
            sql += ` AND vehicle_id = $${params.length + 1}`;
            countSql += ` AND vehicle_id = $${params.length + 1}`;
            params.push(options.vehicleId);
        }
        if (options?.expenseType) {
            sql += ` AND expense_type = $${params.length + 1}`;
            countSql += ` AND expense_type = $${params.length + 1}`;
            params.push(options.expenseType);
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
        const [rows, countRows] = await Promise.all([
            (0, database_1.query)(sql, params),
            (0, database_1.query)(countSql, params.slice(0, options?.limit ? params.length - (options.offset ? 2 : 1) : params.length))
        ]);
        return {
            expenses: rows.map((row) => ({
                id: row.id,
                companyId: row.company_id,
                vehicleId: row.vehicle_id,
                driverId: row.driver_id,
                expenseType: row.expense_type,
                amount: parseFloat(row.amount),
                expenseDate: new Date(row.expense_date),
                description: row.description,
                vendorName: row.vendor_name,
                receiptUrl: row.receipt_url,
                status: row.status,
                isReimbursable: row.is_reimbursable,
                createdBy: row.created_by,
                createdAt: new Date(row.created_at),
                updatedAt: new Date(row.updated_at),
            })),
            total: parseInt(countRows[0].total)
        };
    }
    static async create(companyId, createdBy, data) {
        const rows = await (0, database_1.query)(`INSERT INTO expenses (company_id, vehicle_id, driver_id, expense_type, amount,
       expense_date, description, vendor_name, is_reimbursable, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`, [companyId, data.vehicleId, data.driverId, data.expenseType, data.amount,
            data.expenseDate || new Date(), data.description, data.vendorName,
            data.isReimbursable || false, createdBy]);
        return {
            id: rows[0].id,
            companyId: rows[0].company_id,
            vehicleId: rows[0].vehicle_id,
            driverId: rows[0].driver_id,
            expenseType: rows[0].expense_type,
            amount: parseFloat(rows[0].amount),
            expenseDate: new Date(rows[0].expense_date),
            description: rows[0].description,
            vendorName: rows[0].vendor_name,
            receiptUrl: rows[0].receipt_url,
            status: rows[0].status,
            isReimbursable: rows[0].is_reimbursable,
            createdBy: rows[0].created_by,
            createdAt: new Date(rows[0].created_at),
            updatedAt: new Date(rows[0].updated_at),
        };
    }
    static async getStats(companyId, dateFrom, dateTo) {
        let sql = `
      SELECT 
        expense_type,
        status,
        COALESCE(SUM(amount), 0) as total
      FROM expenses 
      WHERE company_id = $1
    `;
        const params = [companyId];
        if (dateFrom) {
            sql += ` AND expense_date >= $${params.length + 1}`;
            params.push(dateFrom);
        }
        if (dateTo) {
            sql += ` AND expense_date <= $${params.length + 1}`;
            params.push(dateTo);
        }
        sql += ' GROUP BY expense_type, status';
        const rows = await (0, database_1.query)(sql, params);
        const byType = {};
        let totalAmount = 0;
        let pendingAmount = 0;
        let approvedAmount = 0;
        for (const row of rows) {
            const amount = parseFloat(row.total);
            totalAmount += amount;
            if (!byType[row.expense_type])
                byType[row.expense_type] = 0;
            byType[row.expense_type] += amount;
            if (row.status === 'pending')
                pendingAmount += amount;
            if (row.status === 'approved')
                approvedAmount += amount;
        }
        return { totalAmount, byType, pendingAmount, approvedAmount };
    }
}
exports.ExpenseModel = ExpenseModel;
//# sourceMappingURL=Fuel.js.map