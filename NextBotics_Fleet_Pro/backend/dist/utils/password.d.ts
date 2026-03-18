export declare function hashPassword(password: string): Promise<string>;
export declare function verifyPassword(password: string, hash: string): Promise<boolean>;
export declare function generateSecurePassword(length?: number): string;
export declare function generateResetToken(): string;
export declare function generateCompanySlug(name: string): string;
//# sourceMappingURL=password.d.ts.map