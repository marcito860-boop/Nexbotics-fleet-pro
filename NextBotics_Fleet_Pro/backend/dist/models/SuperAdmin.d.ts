export interface SuperAdmin {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    isActive: boolean;
    lastLoginAt?: Date;
    createdAt: Date;
}
export declare class SuperAdminModel {
    static findByEmail(email: string): Promise<SuperAdmin | null>;
    static verifyCredentials(email: string, password: string): Promise<SuperAdmin | null>;
    static updateLastLogin(id: string): Promise<void>;
    static changePassword(id: string, newPassword: string): Promise<void>;
    static create(email: string, password: string, firstName: string, lastName: string): Promise<SuperAdmin>;
}
//# sourceMappingURL=SuperAdmin.d.ts.map