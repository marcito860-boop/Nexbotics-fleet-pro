export interface AuditTemplate {
    id: string;
    companyId: string;
    name: string;
    description?: string;
    category: string;
    isSystemTemplate: boolean;
    isActive: boolean;
    createdBy?: string;
    createdAt: Date;
    updatedAt: Date;
    questionCount?: number;
}
export interface AuditQuestion {
    id: string;
    companyId: string;
    templateId: string;
    questionNumber: number;
    questionText: string;
    description?: string;
    category?: string;
    weight: number;
    evidenceRequired: boolean;
    isActive: boolean;
}
export interface AuditSession {
    id: string;
    companyId: string;
    templateId: string;
    vehicleId?: string;
    driverId?: string;
    auditorId: string;
    auditReference?: string;
    location?: string;
    latitude?: number;
    longitude?: number;
    startedAt: Date;
    completedAt?: Date;
    status: 'in_progress' | 'completed' | 'cancelled';
    totalScore?: number;
    maxPossibleScore?: number;
    scorePercentage?: number;
    maturityRating?: string;
    notes?: string;
    weatherConditions?: string;
    createdAt: Date;
    updatedAt: Date;
    template?: {
        name: string;
        category: string;
    };
    vehicle?: {
        registrationNumber: string;
        make: string;
        model: string;
    };
    driver?: {
        firstName: string;
        lastName: string;
    };
    auditor?: {
        firstName: string;
        lastName: string;
    };
    responses?: AuditResponse[];
}
export interface AuditResponse {
    id: string;
    companyId: string;
    sessionId: string;
    questionId: string;
    score: number;
    notes?: string;
    evidencePhotos: string[];
    answeredAt: Date;
    answeredBy?: string;
    question?: AuditQuestion;
}
export interface AuditCategoryScore {
    id: string;
    companyId: string;
    sessionId: string;
    category: string;
    totalScore: number;
    maxPossibleScore: number;
    scorePercentage: number;
}
export interface CorrectiveAction {
    id: string;
    companyId: string;
    sessionId: string;
    responseId?: string;
    title: string;
    description: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    assignedTo?: string;
    dueDate?: Date;
    status: 'open' | 'in_progress' | 'completed' | 'overdue' | 'cancelled';
    completedAt?: Date;
    completedBy?: string;
    completionNotes?: string;
    evidencePhotos: string[];
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
    assignee?: {
        firstName: string;
        lastName: string;
    };
}
export declare class AuditTemplateModel {
    static findById(id: string, companyId: string): Promise<AuditTemplate | null>;
    static findByCompany(companyId: string, options?: {
        isActive?: boolean;
    }): Promise<AuditTemplate[]>;
    static createFromSystemTemplate(systemTemplateId: string, companyId: string, createdBy: string): Promise<AuditTemplate | null>;
    static getQuestions(templateId: string, companyId: string): Promise<AuditQuestion[]>;
    static addQuestion(templateId: string, companyId: string, data: Partial<AuditQuestion>): Promise<AuditQuestion>;
    private static mapTemplateRow;
    private static mapQuestionRow;
}
export declare class AuditSessionModel {
    static findById(id: string, companyId: string): Promise<AuditSession | null>;
    static findByCompany(companyId: string, options?: {
        status?: string;
        templateId?: string;
        vehicleId?: string;
        dateFrom?: Date;
        dateTo?: Date;
        limit?: number;
        offset?: number;
    }): Promise<{
        sessions: AuditSession[];
        total: number;
    }>;
    static create(companyId: string, data: Partial<AuditSession>): Promise<AuditSession>;
    static submitResponse(sessionId: string, companyId: string, data: Partial<AuditResponse>): Promise<AuditResponse>;
    static complete(sessionId: string, companyId: string): Promise<AuditSession | null>;
    static getCategoryScores(sessionId: string, companyId: string): Promise<AuditCategoryScore[]>;
    static getStats(companyId: string): Promise<{
        totalAudits: number;
        completedAudits: number;
        averageScore: number;
        byMaturityRating: Record<string, number>;
    }>;
    private static mapSessionRow;
}
export declare class CorrectiveActionModel {
    static findById(id: string, companyId: string): Promise<CorrectiveAction | null>;
    static findByCompany(companyId: string, options?: {
        status?: string;
        assignedTo?: string;
        priority?: string;
        limit?: number;
        offset?: number;
    }): Promise<{
        actions: CorrectiveAction[];
        total: number;
    }>;
    static create(companyId: string, createdBy: string, data: Partial<CorrectiveAction>): Promise<CorrectiveAction>;
    static complete(id: string, companyId: string, completedBy: string, notes?: string): Promise<CorrectiveAction | null>;
    static getStats(companyId: string): Promise<{
        total: number;
        open: number;
        inProgress: number;
        completed: number;
        overdue: number;
        byPriority: Record<string, number>;
    }>;
    private static mapActionRow;
}
//# sourceMappingURL=Audit.d.ts.map