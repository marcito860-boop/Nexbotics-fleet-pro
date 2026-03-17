import { Router, Request, Response } from 'express';
import { body, param, query as queryValidator, validationResult } from 'express-validator';
import { AlertModel } from '../models/Alert';
import { authMiddleware, requireRole } from '../utils/auth';

const router = Router();

router.use(authMiddleware);

// GET /api/fleet/alerts - List all alerts
router.get('/', [
  queryValidator('page').optional().isInt({ min: 1 }),
  queryValidator('perPage').optional().isInt({ min: 1, max: 100 }),
  queryValidator('isRead').optional().isBoolean(),
  queryValidator('severity').optional().isIn(['info', 'warning', 'critical']),
  queryValidator('alertType').optional().isIn(['maintenance_due', 'insurance_expiry', 'license_expiry', 'speeding', 'geofence', 'fuel_low', 'diagnostic', 'assignment', 'custom']),
  queryValidator('vehicleId').optional().isUUID(),
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
  }

  try {
    const companyId = req.user!.companyId;
    const page = parseInt(req.query.page as string) || 1;
    const perPage = parseInt(req.query.perPage as string) || 20;
    const isRead = req.query.isRead === 'true' ? true : req.query.isRead === 'false' ? false : undefined;
    const severity = req.query.severity as any;
    const alertType = req.query.alertType as any;
    const vehicleId = req.query.vehicleId as string;

    const { alerts, total, unreadCount } = await AlertModel.findByCompany(companyId, {
      isRead,
      severity,
      alertType,
      vehicleId,
      limit: perPage,
      offset: (page - 1) * perPage,
    });

    res.json({
      success: true,
      data: {
        items: alerts,
        total,
        unreadCount,
        page,
        perPage,
        totalPages: Math.ceil(total / perPage),
      }
    });
  } catch (error) {
    console.error('List alerts error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch alerts' });
  }
});

// GET /api/fleet/alerts/stats/unread-count - Frontend compatible endpoint
router.get('/stats/unread-count', async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const { unreadCount } = await AlertModel.findByCompany(companyId, { limit: 0 });
    res.json({ success: true, data: { count: unreadCount } });
  } catch (error) {
    console.error('Unread count error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch unread count' });
  }
});

// GET /api/fleet/alerts/unread-count - Get unread alert count (keep for compatibility)
router.get('/unread-count', async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const { unreadCount } = await AlertModel.findByCompany(companyId, { limit: 0 });

    res.json({ success: true, data: { unreadCount } });
  } catch (error) {
    console.error('Unread count error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch unread count' });
  }
});

// POST /api/fleet/alerts/generate - Generate system alerts (admin/manager only)
router.post('/generate', [
  requireRole('admin', 'manager'),
], async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;

    await AlertModel.generateMaintenanceAlerts(companyId);
    await AlertModel.generateExpiryAlerts(companyId);

    res.json({ success: true, message: 'Alerts generated successfully' });
  } catch (error) {
    console.error('Generate alerts error:', error);
    res.status(500).json({ success: false, error: 'Failed to generate alerts' });
  }
});

// POST /api/fleet/alerts - Create custom alert (admin/manager only)
router.post('/', [
  requireRole('admin', 'manager'),
  body('title').trim().notEmpty().withMessage('Title required'),
  body('alertType').isIn(['maintenance_due', 'insurance_expiry', 'license_expiry', 'speeding', 'geofence', 'fuel_low', 'diagnostic', 'assignment', 'custom']).withMessage('Valid alert type required'),
  body('severity').optional().isIn(['info', 'warning', 'critical']),
  body('message').optional().trim(),
  body('vehicleId').optional().isUUID(),
  body('driverId').optional().isUUID(),
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
  }

  try {
    const companyId = req.user!.companyId;

    const alert = await AlertModel.create(companyId, {
      vehicleId: req.body.vehicleId,
      driverId: req.body.driverId,
      alertType: req.body.alertType,
      severity: req.body.severity || 'info',
      title: req.body.title,
      message: req.body.message,
      data: req.body.data,
    });

    res.status(201).json({ success: true, data: alert, message: 'Alert created successfully' });
  } catch (error) {
    console.error('Create alert error:', error);
    res.status(500).json({ success: false, error: 'Failed to create alert' });
  }
});

// POST /api/fleet/alerts/:id/read - Mark alert as read
router.post('/:id/read', [
  param('id').isUUID().withMessage('Valid alert ID required'),
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
  }

  try {
    const companyId = req.user!.companyId;
    const userId = req.user!.userId;

    await AlertModel.markAsRead(req.params.id, companyId, userId);

    res.json({ success: true, message: 'Alert marked as read' });
  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({ success: false, error: 'Failed to mark alert as read' });
  }
});

// POST /api/fleet/alerts/read-all - Mark all alerts as read
router.post('/read-all', async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const userId = req.user!.userId;

    await AlertModel.markAllAsRead(companyId, userId);

    res.json({ success: true, message: 'All alerts marked as read' });
  } catch (error) {
    console.error('Mark all read error:', error);
    res.status(500).json({ success: false, error: 'Failed to mark alerts as read' });
  }
});

// POST /api/fleet/alerts/:id/dismiss - Dismiss alert
router.post('/:id/dismiss', [
  param('id').isUUID().withMessage('Valid alert ID required'),
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
  }

  try {
    const companyId = req.user!.companyId;
    const userId = req.user!.userId;

    await AlertModel.dismiss(req.params.id, companyId, userId);

    res.json({ success: true, message: 'Alert dismissed' });
  } catch (error) {
    console.error('Dismiss alert error:', error);
    res.status(500).json({ success: false, error: 'Failed to dismiss alert' });
  }
});

// DELETE /api/fleet/alerts/:id - Delete alert (admin only)
router.delete('/:id', [
  requireRole('admin'),
  param('id').isUUID().withMessage('Valid alert ID required'),
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
  }

  try {
    const companyId = req.user!.companyId;
    const deleted = await AlertModel.delete(req.params.id, companyId);

    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Alert not found' });
    }

    res.json({ success: true, message: 'Alert deleted successfully' });
  } catch (error) {
    console.error('Delete alert error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete alert' });
  }
});

export default router;
