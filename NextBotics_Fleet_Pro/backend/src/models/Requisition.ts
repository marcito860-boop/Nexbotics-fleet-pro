import { query } from '../database';

export type RequisitionStatus = 'pending' | 'approved' | 'rejected' | 'allocated' | 'in_progress' | 'completed' | 'cancelled';
export type RequisitionPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface VehicleRequisition {
  id: string;
  companyId: string;
  requestNumber: string;
  requestedBy: string;
  requesterName: string;
  requesterDepartment?: string;
  requesterPhone?: string;
  purpose: string;
  destination?: string;
  passengersCount: number;
  startDate: Date;
  endDate: Date;
  preferredVehicleType?: string;
  requiresDriver: boolean;
  priority: RequisitionPriority;
  status: RequisitionStatus;
  approvedBy?: string;
  approvedAt?: Date;
  approvalNotes?: string;
  rejectionReason?: string;
  allocatedVehicleId?: string;
  allocatedDriverId?: string;
  allocatedBy?: string;
  allocatedAt?: Date;
  actualStartTime?: Date;
  actualEndTime?: Date;
  actualStartOdometer?: number;
  actualEndOdometer?: number;
  tripRemarks?: string;
  createdAt: Date;
  updatedAt: Date;
  // Joined fields
  requester?: {
    email: string;
    firstName: string;
    lastName: string;
  };
  approver?: {
    firstName: string;
    lastName: string;
  };
  allocator?: {
    firstName: string;
    lastName: string;
  };
  allocatedVehicle?: {
    registrationNumber: string;
    make: string;
    model: string;
  };
  allocatedDriver?: {
    firstName: string;
    lastName: string;
  };
}

export interface RequisitionWorkflowHistory {
  id: string;
  companyId: string;
  requisitionId: string;
  action: 'submitted' | 'approved' | 'rejected' | 'allocated' | 'started' | 'completed' | 'cancelled';
  actionBy: string;
  actionAt: Date;
  notes?: string;
  metadata?: any;
  actor?: {
    firstName: string;
    lastName: string;
  };
}

