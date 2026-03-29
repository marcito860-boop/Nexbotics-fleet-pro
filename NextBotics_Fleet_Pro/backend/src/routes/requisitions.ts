import { Router } from 'express';
import { query } from '../database';
import { v4 as uuidv4 } from 'uuid';
import emailService from '../services/email';

const router = Router();

// Helper to wrap responses
const successResponse = (data: any, message?: string) => ({ success: true, data, message });
const errorResponse = (error: string, details?: any) => ({ success: false, error, details });

// ==================== REQUISITION ROUTES ====================

// Create requisition request - with company filtering
router.post('/', async (req: any, res) => {
  const companyId = req.user?.companyId;
  
  // Support both old and new field names
  const {
    requested_by, requestBy, staffId,
    place_of_departure, placeOfDeparture, fromLocation,
    destination, toLocation,
    purpose,
    travel_date, travelDate, requiredFrom,
    travel_time, travelTime,
    return_date, returnDate, requiredUntil,
    return_time, returnTime,
    num_passengers, numPassengers, numberOfPassengers,
    passenger_names, passengerNames,
    priority = 'normal',
    notes
  } = req.body;

  // Normalize field names
  const normalizedData = {
    requested_by: requested_by || requestBy || staffId,
    place_of_departure: place_of_departure || placeOfDeparture || fromLocation || '',
    destination: destination || toLocation || '',
    purpose: purpose || '',
    travel_date: travel_date || travelDate || requiredFrom,
    travel_time: travel_time || travelTime || '09:00',
    return_date: return_date || returnDate || requiredUntil || null,
    return_time: return_time || returnTime || null,
    num_passengers: num_passengers || numPassengers || numberOfPassengers || 1,
    passenger_names: passenger_names || passengerNames || '',
    priority,
    notes: notes || ''
  };

  // If requested_by not provided, try to find staff by user's email
  let requesterId = normalizedData.requested_by;
  let staffEmail = null;
  let staffCreationError = null;
  
  try {
    if (!requesterId && req.user?.email) {
      // Find staff by email and company
      const staffByEmail = await query(
        'SELECT id, staff_name, email, department FROM staff WHERE email = $1 AND (company_id = $2 OR $2 IS NULL OR $2 = \'super_admin\')',
        [req.user.email, companyId]
      );
      if (staffByEmail && staffByEmail.length > 0) {
        requesterId = staffByEmail[0].id;
        staffEmail = staffByEmail[0].email;
      }
    }
    
    // If still no requester, create a default staff record for this user
    if (!requesterId && req.user) {
      const staffName = req.user.firstName && req.user.lastName 
        ? `${req.user.firstName} ${req.user.lastName}`
        : req.user.email.split('@')[0];
      
      console.log('Auto-creating staff for user:', { 
        userId: req.user.userId, 
        email: req.user.email, 
        companyId,
        staffName 
      });
      
      try {
        // Try to find existing staff first (same company)
        const existingStaff = await query(
          'SELECT id FROM staff WHERE email = $1 AND (company_id = $2 OR $2 IS NULL OR $2 = \'super_admin\')',
          [req.user.email, companyId]
        );
        
        if (existingStaff && existingStaff.length > 0) {
          // Use existing staff
          requesterId = existingStaff[0].id;
          staffEmail = req.user.email;
          console.log('Using existing staff record:', { staffId: requesterId });
        } else {
          // Create new staff with company_id
          const newStaffId = uuidv4();
          await query(`
            INSERT INTO staff (id, staff_name, email, role, department, company_id)
            VALUES ($1, $2, $3, 'Staff', 'General', $4)
          `, [newStaffId, staffName, req.user.email, companyId]);
          
          requesterId = newStaffId;
          staffEmail = req.user.email;
          console.log('Staff auto-created successfully:', { staffId: newStaffId });
        }
      } catch (insertErr: any) {
        console.error('Failed to auto-create staff:', insertErr);
        staffCreationError = insertErr.message;
      }
    }
  } catch (err: any) {
    console.error('Error finding/creating staff:', err);
    staffCreationError = err.message;
  }

  // Validation
  if (!requesterId || !normalizedData.place_of_departure || !normalizedData.destination || 
      !normalizedData.purpose || !normalizedData.travel_date) {
    return res.status(400).json(errorResponse('Missing required fields',
      { 
        fields: ['requested_by', 'place_of_departure', 'destination', 'purpose', 'travel_date'],
        received: { 
          hasRequesterId: !!requesterId, 
          hasDeparture: !!normalizedData.place_of_departure,
          hasDestination: !!normalizedData.destination,
          hasPurpose: !!normalizedData.purpose,
          hasTravelDate: !!normalizedData.travel_date,
          user: req.user ? { id: req.user.userId, email: req.user.email, companyId } : null,
          staffCreationError
        }
      }
    ));
  }

  try {
    // Check if staff has email and belongs to same company
    const staffCheck = await query(
      'SELECT staff_name, email, department, company_id FROM staff WHERE id = $1',
      [requesterId]
    );
    if (!staffCheck || staffCheck.length === 0) {
      return res.status(400).json(errorResponse('Staff not found', { staffId: requesterId }));
    }

    const staff = staffCheck[0];
    
    // Verify staff belongs to user's company (unless super_admin)
    if (companyId && companyId !== 'super_admin' && staff.company_id && staff.company_id !== companyId) {
      return res.status(403).json(errorResponse('Staff does not belong to your company'));
    }

    if (!staff.email) {
      return res.status(400).json({ 
        error: 'Staff has no email address',
        staff_name: staff.staff_name,
        message: 'Please add email in Staff section first'
      });
    }

    // Generate request number
    const date = new Date();
    const requestNo = `REQ-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;

    const id = uuidv4();
    
    await query(`
      INSERT INTO requisitions (
        id, request_no, requested_by, place_of_departure, destination, purpose,
        travel_date, travel_time, return_date, return_time, num_passengers, passenger_names,
        status, created_at, priority, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'pending', CURRENT_TIMESTAMP, $13, $14)
    `, [
      id, requestNo, requesterId, normalizedData.place_of_departure, 
      normalizedData.destination, normalizedData.purpose,
      normalizedData.travel_date, normalizedData.travel_time, 
      normalizedData.return_date, normalizedData.return_time,
      normalizedData.num_passengers, normalizedData.passenger_names,
      normalizedData.priority, normalizedData.notes
    ]);

    // Get the created requisition with joins
    const result = await query(`
      SELECT r.*, s.staff_name as requester_name, s.email as requester_email, s.department
      FROM requisitions r
      JOIN staff s ON r.requested_by = s.id
      WHERE r.id = $1
    `, [id]);
    
    // Send email notification - non-blocking
    emailService.sendRequisitionRequest(staff.staff_name, req.body)
      .then(() => console.log('Requisition email sent'))
      .catch((err: any) => console.error('Email failed (non-blocking):', err));

    res.status(201).json(successResponse(result[0], 'Requisition created successfully'));
  } catch (error: any) {
    console.error('Create requisition error:', error);
    res.status(500).json(errorResponse('Failed to create requisition: ' + error.message));
  }
});

// Get all requisitions - with company filtering
router.get('/', async (req: any, res) => {
  try {
    const { status, myRequests, page = 1, perPage = 20 } = req.query;
    const companyId = req.user?.companyId;
    const userId = req.user?.userId;
    const staffId = req.user?.staffId;
    const userRole = req.user?.role;
    const isManager = ['admin', 'manager'].includes(userRole);
    
    let queryStr = `
      SELECT r.*, 
        s.staff_name as requester_name, s.email as requester_email, s.department,
        d.staff_name as driver_name,
        v.registration_num,
        approver.staff_name as approver_name,
        allocator.staff_name as allocator_name
      FROM requisitions r
      JOIN staff s ON r.requested_by = s.id
      LEFT JOIN staff d ON r.driver_id = d.id
      LEFT JOIN vehicles v ON r.vehicle_id = v.id
      LEFT JOIN staff approver ON r.approved_by = approver.id
      LEFT JOIN staff allocator ON r.allocated_by = allocator.id
    `;
    let params: any[] = [];
    let paramIndex = 1;
    
    // Company filtering
    if (companyId && companyId !== 'super_admin') {
      queryStr += ` WHERE s.company_id = $${paramIndex}`;
      params.push(companyId);
      paramIndex++;
    } else {
      queryStr += ' WHERE 1=1';
    }
    
    // Status filter
    if (status) {
      queryStr += ` AND r.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }
    
    // My requests filter (for non-managers)
    if (myRequests === 'true' || (!isManager && !status)) {
      queryStr += ` AND r.requested_by = $${paramIndex}`;
      params.push(staffId || userId);
      paramIndex++;
    }
    
    queryStr += ` ORDER BY r.created_at DESC`;
    
    // Pagination
    const offset = (parseInt(page) - 1) * parseInt(perPage);
    queryStr += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(perPage), offset);
    
    const result = await query(queryStr, params);
    
    // Get total count with company filtering
    let countQuery = `SELECT COUNT(*) as total FROM requisitions r JOIN staff s ON r.requested_by = s.id`;
    let countParams: any[] = [];
    
    if (companyId && companyId !== 'super_admin') {
      countQuery += ' WHERE s.company_id = $1';
      countParams.push(companyId);
    } else {
      countQuery += ' WHERE 1=1';
    }
    
    if (status) {
      countQuery += countParams.length > 0 ? ` AND r.status = $${countParams.length + 1}` : ` AND r.status = $1`;
      countParams.push(status);
    }
    if (myRequests === 'true' || (!isManager && !status)) {
      countQuery += countParams.length > 0 ? ` AND r.requested_by = $${countParams.length + 1}` : ` AND r.requested_by = $1`;
      countParams.push(staffId || userId);
    }
    
    const countResult = await query(countQuery, countParams);
    
    // Format response to match frontend expectations
    const formattedItems = result.map((r: any) => ({
      id: r.id,
      requestNumber: r.request_no,
      request_no: r.request_no,
      purpose: r.purpose,
      status: r.status,
      priority: r.priority || 'normal',
      requiredFrom: r.travel_date,
      travel_date: r.travel_date,
      requiredUntil: r.return_date,
      return_date: r.return_date,
      fromLocation: r.place_of_departure,
      place_of_departure: r.place_of_departure,
      toLocation: r.destination,
      destination: r.destination,
      numberOfPassengers: r.num_passengers,
      num_passengers: r.num_passengers,
      notes: r.notes,
      createdAt: r.created_at,
      created_at: r.created_at,
      requester: {
        id: r.requested_by,
        firstName: r.requester_name?.split(' ')[0] || '',
        lastName: r.requester_name?.split(' ').slice(1).join(' ') || '',
        staff_name: r.requester_name,
        email: r.requester_email,
        department: r.department
      },
      allocatedVehicle: r.registration_num ? {
        id: r.vehicle_id,
        registrationNumber: r.registration_num,
        registration_num: r.registration_num
      } : null,
      driver: r.driver_name ? {
        id: r.driver_id,
        name: r.driver_name
      } : null
    }));
    
    res.json(successResponse({
      items: formattedItems,
      total: parseInt(countResult[0]?.total || 0),
      page: parseInt(page),
      perPage: parseInt(perPage)
    }));
  } catch (error: any) {
    console.error('Get requisitions error:', error);
    res.status(500).json(errorResponse('Failed to fetch requisitions: ' + error.message));
  }
});

