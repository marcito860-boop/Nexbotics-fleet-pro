export interface AuditQuestion {
    id: string;
    question_text: string;
    module_name: string;
    question_order: number;
    max_score: number;
    requires_evidence: boolean;
}
export interface AuditTemplate {
    id: string;
    template_name: string;
    description: string;
    category: string;
    questions: AuditQuestion[];
}
export declare const fleetPolicyGovernanceQuestions: AuditQuestion[];
export declare const vehicleAcquisitionDisposalQuestions: AuditQuestion[];
export declare const driverManagementSafetyQuestions: AuditQuestion[];
export declare const vehicleMaintenanceInspectionsQuestions: AuditQuestion[];
export declare const fuelManagementEfficiencyQuestions: AuditQuestion[];
export declare const complianceRegulatoryQuestions: AuditQuestion[];
export declare const riskManagementInsuranceQuestions: AuditQuestion[];
export declare const dataManagementTelematicsQuestions: AuditQuestion[];
export declare const environmentalSustainabilityQuestions: AuditQuestion[];
export declare const financialManagementCostControlQuestions: AuditQuestion[];
export declare const allAuditTemplates: AuditTemplate[];
export declare const getMaturityRating: (totalScore: number) => {
    rating: string;
    color: string;
    description: string;
};
export declare const getScoreLabel: (score: number) => string;
export declare const getScoreColor: (score: number) => string;
export declare const calculateTemplateScore: (responses: {
    question_id: string;
    score: number;
}[]) => {
    totalScore: number;
    maxScore: number;
    percentage: number;
};
export default allAuditTemplates;
//# sourceMappingURL=auditTemplates.d.ts.map