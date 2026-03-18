export type AssignmentStatus = 'active' | 'completed' | 'cancelled';
export interface VehicleAssignment {
    id: string;
    companyId: string;
    vehicleId: string;
    driverId: string;
    assignedBy?: string;
    assignedAt: Date;
    unassignedAt?: Date;
    startDate: Date;
    endDate?: Date;
    purpose?: string;
    status: AssignmentStatus;
    createdAt: Date;
    updatedAt: Date;
    vehicle?: {
        id: string;
        registrationNumber: string;
        make: string;
        model: string;
    };
    driver?: {
        id: string;
        firstName: string;
        lastName: string;
        email?: string;
        phone?: string;
    };
}
export interface CreateAssignmentInput {
    vehicleId: string;
    driverId: string;
    startDate: Date;
    endDate?: Date;
    purpose?: string;
}
export interface UpdateAssignmentInput {
    endDate?: Date;
    purpose?: string;
    status?: AssignmentStatus;
}
export declare class AssignmentModel {
    static findById(id: string, companyId: string): Promise<VehicleAssignment | null>;
    static findByCompany(companyId: string, options?: {
        status?: AssignmentStatus;
        vehicleId?: string;
        driverId?: string;
        activeOnly?: boolean;
        limit?: number;
        offset?: number;
    }): Promise<{
        assignments: VehicleAssignment[];
        total: number;
    }>;
    static getActiveAssignmentForVehicle(vehicleId: string, companyId: string): Promise<VehicleAssignment | null>;
    static create(companyId: string, assignedBy: string, input: CreateAssignmentInput): Promise<VehicleAssignment>;
    static complete(id: string, companyId: string): Promise<VehicleAssignment | null>;
    static cancel(id: string, companyId: string): Promise<VehicleAssignment | null>;
    static update(id: string, companyId: string, input: UpdateAssignmentInput): Promise<VehicleAssignment | null>;
}
//# sourceMappingURL=Assignment.d.ts.map