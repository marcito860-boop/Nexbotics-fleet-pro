export type UserRole = 'admin' | 'manager' | 'staff';
export interface User {
    id: string;
    companyId: string;
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    role: UserRole;
    isActive: boolean;
    mustChangePassword: boolean;
    lastLoginAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}
export interface CreateUserInput {
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    role: UserRole;
    companyId: string;
}
export interface UpdateUserInput {
    firstName?: string;
    lastName?: string;
    phone?: string;
    role?: UserRole;
    isActive?: boolean;
}
export interface Company {
    id: string;
    name: string;
    slug: string;
    logoUrl?: string;
    address?: string;
    phone?: string;
    email?: string;
    subscriptionPlan: string;
    subscriptionStatus: string;
    maxUsers: number;
    settings: Record<string, any>;
    createdAt: Date;
    updatedAt: Date;
}
export interface CreateCompanyInput {
    name: string;
    slug: string;
    address?: string;
    phone?: string;
    email?: string;
}
export interface JWTPayload {
    userId: string;
    companyId: string;
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    type: 'user' | 'super_admin';
}
export interface AuthResponse {
    token: string;
    user: SafeUser;
    company?: Company;
}
export interface SafeUser {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    mustChangePassword: boolean;
}
export interface LoginInput {
    email: string;
    password: string;
    companySlug?: string;
}
export interface ChangePasswordInput {
    currentPassword: string;
    newPassword: string;
}
export interface ResetPasswordInput {
    token: string;
    newPassword: string;
}
export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}
export interface PaginatedResponse<T> {
    items: T[];
    total: number;
    page: number;
    perPage: number;
    totalPages: number;
}
export interface PaginationParams {
    page?: number;
    perPage?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}
//# sourceMappingURL=index.d.ts.map