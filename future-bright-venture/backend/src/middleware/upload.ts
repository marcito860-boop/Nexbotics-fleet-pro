import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

// Use memory storage for R2 uploads
const storage = multer.memoryStorage();

// File filter
const fileFilter = (allowedMimes: string[]) => {
  return (req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type. Allowed types: ${allowedMimes.join(', ')}`));
    }
  };
};

// Book file upload (PDF, EPUB, MOBI) - now to memory for R2
export const uploadBook = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: fileFilter([
    'application/pdf',
    'application/epub+zip',
    'application/x-mobipocket-ebook',
    'application/octet-stream'
  ])
});

// Cover image upload - now to memory for R2
export const uploadCover = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: fileFilter([
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif'
  ])
});

// Generate unique filename
export const generateFileKey = (folder: string, originalname: string): string => {
  const ext = path.extname(originalname);
  return `${folder}/${uuidv4()}${ext}`;
};
