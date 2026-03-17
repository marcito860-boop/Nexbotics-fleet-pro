import { query } from '../database';

export type AssignmentStatus = 'active' | 'completed' | 'cancelled';

export interface VehicleAssignment {
  id: string;
  companyId: string;
  vehicleId: string;
  driverId: string;
  assignedBy?: string;
  assignedAt: Date;
  unassignedAt?: Date;
  startDate: Date;
  endDate?: Date;
  purpose?: string;
  status: AssignmentStatus;
  createdAt: Date;
  updatedAt: Date;
  // Joined fields
  vehicle?: {
    id: string;
    registrationNumber: string;
    make: string;
    model: string;
  };
  driver?: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
  };
}

export interface CreateAssignmentInput {
  vehicleId: string;
  driverId: string;
  startDate: Date;
  endDate?: Date;
  purpose?: string;
}

export interface UpdateAssignmentInput {
  endDate?: Date;
  purpose?: string;
  status?: AssignmentStatus;
}

function mapRowToAssignment(row: any): VehicleAssignment {
  return {
    id: row.id,
    companyId: row.company_id,
    vehicleId: row.vehicle_id,
    driverId: row.driver_id,
    assignedBy: row.assigned_by,
    assignedAt: new Date(row.assigned_at),
    unassignedAt: row.unassigned_at ? new Date(row.unassigned_at) : undefined,
    startDate: new Date(row.start_date),
    endDate: row.end_date ? new Date(row.end_date) : undefined,
    purpose: row.purpose,
    status: row.status,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export class AssignmentModel {
  static async findById(id: string, companyId: string): Promise<VehicleAssignment | null> {
    const rows = await query(
      `SELECT va.*, 
        v.registration_number as v_reg, v.make as v_make, v.model as v_model,
        d.first_name as d_fname, d.last_name as d_lname, d.email as d_email, d.phone as d_phone
       FROM vehicle_assignments va
       LEFT JOIN vehicles v ON va.vehicle_id = v.id
       LEFT JOIN drivers d ON va.driver_id = d.id
       WHERE va.id = $1 AND va.company_id = $2`,
      [id, companyId]
    );
    
    if (rows.length === 0) return null;
    
    const row = rows[0];
    const assignment = mapRowToAssignment(row);
    
    if (row.v_reg) {
      assignment.vehicle = {
        id: row.vehicle_id,
        registrationNumber: row.v_reg,
        make: row.v_make,
        model: row.v_model,
      };
    }
    
    if (row.d_fname) {
      assignment.driver = {
        id: row.driver_id,
        firstName: row.d_fname,
        lastName: row.d_lname,
        email: row.d_email,
        phone: row.d_phone,
      };
    }
    
    return assignment;
  }

  static async findByCompany(companyId: string, options?: {
    status?: AssignmentStatus;
    vehicleId?: string;
    driverId?: string;
    activeOnly?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{ assignments: VehicleAssignment[]; total: number }> {
    let sql = `
      SELECT va.*, 
        v.registration_number as v_reg, v.make as v_make, v.model as v_model,
        d.first_name as d_fname, d.last_name as d_lname, d.email as d_email, d.phone as d_phone
      FROM vehicle_assignments va
      LEFT JOIN vehicles v ON va.vehicle_id = v.id
      LEFT JOIN drivers d ON va.driver_id = d.id
      WHERE va.company_id = $1
    `;
    let countSql = 'SELECT COUNT(*) as total FROM vehicle_assignments WHERE company_id = $1';
    const params: any[] = [companyId];

    if (options?.status) {
      sql += ` AND va.status = $${params.length + 1}`;
      countSql += ` AND status = $${params.length + 1}`;
      params.push(options.status);
    }

    if (options?.vehicleId) {
      sql += ` AND va.vehicle_id = $${params.length + 1}`;
      countSql += ` AND vehicle_id = $${params.length + 1}`;
      params.push(options.vehicleId);
    }

    if (options?.driverId) {
      sql += ` AND va.driver_id = $${params.length + 1}`;
      countSql += ` AND driver_id = $${params.length + 1}`;
      params.push(options.driverId);
    }

    if (options?.activeOnly) {
      sql += ` AND va.status = 'active'`;
      countSql += ` AND status = 'active'`;
    }

    sql += ' ORDER BY va.assigned_at DESC';

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

    const assignments = rows.map((row: any) => {
      const assignment = mapRowToAssignment(row);
      
      if (row.v_reg) {
        assignment.vehicle = {
          id: row.vehicle_id,
          registrationNumber: row.v_reg,
          make: row.v_make,
          model: row.v_model,
        };
      }
      
      if (row.d_fname) {
        assignment.driver = {
          id: row.driver_id,
          firstName: row.d_fname,
          lastName: row.d_lname,
          email: row.d_email,
          phone: row.d_phone,
        };
      }
      
      return assignment;
    });

    return {
      assignments,
      total: parseInt(countRows[0].total)
    };
  }

  static async getActiveAssignmentForVehicle(vehicleId: string, companyId: string): Promise<VehicleAssignment | null> {
    const rows = await query(
      `SELECT * FROM vehicle_assignments 
       WHERE vehicle_id = $1 AND company_id = $2 AND status = 'active'
       LIMIT 1`,
      [vehicleId, companyId]
    );
    return rows.length > 0 ? mapRowToAssignment(rows[0]) : null;
  }

  static async create(companyId: string, assignedBy: string, input: CreateAssignmentInput): Promise<VehicleAssignment> {
    const rows = await query(
      `INSERT INTO vehicle_assignments (
        company_id, vehicle_id, driver_id, assigned_by, start_date, end_date, purpose
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        companyId,
        input.vehicleId,
        input.driverId,
        assignedBy,
        input.startDate,
        input.endDate || null,
        input.purpose || null,
      ]
    );

    // Update vehicle status to assigned
    await query(
      "UPDATE vehicles SET status = 'assigned' WHERE id = $1 AND company_id = $2",
      [input.vehicleId, companyId]
    );

    return mapRowToAssignment(rows[0]);
  }

  static async complete(id: string, companyId: string): Promise<VehicleAssignment | null> {
    const assignment = await this.findById(id, companyId);
    if (!assignment) return null;

    const rows = await query(
      `UPDATE vehicle_assignments 
       SET status = 'completed', unassigned_at = CURRENT_TIMESTAMP 
       WHERE id = $1 AND company_id = $2 
       RETURNING *`,
      [id, companyId]
    );

    // Update vehicle status back to available
    await query(
      "UPDATE vehicles SET status = 'available' WHERE id = $1 AND company_id = $2",
      [assignment.vehicleId, companyId]
    );

    return mapRowToAssignment(rows[0]);
  }

  static async cancel(id: string, companyId: string): Promise<VehicleAssignment | null> {
    const assignment = await this.findById(id, companyId);
    if (!assignment) return null;

    const rows = await query(
      `UPDATE vehicle_assignments 
       SET status = 'cancelled', unassigned_at = CURRENT_TIMESTAMP 
       WHERE id = $1 AND company_id = $2 
       RETURNING *`,
      [id, companyId]
    );

    // Update vehicle status back to available
    await query(
      "UPDATE vehicles SET status = 'available' WHERE id = $1 AND company_id = $2",
      [assignment.vehicleId, companyId]
    );

    return mapRowToAssignment(rows[0]);
  }

  static async update(id: string, companyId: string, input: UpdateAssignmentInput): Promise<VehicleAssignment | null> {
    const updates: string[] = [];
    const params: any[] = [];

    if (input.endDate !== undefined) {
      updates.push(`end_date = $${params.length + 1}`);
      params.push(input.endDate);
    }

    if (input.purpose !== undefined) {
      updates.push(`purpose = $${params.length + 1}`);
      params.push(input.purpose);
    }

    if (input.status !== undefined) {
      updates.push(`status = $${params.length + 1}`);
      params.push(input.status);
    }

    if (updates.length === 0) return this.findById(id, companyId);

    params.push(id, companyId);

    const rows = await query(
      `UPDATE vehicle_assignments SET ${updates.join(', ')} WHERE id = $${params.length - 1} AND company_id = $${params.length} RETURNING *`,
      params
    );

    return rows.length > 0 ? mapRowToAssignment(rows[0]) : null;
  }
}