// Get single requisition - with company verification
router.get('/:id', async (req: any, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user?.companyId;
    
    let sql = `
      SELECT r.*, 
        s.staff_name as requester_name, s.email as requester_email, s.department,
        d.staff_name as driver_name, d.phone as driver_phone,
        v.registration_num, v.make_model,
        approver.staff_name as approver_name,
        allocator.staff_name as allocator_name
      FROM requisitions r
      JOIN staff s ON r.requested_by = s.id
      LEFT JOIN staff d ON r.driver_id = d.id
      LEFT JOIN vehicles v ON r.vehicle_id = v.id
      LEFT JOIN staff approver ON r.approved_by = approver.id
      LEFT JOIN staff allocator ON r.allocated_by = allocator.id
      WHERE r.id = $1
    `;
    let params: any[] = [id];
    
    // Company verification
    if (companyId && companyId !== 'super_admin') {
      sql += ` AND s.company_id = $2`;
      params.push(companyId);
    }
    
    const result = await query(sql, params);
    
    if (result.length === 0) {
      return res.status(404).json(errorResponse('Requisition not found'));
    }
    
    res.json(successResponse(result[0]));
  } catch (error: any) {
    console.error('Get requisition error:', error);
    res.status(500).json(errorResponse('Failed to fetch requisition: ' + error.message));
  }
});

