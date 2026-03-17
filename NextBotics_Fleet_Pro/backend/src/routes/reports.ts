import { Router, Request, Response } from 'express';
import { query } from '../database';
import { authMiddleware, requireRole } from '../utils/auth';

const router = Router();

router.use(authMiddleware);

// ============================================
// REPORT GENERATION ENDPOINTS
// ============================================

// GET /api/fleet/reports/audits - Audit report data
router.get('/audits', async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const { sessionId, format = 'json' } = req.query;

    if (!sessionId) {
      return res.status(400).json({ success: false, error: 'Session ID is required' });
    }

    const reportData = await generateAuditReport(companyId, sessionId as string);
    
    if (format === 'json') {
      res.json({ success: true, data: reportData });
    } else {
      // For PDF/Excel generation, return structured data that frontend can use
      res.json({ 
        success: true, 
        data: reportData,
        export: { format, filename: `audit-report-${sessionId}.pdf` }
      });
    }
  } catch (error) {
    console.error('Error generating audit report:', error);
    res.status(500).json({ success: false, error: 'Failed to generate report' });
  }
});

// GET /api/fleet/reports/compliance - Compliance dashboard data
router.get('/compliance', async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const { dateFrom, dateTo } = req.query;

    const fromDate = dateFrom ? new Date(dateFrom as string) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const toDate = dateTo ? new Date(dateTo as string) : new Date();

    const [auditTrend, categoryScores, riskHeatmap] = await Promise.all([
      // Audit trend over time
      query(
        `SELECT 
          DATE_TRUNC('month', completed_at) as month,
          AVG(score_percentage) as avg_score,
          COUNT(*) as count
         FROM audit_sessions
         WHERE company_id = $1 AND status = 'completed' 
           AND completed_at >= $2 AND completed_at <= $3
         GROUP BY DATE_TRUNC('month', completed_at)
         ORDER BY month`,
        [companyId, fromDate, toDate]
      ),
      // Category performance
      query(
        `SELECT 
          category,
          AVG(score_percentage) as avg_score,
          COUNT(DISTINCT session_id) as audit_count
         FROM audit_category_scores
         WHERE company_id = $1
         GROUP BY category`,
        [companyId]
      ),
      // Risk heatmap data
      query(
        `SELECT 
          category,
          risk_level,
          COUNT(*) as count
         FROM risk_register
         WHERE company_id = $1
         GROUP BY category, risk_level`,
        [companyId]
      ),
    ]);

    res.json({
      success: true,
      data: {
        auditTrend: auditTrend.map((r: any) => ({
          month: r.month,
          averageScore: parseFloat(r.avg_score),
          count: parseInt(r.count),
        })),
        categoryScores: categoryScores.map((r: any) => ({
          category: r.category,
          averageScore: parseFloat(r.avg_score),
          auditCount: parseInt(r.audit_count),
        })),
        riskHeatmap: riskHeatmap.map((r: any) => ({
          category: r.category,
          riskLevel: r.risk_level,
          count: parseInt(r.count),
        })),
        period: { from: fromDate, to: toDate },
      },
    });
  } catch (error) {
    console.error('Error generating compliance report:', error);
    res.status(500).json({ success: false, error: 'Failed to generate report' });
  }
});

// GET /api/fleet/reports/requisitions - Requisition log report
router.get('/requisitions', async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const { dateFrom, dateTo, status } = req.query;

    const fromDate = dateFrom ? new Date(dateFrom as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const toDate = dateTo ? new Date(dateTo as string) : new Date();

    let sql = `
      SELECT 
        r.*,
        u.first_name as requester_fname, u.last_name as requester_lname,
        v.registration_number,
        d.first_name as driver_fname, d.last_name as driver_lname
      FROM vehicle_requisitions r
      LEFT JOIN users u ON r.requested_by = u.id
      LEFT JOIN vehicles v ON r.allocated_vehicle_id = v.id
      LEFT JOIN drivers d ON r.allocated_driver_id = d.id
      WHERE r.company_id = $1 AND r.created_at >= $2 AND r.created_at <= $3
    `;
    const params: any[] = [companyId, fromDate, toDate];

    if (status) {
      sql += ` AND r.status = $${params.length + 1}`;
      params.push(status);
    }

    sql += ' ORDER BY r.created_at DESC';

    const rows = await query(sql, params);

    const summary = {
      total: rows.length,
      byStatus: {} as Record<string, number>,
      averageCompletionTime: 0,
    };

    let totalCompletionTime = 0;
    let completedCount = 0;

    for (const row of rows) {
      if (!summary.byStatus[row.status]) summary.byStatus[row.status] = 0;
      summary.byStatus[row.status]++;

      if (row.status === 'completed' && row.actual_end_time && row.actual_start_time) {
        const duration = new Date(row.actual_end_time).getTime() - new Date(row.actual_start_time).getTime();
        totalCompletionTime += duration;
        completedCount++;
      }
    }

    if (completedCount > 0) {
      summary.averageCompletionTime = Math.round(totalCompletionTime / completedCount / (1000 * 60 * 60)); // hours
    }

    res.json({
      success: true,
      data: {
        requisitions: rows.map((r: any) => ({
          id: r.id,
          requestNumber: r.request_number,
          requesterName: r.requester_name,
          purpose: r.purpose,
          destination: r.destination,
          status: r.status,
          priority: r.priority,
          startDate: r.start_date,
          endDate: r.end_date,
          allocatedVehicle: r.registration_number,
          allocatedDriver: r.driver_fname ? `${r.driver_fname} ${r.driver_lname}` : null,
          createdAt: r.created_at,
        })),
        summary,
        period: { from: fromDate, to: toDate },
      },
    });
  } catch (error) {
    console.error('Error generating requisition report:', error);
    res.status(500).json({ success: false, error: 'Failed to generate report' });
  }
});

