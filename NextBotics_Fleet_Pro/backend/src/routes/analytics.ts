import { Router, Request, Response } from 'express';
import { query } from '../database';
import { authMiddleware, requireRole } from '../utils/auth';
import { VehicleModel } from '../models/Vehicle';
import { DriverModel } from '../models/Driver';
import { AuditSessionModel } from '../models/Audit';
import { CorrectiveActionModel } from '../models/Audit';
import { RequisitionModel } from '../models/Requisition';
import { FuelTransactionModel } from '../models/Fuel';
import { InventoryTransactionModel } from '../models/Inventory';
import { InvoiceModel } from '../models/Invoice';

const router = Router();

router.use(authMiddleware);

// ============================================
// MANAGER ANALYTICS - Company Level
// ============================================

// GET /api/fleet/analytics/dashboard - Main dashboard data
router.get('/dashboard', async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const { period, dateFrom, dateTo } = req.query;

    // Support both 'period' param (frontend) and 'dateFrom/dateTo' (backend)
    let fromDate: Date;
    let toDate: Date;

    if (period) {
      // Convert period to dates
      const days = period === '7d' ? 7 : period === '90d' ? 90 : 30;
      fromDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      toDate = new Date();
    } else {
      fromDate = dateFrom ? new Date(dateFrom as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      toDate = dateTo ? new Date(dateTo as string) : new Date();
    }

    // Fetch all stats in parallel
    const [
      vehicleStats,
      driverStats,
      auditStats,
      actionStats,
      requisitionStats,
      fuelStats,
      inventoryStats,
      invoiceStats,
      fleetUtilization
    ] = await Promise.all([
      // Vehicle stats
      query(
        `SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'available' THEN 1 END) as available,
          COUNT(CASE WHEN status = 'assigned' THEN 1 END) as assigned,
          COUNT(CASE WHEN status = 'maintenance' THEN 1 END) as maintenance
         FROM vehicles WHERE company_id = $1`,
        [companyId]
      ),
      // Driver stats
      query(
        `SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN employment_status = 'active' THEN 1 END) as active
         FROM drivers WHERE company_id = $1`,
        [companyId]
      ),
      // Audit stats
      AuditSessionModel.getStats(companyId),
      // Corrective action stats
      CorrectiveActionModel.getStats(companyId),
      // Requisition stats
      RequisitionModel.getStats(companyId),
      // Fuel stats
      FuelTransactionModel.getStats(companyId, fromDate, toDate),
      // Inventory stats
      InventoryTransactionModel.getStats(companyId),
      // Invoice stats
      InvoiceModel.getStats(companyId),
      // Fleet utilization
      query(
        `SELECT 
          COUNT(*) as total_trips,
          COALESCE(SUM(distance_km), 0) as total_distance,
          COALESCE(AVG(distance_km), 0) as avg_distance
         FROM trips 
         WHERE company_id = $1 AND start_time >= $2 AND start_time <= $3`,
        [companyId, fromDate, toDate]
      )
    ]);

    const dashboard = {
      summary: {
        totalVehicles: parseInt(vehicleStats[0].total),
        totalDrivers: parseInt(driverStats[0].total),
        activeTrips: parseInt(fleetUtilization[0].total_trips),
        pendingRequisitions: requisitionStats.pending || 0,
        lowStockItems: inventoryStats.lowStockItems || 0,
        overdueInvoices: invoiceStats.overdueCount || 0,
      },
      vehicleStats: {
        total: parseInt(vehicleStats[0].total),
        available: parseInt(vehicleStats[0].available),
        assigned: parseInt(vehicleStats[0].assigned),
        maintenance: parseInt(vehicleStats[0].maintenance),
      },
      driverStats: {
        total: parseInt(driverStats[0].total),
        active: parseInt(driverStats[0].active),
        onLeave: 0, // Will be populated if we track this
      },
      auditStats: {
        totalAudits: auditStats.totalAudits || 0,
        completedAudits: auditStats.completedAudits || 0,
        averageScore: auditStats.averageScore || 0,
        byMaturityRating: auditStats.byMaturityRating || {},
      },
      fuelStats: {
        totalCost: fuelStats.totalCost || 0,
        totalLiters: fuelStats.totalLiters || 0,
        transactionCount: fuelStats.transactionCount || 0,
        averagePricePerLiter: fuelStats.averagePricePerLiter || 0,
      },
      inventoryStats: {
        totalItems: inventoryStats.totalTransactions || 0, // Use transactions as proxy
        totalValue: inventoryStats.totalValue || 0,
        lowStockCount: inventoryStats.lowStockItems || 0,
      },
      invoiceStats: {
        total: invoiceStats.total || 0,
        pendingAmount: (invoiceStats.totalAmount || 0) - (invoiceStats.paidAmount || 0) - (invoiceStats.overdueAmount || 0),
        paidAmount: invoiceStats.paidAmount || 0,
        overdueAmount: invoiceStats.overdueAmount || 0,
      },
      period: { from: fromDate, to: toDate },
    };

    res.json({ success: true, data: dashboard });
  } catch (error) {
    console.error('Error fetching dashboard:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch dashboard data' });
  }
});