// Approve requisition - with company verification
router.post('/:id/approve', async (req: any, res) => {
  const { id } = req.params;
  const { notes, reason } = req.body;
  const staffId = req.user?.staffId;
  const companyId = req.user?.companyId;
  
  try {
    // First check if requisition exists and belongs to company
    let checkSql = 'SELECT * FROM requisitions r JOIN staff s ON r.requested_by = s.id WHERE r.id = $1';
    let checkParams: any[] = [id];
    
    if (companyId && companyId !== 'super_admin') {
      checkSql += ' AND s.company_id = $2';
      checkParams.push(companyId);
    }
    
    const checkResult = await query(checkSql, checkParams);
    if (checkResult.length === 0) {
      return res.status(404).json(errorResponse('Requisition not found'));
    }
    
    if (checkResult[0].status !== 'pending') {
      return res.status(400).json(errorResponse('Requisition is not pending'));
    }

    await query(`
      UPDATE requisitions 
      SET status = 'approved', approved_by = $1, approved_at = CURRENT_TIMESTAMP, approval_reason = $2
      WHERE id = $3
    `, [staffId || null, notes || reason || '', id]);

    // Get updated requisition
    const result = await query(`
      SELECT r.*, s.staff_name as requester_name
      FROM requisitions r
      JOIN staff s ON r.requested_by = s.id
      WHERE r.id = $1
    `, [id]);

    // Send email notification
    if (result.length > 0) {
      emailService.sendApprovalNotification(result[0].requester_name, 'approved', notes || reason)
        .catch((err: any) => console.error('Email failed:', err));
    }

    res.json(successResponse(result[0], 'Requisition approved'));
  } catch (error: any) {
    console.error('Approve requisition error:', error);
    res.status(500).json(errorResponse('Failed to approve requisition: ' + error.message));
  }
});

