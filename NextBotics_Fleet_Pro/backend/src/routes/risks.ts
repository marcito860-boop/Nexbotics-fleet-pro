import { Router, Request, Response } from 'express';
import { RiskModel, InspectionModel } from '../models/Risk';
import { authMiddleware, requireRole } from '../utils/auth';

const router = Router();

router.use(authMiddleware);

// ============================================
// RISK REGISTER
// ============================================

// GET /api/fleet/risks - List risks
router.get('/', async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const { status, riskLevel, category, ownerId, limit = '50', offset = '0' } = req.query;

    const result = await RiskModel.findByCompany(companyId, {
      status: status as string,
      riskLevel: riskLevel as string,
      category: category as string,
      ownerId: ownerId as string,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });

    res.json({
      success: true,
      data: result.risks,
      pagination: { total: result.total, limit: parseInt(limit as string), offset: parseInt(offset as string) },
    });
  } catch (error) {
    console.error('Error fetching risks:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch risks' });
  }
});

// GET /api/fleet/risks/stats - Get risk statistics
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const stats = await RiskModel.getStats(companyId);
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error fetching risk stats:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch statistics' });
  }
});

// GET /api/fleet/risks/my-risks - Get risks assigned to current user
router.get('/my-risks', async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const userId = req.user!.userId;

    const result = await RiskModel.findByCompany(companyId, {
      ownerId: userId,
      limit: 50,
    });

    res.json({ success: true, data: result.risks });
  } catch (error) {
    console.error('Error fetching my risks:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch risks' });
  }
});

// GET /api/fleet/risks/:id - Get single risk
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const risk = await RiskModel.findById(req.params.id, companyId);

    if (!risk) {
      return res.status(404).json({ success: false, error: 'Risk not found' });
    }

    res.json({ success: true, data: risk });
  } catch (error) {
    console.error('Error fetching risk:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch risk' });
  }
});

// POST /api/fleet/risks - Create risk
router.post('/', requireRole(['admin', 'manager']), async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const userId = req.user!.userId;
    const { title, description, category, likelihood, impact, mitigatingActions, ownerId, reviewDate } = req.body;

    if (!title || !description || !category || !likelihood || !impact) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const risk = await RiskModel.create(companyId, {
      title,
      description,
      category,
      likelihood,
      impact,
      mitigatingActions,
      identifiedBy: userId,
      ownerId,
      reviewDate: reviewDate ? new Date(reviewDate) : undefined,
    });

    res.status(201).json({ success: true, data: risk });
  } catch (error) {
    console.error('Error creating risk:', error);
    res.status(500).json({ success: false, error: 'Failed to create risk' });
  }
});

// PUT /api/fleet/risks/:id - Update risk
router.put('/:id', requireRole(['admin', 'manager']), async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const userId = req.user!.userId;
    const { title, description, category, likelihood, impact, mitigatingActions, ownerId, reviewDate, status } = req.body;

    const risk = await RiskModel.update(req.params.id, companyId, {
      title,
      description,
      category,
      likelihood,
      impact,
      mitigatingActions,
      ownerId,
      reviewDate: reviewDate ? new Date(reviewDate) : undefined,
      status,
    }, userId);

    if (!risk) {
      return res.status(404).json({ success: false, error: 'Risk not found' });
    }

    res.json({ success: true, data: risk });
  } catch (error) {
    console.error('Error updating risk:', error);
    res.status(500).json({ success: false, error: 'Failed to update risk' });
  }
});

// GET /api/fleet/risks/:id/history - Get risk history
router.get('/:id/history', async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const history = await RiskModel.getHistory(req.params.id, companyId);
    res.json({ success: true, data: history });
  } catch (error) {
    console.error('Error fetching risk history:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch history' });
  }
});

// ============================================
// INSPECTION RECORDS
// ============================================

// GET /api/fleet/risks/inspections - List inspections
router.get('/inspections/all', async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const { inspectionType, vehicleId, status, limit = '50', offset = '0' } = req.query;

    const result = await InspectionModel.findByCompany(companyId, {
      inspectionType: inspectionType as string,
      vehicleId: vehicleId as string,
      status: status as string,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });

    res.json({
      success: true,
      data: result.inspections,
      pagination: { total: result.total, limit: parseInt(limit as string), offset: parseInt(offset as string) },
    });
  } catch (error) {
    console.error('Error fetching inspections:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch inspections' });
  }
});

// GET /api/fleet/risks/inspections/:id - Get single inspection
router.get('/inspections/:id', async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const inspection = await InspectionModel.findById(req.params.id, companyId);

    if (!inspection) {
      return res.status(404).json({ success: false, error: 'Inspection not found' });
    }

    res.json({ success: true, data: inspection });
  } catch (error) {
    console.error('Error fetching inspection:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch inspection' });
  }
});

// POST /api/fleet/risks/inspections - Create inspection
router.post('/inspections', requireRole(['admin', 'manager', 'staff']), async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const userId = req.user!.userId;
    const { inspectionType, vehicleId, driverId, location, latitude, longitude, overallStatus, findings, correctiveActionNeeded, photos, signatureUrl } = req.body;

    if (!inspectionType) {
      return res.status(400).json({ success: false, error: 'Inspection type is required' });
    }

    const inspection = await InspectionModel.create(companyId, {
      inspectionType,
      vehicleId,
      driverId,
      inspectedBy: userId,
      location,
      latitude,
      longitude,
      overallStatus,
      findings,
      correctiveActionNeeded,
      photos,
      signatureUrl,
    });

    res.status(201).json({ success: true, data: inspection });
  } catch (error) {
    console.error('Error creating inspection:', error);
    res.status(500).json({ success: false, error: 'Failed to create inspection' });
  }
});

// POST /api/fleet/risks/inspections/:id/link-action - Link to corrective action
router.post('/inspections/:id/link-action', requireRole(['admin', 'manager']), async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const userId = req.user!.userId;
    const { correctiveActionId } = req.body;

    if (!correctiveActionId) {
      return res.status(400).json({ success: false, error: 'Corrective action ID is required' });
    }

    await InspectionModel.linkToCorrectiveAction(req.params.id, correctiveActionId, userId);
    res.json({ success: true, message: 'Inspection linked to corrective action' });
  } catch (error) {
    console.error('Error linking inspection:', error);
    res.status(500).json({ success: false, error: 'Failed to link inspection' });
  }
});

export default router;
