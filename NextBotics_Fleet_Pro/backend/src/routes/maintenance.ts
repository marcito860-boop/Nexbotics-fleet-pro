import { Router, Request, Response } from 'express';
import { body, param, query as queryValidator, validationResult } from 'express-validator';
import { authMiddleware, requireRole } from '../utils/auth';
import { query } from '../database';
import {
  ServiceProviderModel,
  SparePartModel,
  MaintenanceScheduleModel,
  MaintenanceRecordModel,
  VehicleDowntimeModel,
  MaintenanceReminderModel,
  ServiceType,
  ScheduleStatus,
  Priority,
  ProviderType,
  DowntimeType,
  MaintenanceStatus,
} from '../models/Maintenance';

const router = Router();
router.use(authMiddleware);

// ==================== SERVICE PROVIDERS ====================

// GET /api/fleet/maintenance/providers - List all service providers
router.get('/providers', [
  queryValidator('page').optional().isInt({ min: 1 }),
  queryValidator('perPage').optional().isInt({ min: 1, max: 100 }),
  queryValidator('type').optional().isIn(['general', 'specialist', 'dealership', 'emergency']),
  queryValidator('isApproved').optional().isBoolean(),
  queryValidator('search').optional().trim(),
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
  }

  try {
    const companyId = req.user!.companyId;
    const page = parseInt(req.query.page as string) || 1;
    const perPage = parseInt(req.query.perPage as string) || 20;
    const type = req.query.type as ProviderType;
    const isApproved = req.query.isApproved !== undefined ? req.query.isApproved === 'true' : undefined;
    const search = req.query.search as string;

    const { providers, total } = await ServiceProviderModel.findByCompany(companyId, {
      type,
      isApproved,
      search,
      limit: perPage,
      offset: (page - 1) * perPage,
    });

    res.json({
      success: true,
      data: {
        items: providers,
        total,
        page,
        perPage,
        totalPages: Math.ceil(total / perPage),
      }
    });
  } catch (error) {
    console.error('List providers error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch service providers' });
  }
});

// GET /api/fleet/maintenance/providers/:id - Get provider by ID
router.get('/providers/:id', [
  param('id').isUUID().withMessage('Valid provider ID required'),
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
  }

  try {
    const companyId = req.user!.companyId;
    const provider = await ServiceProviderModel.findById(req.params.id, companyId);

    if (!provider) {
      return res.status(404).json({ success: false, error: 'Service provider not found' });
    }

    res.json({ success: true, data: provider });
  } catch (error) {
    console.error('Get provider error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch service provider' });
  }
});

// POST /api/fleet/maintenance/providers - Create new provider
router.post('/providers', [
  requireRole('admin', 'manager'),
  body('name').trim().notEmpty().withMessage('Provider name required'),
  body('type').optional().isIn(['general', 'specialist', 'dealership', 'emergency']),
  body('email').optional().isEmail().withMessage('Valid email required'),
  body('phone').optional().trim(),
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
  }

  try {
    const companyId = req.user!.companyId;
    const provider = await ServiceProviderModel.create(companyId, {
      name: req.body.name,
      type: req.body.type,
      contactPerson: req.body.contactPerson,
      phone: req.body.phone,
      email: req.body.email,
      address: req.body.address,
      city: req.body.city,
      country: req.body.country,
      taxId: req.body.taxId,
      bankAccount: req.body.bankAccount,
      specialties: req.body.specialties,
      workingHours: req.body.workingHours,
      notes: req.body.notes,
    });

    res.status(201).json({ success: true, data: provider, message: 'Service provider created successfully' });
  } catch (error) {
    console.error('Create provider error:', error);
    res.status(500).json({ success: false, error: 'Failed to create service provider' });
  }
});

