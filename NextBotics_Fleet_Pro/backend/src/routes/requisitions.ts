import { Router } from 'express';
import { query } from '../database';
import { v4 as uuidv4 } from 'uuid';
import emailService from '../services/email';

const router = Router();

// Helper to wrap responses
const successResponse = (data: any, message?: string) => ({ success: true, data, message });
const errorResponse = (error: string, details?: any) => ({ success: false, error, details });

// ==================== REQUISITION ROUTES ====================

// Create requisition request
router.post('/', async (req: any, res) => {
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
      // Find staff by email
      const staffByEmail = await query('SELECT id, staff_name, email, department FROM staff WHERE email = $1', [req.user.email]);
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
        companyId: req.user.companyId,
        staffName 
      });
      
      try {
        // Try to find existing staff first
        const existingStaff = await query('SELECT id FROM staff WHERE email = $1', [req.user.email]);
        
        if (existingStaff && existingStaff.length > 0) {
          // Use existing staff
          requesterId = existingStaff[0].id;
          staffEmail = req.user.email;
          console.log('Using existing staff record:', { staffId: requesterId });
        } else {
          // Create new staff
          const newStaffId = uuidv4();
          await query(`
            INSERT INTO staff (id, staff_name, email, role, department, company_id)
            VALUES ($1, $2, $3, 'Staff', 'General', $4)
          `, [newStaffId, staffName, req.user.email, req.user.companyId]);
          
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
          user: req.user ? { id: req.user.userId, email: req.user.email, companyId: req.user.companyId } : null,
          staffCreationError
        }
      }
    ));
  }

  try {
    // Check if staff has email
    const staffCheck = await query('SELECT staff_name, email, department FROM staff WHERE id = $1', [requesterId]);
    if (!staffCheck || staffCheck.length === 0) {
      return res.status(400).json(errorResponse('Staff not found', { staffId: requesterId }));
    }

    const staff = staffCheck[0];
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

// Get all requisitions
router.get('/', async (req: any, res) => {
  try {
    const { status, myRequests, page = 1, perPage = 20 } = req.query;
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
      WHERE 1=1
    `;
    let params: any[] = [];
    let paramIndex = 1;
    
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
    
    // Get total count
    let countQuery = `SELECT COUNT(*) as total FROM requisitions r WHERE 1=1`;
    let countParams: any[] = [];
    
    if (status) {
      countQuery += ` AND r.status = $1`;
      countParams.push(status);
    }
    if (myRequests === 'true' || (!isManager && !status)) {
      countQuery += ` AND r.requested_by = $${countParams.length + 1}`;
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

// Get single requisition
router.get('/:id', async (req: any, res) => {
  try {
    const { id } = req.params;
    
    const result = await query(`
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
    `, [id]);
    
    if (result.length === 0) {
      return res.status(404).json(errorResponse('Requisition not found'));
    }
    
    res.json(successResponse(result[0]));
  } catch (error: any) {
    console.error('Get requisition error:', error);
    res.status(500).json(errorResponse('Failed to fetch requisition: ' + error.message));
  }
});

// Approve requisition
router.post('/:id/approve', async (req: any, res) => {
  const { id } = req.params;
  const { notes, reason } = req.body;
  const staffId = req.user?.staffId;
  
  try {
    // First check if requisition exists and is pending
    const checkResult = await query('SELECT * FROM requisitions WHERE id = $1', [id]);
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

// Reject requisition
router.post('/:id/reject', async (req: any, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  const staffId = req.user?.staffId;
  
  if (!reason) {
    return res.status(400).json(errorResponse('Rejection reason is required'));
  }
  
  try {
    const checkResult = await query('SELECT * FROM requisitions WHERE id = $1', [id]);
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

// Allocate vehicle and driver
router.post('/:id/allocate', async (req: any, res) => {
  const { id } = req.params;
  const { vehicleId, driverId, vehicle_id, driver_id } = req.body;
  const staffId = req.user?.staffId;
  
  const vId = vehicleId || vehicle_id;
  const dId = driverId || driver_id;
  
  if (!vId || !dId) {
    return res.status(400).json(errorResponse('Vehicle and driver are required'));
  }

  try {
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

// Start trip (mark as in_progress)
router.post('/:id/start', async (req: any, res) => {
  const { id } = req.params;
  
  try {
    await query(`
      UPDATE requisitions 
      SET status = 'in_progress', departed_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND status = 'allocated'
    `, [id]);

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

// Complete trip
router.post('/:id/complete', async (req: any, res) => {
  const { id } = req.params;
  const { endingOdometer, endOdometer, notes } = req.body;
  
  const finalOdometer = endingOdometer || endOdometer;
  
  try {
    const tripData = await query('SELECT * FROM requisitions WHERE id = $1', [id]);
    if (tripData.length === 0) {
      return res.status(404).json(errorResponse('Requisition not found'));
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

// Cancel requisition
router.post('/:id/cancel', async (req: any, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  
  try {
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

// ==================== LEGACY ENDPOINTS ====================

// Get my requisitions
router.get('/my-requests', async (req: any, res) => {
  const staffId = req.user?.staffId || req.user?.userId;
  
  try {
    const result = await query(`
      SELECT r.*, 
        s.staff_name as requester_name, 
        d.staff_name as driver_name,
        v.registration_num
      FROM requisitions r
      JOIN staff s ON r.requested_by = s.id
      LEFT JOIN staff d ON r.driver_id = d.id
      LEFT JOIN vehicles v ON r.vehicle_id = v.id
      WHERE r.requested_by = $1
      ORDER BY r.created_at DESC
    `, [staffId]);
    
    res.json(successResponse(result));
  } catch (error: any) {
    console.error('Get my requests error:', error);
    res.status(500).json(errorResponse('Failed to fetch requests: ' + error.message));
  }
});

// Get pending approvals
router.get('/pending-approvals', async (req: any, res) => {
  const userDept = req.user?.department;
  const userRole = req.user?.role;
  const isManager = ['admin', 'manager'].includes(userRole);
  
  try {
    let result;
    
    if (isManager) {
      result = await query(`
        SELECT r.*, s.staff_name, s.email, s.department
        FROM requisitions r
        JOIN staff s ON r.requested_by = s.id
        WHERE r.status = 'pending'
        ORDER BY r.created_at DESC
      `);
    } else {
      result = await query(`
        SELECT r.*, s.staff_name, s.email, s.department
        FROM requisitions r
        JOIN staff s ON r.requested_by = s.id
        WHERE r.status = 'pending' AND s.department = $1
        ORDER BY r.created_at DESC
      `, [userDept]);
    }
    
    res.json(successResponse(result));
  } catch (error: any) {
    console.error('Get pending approvals error:', error);
    res.status(500).json(errorResponse('Failed to fetch pending approvals: ' + error.message));
  }
});

// Get pending allocations
router.get('/pending-allocations', async (req: any, res) => {
  try {
    const result = await query(`
      SELECT r.*, s.staff_name as requester_name, s.department
      FROM requisitions r
      JOIN staff s ON r.requested_by = s.id
      WHERE r.status = 'approved' AND r.vehicle_id IS NULL
      ORDER BY r.created_at DESC
    `);
    
    res.json(successResponse(result));
  } catch (error: any) {
    console.error('Get pending allocations error:', error);
    res.status(500).json(errorResponse('Failed to fetch pending allocations: ' + error.message));
  }
});

// Get dashboard stats
router.get('/stats', async (req: any, res) => {
  const userId = req.user?.userId;
  const staffId = req.user?.staffId;
  const userRole = req.user?.role;
  const isManager = ['admin', 'manager'].includes(userRole);
  
  try {
    // Total requests
    let totalRequestsQuery = 'SELECT COUNT(*) as count FROM requisitions';
    let totalRequestsParams: any[] = [];
    
    if (!isManager && staffId) {
      totalRequestsQuery += ' WHERE requested_by = $1';
      totalRequestsParams.push(staffId);
    }
    
    const totalRequests = await query(totalRequestsQuery, totalRequestsParams);
    
    // Pending approvals
    const pendingApprovals = await query(`
      SELECT COUNT(*) as count FROM requisitions WHERE status = 'pending'
    `);
    
    // Pending allocations
    const pendingAllocations = await query(`
      SELECT COUNT(*) as count FROM requisitions WHERE status = 'approved' AND vehicle_id IS NULL
    `);
    
    // My assignments
    let myAssignmentsQuery = `SELECT COUNT(*) as count FROM requisitions WHERE status IN ('allocated', 'in_progress')`;
    let myAssignmentsParams: any[] = [];
    
    if (!isManager && staffId) {
      myAssignmentsQuery += ' AND driver_id = $1';
      myAssignmentsParams.push(staffId);
    }
    
    const myAssignments = await query(myAssignmentsQuery, myAssignmentsParams);
    
    // Completed today
    const completedToday = await query(`
      SELECT COUNT(*) as count FROM requisitions 
      WHERE status = 'completed' AND DATE(completed_at) = CURRENT_DATE
    `);
    
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

// ========== INSPECTION ENDPOINTS ==========

// Submit driver inspection
router.post('/:id/inspection', async (req: any, res) => {
  const { id } = req.params;
  const { 
    tires_ok, brakes_ok, lights_ok, oil_ok, coolant_ok,
    battery_ok, wipers_ok, mirrors_ok, seatbelts_ok, fuel_ok,
    defects_found, defect_photos, passed,
    starting_odometer
  } = req.body;

  try {
    const reqResult = await query('SELECT * FROM requisitions WHERE id = $1', [id]);
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