// GET /api/fleet/analytics/fleet - Fleet analytics
router.get('/fleet', async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const { dateFrom, dateTo } = req.query;

    const fromDate = dateFrom ? new Date(dateFrom as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const toDate = dateTo ? new Date(dateTo as string) : new Date();

    // Vehicle utilization by type
    const utilizationByType = await query(
      `SELECT 
        v.type,
        COUNT(*) as vehicle_count,
        COUNT(CASE WHEN v.status = 'assigned' THEN 1 END) as assigned_count,
        COALESCE(SUM(t.distance_km), 0) as total_distance,
        COALESCE(AVG(t.distance_km), 0) as avg_distance
       FROM vehicles v
       LEFT JOIN trips t ON v.id = t.vehicle_id AND t.start_time >= $2 AND t.start_time <= $3
       WHERE v.company_id = $1
       GROUP BY v.type`,
      [companyId, fromDate, toDate]
    );

    // Maintenance trends
    const maintenanceTrends = await query(
      `SELECT 
        DATE_TRUNC('month', created_at) as month,
        COUNT(*) as count,
        COALESCE(SUM(cost), 0) as total_cost
       FROM maintenance_records
       WHERE company_id = $1 AND created_at >= $2 AND created_at <= $3
       GROUP BY DATE_TRUNC('month', created_at)
       ORDER BY month`,
      [companyId, fromDate, toDate]
    );

    res.json({
      success: true,
      data: {
        utilizationByType: utilizationByType.map((r: any) => ({
          type: r.type,
          vehicleCount: parseInt(r.vehicle_count),
          assignedCount: parseInt(r.assigned_count),
          utilizationRate: parseInt(r.vehicle_count) > 0 
            ? (parseInt(r.assigned_count) / parseInt(r.vehicle_count)) * 100 
            : 0,
          totalDistance: parseFloat(r.total_distance),
          averageDistance: parseFloat(r.avg_distance),
        })),
        maintenanceTrends: maintenanceTrends.map((r: any) => ({
          month: r.month,
          count: parseInt(r.count),
          totalCost: parseFloat(r.total_cost),
        })),
      },
    });
  } catch (error) {
    console.error('Error fetching fleet analytics:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch fleet analytics' });
  }
});

// GET /api/fleet/analytics/audits - Audit analytics
router.get('/audits', async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;

    const stats = await AuditSessionModel.getStats(companyId);
    const categoryScores = await query(
      `SELECT 
        category,
        AVG(score_percentage) as avg_score,
        COUNT(*) as audit_count
       FROM audit_category_scores
       WHERE company_id = $1
       GROUP BY category`,
      [companyId]
    );

    res.json({
      success: true,
      data: {
        ...stats,
        categoryPerformance: categoryScores.map((r: any) => ({
          category: r.category,
          averageScore: parseFloat(r.avg_score),
          auditCount: parseInt(r.audit_count),
        })),
      },
    });
  } catch (error) {
    console.error('Error fetching audit analytics:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch audit analytics' });
  }
});