// PUT /api/fleet/maintenance/providers/:id - Update provider
router.put('/providers/:id', [
  requireRole('admin', 'manager'),
  param('id').isUUID().withMessage('Valid provider ID required'),
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
  }

  try {
    const companyId = req.user!.companyId;
    const provider = await ServiceProviderModel.update(req.params.id, companyId, {
      name: req.body.name,
      type: req.body.type,
      contactPerson: req.body.contactPerson,
      phone: req.body.phone,
      email: req.body.email,
      address: req.body.address,
      city: req.body.city,
      country: req.body.country,
      taxId: req.body.taxId,
      bankAccount: req.body.bankAccount,
      specialties: req.body.specialties,
      workingHours: req.body.workingHours,
      notes: req.body.notes,
    });

    if (!provider) {
      return res.status(404).json({ success: false, error: 'Service provider not found' });
    }

    res.json({ success: true, data: provider });
  } catch (error) {
    console.error('Update provider error:', error);
    res.status(500).json({ success: false, error: 'Failed to update service provider' });
  }
});

// DELETE /api/fleet/maintenance/providers/:id - Delete provider
router.delete('/providers/:id', [
  requireRole('admin'),
  param('id').isUUID().withMessage('Valid provider ID required'),
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
  }

  try {
    const companyId = req.user!.companyId;
    const deleted = await ServiceProviderModel.delete(req.params.id, companyId);

    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Service provider not found' });
    }

    res.json({ success: true, message: 'Service provider deleted successfully' });
  } catch (error) {
    console.error('Delete provider error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete service provider' });
  }
});

// ==================== SPARE PARTS ====================

// GET /api/fleet/maintenance/parts - List all spare parts
router.get('/parts', [
  queryValidator('page').optional().isInt({ min: 1 }),
  queryValidator('perPage').optional().isInt({ min: 1, max: 100 }),
  queryValidator('category').optional().trim(),
  queryValidator('lowStockOnly').optional().isBoolean(),
  queryValidator('search').optional().trim(),
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
  }

  try {
    const companyId = req.user!.companyId;
    const page = parseInt(req.query.page as string) || 1;
    const perPage = parseInt(req.query.perPage as string) || 20;
    const category = req.query.category as string;
    const lowStockOnly = req.query.lowStockOnly === 'true';
    const search = req.query.search as string;

    const { parts, total } = await SparePartModel.findByCompany(companyId, {
      category,
      lowStockOnly,
      search,
      limit: perPage,
      offset: (page - 1) * perPage,
    });

    res.json({
      success: true,
      data: {
        items: parts,
        total,
        page,
        perPage,
        totalPages: Math.ceil(total / perPage),
      }
    });
  } catch (error) {
    console.error('List parts error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch spare parts' });
  }
});

// GET /api/fleet/maintenance/parts/low-stock - Get low stock items
router.get('/parts/low-stock', async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const { parts, total } = await SparePartModel.findByCompany(companyId, { lowStockOnly: true });

    res.json({ success: true, data: { items: parts, total } });
  } catch (error) {
    console.error('Low stock error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch low stock items' });
  }
});

// POST /api/fleet/maintenance/parts - Create new part
router.post('/parts', [
  requireRole('admin', 'manager'),
  body('partNumber').trim().notEmpty().withMessage('Part number required'),
  body('name').trim().notEmpty().withMessage('Part name required'),
  body('category').trim().notEmpty().withMessage('Category required'),
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
  }

  try {
    const companyId = req.user!.companyId;

    // Check for duplicate part number
    const existing = await SparePartModel.findByPartNumber(req.body.partNumber, companyId);
    if (existing) {
      return res.status(409).json({ success: false, error: 'Part with this number already exists' });
    }

    const part = await SparePartModel.create(companyId, {
      partNumber: req.body.partNumber,
      name: req.body.name,
      description: req.body.description,
      category: req.body.category,
      manufacturer: req.body.manufacturer,
      compatibleVehicles: req.body.compatibleVehicles,
      unitCost: req.body.unitCost,
      sellingPrice: req.body.sellingPrice,
      quantityInStock: req.body.quantityInStock,
      reorderLevel: req.body.reorderLevel,
      reorderQuantity: req.body.reorderQuantity,
      unitOfMeasure: req.body.unitOfMeasure,
      locationCode: req.body.locationCode,
      supplierId: req.body.supplierId,
      leadTimeDays: req.body.leadTimeDays,
    });

    res.status(201).json({ success: true, data: part, message: 'Spare part created successfully' });
  } catch (error) {
    console.error('Create part error:', error);
    res.status(500).json({ success: false, error: 'Failed to create spare part' });
  }
});

