import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
export interface ApiKeyRequest extends AuthRequest {
    apiKey?: {
        id: string;
        name: string;
        permissions: string[];
        rateLimit: number;
    };
}
export declare const authenticateApiKey: (req: ApiKeyRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const requireApiPermission: (permission: string) => (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
export declare const authenticateAny: (req: ApiKeyRequest, res: Response, next: NextFunction) => Promise<any>;
//# sourceMappingURL=apiAuth.d.ts.map