// Reject requisition - with company verification
router.post('/:id/reject', async (req: any, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  const staffId = req.user?.staffId;
  const companyId = req.user?.companyId;
  
  if (!reason) {
    return res.status(400).json(errorResponse('Rejection reason is required'));
  }
  
  try {
    let checkSql = 'SELECT * FROM requisitions r JOIN staff s ON r.requested_by = s.id WHERE r.id = $1';
    let checkParams: any[] = [id];
    
    if (companyId && companyId !== 'super_admin') {
      checkSql += ' AND s.company_id = $2';
      checkParams.push(companyId);
    }
    
    const checkResult = await query(checkSql, checkParams);
    if (checkResult.length === 0) {
      return res.status(404).json(errorResponse('Requisition not found'));
    }
    
    if (checkResult[0].status !== 'pending') {
      return res.status(400).json(errorResponse('Requisition is not pending'));
    }

    await query(`
      UPDATE requisitions 
      SET status = 'rejected', approved_by = $1, approved_at = CURRENT_TIMESTAMP, approval_reason = $2
      WHERE id = $3
    `, [staffId || null, reason, id]);

    const result = await query(`
      SELECT r.*, s.staff_name as requester_name
      FROM requisitions r
      JOIN staff s ON r.requested_by = s.id
      WHERE r.id = $1
    `, [id]);

    if (result.length > 0) {
      emailService.sendApprovalNotification(result[0].requester_name, 'rejected', reason)
        .catch((err: any) => console.error('Email failed:', err));
    }

    res.json(successResponse(result[0], 'Requisition rejected'));
  } catch (error: any) {
    console.error('Reject requisition error:', error);
    res.status(500).json(errorResponse('Failed to reject requisition: ' + error.message));
  }
});

