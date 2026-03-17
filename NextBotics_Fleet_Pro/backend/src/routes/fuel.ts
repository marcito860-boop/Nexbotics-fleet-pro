import { Router, Request, Response } from 'express';
import { FuelCardModel, FuelTransactionModel, ExpenseModel } from '../models/Fuel';
import { authMiddleware, requireRole } from '../utils/auth';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// GET /api/fleet/fuel/stats - Frontend compatible endpoint (aggregates all fuel stats)
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const { dateFrom, dateTo } = req.query;

    const fromDate = dateFrom ? new Date(dateFrom as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const toDate = dateTo ? new Date(dateTo as string) : new Date();

    const stats = await FuelTransactionModel.getStats(companyId, fromDate, toDate);

    res.json({
      success: true,
      data: {
        totalCost: stats.totalCost || 0,
        totalLiters: stats.totalLiters || 0,
        transactionCount: stats.transactionCount || 0,
        averagePricePerLiter: stats.averagePricePerLiter || 0,
        byStation: (stats as any).byStation || [],
        period: { from: fromDate, to: toDate },
      }
    });
  } catch (error) {
    console.error('Error fetching fuel stats:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch fuel statistics' });
  }
});

// ============================================
// FUEL CARDS
// ============================================

// GET /api/fleet/fuel/cards - List fuel cards
router.get('/cards', async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const cards = await FuelCardModel.findByCompany(companyId);
    res.json({ success: true, data: cards });
  } catch (error) {
    console.error('Error fetching fuel cards:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch fuel cards' });
  }
});

// GET /api/fleet/fuel/cards/:id - Get single fuel card
router.get('/cards/:id', async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const card = await FuelCardModel.findById(req.params.id, companyId);

    if (!card) {
      return res.status(404).json({ success: false, error: 'Fuel card not found' });
    }

    res.json({ success: true, data: card });
  } catch (error) {
    console.error('Error fetching fuel card:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch fuel card' });
  }
});

// POST /api/fleet/fuel/cards - Create fuel card
router.post('/cards', requireRole(['admin', 'manager']), async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const { cardNumber, cardProvider, vehicleId, driverId, monthlyLimit, expiryDate } = req.body;

    if (!cardNumber) {
      return res.status(400).json({ success: false, error: 'Card number is required' });
    }

    const card = await FuelCardModel.create(companyId, {
      cardNumber,
      cardProvider,
      vehicleId,
      driverId,
      monthlyLimit,
      expiryDate: expiryDate ? new Date(expiryDate) : undefined,
    });

    res.status(201).json({ success: true, data: card });
  } catch (error) {
    console.error('Error creating fuel card:', error);
    res.status(500).json({ success: false, error: 'Failed to create fuel card' });
  }
});

// ============================================
// FUEL TRANSACTIONS
// ============================================

// GET /api/fleet/fuel/transactions - List fuel transactions
router.get('/transactions', async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const { vehicleId, dateFrom, dateTo, isAnomaly, limit = '50', offset = '0' } = req.query;

    const result = await FuelTransactionModel.findByCompany(companyId, {
      vehicleId: vehicleId as string,
      dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo: dateTo ? new Date(dateTo as string) : undefined,
      isAnomaly: isAnomaly !== undefined ? isAnomaly === 'true' : undefined,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });

    res.json({
      success: true,
      data: result.transactions,
      pagination: {
        total: result.total,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      },
    });
  } catch (error) {
    console.error('Error fetching fuel transactions:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch fuel transactions' });
  }
});

// GET /api/fleet/fuel/transactions/stats - Get fuel statistics
router.get('/transactions/stats', async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const { dateFrom, dateTo } = req.query;

    const stats = await FuelTransactionModel.getStats(
      companyId,
      dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo ? new Date(dateTo as string) : undefined
    );

    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error fetching fuel stats:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch fuel statistics' });
  }
});

// POST /api/fleet/fuel/transactions - Create fuel transaction
router.post('/transactions', requireRole(['admin', 'manager', 'staff']), async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const {
      vehicleId,
      driverId,
      fuelCardId,
      transactionDate,
      stationName,
      liters,
      pricePerLiter,
      totalCost,
      odometerReading,
      notes,
    } = req.body;

    if (!vehicleId || !liters || !totalCost) {
      return res.status(400).json({ 
        success: false, 
        error: 'Vehicle ID, liters, and total cost are required' 
      });
    }

    const transaction = await FuelTransactionModel.create(companyId, {
      vehicleId,
      driverId,
      fuelCardId,
      transactionDate: transactionDate ? new Date(transactionDate) : new Date(),
      stationName,
      liters,
      pricePerLiter,
      totalCost,
      odometerReading,
      notes,
    });

    res.status(201).json({ success: true, data: transaction });
  } catch (error) {
    console.error('Error creating fuel transaction:', error);
    res.status(500).json({ success: false, error: 'Failed to create fuel transaction' });
  }
});

// ============================================
// EXPENSES
// ============================================

// GET /api/fleet/fuel/expenses - List expenses
router.get('/expenses', async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const { status, vehicleId, expenseType, dateFrom, dateTo, limit = '50', offset = '0' } = req.query;

    const result = await ExpenseModel.findByCompany(companyId, {
      status: status as string,
      vehicleId: vehicleId as string,
      expenseType: expenseType as string,
      dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo: dateTo ? new Date(dateTo as string) : undefined,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });

    res.json({
      success: true,
      data: result.expenses,
      pagination: {
        total: result.total,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      },
    });
  } catch (error) {
    console.error('Error fetching expenses:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch expenses' });
  }
});

// GET /api/fleet/fuel/expenses/stats - Get expense statistics
router.get('/expenses/stats', async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const { dateFrom, dateTo } = req.query;

    const stats = await ExpenseModel.getStats(
      companyId,
      dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo ? new Date(dateTo as string) : undefined
    );

    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error fetching expense stats:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch expense statistics' });
  }
});

// POST /api/fleet/fuel/expenses - Create expense
router.post('/expenses', requireRole(['admin', 'manager', 'staff']), async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const userId = req.user!.userId;
    const {
      vehicleId,
      driverId,
      expenseType,
      amount,
      expenseDate,
      description,
      vendorName,
      isReimbursable,
    } = req.body;

    if (!expenseType || !amount) {
      return res.status(400).json({ 
        success: false, 
        error: 'Expense type and amount are required' 
      });
    }

    const expense = await ExpenseModel.create(companyId, userId, {
      vehicleId,
      driverId,
      expenseType,
      amount,
      expenseDate: expenseDate ? new Date(expenseDate) : new Date(),
      description,
      vendorName,
      isReimbursable,
    });

    res.status(201).json({ success: true, data: expense });
  } catch (error) {
    console.error('Error creating expense:', error);
    res.status(500).json({ success: false, error: 'Failed to create expense' });
  }
});

export default router;