// PUT /api/fleet/maintenance/parts/:id - Update part
router.put('/parts/:id', [
  requireRole('admin', 'manager'),
  param('id').isUUID().withMessage('Valid part ID required'),
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
  }

  try {
    const companyId = req.user!.companyId;
    const part = await SparePartModel.update(req.params.id, companyId, {
      partNumber: req.body.partNumber,
      name: req.body.name,
      description: req.body.description,
      category: req.body.category,
      manufacturer: req.body.manufacturer,
      compatibleVehicles: req.body.compatibleVehicles,
      unitCost: req.body.unitCost,
      sellingPrice: req.body.sellingPrice,
      reorderLevel: req.body.reorderLevel,
      reorderQuantity: req.body.reorderQuantity,
      unitOfMeasure: req.body.unitOfMeasure,
      locationCode: req.body.locationCode,
      supplierId: req.body.supplierId,
      leadTimeDays: req.body.leadTimeDays,
    });

    if (!part) {
      return res.status(404).json({ success: false, error: 'Spare part not found' });
    }

    res.json({ success: true, data: part });
  } catch (error) {
    console.error('Update part error:', error);
    res.status(500).json({ success: false, error: 'Failed to update spare part' });
  }
});

// POST /api/fleet/maintenance/parts/:id/adjust-stock - Adjust stock quantity
router.post('/parts/:id/adjust-stock', [
  requireRole('admin', 'manager'),
  param('id').isUUID().withMessage('Valid part ID required'),
  body('quantity').isInt().withMessage('Quantity must be an integer'),
  body('reason').optional().trim(),
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
  }

  try {
    const companyId = req.user!.companyId;
    const part = await SparePartModel.adjustStock(req.params.id, companyId, req.body.quantity, req.body.reason);

    if (!part) {
      return res.status(404).json({ success: false, error: 'Spare part not found' });
    }

    res.json({ success: true, data: part, message: 'Stock adjusted successfully' });
  } catch (error) {
    console.error('Adjust stock error:', error);
    res.status(500).json({ success: false, error: 'Failed to adjust stock' });
  }
});

// DELETE /api/fleet/maintenance/parts/:id - Delete part
router.delete('/parts/:id', [
  requireRole('admin'),
  param('id').isUUID().withMessage('Valid part ID required'),
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
  }

  try {
    const companyId = req.user!.companyId;
    const deleted = await SparePartModel.delete(req.params.id, companyId);

    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Spare part not found' });
    }

    res.json({ success: true, message: 'Spare part deleted successfully' });
  } catch (error) {
    console.error('Delete part error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete spare part' });
  }
});

// ==================== MAINTENANCE SCHEDULES ====================

// GET /api/fleet/maintenance/schedules - List all schedules
router.get('/schedules', [
  queryValidator('page').optional().isInt({ min: 1 }),
  queryValidator('perPage').optional().isInt({ min: 1, max: 100 }),
  queryValidator('vehicleId').optional().isUUID(),
  queryValidator('status').optional().isIn(['active', 'paused', 'completed', 'cancelled']),
  queryValidator('upcoming').optional().isBoolean(),
  queryValidator('overdue').optional().isBoolean(),
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
  }

  try {
    const companyId = req.user!.companyId;
    const page = parseInt(req.query.page as string) || 1;
    const perPage = parseInt(req.query.perPage as string) || 20;
    const vehicleId = req.query.vehicleId as string;
    const status = req.query.status as ScheduleStatus;
    const upcoming = req.query.upcoming === 'true';
    const overdue = req.query.overdue === 'true';

    const { schedules, total } = await MaintenanceScheduleModel.findByCompany(companyId, {
      vehicleId,
      status,
      upcoming,
      overdue,
      limit: perPage,
      offset: (page - 1) * perPage,
    });

    res.json({
      success: true,
      data: {
        items: schedules,
        total,
        page,
        perPage,
        totalPages: Math.ceil(total / perPage),
      }
    });
  } catch (error) {
    console.error('List schedules error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch maintenance schedules' });
  }
});

