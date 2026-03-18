export type DriverStatus = 'active' | 'inactive' | 'suspended' | 'terminated';
export interface Driver {
    id: string;
    companyId: string;
    userId?: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    licenseNumber?: string;
    licenseExpiry?: Date;
    licenseClass?: string;
    dateOfBirth?: Date;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
    address?: string;
    hireDate?: Date;
    status: DriverStatus;
    safetyScore: number;
    totalTrips: number;
    totalDistance: number;
    rating: number;
    notes?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export interface CreateDriverInput {
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    licenseNumber?: string;
    licenseExpiry?: Date;
    licenseClass?: string;
    dateOfBirth?: Date;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
    address?: string;
    hireDate?: Date;
    notes?: string;
}
export interface UpdateDriverInput extends Partial<CreateDriverInput> {
    status?: DriverStatus;
    isActive?: boolean;
    safetyScore?: number;
    totalTrips?: number;
    totalDistance?: number;
    rating?: number;
}
export declare class DriverModel {
    static findById(id: string, companyId: string): Promise<Driver | null>;
    static findByUserId(userId: string, companyId: string): Promise<Driver | null>;
    static findByCompany(companyId: string, options?: {
        status?: DriverStatus;
        isActive?: boolean;
        limit?: number;
        offset?: number;
        search?: string;
    }): Promise<{
        drivers: Driver[];
        total: number;
    }>;
    static create(companyId: string, input: CreateDriverInput, userId?: string): Promise<Driver>;
    static update(id: string, companyId: string, input: UpdateDriverInput): Promise<Driver | null>;
    static delete(id: string, companyId: string): Promise<boolean>;
    static getStats(companyId: string): Promise<{
        total: number;
        active: number;
        inactive: number;
        suspended: number;
    }>;
    static updateTripStats(id: string, companyId: string, distance: number): Promise<void>;
}
//# sourceMappingURL=Driver.d.ts.map