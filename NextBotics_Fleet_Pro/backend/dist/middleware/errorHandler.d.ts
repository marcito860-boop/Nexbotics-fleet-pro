import { Request, Response, NextFunction } from 'express';
export interface ApiError extends Error {
    statusCode?: number;
    code?: string;
    details?: any;
}
export declare class AppError extends Error implements ApiError {
    statusCode: number;
    code: string;
    details?: any;
    constructor(message: string, statusCode?: number, code?: string, details?: any);
}
export declare const Errors: {
    BadRequest: (message: string, details?: any) => AppError;
    Unauthorized: (message?: string) => AppError;
    Forbidden: (message?: string) => AppError;
    NotFound: (resource: string) => AppError;
    Conflict: (message: string) => AppError;
    ValidationError: (message: string, details?: any) => AppError;
    TooManyRequests: (message?: string) => AppError;
    InternalError: (message?: string) => AppError;
};
export declare const errorHandler: (err: ApiError, req: Request, res: Response, next: NextFunction) => void;
export declare const notFoundHandler: (req: Request, res: Response) => void;
export declare const asyncHandler: (fn: Function) => (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=errorHandler.d.ts.map