// GET /api/fleet/maintenance/schedules/stats - Get schedule statistics
router.get('/schedules/stats', async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const stats = await MaintenanceScheduleModel.getStats(companyId);
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Schedule stats error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch schedule statistics' });
  }
});

// GET /api/fleet/maintenance/schedules/:id - Get schedule by ID
router.get('/schedules/:id', [
  param('id').isUUID().withMessage('Valid schedule ID required'),
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
  }

  try {
    const companyId = req.user!.companyId;
    const schedule = await MaintenanceScheduleModel.findById(req.params.id, companyId);

    if (!schedule) {
      return res.status(404).json({ success: false, error: 'Maintenance schedule not found' });
    }

    res.json({ success: true, data: schedule });
  } catch (error) {
    console.error('Get schedule error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch maintenance schedule' });
  }
});

// POST /api/fleet/maintenance/schedules - Create new schedule
router.post('/schedules', [
  requireRole('admin', 'manager'),
  body('vehicleId').isUUID().withMessage('Valid vehicle ID required'),
  body('scheduleType').isIn(['mileage_based', 'time_based', 'both']).withMessage('Valid schedule type required'),
  body('serviceType').trim().notEmpty().withMessage('Service type required'),
  body('title').trim().notEmpty().withMessage('Title required'),
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
  }

  try {
    const companyId = req.user!.companyId;
    const schedule = await MaintenanceScheduleModel.create(companyId, {
      vehicleId: req.body.vehicleId,
      scheduleType: req.body.scheduleType,
      serviceType: req.body.serviceType,
      title: req.body.title,
      description: req.body.description,
      intervalMileage: req.body.intervalMileage,
      lastServiceMileage: req.body.lastServiceMileage,
      intervalMonths: req.body.intervalMonths,
      lastServiceDate: req.body.lastServiceDate ? new Date(req.body.lastServiceDate) : undefined,
      estimatedCost: req.body.estimatedCost,
      estimatedDurationHours: req.body.estimatedDurationHours,
      assignedProviderId: req.body.assignedProviderId,
      reminderDaysBefore: req.body.reminderDaysBefore,
      reminderMileageBefore: req.body.reminderMileageBefore,
      priority: req.body.priority,
    });

    res.status(201).json({ success: true, data: schedule, message: 'Maintenance schedule created successfully' });
  } catch (error) {
    console.error('Create schedule error:', error);
    res.status(500).json({ success: false, error: 'Failed to create maintenance schedule' });
  }
});

// PUT /api/fleet/maintenance/schedules/:id - Update schedule
router.put('/schedules/:id', [
  requireRole('admin', 'manager'),
  param('id').isUUID().withMessage('Valid schedule ID required'),
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
  }

  try {
    const companyId = req.user!.companyId;
    const schedule = await MaintenanceScheduleModel.update(req.params.id, companyId, {
      scheduleType: req.body.scheduleType,
      serviceType: req.body.serviceType,
      title: req.body.title,
      description: req.body.description,
      intervalMileage: req.body.intervalMileage,
      lastServiceMileage: req.body.lastServiceMileage,
      intervalMonths: req.body.intervalMonths,
      lastServiceDate: req.body.lastServiceDate ? new Date(req.body.lastServiceDate) : undefined,
      estimatedCost: req.body.estimatedCost,
      estimatedDurationHours: req.body.estimatedDurationHours,
      assignedProviderId: req.body.assignedProviderId,
      reminderDaysBefore: req.body.reminderDaysBefore,
      reminderMileageBefore: req.body.reminderMileageBefore,
      priority: req.body.priority,
      status: req.body.status,
    });

    if (!schedule) {
      return res.status(404).json({ success: false, error: 'Maintenance schedule not found' });
    }

    res.json({ success: true, data: schedule });
  } catch (error) {
    console.error('Update schedule error:', error);
    res.status(500).json({ success: false, error: 'Failed to update maintenance schedule' });
  }
});

