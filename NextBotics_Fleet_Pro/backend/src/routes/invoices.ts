import { Router, Request, Response } from 'express';
import { InvoiceCategoryModel, InvoiceModel } from '../models/Invoice';
import { authMiddleware, requireRole } from '../utils/auth';

const router = Router();

router.use(authMiddleware);

// ============================================
// CATEGORIES
// ============================================

// GET /api/fleet/invoices/categories - List categories
router.get('/categories', async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const categories = await InvoiceCategoryModel.findByCompany(companyId);
    res.json({ success: true, data: categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch categories' });
  }
});

// POST /api/fleet/invoices/categories - Create category
router.post('/categories', requireRole(['admin', 'manager']), async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, error: 'Category name is required' });
    }

    const category = await InvoiceCategoryModel.create(companyId, name, description);
    res.status(201).json({ success: true, data: category });
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ success: false, error: 'Failed to create category' });
  }
});

// ============================================
// INVOICES
// ============================================

// GET /api/fleet/invoices - List invoices
router.get('/', async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const { status, invoiceType, vendorName, overdueOnly, dateFrom, dateTo, limit = '50', offset = '0' } = req.query;

    const result = await InvoiceModel.findByCompany(companyId, {
      status: status as string,
      invoiceType: invoiceType as string,
      vendorName: vendorName as string,
      overdueOnly: overdueOnly === 'true',
      dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo: dateTo ? new Date(dateTo as string) : undefined,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });

    res.json({
      success: true,
      data: result.invoices,
      pagination: { total: result.total, limit: parseInt(limit as string), offset: parseInt(offset as string) },
    });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch invoices' });
  }
});

// GET /api/fleet/invoices/stats - Get invoice statistics
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const stats = await InvoiceModel.getStats(companyId);
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error fetching invoice stats:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch statistics' });
  }
});

// GET /api/fleet/invoices/:id - Get single invoice
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const invoice = await InvoiceModel.findById(req.params.id, companyId);

    if (!invoice) {
      return res.status(404).json({ success: false, error: 'Invoice not found' });
    }

    res.json({ success: true, data: invoice });
  } catch (error) {
    console.error('Error fetching invoice:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch invoice' });
  }
});

// POST /api/fleet/invoices - Create invoice
router.post('/', requireRole(['admin', 'manager']), async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const userId = req.user!.userId;
    const { invoiceNumber, categoryId, invoiceType, vendorName, vendorTaxId, vendorAddress, vendorContact, invoiceDate, dueDate, subtotal, taxAmount, totalAmount, notes, items } = req.body;

    if (!invoiceNumber || !vendorName || !invoiceDate || !totalAmount || !items || !Array.isArray(items)) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const invoice = await InvoiceModel.create(companyId, userId, {
      invoiceNumber,
      categoryId,
      invoiceType,
      vendorName,
      vendorTaxId,
      vendorAddress,
      vendorContact,
      invoiceDate: new Date(invoiceDate),
      dueDate: dueDate ? new Date(dueDate) : undefined,
      subtotal,
      taxAmount: taxAmount || 0,
      totalAmount,
      notes,
    }, items);

    res.status(201).json({ success: true, data: invoice });
  } catch (error) {
    console.error('Error creating invoice:', error);
    res.status(500).json({ success: false, error: 'Failed to create invoice' });
  }
});

// POST /api/fleet/invoices/:id/validate - Validate invoice
router.post('/:id/validate', requireRole(['admin', 'manager']), async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const userId = req.user!.userId;

    const invoice = await InvoiceModel.validate(req.params.id, companyId, userId);

    if (!invoice) {
      return res.status(404).json({ success: false, error: 'Invoice not found or already validated' });
    }

    res.json({ success: true, data: invoice });
  } catch (error) {
    console.error('Error validating invoice:', error);
    res.status(500).json({ success: false, error: 'Failed to validate invoice' });
  }
});

// POST /api/fleet/invoices/:id/approve - Approve invoice
router.post('/:id/approve', requireRole(['admin', 'manager']), async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const userId = req.user!.userId;

    const invoice = await InvoiceModel.approve(req.params.id, companyId, userId);

    if (!invoice) {
      return res.status(404).json({ success: false, error: 'Invoice not found or not validated' });
    }

    res.json({ success: true, data: invoice });
  } catch (error) {
    console.error('Error approving invoice:', error);
    res.status(500).json({ success: false, error: 'Failed to approve invoice' });
  }
});

// POST /api/fleet/invoices/:id/pay - Mark invoice as paid
router.post('/:id/pay', requireRole(['admin', 'manager']), async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const userId = req.user!.userId;
    const { paymentMethod, paymentDate, paymentReference } = req.body;

    if (!paymentMethod || !paymentDate) {
      return res.status(400).json({ success: false, error: 'Payment method and date are required' });
    }

    const invoice = await InvoiceModel.markPaid(req.params.id, companyId, userId, {
      paymentMethod,
      paymentDate: new Date(paymentDate),
      paymentReference,
    });

    if (!invoice) {
      return res.status(404).json({ success: false, error: 'Invoice not found or not approved' });
    }

    res.json({ success: true, data: invoice });
  } catch (error) {
    console.error('Error marking invoice as paid:', error);
    res.status(500).json({ success: false, error: 'Failed to mark invoice as paid' });
  }
});

// POST /api/fleet/invoices/:id/cancel - Cancel invoice
router.post('/:id/cancel', requireRole(['admin', 'manager']), async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const userId = req.user!.userId;
    const { reason } = req.body;

    const invoice = await InvoiceModel.cancel(req.params.id, companyId, userId, reason);

    if (!invoice) {
      return res.status(404).json({ success: false, error: 'Invoice not found or already paid' });
    }

    res.json({ success: true, data: invoice });
  } catch (error) {
    console.error('Error cancelling invoice:', error);
    res.status(500).json({ success: false, error: 'Failed to cancel invoice' });
  }
});

export default router;
