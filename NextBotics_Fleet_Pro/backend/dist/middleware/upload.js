"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateCompanyAccess = exports.handleUploadError = exports.deleteImage = exports.optimizeImage = exports.upload = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
// import sharp from 'sharp';
const uuid_1 = require("uuid");
// Ensure upload directories exist
const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
const PHOTOS_DIR = path_1.default.join(UPLOAD_DIR, 'photos');
const THUMBNAILS_DIR = path_1.default.join(UPLOAD_DIR, 'thumbnails');
[UPLOAD_DIR, PHOTOS_DIR, THUMBNAILS_DIR].forEach(dir => {
    if (!fs_1.default.existsSync(dir)) {
        fs_1.default.mkdirSync(dir, { recursive: true });
    }
});
// Configure multer storage
const storage = multer_1.default.memoryStorage();
// File filter for images
const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    }
    else {
        cb(new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.'));
    }
};
// Multer upload configuration
exports.upload = (0, multer_1.default)({
    storage,
    fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB max file size
        files: 5 // Max 5 files per upload
    }
});
// Image optimization settings (disabled - sharp not installed)
const OPTIMIZATION_CONFIG = {
    maxWidth: 1920,
    maxHeight: 1920,
    quality: 80,
    thumbnailWidth: 300,
    thumbnailHeight: 300,
    thumbnailQuality: 60
};
/**
 * Save image without processing (sharp disabled)
 */
const optimizeImage = async (buffer, filename, companyId) => {
    // Create company-specific subdirectory if companyId provided
    const companyDir = companyId ? path_1.default.join(PHOTOS_DIR, companyId) : PHOTOS_DIR;
    if (!fs_1.default.existsSync(companyDir)) {
        fs_1.default.mkdirSync(companyDir, { recursive: true });
    }
    const uniqueName = `${(0, uuid_1.v4)()}-${filename}`;
    const imagePath = path_1.default.join(companyDir, uniqueName);
    // Save raw image (no processing without sharp)
    await fs_1.default.promises.writeFile(imagePath, buffer);
    // Generate URLs (relative paths)
    const baseUrl = process.env.UPLOAD_BASE_URL || '/uploads';
    const companyPath = companyId ? `/${companyId}` : '';
    return {
        imageUrl: `${baseUrl}/photos${companyPath}/${uniqueName}`,
        thumbnailUrl: `${baseUrl}/photos${companyPath}/${uniqueName}`, // Same as main image
        fileSize: buffer.length,
        mimeType: 'image/jpeg'
    };
};
exports.optimizeImage = optimizeImage;
/**
 * Delete image
 */
const deleteImage = async (imageUrl) => {
    try {
        const basePath = process.env.UPLOAD_BASE_URL || '/uploads';
        const relativePath = imageUrl.replace(basePath, '');
        const fullPath = path_1.default.join(UPLOAD_DIR, relativePath);
        // Delete main image
        if (fs_1.default.existsSync(fullPath)) {
            await fs_1.default.promises.unlink(fullPath);
        }
    }
    catch (error) {
        console.error('Error deleting image:', error);
    }
};
exports.deleteImage = deleteImage;
/**
 * Middleware to handle upload errors
 */
const handleUploadError = (err, req, res, next) => {
    if (err instanceof multer_1.default.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'File too large. Maximum size is 10MB.' });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({ error: 'Too many files. Maximum is 5 files per upload.' });
        }
        return res.status(400).json({ error: err.message });
    }
    if (err) {
        return res.status(400).json({ error: err.message });
    }
    next();
};
exports.handleUploadError = handleUploadError;
/**
 * Validate company access for uploaded files
 */
const validateCompanyAccess = (req, res, next) => {
    const user = req.user;
    const companyId = req.params.companyId || req.body.companyId;
    // Admin can access any company
    if (user?.role === 'admin') {
        return next();
    }
    // Check if user belongs to the requested company
    if (companyId && user?.companyId && companyId !== user.companyId) {
        return res.status(403).json({ error: 'Access denied for this company' });
    }
    next();
};
exports.validateCompanyAccess = validateCompanyAccess;
//# sourceMappingURL=upload.js.map