// GET /api/fleet/reports/trips - Trip summary report
router.get('/trips', async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const { dateFrom, dateTo, vehicleId } = req.query;

    const fromDate = dateFrom ? new Date(dateFrom as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const toDate = dateTo ? new Date(dateTo as string) : new Date();

    let sql = `
      SELECT 
        t.*,
        v.registration_number, v.make, v.model,
        d.first_name as driver_fname, d.last_name as driver_lname
      FROM trips t
      LEFT JOIN vehicles v ON t.vehicle_id = v.id
      LEFT JOIN drivers d ON t.driver_id = d.id
      WHERE t.company_id = $1 AND t.start_time >= $2 AND t.start_time <= $3
    `;
    const params: any[] = [companyId, fromDate, toDate];

    if (vehicleId) {
      sql += ` AND t.vehicle_id = $${params.length + 1}`;
      params.push(vehicleId);
    }

    sql += ' ORDER BY t.start_time DESC';

    const rows = await query(sql, params);

    const summary = {
      totalTrips: rows.length,
      totalDistance: 0,
      totalFuel: 0,
      averageDistance: 0,
    };

    for (const row of rows) {
      summary.totalDistance += parseFloat(row.distance_km || 0);
      summary.totalFuel += parseFloat(row.fuel_consumed || 0);
    }

    summary.averageDistance = rows.length > 0 ? summary.totalDistance / rows.length : 0;

    res.json({
      success: true,
      data: {
        trips: rows.map((r: any) => ({
          id: r.id,
          registrationNumber: r.registration_number,
          make: r.make,
          model: r.model,
          driver: r.driver_fname ? `${r.driver_fname} ${r.driver_lname}` : null,
          startTime: r.start_time,
          endTime: r.end_time,
          distance: parseFloat(r.distance_km || 0),
          fuelConsumed: parseFloat(r.fuel_consumed || 0),
          purpose: r.purpose,
          status: r.status,
        })),
        summary,
        period: { from: fromDate, to: toDate },
      },
    });
  } catch (error) {
    console.error('Error generating trip report:', error);
    res.status(500).json({ success: false, error: 'Failed to generate report' });
  }
});

// GET /api/fleet/reports/invoices - Invoice report
router.get('/invoices', async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const { dateFrom, dateTo, invoiceType } = req.query;

    const fromDate = dateFrom ? new Date(dateFrom as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const toDate = dateTo ? new Date(dateTo as string) : new Date();

    let sql = `
      SELECT 
        i.*,
        c.name as category_name
      FROM invoices i
      LEFT JOIN invoice_categories c ON i.category_id = c.id
      WHERE i.company_id = $1 AND i.invoice_date >= $2 AND i.invoice_date <= $3
    `;
    const params: any[] = [companyId, fromDate, toDate];

    if (invoiceType) {
      sql += ` AND i.invoice_type = $${params.length + 1}`;
      params.push(invoiceType);
    }

    sql += ' ORDER BY i.invoice_date DESC';

    const rows = await query(sql, params);

    const summary = {
      totalCount: rows.length,
      totalAmount: 0,
      paidAmount: 0,
      pendingAmount: 0,
      overdueAmount: 0,
      byType: {} as Record<string, { count: number; amount: number }>,
    };

    for (const row of rows) {
      const amount = parseFloat(row.total_amount);
      summary.totalAmount += amount;

      if (row.status === 'paid') summary.paidAmount += amount;
      else if (row.status === 'overdue') summary.overdueAmount += amount;
      else summary.pendingAmount += amount;

      if (!summary.byType[row.invoice_type]) {
        summary.byType[row.invoice_type] = { count: 0, amount: 0 };
      }
      summary.byType[row.invoice_type].count++;
      summary.byType[row.invoice_type].amount += amount;
    }

    res.json({
      success: true,
      data: {
        invoices: rows.map((r: any) => ({
          id: r.id,
          invoiceNumber: r.invoice_number,
          invoiceType: r.invoice_type,
          vendorName: r.vendor_name,
          invoiceDate: r.invoice_date,
          dueDate: r.due_date,
          totalAmount: parseFloat(r.total_amount),
          status: r.status,
          category: r.category_name,
        })),
        summary,
        period: { from: fromDate, to: toDate },
      },
    });
  } catch (error) {
    console.error('Error generating invoice report:', error);
    res.status(500).json({ success: false, error: 'Failed to generate report' });
  }
});