// GET /api/fleet/analytics/fuel - Fuel analytics
router.get('/fuel', async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const { dateFrom, dateTo } = req.query;

    const fromDate = dateFrom ? new Date(dateFrom as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const toDate = dateTo ? new Date(dateTo as string) : new Date();

    const stats = await FuelTransactionModel.getStats(companyId, fromDate, toDate);

    // Fuel consumption by vehicle
    const byVehicle = await query(
      `SELECT 
        v.registration_number,
        v.make,
        v.model,
        COALESCE(SUM(ft.liters), 0) as total_liters,
        COALESCE(SUM(ft.total_cost), 0) as total_cost,
        COALESCE(AVG(ft.price_per_liter), 0) as avg_price
       FROM vehicles v
       LEFT JOIN fuel_transactions ft ON v.id = ft.vehicle_id 
         AND ft.transaction_date >= $2 AND ft.transaction_date <= $3
       WHERE v.company_id = $1
       GROUP BY v.id, v.registration_number, v.make, v.model
       HAVING COALESCE(SUM(ft.liters), 0) > 0
       ORDER BY total_cost DESC`,
      [companyId, fromDate, toDate]
    );

    res.json({
      success: true,
      data: {
        ...stats,
        byVehicle: byVehicle.map((r: any) => ({
          registrationNumber: r.registration_number,
          make: r.make,
          model: r.model,
          totalLiters: parseFloat(r.total_liters),
          totalCost: parseFloat(r.total_cost),
          averagePrice: parseFloat(r.avg_price),
        })),
      },
    });
  } catch (error) {
    console.error('Error fetching fuel analytics:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch fuel analytics' });
  }
});

// ============================================
// STAFF ANALYTICS - Personal Level
// ============================================

// GET /api/fleet/analytics/my-performance - Staff personal analytics
router.get('/my-performance', async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const userId = req.user!.userId;
    const { dateFrom, dateTo } = req.query;

    const fromDate = dateFrom ? new Date(dateFrom as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const toDate = dateTo ? new Date(dateTo as string) : new Date();

    // Get driver record if exists
    const driverRows = await query(
      'SELECT id FROM drivers WHERE user_id = $1 AND company_id = $2',
      [userId, companyId]
    );

    const driverId = driverRows.length > 0 ? driverRows[0].id : null;

    const [
      trips,
      requisitions,
      correctiveActions,
      training
    ] = await Promise.all([
      // My trips
      query(
        `SELECT 
          COUNT(*) as trip_count,
          COALESCE(SUM(distance_km), 0) as total_distance,
          COALESCE(AVG(distance_km), 0) as avg_distance
         FROM trips 
         WHERE company_id = $1 AND driver_id = $2 AND start_time >= $3 AND start_time <= $4`,
        [companyId, driverId, fromDate, toDate]
      ),
      // My requisitions
      query(
        `SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed
         FROM vehicle_requisitions 
         WHERE company_id = $1 AND requested_by = $2 AND created_at >= $3 AND created_at <= $4`,
        [companyId, userId, fromDate, toDate]
      ),
      // My corrective actions
      query(
        `SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed
         FROM corrective_actions 
         WHERE company_id = $1 AND assigned_to = $2`,
        [companyId, userId]
      ),
      // My training
      query(
        `SELECT 
          COUNT(*) as courses_enrolled,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as courses_completed,
          AVG(progress_percentage) as avg_progress
         FROM user_course_progress 
         WHERE company_id = $1 AND user_id = $2`,
        [companyId, userId]
      ),
    ]);

    res.json({
      success: true,
      data: {
        trips: {
          count: parseInt(trips[0].trip_count),
          totalDistance: parseFloat(trips[0].total_distance),
          averageDistance: parseFloat(trips[0].avg_distance),
        },
        requisitions: {
          total: parseInt(requisitions[0].total),
          completed: parseInt(requisitions[0].completed),
        },
        correctiveActions: {
          total: parseInt(correctiveActions[0].total),
          completed: parseInt(correctiveActions[0].completed),
        },
        training: {
          coursesEnrolled: parseInt(training[0].courses_enrolled),
          coursesCompleted: parseInt(training[0].courses_completed),
          averageProgress: parseFloat(training[0].avg_progress) || 0,
        },
        period: { from: fromDate, to: toDate },
      },
    });
  } catch (error) {
    console.error('Error fetching personal analytics:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch analytics' });
  }
});

// ============================================
// FRONTEND COMPATIBILITY ALIASES
// ============================================

