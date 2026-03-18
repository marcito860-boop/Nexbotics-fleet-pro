export type ServiceType = 'preventive' | 'repair' | 'breakdown' | 'emergency';
export type MaintenanceStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
export type ScheduleType = 'mileage_based' | 'time_based' | 'both';
export type ScheduleStatus = 'active' | 'paused' | 'completed' | 'cancelled';
export type Priority = 'low' | 'normal' | 'high' | 'critical';
export type ProviderType = 'general' | 'specialist' | 'dealership' | 'emergency';
export type DowntimeType = 'maintenance' | 'repair' | 'accident' | 'other';
export type ReminderStatus = 'pending' | 'sent' | 'acknowledged' | 'dismissed';
export type ReminderSeverity = 'info' | 'warning' | 'critical';
export interface ServiceProvider {
    id: string;
    companyId: string;
    name: string;
    type: ProviderType;
    contactPerson?: string;
    phone?: string;
    email?: string;
    address?: string;
    city?: string;
    country: string;
    taxId?: string;
    bankAccount?: string;
    isApproved: boolean;
    rating: number;
    reviewCount: number;
    specialties: string[];
    workingHours?: Record<string, {
        open: string;
        close: string;
    }>;
    isActive: boolean;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface CreateServiceProviderInput {
    name: string;
    type?: ProviderType;
    contactPerson?: string;
    phone?: string;
    email?: string;
    address?: string;
    city?: string;
    country?: string;
    taxId?: string;
    bankAccount?: string;
    specialties?: string[];
    workingHours?: Record<string, {
        open: string;
        close: string;
    }>;
    notes?: string;
}
export interface SparePart {
    id: string;
    companyId: string;
    partNumber: string;
    name: string;
    description?: string;
    category: string;
    manufacturer?: string;
    compatibleVehicles: string[];
    unitCost: number;
    sellingPrice: number;
    quantityInStock: number;
    reorderLevel: number;
    reorderQuantity: number;
    unitOfMeasure: string;
    locationCode?: string;
    supplierId?: string;
    leadTimeDays: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export interface CreateSparePartInput {
    partNumber: string;
    name: string;
    description?: string;
    category: string;
    manufacturer?: string;
    compatibleVehicles?: string[];
    unitCost?: number;
    sellingPrice?: number;
    quantityInStock?: number;
    reorderLevel?: number;
    reorderQuantity?: number;
    unitOfMeasure?: string;
    locationCode?: string;
    supplierId?: string;
    leadTimeDays?: number;
}
export interface MaintenanceSchedule {
    id: string;
    companyId: string;
    vehicleId: string;
    scheduleType: ScheduleType;
    serviceType: string;
    title: string;
    description?: string;
    intervalMileage?: number;
    lastServiceMileage: number;
    nextServiceMileage?: number;
    intervalMonths?: number;
    lastServiceDate?: Date;
    nextServiceDate?: Date;
    status: ScheduleStatus;
    priority: Priority;
    estimatedCost?: number;
    estimatedDurationHours?: number;
    assignedProviderId?: string;
    reminderDaysBefore: number;
    reminderMileageBefore: number;
    createdAt: Date;
    updatedAt: Date;
    vehicleRegistration?: string;
    vehicleMake?: string;
    vehicleModel?: string;
    assignedProviderName?: string;
}
export interface CreateScheduleInput {
    vehicleId: string;
    scheduleType: ScheduleType;
    serviceType: string;
    title: string;
    description?: string;
    intervalMileage?: number;
    lastServiceMileage?: number;
    intervalMonths?: number;
    lastServiceDate?: Date;
    estimatedCost?: number;
    estimatedDurationHours?: number;
    assignedProviderId?: string;
    reminderDaysBefore?: number;
    reminderMileageBefore?: number;
    priority?: Priority;
}
export interface MaintenanceRecord {
    id: string;
    companyId: string;
    vehicleId: string;
    scheduleId?: string;
    serviceType: ServiceType;
    category: string;
    title: string;
    description?: string;
    providerId?: string;
    providerName?: string;
    scheduledDate?: Date;
    startedDate?: Date;
    completedDate?: Date;
    serviceMileage?: number;
    nextServiceMileage?: number;
    laborCost: number;
    partsCost: number;
    otherCost: number;
    totalCost: number;
    status: MaintenanceStatus;
    breakdownLocation?: string;
    breakdownCause?: string;
    isEmergency: boolean;
    technicianName?: string;
    driverId?: string;
    warrantyMonths?: number;
    warrantyExpiry?: Date;
    invoiceNumber?: string;
    documents?: any[];
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
    vehicleRegistration?: string;
    vehicleMake?: string;
    vehicleModel?: string;
    parts?: MaintenancePart[];
}
export interface MaintenancePart {
    id: string;
    recordId: string;
    partId?: string;
    partNumber: string;
    partName: string;
    quantity: number;
    unitCost: number;
    totalCost: number;
    createdAt: Date;
}
export interface CreateRecordInput {
    vehicleId: string;
    scheduleId?: string;
    serviceType: ServiceType;
    category: string;
    title: string;
    description?: string;
    providerId?: string;
    providerName?: string;
    scheduledDate?: Date;
    startedDate?: Date;
    completedDate?: Date;
    serviceMileage?: number;
    nextServiceMileage?: number;
    laborCost?: number;
    partsCost?: number;
    otherCost?: number;
    status?: MaintenanceStatus;
    breakdownLocation?: string;
    breakdownCause?: string;
    isEmergency?: boolean;
    technicianName?: string;
    driverId?: string;
    warrantyMonths?: number;
    invoiceNumber?: string;
    documents?: any[];
    notes?: string;
    parts?: Array<{
        partId?: string;
        partNumber: string;
        partName: string;
        quantity: number;
        unitCost: number;
    }>;
}
export interface VehicleDowntime {
    id: string;
    companyId: string;
    vehicleId: string;
    recordId?: string;
    downtimeType: DowntimeType;
    startDate: Date;
    endDate?: Date;
    startTime?: string;
    endTime?: string;
    durationHours?: number;
    durationDays?: number;
    reason?: string;
    impact?: string;
    replacementVehicleId?: string;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
    vehicleRegistration?: string;
    replacementVehicleRegistration?: string;
}
export interface CreateDowntimeInput {
    vehicleId: string;
    recordId?: string;
    downtimeType: DowntimeType;
    startDate: Date;
    endDate?: Date;
    startTime?: string;
    endTime?: string;
    durationHours?: number;
    reason?: string;
    impact?: string;
    replacementVehicleId?: string;
    notes?: string;
}
export interface MaintenanceReminder {
    id: string;
    companyId: string;
    scheduleId?: string;
    vehicleId: string;
    reminderType: string;
    title: string;
    message?: string;
    dueMileage?: number;
    dueDate?: Date;
    status: ReminderStatus;
    severity: ReminderSeverity;
    notifiedAt?: Date;
    acknowledgedAt?: Date;
    acknowledgedBy?: string;
    createdAt: Date;
    vehicleRegistration?: string;
    vehicleMake?: string;
    vehicleModel?: string;
    scheduleTitle?: string;
}
export declare class ServiceProviderModel {
    static findById(id: string, companyId: string): Promise<ServiceProvider | null>;
    static findByCompany(companyId: string, options?: {
        type?: ProviderType;
        isApproved?: boolean;
        isActive?: boolean;
        search?: string;
        limit?: number;
        offset?: number;
    }): Promise<{
        providers: ServiceProvider[];
        total: number;
    }>;
    static create(companyId: string, input: CreateServiceProviderInput): Promise<ServiceProvider>;
    static update(id: string, companyId: string, input: Partial<CreateServiceProviderInput>): Promise<ServiceProvider | null>;
    static delete(id: string, companyId: string): Promise<boolean>;
}
export declare class SparePartModel {
    static findById(id: string, companyId: string): Promise<SparePart | null>;
    static findByPartNumber(partNumber: string, companyId: string): Promise<SparePart | null>;
    static findByCompany(companyId: string, options?: {
        category?: string;
        lowStockOnly?: boolean;
        search?: string;
        limit?: number;
        offset?: number;
    }): Promise<{
        parts: SparePart[];
        total: number;
    }>;
    static create(companyId: string, input: CreateSparePartInput): Promise<SparePart>;
    static update(id: string, companyId: string, input: Partial<CreateSparePartInput>): Promise<SparePart | null>;
    static adjustStock(id: string, companyId: string, quantity: number, reason?: string): Promise<SparePart | null>;
    static delete(id: string, companyId: string): Promise<boolean>;
}
export declare class MaintenanceScheduleModel {
    static findById(id: string, companyId: string): Promise<MaintenanceSchedule | null>;
    static findByCompany(companyId: string, options?: {
        vehicleId?: string;
        status?: ScheduleStatus;
        priority?: Priority;
        upcoming?: boolean;
        overdue?: boolean;
        limit?: number;
        offset?: number;
    }): Promise<{
        schedules: MaintenanceSchedule[];
        total: number;
    }>;
    static create(companyId: string, input: CreateScheduleInput): Promise<MaintenanceSchedule>;
    static update(id: string, companyId: string, input: Partial<CreateScheduleInput> & {
        status?: ScheduleStatus;
    }): Promise<MaintenanceSchedule | null>;
    static delete(id: string, companyId: string): Promise<boolean>;
    static getStats(companyId: string): Promise<{
        total: number;
        active: number;
        overdue: number;
        dueSoon: number;
    }>;
}
export declare class MaintenanceRecordModel {
    static findById(id: string, companyId: string): Promise<MaintenanceRecord | null>;
    static getParts(recordId: string): Promise<MaintenancePart[]>;
    static findByCompany(companyId: string, options?: {
        vehicleId?: string;
        status?: MaintenanceStatus;
        serviceType?: ServiceType;
        category?: string;
        dateFrom?: Date;
        dateTo?: Date;
        limit?: number;
        offset?: number;
    }): Promise<{
        records: MaintenanceRecord[];
        total: number;
    }>;
    static create(companyId: string, input: CreateRecordInput): Promise<MaintenanceRecord>;
    static update(id: string, companyId: string, input: Partial<CreateRecordInput>): Promise<MaintenanceRecord | null>;
    static delete(id: string, companyId: string): Promise<boolean>;
    static getStats(companyId: string, dateFrom?: Date, dateTo?: Date): Promise<{
        totalRecords: number;
        totalCost: number;
        preventiveCount: number;
        repairCount: number;
        breakdownCount: number;
        emergencyCount: number;
    }>;
}
export declare class VehicleDowntimeModel {
    static findById(id: string, companyId: string): Promise<VehicleDowntime | null>;
    static findByCompany(companyId: string, options?: {
        vehicleId?: string;
        downtimeType?: DowntimeType;
        active?: boolean;
        dateFrom?: Date;
        dateTo?: Date;
        limit?: number;
        offset?: number;
    }): Promise<{
        downtimes: VehicleDowntime[];
        total: number;
    }>;
    static create(companyId: string, input: CreateDowntimeInput): Promise<VehicleDowntime>;
    static endDowntime(id: string, companyId: string, endDate: Date, endTime?: string, durationHours?: number): Promise<VehicleDowntime | null>;
    static getStats(companyId: string, dateFrom?: Date, dateTo?: Date): Promise<{
        totalDowntimeDays: number;
        activeDowntimeCount: number;
        averageDurationDays: number;
        downtimeByType: Record<string, number>;
    }>;
}
export declare class MaintenanceReminderModel {
    static findById(id: string, companyId: string): Promise<MaintenanceReminder | null>;
    static findByCompany(companyId: string, options?: {
        status?: ReminderStatus;
        severity?: ReminderSeverity;
        vehicleId?: string;
        upcoming?: boolean;
        limit?: number;
        offset?: number;
    }): Promise<{
        reminders: MaintenanceReminder[];
        total: number;
    }>;
    static create(companyId: string, scheduleId: string, vehicleId: string, input: {
        reminderType: string;
        title: string;
        message?: string;
        dueMileage?: number;
        dueDate?: Date;
        severity?: ReminderSeverity;
    }): Promise<MaintenanceReminder>;
    static acknowledge(id: string, companyId: string, userId: string): Promise<MaintenanceReminder | null>;
    static dismiss(id: string, companyId: string): Promise<MaintenanceReminder | null>;
    static generateFromSchedules(companyId: string): Promise<number>;
    static getStats(companyId: string): Promise<{
        total: number;
        pending: number;
        acknowledged: number;
        critical: number;
        warning: number;
    }>;
}
//# sourceMappingURL=Maintenance.d.ts.map