// Allocate vehicle and driver - with company verification
router.post('/:id/allocate', async (req: any, res) => {
  const { id } = req.params;
  const { vehicleId, driverId, vehicle_id, driver_id } = req.body;
  const staffId = req.user?.staffId;
  const companyId = req.user?.companyId;
  
  const vId = vehicleId || vehicle_id;
  const dId = driverId || driver_id;
  
  if (!vId || !dId) {
    return res.status(400).json(errorResponse('Vehicle and driver are required'));
  }

  try {
    // Verify vehicle belongs to company
    if (companyId && companyId !== 'super_admin') {
      const vehicleCheck = await query('SELECT company_id FROM vehicles WHERE id = $1', [vId]);
      if (vehicleCheck.length === 0 || vehicleCheck[0].company_id !== companyId) {
        return res.status(403).json(errorResponse('Vehicle does not belong to your company'));
      }
      
      // Verify driver belongs to company
      const driverCheck = await query('SELECT company_id FROM staff WHERE id = $1', [dId]);
      if (driverCheck.length === 0 || driverCheck[0].company_id !== companyId) {
        return res.status(403).json(errorResponse('Driver does not belong to your company'));
      }
    }

    // Verify requisition belongs to company
    let reqCheckSql = 'SELECT r.* FROM requisitions r JOIN staff s ON r.requested_by = s.id WHERE r.id = $1';
    let reqCheckParams: any[] = [id];
    if (companyId && companyId !== 'super_admin') {
      reqCheckSql += ' AND s.company_id = $2';
      reqCheckParams.push(companyId);
    }
    
    const reqCheck = await query(reqCheckSql, reqCheckParams);
    if (reqCheck.length === 0) {
      return res.status(404).json(errorResponse('Requisition not found'));
    }

    await query(`
      UPDATE requisitions 
      SET vehicle_id = $1, driver_id = $2, allocated_by = $3, allocated_at = CURRENT_TIMESTAMP, status = 'allocated'
      WHERE id = $4
    `, [vId, dId, staffId || null, id]);

    // Get details for response
    const result = await query(`
      SELECT r.*, s.staff_name, v.registration_num, d.staff_name as driver_name
      FROM requisitions r
      JOIN staff s ON r.requested_by = s.id
      LEFT JOIN vehicles v ON r.vehicle_id = v.id
      LEFT JOIN staff d ON r.driver_id = d.id
      WHERE r.id = $1
    `, [id]);

    if (result.length > 0) {
      emailService.sendVehicleAllocated(
        result[0].staff_name, 
        result[0].registration_num,
        result[0].driver_name
      ).catch((err: any) => console.error('Email failed:', err));
    }

    res.json(successResponse(result[0], 'Vehicle allocated'));
  } catch (error: any) {
    console.error('Allocate vehicle error:', error);
    res.status(500).json(errorResponse('Failed to allocate vehicle: ' + error.message));
  }
});

// Start trip - with company verification
router.post('/:id/start', async (req: any, res) => {
  const { id } = req.params;
  const { startingOdometer, startOdometer } = req.body;
  const companyId = req.user?.companyId;
  
  const startOdo = startingOdometer || startOdometer;
  
  console.log('Start trip request:', { id, startOdo, body: req.body });
  
  try {
    // Verify requisition belongs to company
    let reqCheckSql = `
      SELECT r.* FROM requisitions r 
      JOIN staff s ON r.requested_by = s.id 
      WHERE r.id = $1
    `;
    let reqCheckParams: any[] = [id];
    if (companyId && companyId !== 'super_admin') {
      reqCheckSql += ' AND s.company_id = $2';
      reqCheckParams.push(companyId);
    }
    
    const reqCheck = await query(reqCheckSql, reqCheckParams);
    if (reqCheck.length === 0) {
      return res.status(404).json(errorResponse('Requisition not found'));
    }
    
    // Get vehicle's current mileage if no starting odometer provided
    let initialOdo = startOdo;
    if (!initialOdo && reqCheck[0].vehicle_id) {
      const vehicleData = await query('SELECT current_mileage FROM vehicles WHERE id = $1', [reqCheck[0].vehicle_id]);
      if (vehicleData.length > 0) {
        initialOdo = vehicleData[0].current_mileage;
        console.log('Using vehicle current mileage as starting odometer:', initialOdo);
      }
    }
    
    await query(`
      UPDATE requisitions 
      SET status = 'in_progress', departed_at = CURRENT_TIMESTAMP, starting_odometer = $1
      WHERE id = $2 AND status = 'allocated'
    `, [initialOdo || null, id]);

    const result = await query(`
      SELECT r.*, v.registration_num 
      FROM requisitions r
      LEFT JOIN vehicles v ON r.vehicle_id = v.id
      WHERE r.id = $1
    `, [id]);

    res.json(successResponse(result[0], 'Trip started'));
  } catch (error: any) {
    console.error('Start trip error:', error);
    res.status(500).json(errorResponse('Failed to start trip: ' + error.message));
  }
});