// GET /api/fleet/analytics/utilization - Alias for /fleet
router.get('/utilization', async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const { dateFrom, dateTo } = req.query;

    const fromDate = dateFrom ? new Date(dateFrom as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const toDate = dateTo ? new Date(dateTo as string) : new Date();

    // Vehicle utilization by type
    const utilizationByType = await query(
      `SELECT 
        v.type,
        COUNT(*) as vehicle_count,
        COUNT(CASE WHEN v.status = 'assigned' THEN 1 END) as assigned_count,
        COALESCE(SUM(t.distance_km), 0) as total_distance,
        COALESCE(AVG(t.distance_km), 0) as avg_distance
       FROM vehicles v
       LEFT JOIN trips t ON v.id = t.vehicle_id AND t.start_time >= $2 AND t.start_time <= $3
       WHERE v.company_id = $1
       GROUP BY v.type`,
      [companyId, fromDate, toDate]
    );

    const fleetRows = await query(
      `SELECT 
        COUNT(*) as total_trips,
        COALESCE(SUM(distance_km), 0) as total_distance,
        COALESCE(AVG(distance_km), 0) as avg_distance
       FROM trips 
       WHERE company_id = $1 AND start_time >= $2 AND start_time <= $3`,
      [companyId, fromDate, toDate]
    );

    res.json({
      success: true,
      data: {
        totalTrips: parseInt(fleetRows[0].total_trips),
        totalDistance: parseFloat(fleetRows[0].total_distance),
        averageDistance: parseFloat(fleetRows[0].avg_distance),
        utilizationByType: utilizationByType.map((r: any) => ({
          type: r.type,
          vehicleCount: parseInt(r.vehicle_count),
          assignedCount: parseInt(r.assigned_count),
          utilizationRate: parseInt(r.vehicle_count) > 0 
            ? (parseInt(r.assigned_count) / parseInt(r.vehicle_count)) * 100 
            : 0,
          totalDistance: parseFloat(r.total_distance),
        })),
      },
    });
  } catch (error) {
    console.error('Error fetching fleet utilization:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch fleet utilization' });
  }
});

// GET /api/fleet/analytics/audit-performance - Alias for /audits
router.get('/audit-performance', async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;

    const stats = await AuditSessionModel.getStats(companyId);
    const categoryScores = await query(
      `SELECT 
        category,
        AVG(score_percentage) as avg_score,
        COUNT(*) as audit_count
       FROM audit_category_scores
       WHERE company_id = $1
       GROUP BY category`,
      [companyId]
    );

    res.json({
      success: true,
      data: {
        ...stats,
        categoryPerformance: categoryScores.map((r: any) => ({
          category: r.category,
          averageScore: parseFloat(r.avg_score),
          auditCount: parseInt(r.audit_count),
        })),
      },
    });
  } catch (error) {
    console.error('Error fetching audit performance:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch audit performance' });
  }
});

// GET /api/fleet/analytics/fuel-consumption - Alias for /fuel
router.get('/fuel-consumption', async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const { dateFrom, dateTo } = req.query;

    const fromDate = dateFrom ? new Date(dateFrom as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const toDate = dateTo ? new Date(dateTo as string) : new Date();

    const stats = await FuelTransactionModel.getStats(companyId, fromDate, toDate);

    // Fuel consumption by vehicle
    const byVehicle = await query(
      `SELECT 
        v.registration_number,
        v.make,
        v.model,
        COALESCE(SUM(ft.liters), 0) as total_liters,
        COALESCE(SUM(ft.total_cost), 0) as total_cost,
        COALESCE(AVG(ft.price_per_liter), 0) as avg_price
       FROM vehicles v
       LEFT JOIN fuel_transactions ft ON v.id = ft.vehicle_id 
         AND ft.transaction_date >= $2 AND ft.transaction_date <= $3
       WHERE v.company_id = $1
       GROUP BY v.id, v.registration_number, v.make, v.model
       HAVING COALESCE(SUM(ft.liters), 0) > 0
       ORDER BY total_cost DESC`,
      [companyId, fromDate, toDate]
    );

    res.json({
      success: true,
      data: {
        ...stats,
        byVehicle: byVehicle.map((r: any) => ({
          registrationNumber: r.registration_number,
          make: r.make,
          model: r.model,
          totalLiters: parseFloat(r.total_liters),
          totalCost: parseFloat(r.total_cost),
          averagePrice: parseFloat(r.avg_price),
        })),
      },
    });
  } catch (error) {
    console.error('Error fetching fuel consumption:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch fuel consumption' });
  }
});

