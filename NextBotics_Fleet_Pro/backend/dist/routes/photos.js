"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = require("../database");
const uuid_1 = require("uuid");
const auth_1 = require("../middleware/auth");
const upload_1 = require("../middleware/upload");
const errorHandler_1 = require("../middleware/errorHandler");
const router = (0, express_1.Router)();
// Apply authentication to all photo routes
router.use(auth_1.authenticateToken);
// ==================== AUDIT PHOTO ROUTES ====================
/**
 * Upload photo for audit question
 * POST /photos/audit/:auditId/question/:questionId
 */
router.post('/audit/:auditId/question/:questionId', upload_1.upload.single('photo'), upload_1.handleUploadError, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { auditId, questionId } = req.params;
    const { issueType, notes, auditSessionId } = req.body;
    const userId = req.user?.id;
    const companyId = req.user?.companyId;
    if (!req.file) {
        return res.status(400).json({ error: 'No photo uploaded' });
    }
    // Validate issue type requires photo
    const requiresPhoto = ['Issue', 'Fail', 'Non-compliant', 'Critical'].includes(issueType);
    if (!requiresPhoto) {
        return res.status(400).json({
            error: 'Photos are only required for Issue, Fail, Non-compliant, or Critical responses'
        });
    }
    // Optimize and save image
    const optimized = await (0, upload_1.optimizeImage)(req.file.buffer, req.file.originalname, companyId);
    // Save to database
    const photoId = (0, uuid_1.v4)();
    await (0, database_1.query)(`
      INSERT INTO audit_photos (
        id, audit_id, audit_session_id, question_id, image_url, thumbnail_url,
        file_size, mime_type, uploaded_by, company_id, issue_type, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `, [
        photoId,
        auditId,
        auditSessionId || null,
        questionId,
        optimized.imageUrl,
        optimized.thumbnailUrl,
        optimized.fileSize,
        optimized.mimeType,
        userId,
        companyId,
        issueType,
        notes
    ]);
    res.status(201).json({
        id: photoId,
        imageUrl: optimized.imageUrl,
        thumbnailUrl: optimized.thumbnailUrl,
        message: 'Photo uploaded successfully'
    });
}));
/**
 * Get all photos for an audit
 * GET /photos/audit/:auditId
 */
router.get('/audit/:auditId', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { auditId } = req.params;
    const companyId = req.user?.companyId;
    const userRole = req.user?.role;
    let sql = `
      SELECT 
        ap.*,
        u.email as uploaded_by_email,
        aq.question_text
      FROM audit_photos ap
      LEFT JOIN users u ON u.id = ap.uploaded_by
      LEFT JOIN audit_questions aq ON aq.id = ap.question_id
      WHERE ap.audit_id = $1
    `;
    const params = [auditId];
    // Non-admin users can only see their company's photos
    if (userRole !== 'admin' && companyId) {
        sql += ` AND (ap.company_id = $2 OR ap.company_id IS NULL)`;
        params.push(companyId);
    }
    sql += ` ORDER BY ap.created_at DESC`;
    const photos = await (0, database_1.query)(sql, params);
    res.json(photos);
}));
/**
 * Get photos for a specific audit question
 * GET /photos/audit/:auditId/question/:questionId
 */
router.get('/audit/:auditId/question/:questionId', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { auditId, questionId } = req.params;
    const companyId = req.user?.companyId;
    const userRole = req.user?.role;
    let sql = `
      SELECT 
        ap.*,
        u.email as uploaded_by_email
      FROM audit_photos ap
      LEFT JOIN users u ON u.id = ap.uploaded_by
      WHERE ap.audit_id = $1 AND ap.question_id = $2
    `;
    const params = [auditId, questionId];
    if (userRole !== 'admin' && companyId) {
        sql += ` AND (ap.company_id = $3 OR ap.company_id IS NULL)`;
        params.push(companyId);
    }
    sql += ` ORDER BY ap.created_at DESC`;
    const photos = await (0, database_1.query)(sql, params);
    res.json(photos);
}));
/**
 * Delete an audit photo
 * DELETE /photos/audit/:photoId
 */
