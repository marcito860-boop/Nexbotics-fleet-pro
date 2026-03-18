import { User, CreateUserInput, UpdateUserInput, UserRole, SafeUser } from '../types';
declare function toSafeUser(user: User): SafeUser;
export declare class UserModel {
    static findByEmail(email: string, companyId: string): Promise<User | null>;
    static verifyCredentials(email: string, companyId: string, password: string): Promise<User | null>;
    static findById(id: string): Promise<User | null>;
    static findByIdAndCompany(id: string, companyId: string): Promise<User | null>;
    static findByCompany(companyId: string, options?: {
        role?: UserRole;
        isActive?: boolean;
        limit?: number;
        offset?: number;
    }): Promise<{
        users: User[];
        total: number;
    }>;
    static create(input: CreateUserInput): Promise<{
        user: User;
        tempPassword: string;
    }>;
    static update(id: string, companyId: string, input: UpdateUserInput): Promise<User | null>;
    static changePassword(id: string, newPassword: string, companyId?: string): Promise<void>;
    static updateLastLogin(id: string): Promise<void>;
    static delete(id: string, companyId: string, hardDelete?: boolean): Promise<boolean>;
    static countByCompany(companyId: string): Promise<number>;
}
export { toSafeUser };
//# sourceMappingURL=User.d.ts.map