// GET /api/fleet/analytics/personal-performance - Alias for /my-performance
router.get('/personal-performance', async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const userId = req.user!.userId;
    const { dateFrom, dateTo } = req.query;

    const fromDate = dateFrom ? new Date(dateFrom as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const toDate = dateTo ? new Date(dateTo as string) : new Date();

    // Get driver record if exists
    const driverRows = await query(
      'SELECT id FROM drivers WHERE user_id = $1 AND company_id = $2',
      [userId, companyId]
    );

    const driverId = driverRows.length > 0 ? driverRows[0].id : null;

    const [
      trips,
      requisitions,
      correctiveActions,
      training
    ] = await Promise.all([
      // My trips
      query(
        `SELECT 
          COUNT(*) as trip_count,
          COALESCE(SUM(distance_km), 0) as total_distance,
          COALESCE(AVG(distance_km), 0) as avg_distance
         FROM trips 
         WHERE company_id = $1 AND driver_id = $2 AND start_time >= $3 AND start_time <= $4`,
        [companyId, driverId, fromDate, toDate]
      ),
      // My requisitions
      query(
        `SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed
         FROM vehicle_requisitions 
         WHERE company_id = $1 AND requested_by = $2 AND created_at >= $3 AND created_at <= $4`,
        [companyId, userId, fromDate, toDate]
      ),
      // My corrective actions
      query(
        `SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed
         FROM corrective_actions 
         WHERE company_id = $1 AND assigned_to = $2`,
        [companyId, userId]
      ),
      // My training
      query(
        `SELECT 
          COUNT(*) as courses_enrolled,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as courses_completed,
          AVG(progress_percentage) as avg_progress
         FROM user_course_progress 
         WHERE company_id = $1 AND user_id = $2`,
        [companyId, userId]
      ),
    ]);

    res.json({
      success: true,
      data: {
        trips: {
          count: parseInt(trips[0].trip_count),
          totalDistance: parseFloat(trips[0].total_distance),
          averageDistance: parseFloat(trips[0].avg_distance),
        },
        requisitions: {
          total: parseInt(requisitions[0].total),
          completed: parseInt(requisitions[0].completed),
        },
        correctiveActions: {
          total: parseInt(correctiveActions[0].total),
          completed: parseInt(correctiveActions[0].completed),
        },
        training: {
          coursesEnrolled: parseInt(training[0].courses_enrolled),
          coursesCompleted: parseInt(training[0].courses_completed),
          averageProgress: parseFloat(training[0].avg_progress) || 0,
        },
        period: { from: fromDate, to: toDate },
      },
    });
  } catch (error) {
    console.error('Error fetching personal performance:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch analytics' });
  }
});

// ============================================
// HELPER FUNCTIONS
// ============================================

async function getHighRiskAreas(companyId: string): Promise<any[]> {
  const rows = await query(
    `SELECT 
      category,
      COUNT(*) as risk_count,
      COUNT(CASE WHEN risk_level = 'critical' THEN 1 END) as critical_count
     FROM risk_register
     WHERE company_id = $1 AND status = 'open'
     GROUP BY category
     ORDER BY critical_count DESC, risk_count DESC
     LIMIT 5`,
    [companyId]
  );

  return rows.map((r: any) => ({
    category: r.category,
    riskCount: parseInt(r.risk_count),
    criticalCount: parseInt(r.critical_count),
  }));
}

async function getComplianceRate(companyId: string): Promise<number> {
  const rows = await query(
    `SELECT 
      COUNT(CASE WHEN maturity_rating IN ('Good', 'Excellent') THEN 1 END) as compliant,
      COUNT(*) as total
     FROM audit_sessions
     WHERE company_id = $1 AND status = 'completed'`,
    [companyId]
  );

  const compliant = parseInt(rows[0].compliant);
  const total = parseInt(rows[0].total);

  return total > 0 ? (compliant / total) * 100 : 0;
}

export default router;
