import { Router } from 'express';
import { query } from '../database';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Get all repairs - with company filtering
router.get('/', async (req: any, res) => {
  try {
    const companyId = req.user?.companyId;
    
    let sql = `
      SELECT r.*, v.registration_num, s.staff_name as driver_name
      FROM repairs r
      LEFT JOIN vehicles v ON v.id = r.vehicle_id
      LEFT JOIN staff s ON s.id = r.driver_id
    `;
    let params: any[] = [];
    
    if (companyId && companyId !== 'super_admin') {
      sql += ' WHERE v.company_id = $1';
      params.push(companyId);
    }
    
    sql += ' ORDER BY r.date_in DESC';
    
    const result = await query(sql, params);
    res.json(result);
  } catch (error: any) {
    console.error('Get repairs error:', error);
    res.status(500).json({ error: 'Failed to fetch repairs' });
  }
});

// Get defective vehicles - with company filtering
router.get('/defective-vehicles', async (req: any, res) => {
  try {
    const companyId = req.user?.companyId;
    
    let sql = `
      SELECT 
        v.id,
        v.registration_num,
        v.make_model,
        v.defect_notes,
        v.defect_reported_at,
        s.staff_name as reported_by_name,
        jc.id as job_card_id,
        jc.job_card_number,
        jc.status as job_card_status
      FROM vehicles v
      LEFT JOIN job_cards jc ON jc.vehicle_id = v.id AND jc.status IN ('Pending', 'In Progress')
      LEFT JOIN staff s ON s.id = jc.reported_by
      WHERE v.status = 'Defective'
    `;
    let params: any[] = [];
    
    if (companyId && companyId !== 'super_admin') {
      sql += ' AND v.company_id = $1';
      params.push(companyId);
    }
    
    sql += ' ORDER BY v.defect_reported_at DESC';
    
    const result = await query(sql, params);
    res.json(result);
  } catch (error: any) {
    console.error('Get defective vehicles error:', error);
    res.status(500).json({ error: 'Failed to fetch defective vehicles' });
  }
});

// Create repair record - with company verification
router.post('/', async (req: any, res) => {
  const {
    date_in, vehicle_id, preventative_maintenance, breakdown_description,
    odometer_reading, driver_id, assigned_technician, repairs_start_time,
    target_repair_hours, garage_name, cost
  } = req.body;
  
  const companyId = req.user?.companyId;

  try {
    // Verify vehicle belongs to user's company
    if (companyId && companyId !== 'super_admin') {
      const vehicleCheck = await query('SELECT company_id FROM vehicles WHERE id = $1', [vehicle_id]);
      if (vehicleCheck.length === 0 || vehicleCheck[0].company_id !== companyId) {
        return res.status(403).json({ error: 'Vehicle does not belong to your company' });
      }
    }

    const id = uuidv4();
    await query(`
      INSERT INTO repairs (
        id, date_in, vehicle_id, preventative_maintenance, breakdown_description,
        odometer_reading, driver_id, assigned_technician, repairs_start_time,
        target_repair_hours, garage_name, cost, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'In Progress')
    `, [
      id, date_in, vehicle_id, preventative_maintenance, breakdown_description,
      odometer_reading, driver_id, assigned_technician, repairs_start_time,
      target_repair_hours, garage_name, cost
    ]);

    // Update vehicle status
    await query(`
      UPDATE vehicles SET status = 'Under Maintenance', updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [vehicle_id]);

    const result = await query('SELECT * FROM repairs WHERE id = $1', [id]);
    res.status(201).json(result[0]);
  } catch (error: any) {
    console.error('Create repair error:', error);
    res.status(500).json({ error: 'Failed to create repair record' });
  }
});

// Complete repair - with company verification
router.put('/:id/complete', async (req: any, res) => {
  const { id } = req.params;
  const { date_out, repairs_end_time, actual_repair_hours } = req.body;
  const companyId = req.user?.companyId;

  try {
    // Verify repair belongs to user's company
    if (companyId && companyId !== 'super_admin') {
      const repairCheck = await query(`
        SELECT r.vehicle_id FROM repairs r
        JOIN vehicles v ON v.id = r.vehicle_id
        WHERE r.id = $1 AND v.company_id = $2
      `, [id, companyId]);
      if (repairCheck.length === 0) {
        return res.status(403).json({ error: 'Repair not found or not in your company' });
      }
    }

    // Get target hours and vehicle_id
    const repairData = await query('SELECT target_repair_hours, vehicle_id FROM repairs WHERE id = $1', [id]);
    const target = repairData[0]?.target_repair_hours;
    const vehicleId = repairData[0]?.vehicle_id;
    
    // Calculate productivity
    const productivity = target && actual_repair_hours > 0 ? (target / actual_repair_hours).toFixed(2) : null;

    await query(`
      UPDATE repairs 
      SET date_out = $1, repairs_end_time = $2, actual_repair_hours = $3,
          productivity_ratio = $4, status = 'Completed', updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
    `, [date_out, repairs_end_time, actual_repair_hours, productivity, id]);

    // Update vehicle status back to Active and clear defects
    await query(`
      UPDATE vehicles 
      SET status = 'Active', 
          defect_notes = NULL, 
          defect_reported_at = NULL,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [vehicleId]);

    const result = await query('SELECT * FROM repairs WHERE id = $1', [id]);
    res.json(result[0]);
  } catch (error: any) {
    console.error('Complete repair error:', error);
    res.status(500).json({ error: 'Failed to complete repair' });
  }
});

