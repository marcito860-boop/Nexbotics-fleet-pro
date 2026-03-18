export type RequisitionStatus = 'pending' | 'approved' | 'rejected' | 'allocated' | 'in_progress' | 'completed' | 'cancelled';
export type RequisitionPriority = 'low' | 'normal' | 'high' | 'urgent';
export interface VehicleRequisition {
    id: string;
    companyId: string;
    requestNumber: string;
    requestedBy: string;
    requesterName: string;
    requesterDepartment?: string;
    requesterPhone?: string;
    purpose: string;
    destination?: string;
    passengersCount: number;
    startDate: Date;
    endDate: Date;
    preferredVehicleType?: string;
    requiresDriver: boolean;
    priority: RequisitionPriority;
    status: RequisitionStatus;
    approvedBy?: string;
    approvedAt?: Date;
    approvalNotes?: string;
    rejectionReason?: string;
    allocatedVehicleId?: string;
    allocatedDriverId?: string;
    allocatedBy?: string;
    allocatedAt?: Date;
    actualStartTime?: Date;
    actualEndTime?: Date;
    actualStartOdometer?: number;
    actualEndOdometer?: number;
    tripRemarks?: string;
    createdAt: Date;
    updatedAt: Date;
    requester?: {
        email: string;
        firstName: string;
        lastName: string;
    };
    approver?: {
        firstName: string;
        lastName: string;
    };
    allocator?: {
        firstName: string;
        lastName: string;
    };
    allocatedVehicle?: {
        registrationNumber: string;
        make: string;
        model: string;
    };
    allocatedDriver?: {
        firstName: string;
        lastName: string;
    };
}
export interface RequisitionWorkflowHistory {
    id: string;
    companyId: string;
    requisitionId: string;
    action: 'submitted' | 'approved' | 'rejected' | 'allocated' | 'started' | 'completed' | 'cancelled';
    actionBy: string;
    actionAt: Date;
    notes?: string;
    metadata?: any;
    actor?: {
        firstName: string;
        lastName: string;
    };
}
export declare class RequisitionModel {
    static generateRequestNumber(companyId: string): Promise<string>;
    static findById(id: string, companyId: string): Promise<VehicleRequisition | null>;
    static findByCompany(companyId: string, options?: {
        status?: RequisitionStatus;
        requestedBy?: string;
        dateFrom?: Date;
        dateTo?: Date;
        limit?: number;
        offset?: number;
    }): Promise<{
        requisitions: VehicleRequisition[];
        total: number;
    }>;
    static create(companyId: string, data: Partial<VehicleRequisition>): Promise<VehicleRequisition>;
    static approve(id: string, companyId: string, approvedBy: string, notes?: string): Promise<VehicleRequisition | null>;
    static reject(id: string, companyId: string, rejectedBy: string, reason: string): Promise<VehicleRequisition | null>;
    static allocate(id: string, companyId: string, allocatedBy: string, vehicleId: string, driverId?: string): Promise<VehicleRequisition | null>;
    static startTrip(id: string, companyId: string, odometer: number): Promise<VehicleRequisition | null>;
    static completeTrip(id: string, companyId: string, odometer: number, remarks?: string): Promise<VehicleRequisition | null>;
    static cancel(id: string, companyId: string, cancelledBy: string, reason?: string): Promise<VehicleRequisition | null>;
    static getWorkflowHistory(requisitionId: string, companyId: string): Promise<RequisitionWorkflowHistory[]>;
    static getStats(companyId: string): Promise<{
        total: number;
        pending: number;
        approved: number;
        allocated: number;
        inProgress: number;
        completed: number;
        rejected: number;
        cancelled: number;
    }>;
    private static logWorkflowHistory;
}
//# sourceMappingURL=Requisition.d.ts.map