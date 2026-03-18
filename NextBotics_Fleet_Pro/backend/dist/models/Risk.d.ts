export interface Risk {
    id: string;
    companyId: string;
    riskReference: string;
    title: string;
    description: string;
    category: string;
    likelihood: number;
    impact: number;
    riskScore: number;
    riskLevel: 'critical' | 'high' | 'medium' | 'low';
    identifiedBy?: string;
    identifiedAt: Date;
    mitigatingActions?: string;
    ownerId?: string;
    reviewDate?: Date;
    status: 'open' | 'mitigated' | 'accepted' | 'transferred' | 'closed';
    relatedAuditSessionId?: string;
    relatedCorrectiveActionId?: string;
    createdAt: Date;
    updatedAt: Date;
    identifiedByUser?: {
        firstName: string;
        lastName: string;
    };
    owner?: {
        firstName: string;
        lastName: string;
    };
}
export interface RiskHistory {
    id: string;
    companyId: string;
    riskId: string;
    action: string;
    actionBy: string;
    actionAt: Date;
    oldValues?: any;
    newValues?: any;
    notes?: string;
    actor?: {
        firstName: string;
        lastName: string;
    };
}
export interface InspectionRecord {
    id: string;
    companyId: string;
    inspectionType: string;
    vehicleId?: string;
    driverId?: string;
    inspectedBy: string;
    inspectionDate: Date;
    location?: string;
    latitude?: number;
    longitude?: number;
    overallStatus?: 'pass' | 'fail' | 'conditional';
    findings?: string;
    correctiveActionNeeded: boolean;
    photos: string[];
    signatureUrl?: string;
    createdAt: Date;
    vehicle?: {
        registrationNumber: string;
        make: string;
        model: string;
    };
    driver?: {
        firstName: string;
        lastName: string;
    };
    inspector?: {
        firstName: string;
        lastName: string;
    };
}
export declare class RiskModel {
    static generateRiskReference(companyId: string): Promise<string>;
    static findById(id: string, companyId: string): Promise<Risk | null>;
    static findByCompany(companyId: string, options?: {
        status?: string;
        riskLevel?: string;
        category?: string;
        ownerId?: string;
        limit?: number;
        offset?: number;
    }): Promise<{
        risks: Risk[];
        total: number;
    }>;
    static create(companyId: string, data: Partial<Risk>): Promise<Risk>;
    static update(id: string, companyId: string, data: Partial<Risk>, updatedBy: string): Promise<Risk | null>;
    static getHistory(riskId: string, companyId: string): Promise<RiskHistory[]>;
    static getStats(companyId: string): Promise<{
        total: number;
        byLevel: Record<string, number>;
        byStatus: Record<string, number>;
        byCategory: Record<string, number>;
        criticalOpen: number;
    }>;
    private static logHistory;
}
export declare class InspectionModel {
    static findById(id: string, companyId: string): Promise<InspectionRecord | null>;
    static findByCompany(companyId: string, options?: {
        inspectionType?: string;
        vehicleId?: string;
        status?: string;
        dateFrom?: Date;
        dateTo?: Date;
        limit?: number;
        offset?: number;
    }): Promise<{
        inspections: InspectionRecord[];
        total: number;
    }>;
    static create(companyId: string, data: Partial<InspectionRecord>): Promise<InspectionRecord>;
    static linkToCorrectiveAction(inspectionId: string, correctiveActionId: string, linkedBy: string): Promise<void>;
    static getLinkedInspections(correctiveActionId: string, companyId: string): Promise<InspectionRecord[]>;
    private static mapInspectionRow;
}
//# sourceMappingURL=Risk.d.ts.map