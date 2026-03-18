import { Company, CreateCompanyInput } from '../types';
export declare class CompanyModel {
    static findById(id: string): Promise<Company | null>;
    static findBySlug(slug: string): Promise<Company | null>;
    static findByEmail(email: string): Promise<Company | null>;
    static findAll(options?: {
        status?: string;
        plan?: string;
        limit?: number;
        offset?: number;
    }): Promise<{
        companies: Company[];
        total: number;
    }>;
    static create(input: CreateCompanyInput): Promise<Company>;
    static update(id: string, updates: Partial<CreateCompanyInput>): Promise<Company | null>;
    static updateSubscription(id: string, plan: string, status: string): Promise<Company | null>;
    static updateSettings(id: string, settings: Record<string, any>): Promise<Company | null>;
    static delete(id: string): Promise<boolean>;
    static getStats(id: string): Promise<{
        totalUsers: number;
        activeUsers: number;
        adminCount: number;
        managerCount: number;
        staffCount: number;
    }>;
}
//# sourceMappingURL=Company.d.ts.map