// Complete trip - with company verification
router.post('/:id/complete', async (req: any, res) => {
  const { id } = req.params;
  const { endingOdometer, endOdometer, notes } = req.body;
  const companyId = req.user?.companyId;
  
  const finalOdometer = endingOdometer || endOdometer;
  
  console.log('Complete trip request:', { id, finalOdometer, notes, body: req.body });
  
  try {
    // Verify requisition belongs to company
    let tripDataSql = `
      SELECT r.* FROM requisitions r 
      JOIN staff s ON r.requested_by = s.id 
      WHERE r.id = $1
    `;
    let tripDataParams: any[] = [id];
    if (companyId && companyId !== 'super_admin') {
      tripDataSql += ' AND s.company_id = $2';
      tripDataParams.push(companyId);
    }
    
    const tripData = await query(tripDataSql, tripDataParams);
    if (tripData.length === 0) {
      return res.status(404).json(errorResponse('Requisition not found'));
    }

    console.log('Trip data:', tripData[0]);
    
    // Require ending odometer for completion
    if (!finalOdometer) {
      return res.status(400).json(errorResponse('Ending odometer reading is required'));
    }

    const distance = finalOdometer ? finalOdometer - (tripData[0].starting_odometer || 0) : 0;

    await query(`
      UPDATE requisitions 
      SET status = 'completed', completed_at = CURRENT_TIMESTAMP,
          ending_odometer = $1, distance_km = $2, completion_notes = $3
      WHERE id = $4
    `, [finalOdometer || null, distance, notes || '', id]);

    // Update vehicle mileage
    if (tripData[0].vehicle_id && finalOdometer) {
      await query(`
        UPDATE vehicles 
        SET current_mileage = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [finalOdometer, tripData[0].vehicle_id]);
    }

    const result = await query(`
      SELECT r.*, s.staff_name, v.registration_num
      FROM requisitions r
      JOIN staff s ON r.requested_by = s.id
      LEFT JOIN vehicles v ON r.vehicle_id = v.id
      WHERE r.id = $1
    `, [id]);

    res.json(successResponse(result[0], 'Trip completed'));
  } catch (error: any) {
    console.error('Complete trip error:', error);
    res.status(500).json(errorResponse('Failed to complete trip: ' + error.message));
  }
});

// Cancel requisition - with company verification
router.post('/:id/cancel', async (req: any, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  const companyId = req.user?.companyId;
  
  try {
    // Verify requisition belongs to company
    let reqCheckSql = 'SELECT r.* FROM requisitions r JOIN staff s ON r.requested_by = s.id WHERE r.id = $1';
    let reqCheckParams: any[] = [id];
    if (companyId && companyId !== 'super_admin') {
      reqCheckSql += ' AND s.company_id = $2';
      reqCheckParams.push(companyId);
    }
    
    const reqCheck = await query(reqCheckSql, reqCheckParams);
    if (reqCheck.length === 0) {
      return res.status(404).json(errorResponse('Requisition not found'));
    }
    
    await query(`
      UPDATE requisitions 
      SET status = 'cancelled', cancellation_reason = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [reason || '', id]);

    const result = await query('SELECT * FROM requisitions WHERE id = $1', [id]);
    res.json(successResponse(result[0], 'Requisition cancelled'));
  } catch (error: any) {
    console.error('Cancel requisition error:', error);
    res.status(500).json(errorResponse('Failed to cancel requisition: ' + error.message));
  }
});

// ==================== LEGACY ENDPOINTS - with company filtering ====================

// Get my requisitions
router.get('/my-requests', async (req: any, res) => {
  const staffId = req.user?.staffId || req.user?.userId;
  const companyId = req.user?.companyId;
  
  try {
    let sql = `
      SELECT r.*, 
        s.staff_name as requester_name, 
        d.staff_name as driver_name,
        v.registration_num
      FROM requisitions r
      JOIN staff s ON r.requested_by = s.id
      LEFT JOIN staff d ON r.driver_id = d.id
      LEFT JOIN vehicles v ON r.vehicle_id = v.id
      WHERE r.requested_by = $1
    `;
    let params: any[] = [staffId];
    
    if (companyId && companyId !== 'super_admin') {
      sql += ' AND s.company_id = $2';
      params.push(companyId);
    }
    
    sql += ' ORDER BY r.created_at DESC';
    
    const result = await query(sql, params);
    
    res.json(successResponse(result));
  } catch (error: any) {
    console.error('Get my requests error:', error);
    res.status(500).json(errorResponse('Failed to fetch requests: ' + error.message));
  }
});

// Get pending approvals - with company filtering
router.get('/pending-approvals', async (req: any, res) => {
  const userDept = req.user?.department;
  const userRole = req.user?.role;
  const companyId = req.user?.companyId;
  const isManager = ['admin', 'manager'].includes(userRole);
  
  try {
    let sql = `
      SELECT r.*, s.staff_name, s.email, s.department
      FROM requisitions r
      JOIN staff s ON r.requested_by = s.id
      WHERE r.status = 'pending'
    `;
    let params: any[] = [];
    
    if (companyId && companyId !== 'super_admin') {
      sql += ' AND s.company_id = $1';
      params.push(companyId);
    }
    
    if (!isManager) {
      const deptParam = companyId && companyId !== 'super_admin' ? '$2' : '$1';
      sql += ` AND s.department = ${deptParam}`;
      params.push(userDept);
    }
    
    sql += ' ORDER BY r.created_at DESC';
    
    const result = await query(sql, params);
    
    res.json(successResponse(result));
  } catch (error: any) {
    console.error('Get pending approvals error:', error);
    res.status(500).json(errorResponse('Failed to fetch pending approvals: ' + error.message));
  }
});

// Get pending allocations - with company filtering
router.get('/pending-allocations', async (req: any, res) => {
  const companyId = req.user?.companyId;
  
  try {
    let sql = `
      SELECT r.*, s.staff_name as requester_name, s.department
      FROM requisitions r
      JOIN staff s ON r.requested_by = s.id
      WHERE r.status = 'approved' AND r.vehicle_id IS NULL
    `;
    let params: any[] = [];
    
    if (companyId && companyId !== 'super_admin') {
      sql += ' AND s.company_id = $1';
      params.push(companyId);
    }
    
    sql += ' ORDER BY r.created_at DESC';
    
    const result = await query(sql, params);
    
    res.json(successResponse(result));
  } catch (error: any) {
    console.error('Get pending allocations error:', error);
    res.status(500).json(errorResponse('Failed to fetch pending allocations: ' + error.message));
  }
});

// Get dashboard stats - with company filtering
router.get('/stats', async (req: any, res) => {
  const userId = req.user?.userId;
  const staffId = req.user?.staffId;
  const userRole = req.user?.role;
  const companyId = req.user?.companyId;
  const isManager = ['admin', 'manager'].includes(userRole);
  
  try {
    // Build base WHERE clause for company filtering
    let companyFilter = '';
    let companyParams: any[] = [];
    if (companyId && companyId !== 'super_admin') {
      companyFilter = ' AND s.company_id = $1';
      companyParams.push(companyId);
    }
    
    // Total requests
    let totalRequestsQuery = `
      SELECT COUNT(*) as count FROM requisitions r 
      JOIN staff s ON r.requested_by = s.id 
      WHERE 1=1${companyFilter}
    `;
    let totalRequestsParams = [...companyParams];
    
    if (!isManager && staffId) {
      const staffParamIndex = companyParams.length + 1;
      totalRequestsQuery += ` AND r.requested_by = $${staffParamIndex}`;
      totalRequestsParams.push(staffId);
    }
    
    const totalRequests = await query(totalRequestsQuery, totalRequestsParams);
    
    // Pending approvals
    const pendingApprovals = await query(`
      SELECT COUNT(*) as count FROM requisitions r
      JOIN staff s ON r.requested_by = s.id
      WHERE r.status = 'pending'${companyFilter}
    `, companyParams);
    
    // Pending allocations
    const pendingAllocations = await query(`
      SELECT COUNT(*) as count FROM requisitions r
      JOIN staff s ON r.requested_by = s.id
      WHERE r.status = 'approved' AND r.vehicle_id IS NULL${companyFilter}
    `, companyParams);
    
    // My assignments
    let myAssignmentsQuery = `
      SELECT COUNT(*) as count FROM requisitions r
      JOIN staff s ON r.requested_by = s.id
      WHERE r.status IN ('allocated', 'in_progress')${companyFilter}
    `;
    let myAssignmentsParams = [...companyParams];
    
    if (!isManager && staffId) {
      const driverParamIndex = companyParams.length + 1;
      myAssignmentsQuery += ` AND r.driver_id = $${driverParamIndex}`;
      myAssignmentsParams.push(staffId);
    }
    
    const myAssignments = await query(myAssignmentsQuery, myAssignmentsParams);
    
    // Completed today
    const completedToday = await query(`
      SELECT COUNT(*) as count FROM requisitions r
      JOIN staff s ON r.requested_by = s.id
      WHERE r.status = 'completed' AND DATE(r.completed_at) = CURRENT_DATE${companyFilter}
    `, companyParams);
    
    res.json(successResponse({
      totalRequests: parseInt(totalRequests[0]?.count || 0),
      pendingApprovals: parseInt(pendingApprovals[0]?.count || 0),
      pendingAllocations: parseInt(pendingAllocations[0]?.count || 0),
      myAssignments: parseInt(myAssignments[0]?.count || 0),
      completedToday: parseInt(completedToday[0]?.count || 0)
    }));
  } catch (error: any) {
    console.error('Stats error:', error);
    res.status(500).json(errorResponse('Failed to fetch stats: ' + error.message));
  }
});

// ========== INSPECTION ENDPOINTS - with company verification ==========

// Submit driver inspection - with company verification
router.post('/:id/inspection', async (req: any, res) => {
  const { id } = req.params;
  const { 
    tires_ok, brakes_ok, lights_ok, oil_ok, coolant_ok,
    battery_ok, wipers_ok, mirrors_ok, seatbelts_ok, fuel_ok,
    defects_found, defect_photos, passed,
    starting_odometer
  } = req.body;
  const companyId = req.user?.companyId;

  try {
    // Verify requisition belongs to company
    let reqSql = `
      SELECT r.* FROM requisitions r
      JOIN staff s ON r.requested_by = s.id
      WHERE r.id = $1
    `;
    let reqParams: any[] = [id];
    if (companyId && companyId !== 'super_admin') {
      reqSql += ' AND s.company_id = $2';
      reqParams.push(companyId);
    }
    
    const reqResult = await query(reqSql, reqParams);
    if (reqResult.length === 0) {
      return res.status(404).json(errorResponse('Requisition not found'));
    }
    
    const requisition = reqResult[0];
    
    await query(`
      UPDATE requisitions 
      SET 
        inspection_tires = $1, inspection_brakes = $2, inspection_lights = $3,
        inspection_oil = $4, inspection_coolant = $5, inspection_battery = $6,
        inspection_wipers = $7, inspection_mirrors = $8, inspection_seatbelts = $9,
        inspection_fuel = $10, defects_found = $11, defect_photos = $12,
        inspection_passed = $13, inspection_completed_at = CURRENT_TIMESTAMP,
        starting_odometer = $14,
        status = $15
      WHERE id = $16
    `, [
      tires_ok, brakes_ok, lights_ok, oil_ok, coolant_ok,
      battery_ok, wipers_ok, mirrors_ok, seatbelts_ok, fuel_ok,
      defects_found || '', JSON.stringify(defect_photos || []),
      passed, starting_odometer || null,
      passed ? 'ready_for_departure' : 'inspection_failed',
      id
    ]);

    // If inspection failed, flag the vehicle as defective
    if (!passed && requisition.vehicle_id) {
      await query(`
        UPDATE vehicles 
        SET status = 'Defective', 
            defect_notes = $1,
            defect_reported_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [defects_found || 'Vehicle failed pre-trip inspection', requisition.vehicle_id]);
    }

    const result = await query(`
      SELECT r.*, v.registration_num, d.staff_name as driver_name
      FROM requisitions r
      LEFT JOIN vehicles v ON r.vehicle_id = v.id
      LEFT JOIN staff d ON r.driver_id = d.id
      WHERE r.id = $1
    `, [id]);

    res.json(successResponse({
      passed, 
      requisition: result[0],
      vehicle_flagged: !passed
    }, 'Inspection submitted'));
  } catch (error: any) {
    console.error('Inspection error:', error);
    res.status(500).json(errorResponse('Failed to submit inspection: ' + error.message));
  }
});

export default router;