router.delete('/audit/:photoId', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { photoId } = req.params;
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const companyId = req.user?.companyId;
    // Get photo details
    let sql = `SELECT * FROM audit_photos WHERE id = $1`;
    const params = [photoId];
    if (userRole !== 'admin' && companyId) {
        sql += ` AND (company_id = $2 OR company_id IS NULL)`;
        params.push(companyId);
    }
    const photos = await (0, database_1.query)(sql, params);
    if (photos.length === 0) {
        return res.status(404).json({ error: 'Photo not found or access denied' });
    }
    const photo = photos[0];
    // Only admin, owner, or manager can delete
    if (userRole !== 'admin' && photo.uploaded_by !== userId && !['manager', 'fleet_manager'].includes(userRole)) {
        return res.status(403).json({ error: 'Not authorized to delete this photo' });
    }
    // Delete from storage
    await (0, upload_1.deleteImage)(photo.image_url);
    // Delete from database
    await (0, database_1.query)(`DELETE FROM audit_photos WHERE id = $1`, [photoId]);
    res.json({ message: 'Photo deleted successfully' });
}));
// ==================== INSPECTION PHOTO ROUTES ====================
/**
 * Upload photo for inspection
 * POST /photos/inspection/:inspectionId
 */
router.post('/inspection/:inspectionId', upload_1.upload.single('photo'), upload_1.handleUploadError, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { inspectionId } = req.params;
    const { issueDescription, severity, jobCardId } = req.body;
    const userId = req.user?.id;
    const companyId = req.user?.companyId;
    if (!req.file) {
        return res.status(400).json({ error: 'No photo uploaded' });
    }
    // Optimize and save image
    const optimized = await (0, upload_1.optimizeImage)(req.file.buffer, req.file.originalname, companyId);
    // Save to database
    const photoId = (0, uuid_1.v4)();
    await (0, database_1.query)(`
      INSERT INTO inspection_photos (
        id, inspection_id, job_card_id, image_url, thumbnail_url,
        file_size, mime_type, issue_description, severity,
        uploaded_by, company_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `, [
        photoId,
        inspectionId,
        jobCardId || null,
        optimized.imageUrl,
        optimized.thumbnailUrl,
        optimized.fileSize,
        optimized.mimeType,
        issueDescription,
        severity || 'medium',
        userId,
        companyId
    ]);
    res.status(201).json({
        id: photoId,
        imageUrl: optimized.imageUrl,
        thumbnailUrl: optimized.thumbnailUrl,
        message: 'Photo uploaded successfully'
    });
}));
/**
 * Upload multiple photos for inspection
 * POST /photos/inspection/:inspectionId/batch
 */
router.post('/inspection/:inspectionId/batch', upload_1.upload.array('photos', 5), upload_1.handleUploadError, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { inspectionId } = req.params;
    const { issueDescription, severity, jobCardId } = req.body;
    const userId = req.user?.id;
    const companyId = req.user?.companyId;
    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'No photos uploaded' });
    }
    const files = req.files;
    const uploadedPhotos = [];
    for (const file of files) {
        // Optimize and save image
        const optimized = await (0, upload_1.optimizeImage)(file.buffer, file.originalname, companyId);
        // Save to database
        const photoId = (0, uuid_1.v4)();
        await (0, database_1.query)(`
        INSERT INTO inspection_photos (
          id, inspection_id, job_card_id, image_url, thumbnail_url,
          file_size, mime_type, issue_description, severity,
          uploaded_by, company_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `, [
            photoId,
            inspectionId,
            jobCardId || null,
            optimized.imageUrl,
            optimized.thumbnailUrl,
            optimized.fileSize,
            optimized.mimeType,
            issueDescription,
            severity || 'medium',
            userId,
            companyId
        ]);
        uploadedPhotos.push({
            id: photoId,
            imageUrl: optimized.imageUrl,
            thumbnailUrl: optimized.thumbnailUrl
        });
    }
    res.status(201).json({
        photos: uploadedPhotos,
        count: uploadedPhotos.length,
        message: 'Photos uploaded successfully'
    });
}));
/**
 * Get all photos for an inspection
 * GET /photos/inspection/:inspectionId
 */
