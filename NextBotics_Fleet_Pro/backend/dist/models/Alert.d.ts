export type AlertType = 'maintenance_due' | 'insurance_expiry' | 'license_expiry' | 'speeding' | 'geofence' | 'fuel_low' | 'diagnostic' | 'assignment' | 'custom';
export type AlertSeverity = 'info' | 'warning' | 'critical';
export interface FleetAlert {
    id: string;
    companyId: string;
    vehicleId?: string;
    driverId?: string;
    alertType: AlertType;
    severity: AlertSeverity;
    title: string;
    message?: string;
    data: Record<string, any>;
    isRead: boolean;
    readAt?: Date;
    readBy?: string;
    dismissedAt?: Date;
    dismissedBy?: string;
    createdAt: Date;
    vehicle?: {
        id: string;
        registrationNumber: string;
    };
    driver?: {
        id: string;
        firstName: string;
        lastName: string;
    };
}
export interface CreateAlertInput {
    vehicleId?: string;
    driverId?: string;
    alertType: AlertType;
    severity?: AlertSeverity;
    title: string;
    message?: string;
    data?: Record<string, any>;
}
export declare class AlertModel {
    static findById(id: string, companyId: string): Promise<FleetAlert | null>;
    static findByCompany(companyId: string, options?: {
        isRead?: boolean;
        severity?: AlertSeverity;
        alertType?: AlertType;
        vehicleId?: string;
        driverId?: string;
        limit?: number;
        offset?: number;
    }): Promise<{
        alerts: FleetAlert[];
        total: number;
        unreadCount: number;
    }>;
    static create(companyId: string, input: CreateAlertInput): Promise<FleetAlert>;
    static markAsRead(id: string, companyId: string, userId: string): Promise<void>;
    static markAllAsRead(companyId: string, userId: string): Promise<void>;
    static dismiss(id: string, companyId: string, userId: string): Promise<void>;
    static delete(id: string, companyId: string): Promise<boolean>;
    static deleteOldAlerts(companyId: string, days: number): Promise<number>;
    static generateMaintenanceAlerts(companyId: string): Promise<void>;
    static generateExpiryAlerts(companyId: string): Promise<void>;
}
//# sourceMappingURL=Alert.d.ts.map