// DELETE /api/fleet/maintenance/schedules/:id - Delete schedule
router.delete('/schedules/:id', [
  requireRole('admin', 'manager'),
  param('id').isUUID().withMessage('Valid schedule ID required'),
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
  }

  try {
    const companyId = req.user!.companyId;
    const deleted = await MaintenanceScheduleModel.delete(req.params.id, companyId);

    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Maintenance schedule not found' });
    }

    res.json({ success: true, message: 'Maintenance schedule deleted successfully' });
  } catch (error) {
    console.error('Delete schedule error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete maintenance schedule' });
  }
});

// ==================== MAINTENANCE RECORDS ====================

// GET /api/fleet/maintenance/records - List all records
router.get('/records', [
  queryValidator('page').optional().isInt({ min: 1 }),
  queryValidator('perPage').optional().isInt({ min: 1, max: 100 }),
  queryValidator('vehicleId').optional().isUUID(),
  queryValidator('status').optional().isIn(['scheduled', 'in_progress', 'completed', 'cancelled']),
  queryValidator('serviceType').optional().isIn(['preventive', 'repair', 'breakdown', 'emergency']),
  queryValidator('category').optional().trim(),
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
  }

  try {
    const companyId = req.user!.companyId;
    const page = parseInt(req.query.page as string) || 1;
    const perPage = parseInt(req.query.perPage as string) || 20;
    const vehicleId = req.query.vehicleId as string;
    const status = req.query.status as MaintenanceStatus;
    const serviceType = req.query.serviceType as ServiceType;
    const category = req.query.category as string;

    const { records, total } = await MaintenanceRecordModel.findByCompany(companyId, {
      vehicleId,
      status,
      serviceType,
      category,
      limit: perPage,
      offset: (page - 1) * perPage,
    });

    res.json({
      success: true,
      data: {
        items: records,
        total,
        page,
        perPage,
        totalPages: Math.ceil(total / perPage),
      }
    });
  } catch (error) {
    console.error('List records error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch maintenance records' });
  }
});

// GET /api/fleet/maintenance/records/stats - Get record statistics
router.get('/records/stats', [
  queryValidator('dateFrom').optional().isISO8601(),
  queryValidator('dateTo').optional().isISO8601(),
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
  }

  try {
    const companyId = req.user!.companyId;
    const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined;
    const dateTo = req.query.dateTo ? new Date(req.query.dateTo as string) : undefined;

    const stats = await MaintenanceRecordModel.getStats(companyId, dateFrom, dateTo);
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Record stats error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch record statistics' });
  }
});

// GET /api/fleet/maintenance/records/:id - Get record by ID
router.get('/records/:id', [
  param('id').isUUID().withMessage('Valid record ID required'),
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
  }

  try {
    const companyId = req.user!.companyId;
    const record = await MaintenanceRecordModel.findById(req.params.id, companyId);

    if (!record) {
      return res.status(404).json({ success: false, error: 'Maintenance record not found' });
    }

    res.json({ success: true, data: record });
  } catch (error) {
    console.error('Get record error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch maintenance record' });
  }
});