// GET /api/fleet/reports/stock - Stock report
router.get('/stock', async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const { categoryId, lowStockOnly } = req.query;

    let sql = `
      SELECT 
        i.*,
        c.name as category_name
      FROM inventory_items i
      LEFT JOIN inventory_categories c ON i.category_id = c.id
      WHERE i.company_id = $1 AND i.is_active = true
    `;
    const params: any[] = [companyId];

    if (categoryId) {
      sql += ` AND i.category_id = $${params.length + 1}`;
      params.push(categoryId);
    }

    if (lowStockOnly === 'true') {
      sql += ` AND i.current_stock <= i.reorder_level`;
    }

    sql += ' ORDER BY i.name ASC';

    const rows = await query(sql, params);

    const summary = {
      totalItems: rows.length,
      totalValue: 0,
      lowStockItems: 0,
      byCategory: {} as Record<string, { count: number; value: number }>,
    };

    for (const row of rows) {
      const itemValue = parseFloat(row.unit_price || 0) * row.current_stock;
      summary.totalValue += itemValue;

      if (row.current_stock <= row.reorder_level) {
        summary.lowStockItems++;
      }

      const categoryName = row.category_name || 'Uncategorized';
      if (!summary.byCategory[categoryName]) {
        summary.byCategory[categoryName] = { count: 0, value: 0 };
      }
      summary.byCategory[categoryName].count++;
      summary.byCategory[categoryName].value += itemValue;
    }

    res.json({
      success: true,
      data: {
        items: rows.map((r: any) => ({
          id: r.id,
          sku: r.sku,
          name: r.name,
          category: r.category_name,
          currentStock: r.current_stock,
          reorderLevel: r.reorder_level,
          unitPrice: parseFloat(r.unit_price || 0),
          stockValue: parseFloat(r.unit_price || 0) * r.current_stock,
          isLowStock: r.current_stock <= r.reorder_level,
          location: r.location,
        })),
        summary,
      },
    });
  } catch (error) {
    console.error('Error generating stock report:', error);
    res.status(500).json({ success: false, error: 'Failed to generate report' });
  }
});

// ============================================
// HELPER FUNCTIONS
// ============================================

async function generateAuditReport(companyId: string, sessionId: string): Promise<any> {
  const [session, responses, categoryScores] = await Promise.all([
    query(
      `SELECT s.*, t.name as template_name, t.category,
        v.registration_number, d.first_name as driver_fname, d.last_name as driver_lname,
        u.first_name as auditor_fname, u.last_name as auditor_lname
       FROM audit_sessions s
       LEFT JOIN audit_templates t ON s.template_id = t.id
       LEFT JOIN vehicles v ON s.vehicle_id = v.id
       LEFT JOIN drivers d ON s.driver_id = d.id
       LEFT JOIN users u ON s.auditor_id = u.id
       WHERE s.id = $1 AND s.company_id = $2`,
      [sessionId, companyId]
    ),
    query(
      `SELECT r.*, q.question_text, q.description, q.category, q.question_number
       FROM audit_responses r
       JOIN audit_questions q ON r.question_id = q.id
       WHERE r.session_id = $1 AND r.company_id = $2
       ORDER BY q.question_number`,
      [sessionId, companyId]
    ),
    query(
      `SELECT * FROM audit_category_scores WHERE session_id = $1 AND company_id = $2`,
      [sessionId, companyId]
    ),
  ]);

  if (session.length === 0) {
    throw new Error('Audit session not found');
  }

  return {
    session: {
      id: session[0].id,
      templateName: session[0].template_name,
      category: session[0].category,
      auditReference: session[0].audit_reference,
      vehicle: session[0].registration_number,
      driver: session[0].driver_fname ? `${session[0].driver_fname} ${session[0].driver_lname}` : null,
      auditor: `${session[0].auditor_fname} ${session[0].auditor_lname}`,
      startedAt: session[0].started_at,
      completedAt: session[0].completed_at,
      totalScore: session[0].total_score,
      maxPossibleScore: session[0].max_possible_score,
      scorePercentage: session[0].score_percentage,
      maturityRating: session[0].maturity_rating,
      notes: session[0].notes,
    },
    responses: responses.map((r: any) => ({
      questionNumber: r.question_number,
      questionText: r.question_text,
      description: r.description,
      category: r.category,
      score: r.score,
      notes: r.notes,
      evidencePhotos: r.evidence_photos,
    })),
    categoryScores: categoryScores.map((c: any) => ({
      category: c.category,
      totalScore: c.total_score,
      maxPossibleScore: c.max_possible_score,
      scorePercentage: c.score_percentage,
    })),
  };
}

export default router;
