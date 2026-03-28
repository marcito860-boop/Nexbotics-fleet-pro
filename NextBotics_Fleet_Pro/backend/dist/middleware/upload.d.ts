import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
export declare const upload: multer.Multer;
/**
 * Save image without processing (sharp disabled)
 */
export declare const optimizeImage: (buffer: Buffer, filename: string, companyId?: string) => Promise<{
    imageUrl: string;
    thumbnailUrl: string;
    fileSize: number;
    mimeType: string;
}>;
/**
 * Delete image
 */
export declare const deleteImage: (imageUrl: string) => Promise<void>;
/**
 * Middleware to handle upload errors
 */
export declare const handleUploadError: (err: any, req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
/**
 * Validate company access for uploaded files
 */
export declare const validateCompanyAccess: (req: Request, res: Response, next: NextFunction) => void | Response<any, Record<string, any>>;
//# sourceMappingURL=upload.d.ts.map