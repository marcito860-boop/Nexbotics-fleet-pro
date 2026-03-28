export interface ApiKeyData {
    id: string;
    keyPrefix: string;
    name: string;
    description?: string;
    createdBy?: string;
    expiresAt?: Date;
    permissions?: string[];
    rateLimitPerMinute?: number;
}
export declare const generateApiKey: (data: ApiKeyData) => Promise<{
    key: string;
    id: string;
}>;
export declare const revokeApiKey: (keyId: string) => Promise<boolean>;
export declare const getApiKeys: () => Promise<any[]>;
export declare const getApiKeyById: (keyId: string) => Promise<any | null>;
export declare const getApiUsageStats: (keyId?: string, days?: number) => Promise<any>;
//# sourceMappingURL=apiKey.d.ts.map