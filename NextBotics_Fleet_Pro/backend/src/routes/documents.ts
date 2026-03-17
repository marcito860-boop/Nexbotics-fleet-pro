import { Router, Request, Response } from 'express';
import { query } from '../database';
import { authMiddleware, requireRole } from '../utils/auth';

const router = Router();

router.use(authMiddleware);

// ============================================
// DOCUMENTS
// ============================================

// GET /api/fleet/documents - List documents
router.get('/', async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const { documentType, entityType, entityId, status, limit = '50' } = req.query;

    let sql = `
      SELECT d.*, 
        v.registration_number as vehicle_reg,
        dr.first_name as driver_fname, dr.last_name as driver_lname
      FROM documents d
      LEFT JOIN vehicles v ON d.entity_type = 'vehicle' AND d.entity_id = v.id
      LEFT JOIN drivers dr ON d.entity_type = 'driver' AND d.entity_id = dr.id
      WHERE d.company_id = $1
    `;
    const params: any[] = [companyId];

    if (documentType) {
      sql += ` AND d.document_type = $${params.length + 1}`;
      params.push(documentType);
    }
    if (entityType) {
      sql += ` AND d.entity_type = $${params.length + 1}`;
      params.push(entityType);
    }
    if (entityId) {
      sql += ` AND d.entity_id = $${params.length + 1}`;
      params.push(entityId);
    }
    if (status) {
      sql += ` AND d.status = $${params.length + 1}`;
      params.push(status);
    }

    sql += ' ORDER BY d.expiry_date ASC NULLS LAST, d.created_at DESC';

    if (limit) {
      sql += ` LIMIT $${params.length + 1}`;
      params.push(parseInt(limit as string));
    }

    const rows = await query(sql, params);

    res.json({
      success: true,
      data: rows.map((r: any) => ({
        id: r.id,
        documentType: r.document_type,
        title: r.title,
        documentNumber: r.document_number,
        entityType: r.entity_type,
        entityId: r.entity_id,
        entityName: r.vehicle_reg || (r.driver_fname ? `${r.driver_fname} ${r.driver_lname}` : null),
        issueDate: r.issue_date,
        expiryDate: r.expiry_date,
        status: r.status,
        fileUrl: r.file_url,
        notes: r.notes,
        createdAt: r.created_at,
        daysUntilExpiry: r.expiry_date 
          ? Math.ceil((new Date(r.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          : null,
      })),
    });
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch documents' });
  }
});

// POST /api/fleet/documents - Create document
router.post('/', requireRole(['admin', 'manager']), async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const userId = req.user!.userId;
    const { documentType, title, documentNumber, entityType, entityId, 
            issueDate, expiryDate, fileUrl, notes } = req.body;

    if (!documentType || !title) {
      return res.status(400).json({ success: false, error: 'Document type and title are required' });
    }

    // Calculate status based on expiry
    let status = 'valid';
    if (expiryDate) {
      const expiry = new Date(expiryDate);
      const today = new Date();
      const daysUntil = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysUntil < 0) status = 'expired';
      else if (daysUntil <= 30) status = 'expiring_soon';
    }

    const rows = await query(
      `INSERT INTO documents (company_id, document_type, title, document_number, entity_type,
       entity_id, issue_date, expiry_date, status, file_url, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
      [companyId, documentType, title, documentNumber, entityType, entityId,
       issueDate, expiryDate, status, fileUrl, notes, userId]
    );

    res.status(201).json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('Error creating document:', error);
    res.status(500).json({ success: false, error: 'Failed to create document' });
  }
});

// GET /api/fleet/documents/expiring - Get documents expiring soon
router.get('/expiring', async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const days = parseInt(req.query.days as string) || 30;

    const rows = await query(
      `SELECT d.*, 
        v.registration_number as vehicle_reg,
        dr.first_name as driver_fname, dr.last_name as driver_lname
       FROM documents d
       LEFT JOIN vehicles v ON d.entity_type = 'vehicle' AND d.entity_id = v.id
       LEFT JOIN drivers dr ON d.entity_type = 'driver' AND d.entity_id = dr.id
       WHERE d.company_id = $1
       AND d.expiry_date IS NOT NULL
       AND d.expiry_date <= CURRENT_DATE + INTERVAL '${days} days'
       AND d.status IN ('valid', 'expiring_soon')
       ORDER BY d.expiry_date ASC`,
      [companyId]
    );

    res.json({
      success: true,
      data: rows.map((r: any) => ({
        id: r.id,
        documentType: r.document_type,
        title: r.title,
        documentNumber: r.document_number,
        entityType: r.entity_type,
        entityName: r.vehicle_reg || (r.driver_fname ? `${r.driver_fname} ${r.driver_lname}` : null),
        expiryDate: r.expiry_date,
        daysUntilExpiry: Math.ceil((new Date(r.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
      })),
    });
  } catch (error) {
    console.error('Error fetching expiring documents:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch documents' });
  }
});

// GET /api/fleet/documents/stats - Document statistics
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;

    const rows = await query(
      `SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'valid' THEN 1 END) as valid,
        COUNT(CASE WHEN status = 'expiring_soon' THEN 1 END) as expiring_soon,
        COUNT(CASE WHEN status = 'expired' THEN 1 END) as expired,
        COUNT(CASE WHEN document_type = 'license' THEN 1 END) as licenses,
        COUNT(CASE WHEN document_type = 'insurance' THEN 1 END) as insurance,
        COUNT(CASE WHEN document_type = 'permit' THEN 1 END) as permits
       FROM documents WHERE company_id = $1`,
      [companyId]
    );

    res.json({
      success: true,
      data: {
        total: parseInt(rows[0].total),
        valid: parseInt(rows[0].valid),
        expiringSoon: parseInt(rows[0].expiring_soon),
        expired: parseInt(rows[0].expired),
        byType: {
          licenses: parseInt(rows[0].licenses),
          insurance: parseInt(rows[0].insurance),
          permits: parseInt(rows[0].permits),
        },
      },
    });
  } catch (error) {
    console.error('Error fetching document stats:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch stats' });
  }
});

// ============================================
// DOCUMENT ALERTS CRON (called via API)
// ============================================

// POST /api/fleet/documents/check-expiry - Check and update document expiry status
router.post('/check-expiry', requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;

    // Update expiring soon (7-30 days)
    await query(
      `UPDATE documents 
       SET status = 'expiring_soon', updated_at = NOW()
       WHERE company_id = $1 
       AND expiry_date IS NOT NULL
       AND expiry_date > CURRENT_DATE
       AND expiry_date <= CURRENT_DATE + INTERVAL '30 days'
       AND status = 'valid'`,
      [companyId]
    );

    // Update expired
    await query(
      `UPDATE documents 
       SET status = 'expired', updated_at = NOW()
       WHERE company_id = $1 
       AND expiry_date IS NOT NULL
       AND expiry_date < CURRENT_DATE
       AND status IN ('valid', 'expiring_soon')`,
      [companyId]
    );

    // Create alerts for newly expired or expiring documents
    const expiringDocs = await query(
      `SELECT * FROM documents 
       WHERE company_id = $1
       AND expiry_date IS NOT NULL
       AND expiry_date <= CURRENT_DATE + INTERVAL '7 days'
       AND NOT EXISTS (
         SELECT 1 FROM fleet_alerts 
         WHERE fleet_alerts.reference_id = documents.id
         AND fleet_alerts.alert_type = 'document_expiry'
         AND fleet_alerts.created_at > CURRENT_DATE - INTERVAL '7 days'
       )`,
      [companyId]
    );

    for (const doc of expiringDocs) {
      const daysUntil = Math.ceil((new Date(doc.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      await query(
        `INSERT INTO fleet_alerts (company_id, alert_type, severity, title, message, reference_id, reference_type)
         VALUES ($1, 'document_expiry', $2, $3, $4, $5, $6)`,
        [companyId, daysUntil < 0 ? 'high' : daysUntil <= 7 ? 'high' : 'medium',
         `${doc.title} ${daysUntil < 0 ? 'Expired' : 'Expiring Soon'}`,
         `${doc.title} (${doc.document_number}) ${daysUntil < 0 ? 'has expired' : `expires in ${daysUntil} days`}`,
         doc.id, 'document']
      );
    }

    res.json({ success: true, message: 'Document expiry check completed', alertsCreated: expiringDocs.length });
  } catch (error) {
    console.error('Error checking document expiry:', error);
    res.status(500).json({ success: false, error: 'Failed to check expiry' });
  }
});

export default router;