function mapRowToRequisition(row: any): VehicleRequisition {
  return {
    id: row.id,
    companyId: row.company_id,
    requestNumber: row.request_number,
    requestedBy: row.requested_by,
    requesterName: row.requester_name,
    requesterDepartment: row.requester_department,
    requesterPhone: row.requester_phone,
    purpose: row.purpose,
    destination: row.destination,
    passengersCount: row.passengers_count || 1,
    startDate: new Date(row.start_date),
    endDate: new Date(row.end_date),
    preferredVehicleType: row.preferred_vehicle_type,
    requiresDriver: row.requires_driver,
    priority: row.priority,
    status: row.status,
    approvedBy: row.approved_by,
    approvedAt: row.approved_at ? new Date(row.approved_at) : undefined,
    approvalNotes: row.approval_notes,
    rejectionReason: row.rejection_reason,
    allocatedVehicleId: row.allocated_vehicle_id,
    allocatedDriverId: row.allocated_driver_id,
    allocatedBy: row.allocated_by,
    allocatedAt: row.allocated_at ? new Date(row.allocated_at) : undefined,
    actualStartTime: row.actual_start_time ? new Date(row.actual_start_time) : undefined,
    actualEndTime: row.actual_end_time ? new Date(row.actual_end_time) : undefined,
    actualStartOdometer: row.actual_start_odometer ? parseFloat(row.actual_start_odometer) : undefined,
    actualEndOdometer: row.actual_end_odometer ? parseFloat(row.actual_end_odometer) : undefined,
    tripRemarks: row.trip_remarks,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export class RequisitionModel {
  static async generateRequestNumber(companyId: string): Promise<string> {
    const date = new Date();
    const prefix = `REQ-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    const rows = await query(
      `SELECT COUNT(*) as count FROM vehicle_requisitions 
       WHERE company_id = $1 AND request_number LIKE $2`,
      [companyId, `${prefix}-%`]
    );
    
    const count = parseInt(rows[0].count) + 1;
    return `${prefix}-${String(count).padStart(4, '0')}`;
  }

  static async findById(id: string, companyId: string): Promise<VehicleRequisition | null> {
    const rows = await query(
      `SELECT r.*,
        u.email as u_email, u.first_name as u_fname, u.last_name as u_lname,
        approver.first_name as app_fname, approver.last_name as app_lname,
        allocator.first_name as alloc_fname, allocator.last_name as alloc_lname,
        v.registration_number as v_reg, v.make as v_make, v.model as v_model,
        d.first_name as d_fname, d.last_name as d_lname
       FROM vehicle_requisitions r
       LEFT JOIN users u ON r.requested_by = u.id
       LEFT JOIN users approver ON r.approved_by = approver.id
       LEFT JOIN users allocator ON r.allocated_by = allocator.id
       LEFT JOIN vehicles v ON r.allocated_vehicle_id = v.id
       LEFT JOIN drivers d ON r.allocated_driver_id = d.id
       WHERE r.id = $1 AND r.company_id = $2`,
      [id, companyId]
    );
    
    if (rows.length === 0) return null;
    
    const req = mapRowToRequisition(rows[0]);
    
    if (rows[0].u_email) {
      req.requester = {
        email: rows[0].u_email,
        firstName: rows[0].u_fname,
        lastName: rows[0].u_lname,
      };
    }
    if (rows[0].app_fname) {
      req.approver = {
        firstName: rows[0].app_fname,
        lastName: rows[0].app_lname,
      };
    }
    if (rows[0].alloc_fname) {
      req.allocator = {
        firstName: rows[0].alloc_fname,
        lastName: rows[0].alloc_lname,
      };
    }
    if (rows[0].v_reg) {
      req.allocatedVehicle = {
        registrationNumber: rows[0].v_reg,
        make: rows[0].v_make,
        model: rows[0].v_model,
      };
    }
    if (rows[0].d_fname) {
      req.allocatedDriver = {
        firstName: rows[0].d_fname,
        lastName: rows[0].d_lname,
      };
    }
    
    return req;
  }

  static async findByCompany(companyId: string, options?: {
    status?: RequisitionStatus;
    requestedBy?: string;
    dateFrom?: Date;
    dateTo?: Date;
    limit?: number;
    offset?: number;
  }): Promise<{ requisitions: VehicleRequisition[]; total: number }> {
    let sql = `
      SELECT r.*,
        u.email as u_email, u.first_name as u_fname, u.last_name as u_lname,
        v.registration_number as v_reg, v.make as v_make, v.model as v_model,
        d.first_name as d_fname, d.last_name as d_lname
      FROM vehicle_requisitions r
      LEFT JOIN users u ON r.requested_by = u.id
      LEFT JOIN vehicles v ON r.allocated_vehicle_id = v.id
      LEFT JOIN drivers d ON r.allocated_driver_id = d.id
      WHERE r.company_id = $1
    `;
    let countSql = 'SELECT COUNT(*) as total FROM vehicle_requisitions WHERE company_id = $1';
    const params: any[] = [companyId];

    if (options?.status) {
      sql += ` AND r.status = $${params.length + 1}`;
      countSql += ` AND status = $${params.length + 1}`;
      params.push(options.status);
    }

    if (options?.requestedBy) {
      sql += ` AND r.requested_by = $${params.length + 1}`;
      countSql += ` AND requested_by = $${params.length + 1}`;
      params.push(options.requestedBy);
    }

    if (options?.dateFrom) {
      sql += ` AND r.start_date >= $${params.length + 1}`;
      countSql += ` AND start_date >= $${params.length + 1}`;
      params.push(options.dateFrom);
    }

    if (options?.dateTo) {
      sql += ` AND r.end_date <= $${params.length + 1}`;
      countSql += ` AND end_date <= $${params.length + 1}`;
      params.push(options.dateTo);
    }

    sql += ' ORDER BY r.created_at DESC';

    if (options?.limit) {
      sql += ` LIMIT $${params.length + 1}`;
      params.push(options.limit);
      if (options?.offset) {
        sql += ` OFFSET $${params.length + 1}`;
        params.push(options.offset);
      }
    }

    const [rows, countRows] = await Promise.all([
      query(sql, params),
      query(countSql, params.slice(0, options?.limit ? params.length - (options.offset ? 2 : 1) : params.length))
    ]);

    const requisitions = rows.map((row: any) => {
      const req = mapRowToRequisition(row);
      if (row.u_email) {
        req.requester = {
          email: row.u_email,
          firstName: row.u_fname,
          lastName: row.u_lname,
        };
      }
      if (row.v_reg) {
        req.allocatedVehicle = {
          registrationNumber: row.v_reg,
          make: row.v_make,
          model: row.v_model,
        };
      }
      if (row.d_fname) {
        req.allocatedDriver = {
          firstName: row.d_fname,
          lastName: row.d_lname,
        };
      }
      return req;
    });

    return { requisitions, total: parseInt(countRows[0].total) };
  }

  static async create(companyId: string, data: Partial<VehicleRequisition>): Promise<VehicleRequisition> {
    const requestNumber = await this.generateRequestNumber(companyId);
    
    const rows = await query(
      `INSERT INTO vehicle_requisitions (
        company_id, request_number, requested_by, requester_name, requester_department,
        requester_phone, purpose, destination, passengers_count, start_date, end_date,
        preferred_vehicle_type, requires_driver, priority
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *`,
      [
        companyId,
        requestNumber,
        data.requestedBy,
        data.requesterName,
        data.requesterDepartment,
        data.requesterPhone,
        data.purpose,
        data.destination,
        data.passengersCount || 1,
        data.startDate,
        data.endDate,
        data.preferredVehicleType,
        data.requiresDriver ?? true,
        data.priority || 'normal',
      ]
    );

    const requisition = mapRowToRequisition(rows[0]);
    
    // Log workflow history
    await this.logWorkflowHistory(companyId, requisition.id, 'submitted', data.requestedBy!, 'Requisition submitted');
    
    return requisition;
  }

  static async approve(id: string, companyId: string, approvedBy: string, notes?: string): Promise<VehicleRequisition | null> {
    const rows = await query(
      `UPDATE vehicle_requisitions 
       SET status = 'approved', approved_by = $1, approved_at = NOW(), approval_notes = $2
       WHERE id = $3 AND company_id = $4 AND status = 'pending'
       RETURNING *`,
      [approvedBy, notes, id, companyId]
    );

    if (rows.length === 0) return null;
    
    await this.logWorkflowHistory(companyId, id, 'approved', approvedBy, notes || 'Requisition approved');
    return this.findById(id, companyId);
  }

  static async reject(id: string, companyId: string, rejectedBy: string, reason: string): Promise<VehicleRequisition | null> {
    const rows = await query(
      `UPDATE vehicle_requisitions 
       SET status = 'rejected', approved_by = $1, approved_at = NOW(), rejection_reason = $2
       WHERE id = $3 AND company_id = $4 AND status = 'pending'
       RETURNING *`,
      [rejectedBy, reason, id, companyId]
    );

    if (rows.length === 0) return null;
    
    await this.logWorkflowHistory(companyId, id, 'rejected', rejectedBy, `Rejected: ${reason}`);
    return this.findById(id, companyId);
  }

  static async allocate(
    id: string, 
    companyId: string, 
    allocatedBy: string, 
    vehicleId: string, 
    driverId?: string
  ): Promise<VehicleRequisition | null> {
    const rows = await query(
      `UPDATE vehicle_requisitions 
       SET status = 'allocated', allocated_vehicle_id = $1, allocated_driver_id = $2,
           allocated_by = $3, allocated_at = NOW()
       WHERE id = $4 AND company_id = $5 AND status = 'approved'
       RETURNING *`,
      [vehicleId, driverId, allocatedBy, id, companyId]
    );

    if (rows.length === 0) return null;
    
    // Update vehicle status to assigned
    await query(
      "UPDATE vehicles SET status = 'assigned', updated_at = NOW() WHERE id = $1 AND company_id = $2",
      [vehicleId, companyId]
    );
    
    await this.logWorkflowHistory(companyId, id, 'allocated', allocatedBy, `Allocated vehicle ${vehicleId}`);
    return this.findById(id, companyId);
  }

  static async startTrip(id: string, companyId: string, odometer: number): Promise<VehicleRequisition | null> {
    const rows = await query(
      `UPDATE vehicle_requisitions 
       SET status = 'in_progress', actual_start_time = NOW(), actual_start_odometer = $1
       WHERE id = $2 AND company_id = $3 AND status = 'allocated'
       RETURNING *`,
      [odometer, id, companyId]
    );

    if (rows.length === 0) return null;
    
    const req = mapRowToRequisition(rows[0]);
    await this.logWorkflowHistory(companyId, id, 'started', req.allocatedBy || req.requestedBy, 'Trip started');
    return this.findById(id, companyId);
  }

  static async completeTrip(
    id: string, 
    companyId: string, 
    odometer: number, 
    remarks?: string
  ): Promise<VehicleRequisition | null> {
    const rows = await query(
      `UPDATE vehicle_requisitions 
       SET status = 'completed', actual_end_time = NOW(), actual_end_odometer = $1, trip_remarks = $2
       WHERE id = $3 AND company_id = $4 AND status = 'in_progress'
       RETURNING *`,
      [odometer, remarks, id, companyId]
    );

    if (rows.length === 0) return null;
    
    const req = mapRowToRequisition(rows[0]);
    
    // Return vehicle to available status
    if (req.allocatedVehicleId) {
      await query(
        "UPDATE vehicles SET status = 'available', current_odometer = $1, updated_at = NOW() WHERE id = $2 AND company_id = $3",
        [odometer, req.allocatedVehicleId, companyId]
      );
    }
    
    await this.logWorkflowHistory(companyId, id, 'completed', req.allocatedBy || req.requestedBy, 'Trip completed');
    return this.findById(id, companyId);
  }

  static async cancel(id: string, companyId: string, cancelledBy: string, reason?: string): Promise<VehicleRequisition | null> {
    const req = await this.findById(id, companyId);
    if (!req) return null;
    
    // Can only cancel if not already completed
    if (req.status === 'completed') return null;
    
    const rows = await query(
      `UPDATE vehicle_requisitions 
       SET status = 'cancelled'
       WHERE id = $1 AND company_id = $2
       RETURNING *`,
      [id, companyId]
    );

    if (rows.length === 0) return null;
    
    // Return vehicle to available if it was allocated
    if (req.allocatedVehicleId && req.status !== 'pending') {
      await query(
        "UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = $1 AND company_id = $2",
        [req.allocatedVehicleId, companyId]
      );
    }
    
    await this.logWorkflowHistory(companyId, id, 'cancelled', cancelledBy, reason || 'Requisition cancelled');
    return this.findById(id, companyId);
  }

  static async getWorkflowHistory(requisitionId: string, companyId: string): Promise<RequisitionWorkflowHistory[]> {
    const rows = await query(
      `SELECT h.*, u.first_name, u.last_name
       FROM requisition_workflow_history h
       LEFT JOIN users u ON h.action_by = u.id
       WHERE h.requisition_id = $1 AND h.company_id = $2
       ORDER BY h.action_at ASC`,
      [requisitionId, companyId]
    );

    return rows.map((row: any) => ({
      id: row.id,
      companyId: row.company_id,
      requisitionId: row.requisition_id,
      action: row.action,
      actionBy: row.action_by,
      actionAt: new Date(row.action_at),
      notes: row.notes,
      metadata: row.metadata,
      actor: row.first_name ? {
        firstName: row.first_name,
        lastName: row.last_name,
      } : undefined,
    }));
  }

  static async getStats(companyId: string): Promise<{
    total: number;
    pending: number;
    approved: number;
    allocated: number;
    inProgress: number;
    completed: number;
    rejected: number;
    cancelled: number;
  }> {
    const rows = await query(
      `SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved,
        COUNT(CASE WHEN status = 'allocated' THEN 1 END) as allocated,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled
       FROM vehicle_requisitions 
       WHERE company_id = $1`,
      [companyId]
    );

    return {
      total: parseInt(rows[0].total),
      pending: parseInt(rows[0].pending),
      approved: parseInt(rows[0].approved),
      allocated: parseInt(rows[0].allocated),
      inProgress: parseInt(rows[0].in_progress),
      completed: parseInt(rows[0].completed),
      rejected: parseInt(rows[0].rejected),
      cancelled: parseInt(rows[0].cancelled),
    };
  }

  private static async logWorkflowHistory(
    companyId: string, 
    requisitionId: string, 
    action: string, 
    actionBy: string, 
    notes?: string
  ): Promise<void> {
    await query(
      `INSERT INTO requisition_workflow_history (company_id, requisition_id, action, action_by, notes)
       VALUES ($1, $2, $3, $4, $5)`,
      [companyId, requisitionId, action, actionBy, notes]
    );
  }
}
