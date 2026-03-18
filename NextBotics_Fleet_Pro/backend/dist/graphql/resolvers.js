"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolvers = void 0;
const database_1 = require("../database");
const Vehicle_1 = require("../models/Vehicle");
const Driver_1 = require("../models/Driver");
const Audit_1 = require("../models/Audit");
const Requisition_1 = require("../models/Requisition");
const Inventory_1 = require("../models/Inventory");
const Invoice_1 = require("../models/Invoice");
const Fuel_1 = require("../models/Fuel");
exports.resolvers = {
    Query: {
        // Vehicles
        vehicles: async (_, args, context) => {
            const { user } = context;
            if (!user)
                throw new Error('Unauthorized');
            const result = await Vehicle_1.VehicleModel.findByCompany(user.companyId, {
                status: args.status,
                limit: args.limit || 50,
                offset: args.offset || 0,
            });
            return {
                items: result.vehicles,
                total: result.total,
                hasMore: (args.offset || 0) + result.vehicles.length < result.total,
            };
        },
        vehicle: async (_, args, context) => {
            const { user } = context;
            if (!user)
                throw new Error('Unauthorized');
            return Vehicle_1.VehicleModel.findById(args.id, user.companyId);
        },
        // Drivers
        drivers: async (_, args, context) => {
            const { user } = context;
            if (!user)
                throw new Error('Unauthorized');
            const result = await Driver_1.DriverModel.findByCompany(user.companyId, {
                status: args.status,
                limit: args.limit || 50,
                offset: args.offset || 0,
            });
            return {
                items: result.drivers,
                total: result.total,
                hasMore: (args.offset || 0) + result.drivers.length < result.total,
            };
        },
        driver: async (_, args, context) => {
            const { user } = context;
            if (!user)
                throw new Error('Unauthorized');
            return Driver_1.DriverModel.findById(args.id, user.companyId);
        },
        // Audits
        auditTemplates: async (_, args, context) => {
            const { user } = context;
            if (!user)
                throw new Error('Unauthorized');
            return Audit_1.AuditTemplateModel.findByCompany(user.companyId, args.limit);
        },
        auditSessions: async (_, args, context) => {
            const { user } = context;
            if (!user)
                throw new Error('Unauthorized');
            return Audit_1.AuditSessionModel.findByCompany(user.companyId, {
                status: args.status,
                limit: args.limit || 50,
            });
        },
        auditSession: async (_, args, context) => {
            const { user } = context;
            if (!user)
                throw new Error('Unauthorized');
            return Audit_1.AuditSessionModel.findById(args.id, user.companyId);
        },
        // Requisitions
        requisitions: async (_, args, context) => {
            const { user } = context;
            if (!user)
                throw new Error('Unauthorized');
            const result = await Requisition_1.RequisitionModel.findByCompany(user.companyId, {
                status: args.status,
                limit: args.limit || 50,
            });
            return result.requisitions;
        },
        requisition: async (_, args, context) => {
            const { user } = context;
            if (!user)
                throw new Error('Unauthorized');
            return Requisition_1.RequisitionModel.findById(args.id, user.companyId);
        },
        // Inventory
        inventoryItems: async (_, args, context) => {
            const { user } = context;
            if (!user)
                throw new Error('Unauthorized');
            const result = await Inventory_1.InventoryItemModel.findByCompany(user.companyId, {
                lowStockOnly: args.lowStockOnly,
                limit: args.limit || 50,
            });
            return result.items;
        },
        inventoryItem: async (_, args, context) => {
            const { user } = context;
            if (!user)
                throw new Error('Unauthorized');
            return Inventory_1.InventoryItemModel.findById(args.id, user.companyId);
        },
        // Invoices
        invoices: async (_, args, context) => {
            const { user } = context;
            if (!user)
                throw new Error('Unauthorized');
            const result = await Invoice_1.InvoiceModel.findByCompany(user.companyId, {
                status: args.status,
                limit: args.limit || 50,
            });
            return result.invoices;
        },
        invoice: async (_, args, context) => {
            const { user } = context;
            if (!user)
                throw new Error('Unauthorized');
            return Invoice_1.InvoiceModel.findById(args.id, user.companyId);
        },
        // Analytics
        dashboardAnalytics: async (_, args, context) => {
            const { user } = context;
            if (!user)
                throw new Error('Unauthorized');
            const companyId = user.companyId;
            const dateFrom = args.period === '7d'
                ? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            const dateTo = new Date();
            const [vehicleStats, driverRows, auditStats, fuelStats, inventoryStats, invoiceStats, activeTrips, pendingReqs,] = await Promise.all([
                (0, database_1.query)(`SELECT 
            COUNT(*) as total,
            COUNT(CASE WHEN status = 'available' THEN 1 END) as available,
            COUNT(CASE WHEN status = 'assigned' THEN 1 END) as assigned,
            COUNT(CASE WHEN status = 'maintenance' THEN 1 END) as maintenance
           FROM vehicles WHERE company_id = $1`, [companyId]),
                (0, database_1.query)(`SELECT 
            COUNT(*) as total,
            COUNT(CASE WHEN employment_status = 'active' THEN 1 END) as active
           FROM drivers WHERE company_id = $1`, [companyId]),
                Audit_1.AuditSessionModel.getStats(companyId),
                Fuel_1.FuelTransactionModel.getStats(companyId, dateFrom, dateTo),
                (0, database_1.query)(`SELECT 
            COUNT(*) as total_items,
            COUNT(CASE WHEN current_stock <= reorder_level THEN 1 END) as low_stock,
            COALESCE(SUM(current_stock * unit_price), 0) as total_value
           FROM inventory_items WHERE company_id = $1 AND is_active = true`, [companyId]),
                Invoice_1.InvoiceModel.getStats(companyId),
                (0, database_1.query)('SELECT COUNT(*) as count FROM trips WHERE company_id = $1 AND status = $2', [companyId, 'in_progress']),
                (0, database_1.query)('SELECT COUNT(*) as count FROM vehicle_requisitions WHERE company_id = $1 AND status = $2', [companyId, 'pending']),
            ]);
            return {
                summary: {
                    totalVehicles: parseInt(vehicleStats[0].total),
                    totalDrivers: parseInt(driverRows[0].total),
                    activeTrips: parseInt(activeTrips[0].count),
                    pendingRequisitions: parseInt(pendingReqs[0].count),
                    lowStockItems: parseInt(inventoryStats[0].low_stock),
                    overdueInvoices: invoiceStats.overdueCount,
                },
                vehicleStats: {
                    total: parseInt(vehicleStats[0].total),
                    available: parseInt(vehicleStats[0].available),
                    assigned: parseInt(vehicleStats[0].assigned),
                    maintenance: parseInt(vehicleStats[0].maintenance),
                },
                driverStats: {
                    total: parseInt(driverRows[0].total),
                    active: parseInt(driverRows[0].active),
                    onLeave: 0,
                },
                auditStats: {
                    totalAudits: auditStats.totalAudits,
                    completedAudits: auditStats.completedAudits,
                    averageScore: auditStats.averageScore,
                    byMaturityRating: {
                        excellent: auditStats.byMaturityRating['Excellent'] || 0,
                        good: auditStats.byMaturityRating['Good'] || 0,
                        fair: auditStats.byMaturityRating['Fair'] || 0,
                        poor: auditStats.byMaturityRating['Poor'] || 0,
                        critical: auditStats.byMaturityRating['Critical'] || 0,
                    },
                },
                fuelStats: {
                    totalCost: fuelStats.totalCost,
                    totalLiters: fuelStats.totalLiters,
                    transactionCount: fuelStats.transactionCount,
                    averagePricePerLiter: fuelStats.averagePricePerLiter,
                },
                inventoryStats: {
                    totalItems: parseInt(inventoryStats[0].total_items),
                    totalValue: parseFloat(inventoryStats[0].total_value),
                    lowStockCount: parseInt(inventoryStats[0].low_stock),
                },
                invoiceStats: {
                    total: invoiceStats.total,
                    pendingAmount: invoiceStats.totalAmount - invoiceStats.paidAmount - invoiceStats.overdueAmount,
                    paidAmount: invoiceStats.paidAmount,
                    overdueAmount: invoiceStats.overdueAmount,
                },
                period: { from: dateFrom, to: dateTo },
            };
        },
        fleetUtilization: async (_, __, context) => {
            const { user } = context;
            if (!user)
                throw new Error('Unauthorized');
            const dateFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            const dateTo = new Date();
            const rows = await (0, database_1.query)(`SELECT 
          v.type,
          COUNT(*) as vehicle_count,
          COUNT(CASE WHEN v.status = 'assigned' THEN 1 END) as assigned_count,
          COALESCE(SUM(t.distance_km), 0) as total_distance
         FROM vehicles v
         LEFT JOIN trips t ON v.id = t.vehicle_id AND t.start_time >= $2 AND t.start_time <= $3
         WHERE v.company_id = $1
         GROUP BY v.type`, [user.companyId, dateFrom, dateTo]);
            const totalTrips = await (0, database_1.query)('SELECT COUNT(*) as count, COALESCE(SUM(distance_km), 0) as distance FROM trips WHERE company_id = $1 AND start_time >= $2', [user.companyId, dateFrom]);
            return {
                totalTrips: parseInt(totalTrips[0].count),
                totalDistance: parseFloat(totalTrips[0].distance),
                averageDistance: parseInt(totalTrips[0].count) > 0
                    ? parseFloat(totalTrips[0].distance) / parseInt(totalTrips[0].count)
                    : 0,
                utilizationByType: rows.map((r) => ({
                    type: r.type,
                    vehicleCount: parseInt(r.vehicle_count),
                    assignedCount: parseInt(r.assigned_count),
                    utilizationRate: parseInt(r.vehicle_count) > 0
                        ? (parseInt(r.assigned_count) / parseInt(r.vehicle_count)) * 100
                        : 0,
                    totalDistance: parseFloat(r.total_distance),
                })),
            };
        },
    },
    Mutation: {
        // Vehicles
        createVehicle: async (_, args, context) => {
            const { user } = context;
            if (!user)
                throw new Error('Unauthorized');
            return Vehicle_1.VehicleModel.create(user.companyId, args.input);
        },
        updateVehicle: async (_, args, context) => {
            const { user } = context;
            if (!user)
                throw new Error('Unauthorized');
            const vehicle = await Vehicle_1.VehicleModel.update(args.id, user.companyId, args.input);
            if (!vehicle)
                throw new Error('Vehicle not found');
            return vehicle;
        },
        // Audits
        createAuditSession: async (_, args, context) => {
            const { user } = context;
            if (!user)
                throw new Error('Unauthorized');
            return Audit_1.AuditSessionModel.create(user.companyId, {
                templateId: args.input.templateId,
                vehicleId: args.input.vehicleId,
                driverId: args.input.driverId,
                auditorId: user.userId,
                location: args.input.location,
                auditReference: args.input.auditReference,
            });
        },
        submitAuditResponse: async (_, args, context) => {
            const { user } = context;
            if (!user)
                throw new Error('Unauthorized');
            return Audit_1.AuditSessionModel.submitResponse(args.sessionId, user.companyId, args.input);
        },
        completeAuditSession: async (_, args, context) => {
            const { user } = context;
            if (!user)
                throw new Error('Unauthorized');
            const session = await Audit_1.AuditSessionModel.complete(args.id, user.companyId);
            if (!session)
                throw new Error('Session not found');
            return session;
        },
        // Requisitions
        createRequisition: async (_, args, context) => {
            const { user } = context;
            if (!user)
                throw new Error('Unauthorized');
            return Requisition_1.RequisitionModel.create(user.companyId, {
                ...args.input,
                requestedBy: user.userId,
            });
        },
        approveRequisition: async (_, args, context) => {
            const { user } = context;
            if (!user)
                throw new Error('Unauthorized');
            const req = await Requisition_1.RequisitionModel.approve(args.id, user.companyId, user.userId, args.notes);
            if (!req)
                throw new Error('Requisition not found');
            return req;
        },
        allocateRequisition: async (_, args, context) => {
            const { user } = context;
            if (!user)
                throw new Error('Unauthorized');
            const req = await Requisition_1.RequisitionModel.allocate(args.id, user.companyId, user.userId, args.vehicleId, args.driverId);
            if (!req)
                throw new Error('Requisition not found');
            return req;
        },
        // Inventory
        adjustStock: async (_, args, context) => {
            const { user } = context;
            if (!user)
                throw new Error('Unauthorized');
            const item = await Inventory_1.InventoryItemModel.adjustStock(args.id, user.companyId, args.quantity, user.userId, args.reason);
            if (!item)
                throw new Error('Item not found');
            return item;
        },
    },
    // Field resolvers
    Vehicle: {
        driver: async (parent, _, context) => {
            if (!parent.assignedDriverId)
                return null;
            return Driver_1.DriverModel.findById(parent.assignedDriverId, parent.companyId);
        },
        trips: async (parent, _, context) => {
            const rows = await (0, database_1.query)('SELECT * FROM trips WHERE vehicle_id = $1 ORDER BY start_time DESC LIMIT 10', [parent.id]);
            return rows;
        },
    },
    Driver: {
        vehicle: async (parent, _, context) => {
            if (!parent.assignedVehicleId)
                return null;
            return Vehicle_1.VehicleModel.findById(parent.assignedVehicleId, parent.companyId);
        },
    },
    AuditTemplate: {
        questions: async (parent, _, context) => {
            return Audit_1.AuditTemplateModel.getQuestions(parent.id, parent.companyId);
        },
    },
    AuditSession: {
        template: async (parent, _, context) => {
            return Audit_1.AuditTemplateModel.findById(parent.templateId, parent.companyId);
        },
        responses: async (parent, _, context) => {
            return (0, database_1.query)('SELECT * FROM audit_responses WHERE session_id = $1', [parent.id]);
        },
    },
    InventoryItem: {
        category: async (parent, _, context) => {
            if (!parent.categoryId)
                return null;
            const rows = await (0, database_1.query)('SELECT * FROM inventory_categories WHERE id = $1', [parent.categoryId]);
            return rows[0] || null;
        },
        isLowStock: (parent) => {
            return parent.currentStock <= parent.reorderLevel;
        },
    },
    Invoice: {
        items: async (parent, _, context) => {
            return Invoice_1.InvoiceModel.getItems(parent.id, parent.companyId);
        },
    },
};
//# sourceMappingURL=resolvers.js.map