// POST /api/fleet/maintenance/records - Create new record
router.post('/records', [
  requireRole('admin', 'manager'),
  body('vehicleId').isUUID().withMessage('Valid vehicle ID required'),
  body('serviceType').isIn(['preventive', 'repair', 'breakdown', 'emergency']).withMessage('Valid service type required'),
  body('category').trim().notEmpty().withMessage('Category required'),
  body('title').trim().notEmpty().withMessage('Title required'),
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
  }

  try {
    const companyId = req.user!.companyId;
    const record = await MaintenanceRecordModel.create(companyId, {
      vehicleId: req.body.vehicleId,
      scheduleId: req.body.scheduleId,
      serviceType: req.body.serviceType,
      category: req.body.category,
      title: req.body.title,
      description: req.body.description,
      providerId: req.body.providerId,
      providerName: req.body.providerName,
      scheduledDate: req.body.scheduledDate ? new Date(req.body.scheduledDate) : undefined,
      startedDate: req.body.startedDate ? new Date(req.body.startedDate) : undefined,
      completedDate: req.body.completedDate ? new Date(req.body.completedDate) : undefined,
      serviceMileage: req.body.serviceMileage,
      nextServiceMileage: req.body.nextServiceMileage,
      laborCost: req.body.laborCost,
      partsCost: req.body.partsCost,
      otherCost: req.body.otherCost,
      status: req.body.status,
      breakdownLocation: req.body.breakdownLocation,
      breakdownCause: req.body.breakdownCause,
      isEmergency: req.body.isEmergency,
      technicianName: req.body.technicianName,
      driverId: req.body.driverId,
      warrantyMonths: req.body.warrantyMonths,
      invoiceNumber: req.body.invoiceNumber,
      documents: req.body.documents,
      notes: req.body.notes,
      parts: req.body.parts,
    });

    res.status(201).json({ success: true, data: record, message: 'Maintenance record created successfully' });
  } catch (error) {
    console.error('Create record error:', error);
    res.status(500).json({ success: false, error: 'Failed to create maintenance record' });
  }
});

// PUT /api/fleet/maintenance/records/:id - Update record
router.put('/records/:id', [
  requireRole('admin', 'manager'),
  param('id').isUUID().withMessage('Valid record ID required'),
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
  }

  try {
    const companyId = req.user!.companyId;
    const record = await MaintenanceRecordModel.update(req.params.id, companyId, {
      serviceType: req.body.serviceType,
      category: req.body.category,
      title: req.body.title,
      description: req.body.description,
      providerId: req.body.providerId,
      providerName: req.body.providerName,
      scheduledDate: req.body.scheduledDate ? new Date(req.body.scheduledDate) : undefined,
      startedDate: req.body.startedDate ? new Date(req.body.startedDate) : undefined,
      completedDate: req.body.completedDate ? new Date(req.body.completedDate) : undefined,
      serviceMileage: req.body.serviceMileage,
      nextServiceMileage: req.body.nextServiceMileage,
      laborCost: req.body.laborCost,
      partsCost: req.body.partsCost,
      otherCost: req.body.otherCost,
      status: req.body.status,
      breakdownLocation: req.body.breakdownLocation,
      breakdownCause: req.body.breakdownCause,
      isEmergency: req.body.isEmergency,
      technicianName: req.body.technicianName,
      driverId: req.body.driverId,
      warrantyMonths: req.body.warrantyMonths,
      invoiceNumber: req.body.invoiceNumber,
      documents: req.body.documents,
      notes: req.body.notes,
    });

    if (!record) {
      return res.status(404).json({ success: false, error: 'Maintenance record not found' });
    }

    res.json({ success: true, data: record });
  } catch (error) {
    console.error('Update record error:', error);
    res.status(500).json({ success: false, error: 'Failed to update maintenance record' });
  }
});

// DELETE /api/fleet/maintenance/records/:id - Delete record
router.delete('/records/:id', [
  requireRole('admin'),
  param('id').isUUID().withMessage('Valid record ID required'),
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
  }

  try {
    const companyId = req.user!.companyId;
    const deleted = await MaintenanceRecordModel.delete(req.params.id, companyId);

    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Maintenance record not found' });
    }

    res.json({ success: true, message: 'Maintenance record deleted successfully' });
  } catch (error) {
    console.error('Delete record error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete maintenance record' });
  }
});

// ==================== VEHICLE DOWNTIME ====================

