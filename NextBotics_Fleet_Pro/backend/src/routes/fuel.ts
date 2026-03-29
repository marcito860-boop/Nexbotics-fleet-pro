import { Router } from 'express';
import { query } from '../database';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// ==================== FUEL RECORDS ====================

// Get all fuel records - RETURNS RAW ARRAY (for frontend compatibility)
router.get('/', async (req: any, res) => {
  try {
    const { vehicle_id, start_date, end_date, limit = 100 } = req.query;
    const companyId = req.user?.companyId;
    
    let queryStr = `
      SELECT f.*, v.registration_num, v.make_model, v.fuel_type
      FROM fuel_records f
      LEFT JOIN vehicles v ON v.id = f.vehicle_id
      WHERE 1=1
    `;
    let params: any[] = [];
    let paramIndex = 1;
    
    // Add company filtering
    if (companyId && companyId !== 'super_admin') {
      queryStr += ` AND v.company_id = $${paramIndex}`;
      params.push(companyId);
      paramIndex++;
    }
    
    if (vehicle_id) {
      queryStr += ` AND f.vehicle_id = $${paramIndex}`;
      params.push(vehicle_id);
      paramIndex++;
    }
    
    if (start_date) {
      queryStr += ` AND f.fuel_date >= $${paramIndex}`;
      params.push(start_date);
      paramIndex++;
    }
    
    if (end_date) {
      queryStr += ` AND f.fuel_date <= $${paramIndex}`;
      params.push(end_date);
      paramIndex++;
    }
    
    queryStr += ` ORDER BY f.fuel_date DESC LIMIT $${paramIndex}`;
    params.push(parseInt(limit as string) || 100);
    
    const result = await query(queryStr, params);
    
    // Ensure numeric fields are properly converted (not NULL)
    const sanitizedResult = result.map((r: any) => ({
      ...r,
      past_mileage: r.past_mileage || 0,
      current_mileage: r.current_mileage || 0,
      distance_km: r.distance_km || 0,
      quantity_liters: r.quantity_liters || 0,
      km_per_liter: parseFloat(r.km_per_liter) || 0,
      amount: parseFloat(r.amount) || 0,
      cost_per_km: parseFloat(r.cost_per_km) || 0
    }));
    
    // Return raw array for frontend compatibility
    res.json(sanitizedResult);
  } catch (error: any) {
    console.error('Get fuel records error:', error);
    res.status(500).json({ error: 'Failed to fetch fuel records' });
  }
});

