import { Request, Response, NextFunction } from 'express';
import { JWTPayload } from '../types';
export declare function generateToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string;
export declare function verifyToken(token: string): JWTPayload;
declare global {
    namespace Express {
        interface Request {
            user?: JWTPayload;
        }
    }
}
export declare function authMiddleware(req: Request, res: Response, next: NextFunction): void;
export declare function requireRole(...roles: (string | string[])[]): (req: Request, res: Response, next: NextFunction) => void;
export declare function requirePasswordChange(req: Request, res: Response, next: NextFunction): void;
//# sourceMappingURL=auth.d.ts.map