export declare const resolvers: {
    Query: {
        vehicles: (_: any, args: any, context: any) => Promise<{
            items: import("../models/Vehicle").Vehicle[];
            total: number;
            hasMore: boolean;
        }>;
        vehicle: (_: any, args: {
            id: string;
        }, context: any) => Promise<import("../models/Vehicle").Vehicle | null>;
        drivers: (_: any, args: any, context: any) => Promise<{
            items: import("../models/Driver").Driver[];
            total: number;
            hasMore: boolean;
        }>;
        driver: (_: any, args: {
            id: string;
        }, context: any) => Promise<import("../models/Driver").Driver | null>;
        auditTemplates: (_: any, args: any, context: any) => Promise<import("../models/Audit").AuditTemplate[]>;
        auditSessions: (_: any, args: any, context: any) => Promise<{
            sessions: import("../models/Audit").AuditSession[];
            total: number;
        }>;
        auditSession: (_: any, args: {
            id: string;
        }, context: any) => Promise<import("../models/Audit").AuditSession | null>;
        requisitions: (_: any, args: any, context: any) => Promise<import("../models/Requisition").VehicleRequisition[]>;
        requisition: (_: any, args: {
            id: string;
        }, context: any) => Promise<import("../models/Requisition").VehicleRequisition | null>;
        inventoryItems: (_: any, args: any, context: any) => Promise<import("../models/Inventory").InventoryItem[]>;
        inventoryItem: (_: any, args: {
            id: string;
        }, context: any) => Promise<import("../models/Inventory").InventoryItem | null>;
        invoices: (_: any, args: any, context: any) => Promise<import("../models/Invoice").Invoice[]>;
        invoice: (_: any, args: {
            id: string;
        }, context: any) => Promise<import("../models/Invoice").Invoice | null>;
        dashboardAnalytics: (_: any, args: any, context: any) => Promise<{
            summary: {
                totalVehicles: number;
                totalDrivers: number;
                activeTrips: number;
                pendingRequisitions: number;
                lowStockItems: number;
                overdueInvoices: number;
            };
            vehicleStats: {
                total: number;
                available: number;
                assigned: number;
                maintenance: number;
            };
            driverStats: {
                total: number;
                active: number;
                onLeave: number;
            };
            auditStats: {
                totalAudits: number;
                completedAudits: number;
                averageScore: number;
                byMaturityRating: {
                    excellent: number;
                    good: number;
                    fair: number;
                    poor: number;
                    critical: number;
                };
            };
            fuelStats: {
                totalCost: number;
                totalLiters: number;
                transactionCount: number;
                averagePricePerLiter: number;
            };
            inventoryStats: {
                totalItems: number;
                totalValue: number;
                lowStockCount: number;
            };
            invoiceStats: {
                total: number;
                pendingAmount: number;
                paidAmount: number;
                overdueAmount: number;
            };
            period: {
                from: Date;
                to: Date;
            };
        }>;
        fleetUtilization: (_: any, __: any, context: any) => Promise<{
            totalTrips: number;
            totalDistance: number;
            averageDistance: number;
            utilizationByType: any;
        }>;
    };
    Mutation: {
        createVehicle: (_: any, args: any, context: any) => Promise<import("../models/Vehicle").Vehicle>;
        updateVehicle: (_: any, args: any, context: any) => Promise<import("../models/Vehicle").Vehicle>;
        createAuditSession: (_: any, args: any, context: any) => Promise<import("../models/Audit").AuditSession>;
        submitAuditResponse: (_: any, args: any, context: any) => Promise<import("../models/Audit").AuditResponse>;
        completeAuditSession: (_: any, args: any, context: any) => Promise<import("../models/Audit").AuditSession>;
        createRequisition: (_: any, args: any, context: any) => Promise<import("../models/Requisition").VehicleRequisition>;
        approveRequisition: (_: any, args: any, context: any) => Promise<import("../models/Requisition").VehicleRequisition>;
        allocateRequisition: (_: any, args: any, context: any) => Promise<import("../models/Requisition").VehicleRequisition>;
        adjustStock: (_: any, args: any, context: any) => Promise<import("../models/Inventory").InventoryItem>;
    };
    Vehicle: {
        driver: (parent: any, _: any, context: any) => Promise<import("../models/Driver").Driver | null>;
        trips: (parent: any, _: any, context: any) => Promise<any>;
    };
    Driver: {
        vehicle: (parent: any, _: any, context: any) => Promise<import("../models/Vehicle").Vehicle | null>;
    };
    AuditTemplate: {
        questions: (parent: any, _: any, context: any) => Promise<import("../models/Audit").AuditQuestion[]>;
    };
    AuditSession: {
        template: (parent: any, _: any, context: any) => Promise<import("../models/Audit").AuditTemplate | null>;
        responses: (parent: any, _: any, context: any) => Promise<any>;
    };
    InventoryItem: {
        category: (parent: any, _: any, context: any) => Promise<any>;
        isLowStock: (parent: any) => boolean;
    };
    Invoice: {
        items: (parent: any, _: any, context: any) => Promise<import("../models/Invoice").InvoiceItem[]>;
    };
};
//# sourceMappingURL=resolvers.d.ts.map