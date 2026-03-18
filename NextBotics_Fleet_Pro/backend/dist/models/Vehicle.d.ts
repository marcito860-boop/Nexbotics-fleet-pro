export type VehicleStatus = 'available' | 'assigned' | 'maintenance' | 'retired';
export type FuelType = 'petrol' | 'diesel' | 'electric' | 'hybrid';
export interface Vehicle {
    id: string;
    companyId: string;
    registrationNumber: string;
    make: string;
    model: string;
    year?: number;
    color?: string;
    vin?: string;
    engineNumber?: string;
    chassisNumber?: string;
    fuelType?: FuelType;
    fuelCapacity?: number;
    currentMileage: number;
    status: VehicleStatus;
    category?: string;
    gpsDeviceId?: string;
    gpsProvider?: string;
    purchaseDate?: Date;
    purchasePrice?: number;
    insuranceExpiry?: Date;
    licenseExpiry?: Date;
    lastServiceDate?: Date;
    nextServiceDue?: Date;
    serviceIntervalKm?: number;
    notes?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export interface CreateVehicleInput {
    registrationNumber: string;
    make: string;
    model: string;
    year?: number;
    color?: string;
    vin?: string;
    engineNumber?: string;
    chassisNumber?: string;
    fuelType?: FuelType;
    fuelCapacity?: number;
    currentMileage?: number;
    category?: string;
    gpsDeviceId?: string;
    gpsProvider?: string;
    purchaseDate?: Date;
    purchasePrice?: number;
    insuranceExpiry?: Date;
    licenseExpiry?: Date;
    serviceIntervalKm?: number;
    notes?: string;
}
export interface UpdateVehicleInput extends Partial<CreateVehicleInput> {
    status?: VehicleStatus;
    isActive?: boolean;
}
export declare class VehicleModel {
    static findById(id: string, companyId: string): Promise<Vehicle | null>;
    static findByRegistration(registrationNumber: string, companyId: string): Promise<Vehicle | null>;
    static findByCompany(companyId: string, options?: {
        status?: VehicleStatus;
        category?: string;
        isActive?: boolean;
        limit?: number;
        offset?: number;
        search?: string;
    }): Promise<{
        vehicles: Vehicle[];
        total: number;
    }>;
    static create(companyId: string, input: CreateVehicleInput): Promise<Vehicle>;
    static update(id: string, companyId: string, input: UpdateVehicleInput): Promise<Vehicle | null>;
    static delete(id: string, companyId: string): Promise<boolean>;
    static getStats(companyId: string): Promise<{
        total: number;
        available: number;
        assigned: number;
        maintenance: number;
        retired: number;
    }>;
    static updateMileage(id: string, companyId: string, mileage: number): Promise<void>;
}
//# sourceMappingURL=Vehicle.d.ts.map