// ========== JOB CARDS ==========

// Get all job cards - with company filtering
router.get('/job-cards', async (req: any, res) => {
  try {
    const companyId = req.user?.companyId;
    
    let sql = `
      SELECT 
        jc.*,
        v.registration_num,
        v.make_model,
        r.staff_name as reported_by_name,
        a.staff_name as approved_by_name,
        t.staff_name as technician_name
      FROM job_cards jc
      LEFT JOIN vehicles v ON v.id = jc.vehicle_id
      LEFT JOIN staff r ON r.id = jc.reported_by
      LEFT JOIN staff a ON a.id = jc.approved_by
      LEFT JOIN staff t ON t.id = jc.assigned_technician
    `;
    let params: any[] = [];
    
    if (companyId && companyId !== 'super_admin') {
      sql += ' WHERE v.company_id = $1';
      params.push(companyId);
    }
    
    sql += ' ORDER BY jc.created_at DESC';
    
    const result = await query(sql, params);
    res.json(result);
  } catch (error: any) {
    console.error('Get job cards error:', error);
    res.status(500).json({ error: 'Failed to fetch job cards' });
  }
});

// Get single job card - with company verification
router.get('/job-cards/:id', async (req: any, res) => {
  const { id } = req.params;
  const companyId = req.user?.companyId;
  
  try {
    let sql = `
      SELECT 
        jc.*,
        v.registration_num,
        v.make_model,
        v.current_mileage,
        r.staff_name as reported_by_name,
        a.staff_name as approved_by_name,
        t.staff_name as technician_name
      FROM job_cards jc
      LEFT JOIN vehicles v ON v.id = jc.vehicle_id
      LEFT JOIN staff r ON r.id = jc.reported_by
      LEFT JOIN staff a ON a.id = jc.approved_by
      LEFT JOIN staff t ON t.id = jc.assigned_technician
      WHERE jc.id = $1
    `;
    let params: any[] = [id];
    
    if (companyId && companyId !== 'super_admin') {
      sql += ' AND v.company_id = $2';
      params.push(companyId);
    }
    
    const result = await query(sql, params);
    
    if (result.length === 0) {
      return res.status(404).json({ error: 'Job card not found' });
    }
    
    res.json(result[0]);
  } catch (error: any) {
    console.error('Get job card error:', error);
    res.status(500).json({ error: 'Failed to fetch job card' });
  }
});

