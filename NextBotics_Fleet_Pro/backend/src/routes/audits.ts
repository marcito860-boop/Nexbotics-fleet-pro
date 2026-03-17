import { Router, Request, Response } from 'express';
import { AuditTemplateModel, AuditSessionModel, CorrectiveActionModel } from '../models/Audit';
import { authMiddleware, requireRole } from '../utils/auth';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// ============================================
// AUDIT TEMPLATES
// ============================================

// GET /api/fleet/audits/templates - List audit templates
router.get('/templates', async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const { isActive } = req.query;

    const templates = await AuditTemplateModel.findByCompany(companyId, {
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
    });

    res.json({ success: true, data: templates });
  } catch (error) {
    console.error('Error fetching audit templates:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch templates' });
  }
});

// GET /api/fleet/audits/templates/:id - Get single template
router.get('/templates/:id', async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const template = await AuditTemplateModel.findById(req.params.id, companyId);

    if (!template) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }

    res.json({ success: true, data: template });
  } catch (error) {
    console.error('Error fetching template:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch template' });
  }
});

// GET /api/fleet/audits/templates/:id/questions - Get template questions
router.get('/templates/:id/questions', async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const questions = await AuditTemplateModel.getQuestions(req.params.id, companyId);
    res.json({ success: true, data: questions });
  } catch (error) {
    console.error('Error fetching questions:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch questions' });
  }
});

// POST /api/fleet/audits/templates/:id/questions - Add question to template
router.post('/templates/:id/questions', requireRole(['admin', 'manager']), async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const { questionText, description, category, weight, evidenceRequired } = req.body;

    if (!questionText) {
      return res.status(400).json({ success: false, error: 'Question text is required' });
    }

    const question = await AuditTemplateModel.addQuestion(req.params.id, companyId, {
      questionText,
      description,
      category,
      weight,
      evidenceRequired,
    });

    res.status(201).json({ success: true, data: question });
  } catch (error) {
    console.error('Error adding question:', error);
    res.status(500).json({ success: false, error: 'Failed to add question' });
  }
});

// POST /api/fleet/audits/templates/:id/clone - Clone system template to company
router.post('/templates/:id/clone', requireRole(['admin', 'manager']), async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const userId = req.user!.userId;

    const template = await AuditTemplateModel.createFromSystemTemplate(req.params.id, companyId, userId);

    if (!template) {
      return res.status(404).json({ success: false, error: 'System template not found' });
    }

    res.status(201).json({ success: true, data: template });
  } catch (error) {
    console.error('Error cloning template:', error);
    res.status(500).json({ success: false, error: 'Failed to clone template' });
  }
});

// ============================================
// AUDIT SESSIONS
// ============================================

// GET /api/fleet/audits/sessions - List audit sessions
router.get('/sessions', async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const { status, templateId, vehicleId, limit = '50', offset = '0' } = req.query;

    const result = await AuditSessionModel.findByCompany(companyId, {
      status: status as string,
      templateId: templateId as string,
      vehicleId: vehicleId as string,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });

    res.json({
      success: true,
      data: result.sessions,
      pagination: {
        total: result.total,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      },
    });
  } catch (error) {
    console.error('Error fetching audit sessions:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch sessions' });
  }
});

// GET /api/fleet/audits/sessions/stats - Get audit statistics
router.get('/sessions/stats', async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const stats = await AuditSessionModel.getStats(companyId);
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error fetching audit stats:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch statistics' });
  }
});

// GET /api/fleet/audits/sessions/:id - Get single session
router.get('/sessions/:id', async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const session = await AuditSessionModel.findById(req.params.id, companyId);

    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    res.json({ success: true, data: session });
  } catch (error) {
    console.error('Error fetching session:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch session' });
  }
});

// POST /api/fleet/audits/sessions - Create audit session
router.post('/sessions', requireRole(['admin', 'manager']), async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const userId = req.user!.userId;
    const {
      templateId,
      vehicleId,
      driverId,
      auditReference,
      location,
      latitude,
      longitude,
      weatherConditions,
      notes,
    } = req.body;

    if (!templateId) {
      return res.status(400).json({ success: false, error: 'Template ID is required' });
    }

    const session = await AuditSessionModel.create(companyId, {
      templateId,
      vehicleId,
      driverId,
      auditorId: userId,
      auditReference,
      location,
      latitude,
      longitude,
      weatherConditions,
      notes,
    });

    res.status(201).json({ success: true, data: session });
  } catch (error) {
    console.error('Error creating audit session:', error);
    res.status(500).json({ success: false, error: 'Failed to create session' });
  }
});