// GET /api/fleet/maintenance/downtime - List all downtime records
router.get('/downtime', [
  queryValidator('page').optional().isInt({ min: 1 }),
  queryValidator('perPage').optional().isInt({ min: 1, max: 100 }),
  queryValidator('vehicleId').optional().isUUID(),
  queryValidator('active').optional().isBoolean(),
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
  }

  try {
    const companyId = req.user!.companyId;
    const page = parseInt(req.query.page as string) || 1;
    const perPage = parseInt(req.query.perPage as string) || 20;
    const vehicleId = req.query.vehicleId as string;
    const active = req.query.active === 'true';

    const { downtimes, total } = await VehicleDowntimeModel.findByCompany(companyId, {
      vehicleId,
      active,
      limit: perPage,
      offset: (page - 1) * perPage,
    });

    res.json({
      success: true,
      data: {
        items: downtimes,
        total,
        page,
        perPage,
        totalPages: Math.ceil(total / perPage),
      }
    });
  } catch (error) {
    console.error('List downtime error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch downtime records' });
  }
});

// GET /api/fleet/maintenance/downtime/stats - Get downtime statistics
router.get('/downtime/stats', async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const stats = await VehicleDowntimeModel.getStats(companyId);
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Downtime stats error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch downtime statistics' });
  }
});

// POST /api/fleet/maintenance/downtime - Create new downtime record
router.post('/downtime', [
  requireRole('admin', 'manager'),
  body('vehicleId').isUUID().withMessage('Valid vehicle ID required'),
  body('downtimeType').isIn(['maintenance', 'repair', 'accident', 'other']).withMessage('Valid downtime type required'),
  body('startDate').isISO8601().withMessage('Valid start date required'),
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
  }

  try {
    const companyId = req.user!.companyId;
    const downtime = await VehicleDowntimeModel.create(companyId, {
      vehicleId: req.body.vehicleId,
      recordId: req.body.recordId,
      downtimeType: req.body.downtimeType,
      startDate: new Date(req.body.startDate),
      endDate: req.body.endDate ? new Date(req.body.endDate) : undefined,
      startTime: req.body.startTime,
      endTime: req.body.endTime,
      durationHours: req.body.durationHours,
      reason: req.body.reason,
      impact: req.body.impact,
      replacementVehicleId: req.body.replacementVehicleId,
      notes: req.body.notes,
    });

    res.status(201).json({ success: true, data: downtime, message: 'Downtime record created successfully' });
  } catch (error) {
    console.error('Create downtime error:', error);
    res.status(500).json({ success: false, error: 'Failed to create downtime record' });
  }
});

// POST /api/fleet/maintenance/downtime/:id/end - End downtime
router.post('/downtime/:id/end', [
  requireRole('admin', 'manager'),
  param('id').isUUID().withMessage('Valid downtime ID required'),
  body('endDate').isISO8601().withMessage('Valid end date required'),
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
  }

  try {
    const companyId = req.user!.companyId;
    const downtime = await VehicleDowntimeModel.endDowntime(
      req.params.id,
      companyId,
      new Date(req.body.endDate),
      req.body.endTime,
      req.body.durationHours
    );

    if (!downtime) {
      return res.status(404).json({ success: false, error: 'Downtime record not found' });
    }

    res.json({ success: true, data: downtime, message: 'Downtime ended successfully' });
  } catch (error) {
    console.error('End downtime error:', error);
    res.status(500).json({ success: false, error: 'Failed to end downtime' });
  }
});

// ==================== MAINTENANCE REMINDERS ====================

// GET /api/fleet/maintenance/reminders - List all reminders
router.get('/reminders', [
  queryValidator('page').optional().isInt({ min: 1 }),
  queryValidator('perPage').optional().isInt({ min: 1, max: 100 }),
  queryValidator('status').optional().isIn(['pending', 'sent', 'acknowledged', 'dismissed']),
  queryValidator('severity').optional().isIn(['info', 'warning', 'critical']),
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
    const status = req.query.status as any;
    const severity = req.query.severity as any;
    const vehicleId = req.query.vehicleId as string;

    const { reminders, total } = await MaintenanceReminderModel.findByCompany(companyId, {
      status,
      severity,
      vehicleId,
      limit: perPage,
      offset: (page - 1) * perPage,
    });

    res.json({
      success: true,
      data: {
        items: reminders,
        total,
        page,
        perPage,
        totalPages: Math.ceil(total / perPage),
      }
    });
  } catch (error) {
    console.error('List reminders error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch reminders' });
  }
});