router.get('/inspection/:inspectionId', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { inspectionId } = req.params;
    const companyId = req.user?.companyId;
    const userRole = req.user?.role;
    let sql = `
      SELECT 
        ip.*,
        u.email as uploaded_by_email
      FROM inspection_photos ip
      LEFT JOIN users u ON u.id = ip.uploaded_by
      WHERE ip.inspection_id = $1
    `;
    const params = [inspectionId];
    if (userRole !== 'admin' && companyId) {
        sql += ` AND (ip.company_id = $2 OR ip.company_id IS NULL)`;
        params.push(companyId);
    }
    sql += ` ORDER BY ip.created_at DESC`;
    const photos = await (0, database_1.query)(sql, params);
    res.json(photos);
}));
/**
 * Delete an inspection photo
 * DELETE /photos/inspection/:photoId
 */
router.delete('/inspection/:photoId', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { photoId } = req.params;
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const companyId = req.user?.companyId;
    // Get photo details
    let sql = `SELECT * FROM inspection_photos WHERE id = $1`;
    const params = [photoId];
    if (userRole !== 'admin' && companyId) {
        sql += ` AND (company_id = $2 OR company_id IS NULL)`;
        params.push(companyId);
    }
    const photos = await (0, database_1.query)(sql, params);
    if (photos.length === 0) {
        return res.status(404).json({ error: 'Photo not found or access denied' });
    }
    const photo = photos[0];
    // Only admin, owner, or manager can delete
    if (userRole !== 'admin' && photo.uploaded_by !== userId && !['manager', 'fleet_manager'].includes(userRole)) {
        return res.status(403).json({ error: 'Not authorized to delete this photo' });
    }
    // Delete from storage
    await (0, upload_1.deleteImage)(photo.image_url);
    // Delete from database
    await (0, database_1.query)(`DELETE FROM inspection_photos WHERE id = $1`, [photoId]);
    res.json({ message: 'Photo deleted successfully' });
}));
// ==================== GENERAL PHOTO ROUTES ====================
/**
 * Get photo statistics for dashboard
 * GET /photos/stats
 */
router.get('/stats', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const companyId = req.user?.companyId;
    const userRole = req.user?.role;
    let auditSql = `SELECT COUNT(*) as count FROM audit_photos WHERE 1=1`;
    let inspectionSql = `SELECT COUNT(*) as count FROM inspection_photos WHERE 1=1`;
    const params = [];
    if (userRole !== 'admin' && companyId) {
        auditSql += ` AND (company_id = $1 OR company_id IS NULL)`;
        inspectionSql += ` AND (company_id = $1 OR company_id IS NULL)`;
        params.push(companyId);
    }
    const [auditResult, inspectionResult] = await Promise.all([
        (0, database_1.query)(auditSql, params),
        (0, database_1.query)(inspectionSql, params)
    ]);
    // Get recent photos
    let recentSql = `
      (SELECT 'audit' as type, id, image_url, thumbnail_url, created_at, issue_type as description
       FROM audit_photos
    `;
    if (userRole !== 'admin' && companyId) {
        recentSql += ` WHERE company_id = $1 OR company_id IS NULL`;
    }
    recentSql += `)
      UNION ALL
      (SELECT 'inspection' as type, id, image_url, thumbnail_url, created_at, issue_description as description
       FROM inspection_photos
    `;
    if (userRole !== 'admin' && companyId) {
        recentSql += ` WHERE company_id = $1 OR company_id IS NULL`;
    }
    recentSql += `)
      ORDER BY created_at DESC
      LIMIT 10
    `;
    const recentPhotos = await (0, database_1.query)(recentSql, companyId && userRole !== 'admin' ? [companyId] : []);
    res.json({
        auditPhotos: parseInt(auditResult[0]?.count || 0),
        inspectionPhotos: parseInt(inspectionResult[0]?.count || 0),
        totalPhotos: parseInt(auditResult[0]?.count || 0) + parseInt(inspectionResult[0]?.count || 0),
        recentPhotos
    });
}));
exports.default = router;
//# sourceMappingURL=photos.js.map