// POST /api/fleet/audits/sessions/:id/responses - Submit audit response
router.post('/sessions/:id/responses', requireRole(['admin', 'manager']), async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const userId = req.user!.userId;
    const { questionId, score, notes, evidencePhotos } = req.body;

    if (!questionId || score === undefined) {
      return res.status(400).json({ success: false, error: 'Question ID and score are required' });
    }

    if (score < 0 || score > 2) {
      return res.status(400).json({ success: false, error: 'Score must be 0, 1, or 2' });
    }

    const response = await AuditSessionModel.submitResponse(req.params.id, companyId, {
      questionId,
      score,
      notes,
      evidencePhotos,
      answeredBy: userId,
    });

    res.status(201).json({ success: true, data: response });
  } catch (error) {
    console.error('Error submitting response:', error);
    res.status(500).json({ success: false, error: 'Failed to submit response' });
  }
});

// POST /api/fleet/audits/sessions/:id/complete - Complete audit
router.post('/sessions/:id/complete', requireRole(['admin', 'manager']), async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const session = await AuditSessionModel.complete(req.params.id, companyId);

    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    res.json({ success: true, data: session });
  } catch (error) {
    console.error('Error completing audit:', error);
    res.status(500).json({ success: false, error: 'Failed to complete audit' });
  }
});

// GET /api/fleet/audits/sessions/:id/category-scores - Get category scores
router.get('/sessions/:id/category-scores', async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const scores = await AuditSessionModel.getCategoryScores(req.params.id, companyId);
    res.json({ success: true, data: scores });
  } catch (error) {
    console.error('Error fetching category scores:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch category scores' });
  }
});

// ============================================
// CORRECTIVE ACTIONS
// ============================================

// GET /api/fleet/audits/corrective-actions - List corrective actions
router.get('/corrective-actions', async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const { status, assignedTo, priority, limit = '50', offset = '0' } = req.query;

    const result = await CorrectiveActionModel.findByCompany(companyId, {
      status: status as string,
      assignedTo: assignedTo as string,
      priority: priority as string,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });

    res.json({
      success: true,
      data: result.actions,
      pagination: {
        total: result.total,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      },
    });
  } catch (error) {
    console.error('Error fetching corrective actions:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch actions' });
  }
});

// GET /api/fleet/audits/corrective-actions/stats - Get stats
router.get('/corrective-actions/stats', async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const stats = await CorrectiveActionModel.getStats(companyId);
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch statistics' });
  }
});

// GET /api/fleet/audits/corrective-actions/:id - Get single action
router.get('/corrective-actions/:id', async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const action = await CorrectiveActionModel.findById(req.params.id, companyId);

    if (!action) {
      return res.status(404).json({ success: false, error: 'Corrective action not found' });
    }

    res.json({ success: true, data: action });
  } catch (error) {
    console.error('Error fetching corrective action:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch action' });
  }
});

// POST /api/fleet/audits/sessions/:id/corrective-actions - Create corrective action
router.post('/sessions/:id/corrective-actions', requireRole(['admin', 'manager']), async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const userId = req.user!.userId;
    const { responseId, title, description, priority, assignedTo, dueDate } = req.body;

    if (!title || !description) {
      return res.status(400).json({ success: false, error: 'Title and description are required' });
    }

    const action = await CorrectiveActionModel.create(companyId, userId, {
      sessionId: req.params.id,
      responseId,
      title,
      description,
      priority,
      assignedTo,
      dueDate: dueDate ? new Date(dueDate) : undefined,
    });

    res.status(201).json({ success: true, data: action });
  } catch (error) {
    console.error('Error creating corrective action:', error);
    res.status(500).json({ success: false, error: 'Failed to create action' });
  }
});

// POST /api/fleet/audits/corrective-actions/:id/complete - Complete action
router.post('/corrective-actions/:id/complete', async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const userId = req.user!.userId;
    const { notes } = req.body;

    const action = await CorrectiveActionModel.complete(req.params.id, companyId, userId, notes);

    if (!action) {
      return res.status(404).json({ success: false, error: 'Corrective action not found' });
    }

    res.json({ success: true, data: action });
  } catch (error) {
    console.error('Error completing action:', error);
    res.status(500).json({ success: false, error: 'Failed to complete action' });
  }
});

export default router;