// Create fuel record - RETURNS OBJECT
router.post('/', async (req: any, res) => {
  const {
    fuel_date, vehicle_id, card_num, card_name,
    past_mileage, current_mileage, quantity_liters, amount, place
  } = req.body;

  console.log('Fuel transaction request:', req.body);
  
  const companyId = req.user?.companyId;

  // Validation
  if (!fuel_date || !vehicle_id || !past_mileage || !current_mileage || !quantity_liters || !amount) {
    return res.status(400).json({ 
      error: 'Missing required fields',
      received: { fuel_date, vehicle_id, past_mileage, current_mileage, quantity_liters, amount },
      required: ['fuel_date', 'vehicle_id', 'past_mileage', 'current_mileage', 'quantity_liters', 'amount']
    });
  }

  // Validate mileage progression
  if (parseInt(current_mileage) <= parseInt(past_mileage)) {
    return res.status(400).json({ 
      error: 'Current mileage must be greater than past mileage',
      past_mileage, current_mileage
    });
  }

  try {
    // Verify vehicle belongs to user's company
    if (companyId && companyId !== 'super_admin') {
      const vehicleCheck = await query('SELECT company_id FROM vehicles WHERE id = $1', [vehicle_id]);
      if (vehicleCheck.length === 0 || vehicleCheck[0].company_id !== companyId) {
        return res.status(403).json({ error: 'Vehicle does not belong to your company' });
      }
    }

    // Calculate metrics
    const distance = parseInt(current_mileage) - parseInt(past_mileage);
    const km_per_liter = distance > 0 && quantity_liters > 0 ? (distance / parseFloat(quantity_liters)).toFixed(2) : 0;
    const cost_per_km = distance > 0 && amount > 0 ? (parseFloat(amount) / distance).toFixed(4) : 0;

    const id = uuidv4();
    
    await query(`
      INSERT INTO fuel_records 
      (id, fuel_date, vehicle_id, card_num, card_name, past_mileage, 
       current_mileage, quantity_liters, km_per_liter, amount, cost_per_km, place)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `, [
      id, fuel_date, vehicle_id, card_num || '', card_name || '', 
      parseInt(past_mileage), parseInt(current_mileage), 
      parseFloat(quantity_liters), km_per_liter, 
      parseFloat(amount), cost_per_km, place || ''
    ]);

    // Update vehicle current mileage
    await query(`
      UPDATE vehicles 
      SET current_mileage = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [parseInt(current_mileage), vehicle_id]);

    const result = await query(`
      SELECT f.*, v.registration_num 
      FROM fuel_records f
      LEFT JOIN vehicles v ON v.id = f.vehicle_id
      WHERE f.id = $1
    `, [id]);
    
    console.log('Fuel transaction created:', result[0]);
    res.status(201).json(result[0]);
  } catch (error: any) {
    console.error('Create fuel record error:', error);
    res.status(500).json({ error: 'Failed to create fuel record: ' + error.message, details: error });
  }
});

// Update fuel record
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const {
    fuel_date, card_num, card_name,
    past_mileage, current_mileage, quantity_liters, amount, place
  } = req.body;

  try {
    // Calculate new metrics
    const distance = parseInt(current_mileage) - parseInt(past_mileage);
    const km_per_liter = distance > 0 && quantity_liters > 0 ? (distance / parseFloat(quantity_liters)).toFixed(2) : 0;
    const cost_per_km = distance > 0 && amount > 0 ? (parseFloat(amount) / distance).toFixed(4) : 0;

    await query(`
      UPDATE fuel_records 
      SET fuel_date = $1, card_num = $2, card_name = $3,
          past_mileage = $4, current_mileage = $5, distance_km = $6,
          quantity_liters = $7, km_per_liter = $8, amount = $9, cost_per_km = $10, place = $11
      WHERE id = $12
    `, [
      fuel_date, card_num, card_name, past_mileage, current_mileage,
      distance, quantity_liters, km_per_liter, amount, cost_per_km, place, id
    ]);

    const result = await query(`
      SELECT f.*, v.registration_num 
      FROM fuel_records f
      LEFT JOIN vehicles v ON v.id = f.vehicle_id
      WHERE f.id = $1
    `, [id]);
    
    res.json(result[0]);
  } catch (error) {
    console.error('Update fuel record error:', error);
    res.status(500).json({ error: 'Failed to update fuel record' });
  }
});

// Delete fuel record
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    await query('DELETE FROM fuel_records WHERE id = $1', [id]);
    res.json({ message: 'Fuel record deleted' });
  } catch (error) {
    console.error('Delete fuel record error:', error);
    res.status(500).json({ error: 'Failed to delete fuel record' });
  }
});

// ==================== FUEL CARDS ====================

// Get all fuel cards - RETURNS RAW ARRAY
router.get('/cards', async (req: any, res) => {
  try {
    // Check if fuel_cards table exists
    const tableCheck = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'fuel_cards'
      )
    `);
    
    if (!tableCheck[0]?.exists) {
      // Create fuel_cards table if it doesn't exist
      await query(`
        CREATE TABLE IF NOT EXISTS fuel_cards (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          card_num VARCHAR(100) UNIQUE NOT NULL,
          card_name VARCHAR(255),
          assigned_vehicle_id UUID REFERENCES vehicles(id),
          monthly_limit DECIMAL(10,2),
          current_month_usage DECIMAL(10,2) DEFAULT 0,
          status VARCHAR(20) DEFAULT 'active',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      return res.json([]);
    }
    
    // Add missing columns if they don't exist
    try {
      await query(`ALTER TABLE fuel_cards ADD COLUMN IF NOT EXISTS card_num VARCHAR(100)`);
      await query(`ALTER TABLE fuel_cards ADD COLUMN IF NOT EXISTS card_name VARCHAR(255)`);
      await query(`ALTER TABLE fuel_cards ADD COLUMN IF NOT EXISTS assigned_vehicle_id UUID REFERENCES vehicles(id)`);
      await query(`ALTER TABLE fuel_cards ADD COLUMN IF NOT EXISTS monthly_limit DECIMAL(10,2)`);
      await query(`ALTER TABLE fuel_cards ADD COLUMN IF NOT EXISTS current_month_usage DECIMAL(10,2) DEFAULT 0`);
      await query(`ALTER TABLE fuel_cards ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active'`);
    } catch (e) {
      console.log('Columns might already exist');
    }
    
    const result = await query(`
      SELECT fc.*, v.registration_num
      FROM fuel_cards fc
      LEFT JOIN vehicles v ON v.id = fc.assigned_vehicle_id
      ORDER BY fc.created_at DESC
    `);
    
    // Return raw array for frontend compatibility
    res.json(result);
  } catch (error: any) {
    console.error('Get fuel cards error:', error);
    res.status(500).json({ error: 'Failed to fetch fuel cards', details: error.message });
  }
});

// Create fuel card
router.post('/cards', async (req, res) => {
  const { card_num, card_name, assigned_vehicle_id, monthly_limit } = req.body;

  if (!card_num) {
    return res.status(400).json({ error: 'Card number is required' });
  }

  try {
    // Ensure table exists with correct columns
    await query(`
      CREATE TABLE IF NOT EXISTS fuel_cards (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        card_num VARCHAR(100) UNIQUE NOT NULL,
        card_name VARCHAR(255),
        assigned_vehicle_id UUID REFERENCES vehicles(id),
        monthly_limit DECIMAL(10,2),
        current_month_usage DECIMAL(10,2) DEFAULT 0,
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add missing columns if they don't exist
    try {
      await query(`ALTER TABLE fuel_cards ADD COLUMN IF NOT EXISTS card_num VARCHAR(100)`);
      await query(`ALTER TABLE fuel_cards ADD COLUMN IF NOT EXISTS card_name VARCHAR(255)`);
      await query(`ALTER TABLE fuel_cards ADD COLUMN IF NOT EXISTS assigned_vehicle_id UUID REFERENCES vehicles(id)`);
      await query(`ALTER TABLE fuel_cards ADD COLUMN IF NOT EXISTS monthly_limit DECIMAL(10,2)`);
      await query(`ALTER TABLE fuel_cards ADD COLUMN IF NOT EXISTS current_month_usage DECIMAL(10,2) DEFAULT 0`);
      await query(`ALTER TABLE fuel_cards ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active'`);
    } catch (e) {
      // Ignore errors
    }

    const id = uuidv4();
    await query(`
      INSERT INTO fuel_cards (id, card_num, card_name, assigned_vehicle_id, monthly_limit)
      VALUES ($1, $2, $3, $4, $5)
    `, [id, card_num, card_name || '', assigned_vehicle_id || null, monthly_limit || null]);

    const result = await query('SELECT * FROM fuel_cards WHERE id = $1', [id]);
    res.status(201).json(result[0]);
  } catch (error: any) {
    console.error('Create fuel card error:', error);
    res.status(500).json({ error: 'Failed to create fuel card: ' + error.message });
  }
});

// Update fuel card
router.put('/cards/:id', async (req, res) => {
  const { id } = req.params;
  const { card_num, card_name, assigned_vehicle_id, monthly_limit, status } = req.body;
  
  try {
    const updates: string[] = [];
    const params: any[] = [];
    
    if (card_num !== undefined) {
      updates.push(`card_num = $${params.length + 1}`);
      params.push(card_num);
    }
    if (card_name !== undefined) {
      updates.push(`card_name = $${params.length + 1}`);
      params.push(card_name);
    }
    if (assigned_vehicle_id !== undefined) {
      updates.push(`assigned_vehicle_id = $${params.length + 1}`);
      params.push(assigned_vehicle_id);
    }
    if (monthly_limit !== undefined) {
      updates.push(`monthly_limit = $${params.length + 1}`);
      params.push(monthly_limit);
    }
    if (status !== undefined) {
      updates.push(`status = $${params.length + 1}`);
      params.push(status);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    params.push(id);
    
    await query(`
      UPDATE fuel_cards SET ${updates.join(', ')} WHERE id = $${params.length}
    `, params);
    
    const result = await query('SELECT * FROM fuel_cards WHERE id = $1', [id]);
    res.json(result[0]);
  } catch (error: any) {
    console.error('Update fuel card error:', error);
    res.status(500).json({ error: 'Failed to update fuel card: ' + error.message });
  }
});

// ==================== ANALYTICS ====================

// Get fuel analytics - RETURNS OBJECT (not array)
router.get('/analytics', async (req: any, res) => {
  try {
    const { start_date, end_date, vehicle_id } = req.query;
    const companyId = req.user?.companyId;
    
    // Default to last 30 days if no dates provided
    const end = end_date || new Date().toISOString().split('T')[0];
    const start = start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    let baseWhere = `f.fuel_date >= $1 AND f.fuel_date <= $2`;
    let params: any[] = [start, end];
    let paramIndex = 3;
    
    // Add company filtering via vehicles join
    if (companyId && companyId !== 'super_admin') {
      baseWhere += ` AND v.company_id = $${paramIndex}`;
      params.push(companyId);
      paramIndex++;
    }
    
    if (vehicle_id) {
      baseWhere += ` AND f.vehicle_id = $${paramIndex}`;
      params.push(vehicle_id);
      paramIndex++;
    }
    
    // Overall summary
    const summaryResult = await query(`
      SELECT 
        COALESCE(SUM(f.quantity_liters), 0) as total_liters,
        COALESCE(SUM(f.amount), 0) as total_cost,
        COALESCE(SUM(f.distance_km), 0) as total_distance,
        COALESCE(AVG(f.km_per_liter), 0) as avg_efficiency,
        COALESCE(AVG(f.cost_per_km), 0) as avg_cost_per_km,
        COUNT(*) as record_count
      FROM fuel_records f
      JOIN vehicles v ON v.id = f.vehicle_id
      WHERE ${baseWhere}
    `, params);
    
    // Monthly breakdown
    const monthlyResult = await query(`
      SELECT 
        DATE_TRUNC('month', f.fuel_date) as month,
        SUM(f.quantity_liters) as liters,
        SUM(f.amount) as cost,
        SUM(f.distance_km) as distance,
        AVG(f.km_per_liter) as avg_efficiency
      FROM fuel_records f
      JOIN vehicles v ON v.id = f.vehicle_id
      WHERE ${baseWhere}
      GROUP BY DATE_TRUNC('month', f.fuel_date)
      ORDER BY month DESC
      LIMIT 12
    `, params);
    
    // Vehicle efficiency ranking - use same params as base query
    const vehicleResult = await query(`
      SELECT 
        v.registration_num,
        v.make_model,
        SUM(f.quantity_liters) as total_liters,
        SUM(f.amount) as total_cost,
        SUM(f.distance_km) as total_distance,
        AVG(f.km_per_liter) as avg_efficiency,
        COUNT(*) as fill_count
      FROM fuel_records f
      JOIN vehicles v ON v.id = f.vehicle_id
      WHERE ${baseWhere}
      GROUP BY v.id, v.registration_num, v.make_model
      HAVING COUNT(*) >= 2
      ORDER BY avg_efficiency DESC
    `, params);
    
    // Alerts - low efficiency vehicles
    const alertsResult = await query(`
      SELECT 
        v.registration_num,
        v.id as vehicle_id,
        AVG(f.km_per_liter) as avg_efficiency,
        COUNT(*) as record_count
      FROM fuel_records f
      JOIN vehicles v ON v.id = f.vehicle_id
      WHERE ${baseWhere}
      GROUP BY v.id, v.registration_num
      HAVING COUNT(*) >= 3 AND AVG(f.km_per_liter) < 5
      ORDER BY avg_efficiency ASC
    `, params);
    
    res.json({
      summary: summaryResult[0] || {
        total_liters: 0, total_cost: 0, total_distance: 0,
        avg_efficiency: 0, avg_cost_per_km: 0, record_count: 0
      },
      monthly: monthlyResult,
      vehicles: vehicleResult,
      alerts: alertsResult.map((a: any) => ({
        id: `low-eff-${a.vehicle_id}`,
        type: 'low_efficiency',
        vehicle: a.registration_num,
        message: `${a.registration_num} has low fuel efficiency (${parseFloat(a.avg_efficiency).toFixed(1)} km/L)`,
        severity: 'warning',
        avg_efficiency: parseFloat(a.avg_efficiency)
      }))
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// Get fuel efficiency - RETURNS RAW ARRAY
router.get('/efficiency', async (req: any, res) => {
  try {
    const companyId = req.user?.companyId;
    
    let sql = `
      SELECT 
        v.registration_num,
        v.target_consumption_rate as target_rate,
        SUM(f.quantity_liters) as total_fuel,
        SUM(f.distance_km) as total_distance,
        AVG(f.km_per_liter) as avg_km_per_liter,
        CASE 
          WHEN v.target_consumption_rate > 0 
          THEN ((AVG(f.km_per_liter) - v.target_consumption_rate) / v.target_consumption_rate) * 100
          ELSE 0 
        END as variance
      FROM fuel_records f
      JOIN vehicles v ON v.id = f.vehicle_id
    `;
    
    let params: any[] = [];
    
    if (companyId && companyId !== 'super_admin') {
      sql += ' WHERE v.company_id = $1';
      params.push(companyId);
    }
    
    sql += `
      GROUP BY v.id, v.registration_num, v.target_consumption_rate
      HAVING COUNT(*) >= 2
      ORDER BY avg_km_per_liter DESC
    `;
    
    const result = await query(sql, params);
    
    // Return raw array for frontend compatibility
    res.json(result.map((r: any) => ({
      registration_num: r.registration_num,
      avg_km_per_liter: parseFloat(r.avg_km_per_liter) || 0,
      target_rate: parseFloat(r.target_rate) || 0,
      total_distance: parseInt(r.total_distance) || 0,
      total_fuel: parseFloat(r.total_fuel) || 0,
      variance: parseFloat(r.variance) || 0
    })));
  } catch (error: any) {
    console.error('Efficiency error:', error);
    res.status(500).json({ error: 'Failed to fetch efficiency data' });
  }
});

// Get vehicle fuel trends
router.get('/trends/:vehicleId', async (req: any, res) => {
  try {
    const { vehicleId } = req.params;
    const { months = 6 } = req.query;
    
    const result = await query(`
      SELECT 
        DATE_TRUNC('month', fuel_date) as month,
        SUM(quantity_liters) as liters,
        SUM(amount) as cost,
        SUM(distance_km) as distance,
        AVG(km_per_liter) as efficiency,
        AVG(cost_per_km) as cost_per_km
      FROM fuel_records
      WHERE vehicle_id = $1 
        AND fuel_date >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '${months} months')
      GROUP BY DATE_TRUNC('month', fuel_date)
      ORDER BY month ASC
    `, [vehicleId]);
    
    res.json(result);
  } catch (error) {
    console.error('Trends error:', error);
    res.status(500).json({ error: 'Failed to fetch trends' });
  }
});

export default router;
