import { Request, Response, NextFunction } from 'express';
export interface RequestWithId extends Request {
    requestId: string;
    startTime: number;
}
export declare const requestLogger: (req: Request, res: Response, next: NextFunction) => void;
export declare const errorLogger: (err: Error, req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=logger.d.ts.map