// Create job card from defect - with company verification
router.post('/job-cards', async (req: any, res) => {
  const {
    vehicle_id,
    defect_description,
    repair_type,
    service_provider,
    priority = 'Medium',
    estimated_cost
  } = req.body;
  
  const reported_by = req.user?.staffId;
  const companyId = req.user?.companyId;

  if (!vehicle_id || !defect_description) {
    return res.status(400).json({ error: 'Vehicle and defect description are required' });
  }

  try {
    // Verify vehicle belongs to user's company
    if (companyId && companyId !== 'super_admin') {
      const vehicleCheck = await query('SELECT company_id FROM vehicles WHERE id = $1', [vehicle_id]);
      if (vehicleCheck.length === 0 || vehicleCheck[0].company_id !== companyId) {
        return res.status(403).json({ error: 'Vehicle does not belong to your company' });
      }
    }

    // Generate unique job card number
    const year = new Date().getFullYear();
    const randomCode = Math.random().toString(36).substring(2, 6).toUpperCase();
    const jobCardNumber = `JB-${randomCode}-${year}`;
    
    const id = uuidv4();
    await query(`
      INSERT INTO job_cards (
        id, job_card_number, vehicle_id, defect_description, repair_type,
        service_provider, priority, estimated_cost, reported_by, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'Pending')
    `, [
      id, jobCardNumber, vehicle_id, defect_description, repair_type,
      service_provider, priority, estimated_cost, reported_by
    ]);

    // Update vehicle status to Defective if not already
    await query(`
      UPDATE vehicles 
      SET status = 'Defective', 
          defect_notes = $1,
          defect_reported_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [defect_description, vehicle_id]);

    const result = await query(`
      SELECT jc.*, v.registration_num, r.staff_name as reported_by_name
      FROM job_cards jc
      LEFT JOIN vehicles v ON v.id = jc.vehicle_id
      LEFT JOIN staff r ON r.id = jc.reported_by
      WHERE jc.id = $1
    `, [id]);
    
    res.status(201).json(result[0]);
  } catch (error: any) {
    console.error('Create job card error:', error);
    res.status(500).json({ error: 'Failed to create job card: ' + error.message });
  }
});

// Approve job card (manager) - with company verification
router.post('/job-cards/:id/approve', async (req: any, res) => {
  const { id } = req.params;
  const approved_by = req.user?.staffId;
  const userRole = req.user?.role;
  const companyId = req.user?.companyId;
  
  // Only managers can approve
  if (!['admin', 'manager', 'transport_supervisor'].includes(userRole)) {
    return res.status(403).json({ error: 'Only managers can approve job cards' });
  }

  try {
    // Verify job card belongs to user's company
    if (companyId && companyId !== 'super_admin') {
      const jcCheck = await query(`
        SELECT jc.id FROM job_cards jc
        JOIN vehicles v ON v.id = jc.vehicle_id
        WHERE jc.id = $1 AND v.company_id = $2
      `, [id, companyId]);
      if (jcCheck.length === 0) {
        return res.status(403).json({ error: 'Job card not found or not in your company' });
      }
    }

    await query(`
      UPDATE job_cards 
      SET status = 'Approved', 
          approved_by = $1, 
          approved_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [approved_by, id]);

    const result = await query(`
      SELECT jc.*, v.registration_num, r.staff_name as reported_by_name, a.staff_name as approved_by_name
      FROM job_cards jc
      LEFT JOIN vehicles v ON v.id = jc.vehicle_id
      LEFT JOIN staff r ON r.id = jc.reported_by
      LEFT JOIN staff a ON a.id = jc.approved_by
      WHERE jc.id = $1
    `, [id]);
    
    res.json({ message: 'Job card approved', job_card: result[0] });
  } catch (error: any) {
    console.error('Approve job card error:', error);
    res.status(500).json({ error: 'Failed to approve job card' });
  }
});

// Assign technician and start work - with company verification
router.post('/job-cards/:id/assign', async (req: any, res) => {
  const { id } = req.params;
  const { assigned_technician, target_hours } = req.body;
  const companyId = req.user?.companyId;

  try {
    // Verify job card belongs to user's company
    if (companyId && companyId !== 'super_admin') {
      const jcCheck = await query(`
        SELECT jc.id FROM job_cards jc
        JOIN vehicles v ON v.id = jc.vehicle_id
        WHERE jc.id = $1 AND v.company_id = $2
      `, [id, companyId]);
      if (jcCheck.length === 0) {
        return res.status(403).json({ error: 'Job card not found or not in your company' });
      }
    }

    await query(`
      UPDATE job_cards 
      SET assigned_technician = $1,
          target_hours = $2,
          status = 'In Progress',
          started_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
    `, [assigned_technician, target_hours, id]);

    res.json({ message: 'Technician assigned' });
  } catch (error: any) {
    console.error('Assign technician error:', error);
    res.status(500).json({ error: 'Failed to assign technician' });
  }
});