// GET /api/fleet/maintenance/reminders/stats - Get reminder statistics
router.get('/reminders/stats', async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const stats = await MaintenanceReminderModel.getStats(companyId);
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Reminder stats error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch reminder statistics' });
  }
});

// POST /api/fleet/maintenance/reminders/generate - Generate reminders from schedules
router.post('/reminders/generate', [
  requireRole('admin', 'manager'),
], async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const generated = await MaintenanceReminderModel.generateFromSchedules(companyId);
    res.json({ success: true, data: { generated }, message: `${generated} reminders generated` });
  } catch (error) {
    console.error('Generate reminders error:', error);
    res.status(500).json({ success: false, error: 'Failed to generate reminders' });
  }
});

// POST /api/fleet/maintenance/reminders/:id/acknowledge - Acknowledge reminder
router.post('/reminders/:id/acknowledge', [
  param('id').isUUID().withMessage('Valid reminder ID required'),
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
  }

  try {
    const companyId = req.user!.companyId;
    const userId = req.user!.userId;
    const reminder = await MaintenanceReminderModel.acknowledge(req.params.id, companyId, userId);

    if (!reminder) {
      return res.status(404).json({ success: false, error: 'Reminder not found' });
    }

    res.json({ success: true, data: reminder, message: 'Reminder acknowledged' });
  } catch (error) {
    console.error('Acknowledge reminder error:', error);
    res.status(500).json({ success: false, error: 'Failed to acknowledge reminder' });
  }
});

// POST /api/fleet/maintenance/reminders/:id/dismiss - Dismiss reminder
router.post('/reminders/:id/dismiss', [
  param('id').isUUID().withMessage('Valid reminder ID required'),
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
  }

  try {
    const companyId = req.user!.companyId;
    const reminder = await MaintenanceReminderModel.dismiss(req.params.id, companyId);

    if (!reminder) {
      return res.status(404).json({ success: false, error: 'Reminder not found' });
    }

    res.json({ success: true, data: reminder, message: 'Reminder dismissed' });
  } catch (error) {
    console.error('Dismiss reminder error:', error);
    res.status(500).json({ success: false, error: 'Failed to dismiss reminder' });
  }
});

// ==================== OVERVIEW / DASHBOARD ====================

// GET /api/fleet/maintenance/overview - Get maintenance overview
router.get('/overview', async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;

    // Get vehicles with maintenance status first
    const vehiclesResult = await query(
      'SELECT id, registration_number, make, model, year, status FROM vehicles WHERE company_id = $1 AND status = $2',
      [companyId, 'maintenance']
    );

    // Fetch all stats in parallel
    const [
      scheduleStats,
      recordStats,
      reminderStats,
      downtimeStats,
      lowStockParts,
      overdueSchedules,
      activeDowntime,
      activeRepairs,
    ] = await Promise.all([
      MaintenanceScheduleModel.getStats(companyId),
      MaintenanceRecordModel.getStats(companyId),
      MaintenanceReminderModel.getStats(companyId),
      VehicleDowntimeModel.getStats(companyId),
      SparePartModel.findByCompany(companyId, { lowStockOnly: true, limit: 5 }),
      MaintenanceScheduleModel.findByCompany(companyId, { overdue: true, limit: 5 }),
      VehicleDowntimeModel.findByCompany(companyId, { active: true, limit: 5 }),
      // Get active repairs (in_progress status)
      MaintenanceRecordModel.findByCompany(companyId, { status: 'in_progress', limit: 10 }),
    ]);

    res.json({
      success: true,
      data: {
        schedules: scheduleStats,
        records: recordStats,
        reminders: reminderStats,
        downtime: downtimeStats,
        lowStockParts: lowStockParts.parts,
        overdueSchedules: overdueSchedules.schedules,
        activeDowntime: activeDowntime.downtimes,
        activeRepairs: activeRepairs.records,
        vehiclesUnderMaintenance: vehiclesResult
      }
    });
  } catch (error) {
    console.error('Maintenance overview error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch maintenance overview' });
  }
});

export default router;