// Complete job card - with company verification
router.post('/job-cards/:id/complete', async (req: any, res) => {
  const { id } = req.params;
  const { actual_hours, actual_cost, repair_notes } = req.body;
  const companyId = req.user?.companyId;

  try {
    // Verify job card belongs to user's company
    if (companyId && companyId !== 'super_admin') {
      const jcCheck = await query(`
        SELECT jc.id, jc.vehicle_id FROM job_cards jc
        JOIN vehicles v ON v.id = jc.vehicle_id
        WHERE jc.id = $1 AND v.company_id = $2
      `, [id, companyId]);
      if (jcCheck.length === 0) {
        return res.status(403).json({ error: 'Job card not found or not in your company' });
      }
    }

    const jobCardResult = await query('SELECT * FROM job_cards WHERE id = $1', [id]);
    if (jobCardResult.length === 0) {
      return res.status(404).json({ error: 'Job card not found' });
    }
    
    const jobCard = jobCardResult[0];

    await query(`
      UPDATE job_cards 
      SET actual_hours = $1,
          actual_cost = $2,
          repair_notes = $3,
          status = 'Completed',
          completed_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
    `, [actual_hours, actual_cost, repair_notes, id]);

    // Update vehicle status back to Active
    await query(`
      UPDATE vehicles 
      SET status = 'Active', 
          defect_notes = NULL, 
          defect_reported_at = NULL,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [jobCard.vehicle_id]);

    res.json({ message: 'Job card completed' });
  } catch (error: any) {
    console.error('Complete job card error:', error);
    res.status(500).json({ error: 'Failed to complete job card' });
  }
});

// Cancel job card - with company verification
router.post('/job-cards/:id/cancel', async (req: any, res) => {
  const { id } = req.params;
  const { cancellation_reason } = req.body;
  const companyId = req.user?.companyId;

  try {
    // Verify job card belongs to user's company
    if (companyId && companyId !== 'super_admin') {
      const jcCheck = await query(`
        SELECT jc.id, jc.vehicle_id FROM job_cards jc
        JOIN vehicles v ON v.id = jc.vehicle_id
        WHERE jc.id = $1 AND v.company_id = $2
      `, [id, companyId]);
      if (jcCheck.length === 0) {
        return res.status(403).json({ error: 'Job card not found or not in your company' });
      }
    }

    const jobCardResult = await query('SELECT * FROM job_cards WHERE id = $1', [id]);
    if (jobCardResult.length === 0) {
      return res.status(404).json({ error: 'Job card not found' });
    }
    
    const jobCard = jobCardResult[0];

    await query(`
      UPDATE job_cards 
      SET status = 'Cancelled',
          cancellation_reason = $1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [cancellation_reason, id]);

    // Update vehicle status - check if there are other pending job cards
    const otherPending = await query(`
      SELECT COUNT(*) as count FROM job_cards 
      WHERE vehicle_id = $1 AND status IN ('Pending', 'In Progress') AND id != $2
    `, [jobCard.vehicle_id, id]);
    
    if (parseInt(otherPending[0]?.count || 0) === 0) {
      await query(`
        UPDATE vehicles 
        SET status = 'Active', 
            defect_notes = NULL, 
            defect_reported_at = NULL,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [jobCard.vehicle_id]);
    }

    res.json({ message: 'Job card cancelled' });
  } catch (error: any) {
    console.error('Cancel job card error:', error);
    res.status(500).json({ error: 'Failed to cancel job card' });
  }
});

// Convert job card to repair record - with company verification
router.post('/job-cards/:id/convert-to-repair', async (req: any, res) => {
  const { id } = req.params;
  const companyId = req.user?.companyId;

  try {
    // Verify job card belongs to user's company
    if (companyId && companyId !== 'super_admin') {
      const jcCheck = await query(`
        SELECT jc.id FROM job_cards jc
        JOIN vehicles v ON v.id = jc.vehicle_id
        WHERE jc.id = $1 AND v.company_id = $2
      `, [id, companyId]);
      if (jcCheck.length === 0) {
        return res.status(403).json({ error: 'Job card not found or not in your company' });
      }
    }

    const jobCardResult = await query(`
      SELECT jc.*, v.registration_num
      FROM job_cards jc
      LEFT JOIN vehicles v ON v.id = jc.vehicle_id
      WHERE jc.id = $1
    `, [id]);
    
    if (jobCardResult.length === 0) {
      return res.status(404).json({ error: 'Job card not found' });
    }
    
    const jobCard = jobCardResult[0];

    // Create repair record from job card
    const repairId = uuidv4();
    await query(`
      INSERT INTO repairs (
        id, date_in, vehicle_id, breakdown_description,
        assigned_technician, target_repair_hours, garage_name, cost, status
      ) VALUES ($1, CURRENT_DATE, $2, $3, $4, $5, $6, $7, 'In Progress')
    `, [
      repairId, 
      jobCard.vehicle_id, 
      jobCard.defect_description,
      jobCard.assigned_technician,
      jobCard.target_hours,
      jobCard.service_provider,
      jobCard.estimated_cost
    ]);

    // Update job card status
    await query(`
      UPDATE job_cards 
      SET status = 'Converted',
          converted_to_repair_id = $1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [repairId, id]);

    // Update vehicle status
    await query(`
      UPDATE vehicles 
      SET status = 'Under Maintenance', updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [jobCard.vehicle_id]);

    res.json({ 
      message: 'Job card converted to repair record', 
      repair_id: repairId 
    });
  } catch (error: any) {
    console.error('Convert job card error:', error);
    res.status(500).json({ error: 'Failed to convert job card' });
  }
});

export default router;
