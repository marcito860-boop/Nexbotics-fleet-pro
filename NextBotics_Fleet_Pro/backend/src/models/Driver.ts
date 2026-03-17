import { query } from '../database';

export type DriverStatus = 'active' | 'inactive' | 'suspended' | 'terminated';

export interface Driver {
  id: string;
  companyId: string;
  userId?: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  licenseNumber?: string;
  licenseExpiry?: Date;
  licenseClass?: string;
  dateOfBirth?: Date;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  address?: string;
  hireDate?: Date;
  status: DriverStatus;
  safetyScore: number;
  totalTrips: number;
  totalDistance: number;
  rating: number;
  notes?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateDriverInput {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  licenseNumber?: string;
  licenseExpiry?: Date;
  licenseClass?: string;
  dateOfBirth?: Date;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  address?: string;
  hireDate?: Date;
  notes?: string;
}

export interface UpdateDriverInput extends Partial<CreateDriverInput> {
  status?: DriverStatus;
  isActive?: boolean;
  safetyScore?: number;
  totalTrips?: number;
  totalDistance?: number;
  rating?: number;
}

function mapRowToDriver(row: any): Driver {
  return {
    id: row.id,
    companyId: row.company_id,
    userId: row.user_id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    phone: row.phone,
    licenseNumber: row.license_number,
    licenseExpiry: row.license_expiry ? new Date(row.license_expiry) : undefined,
    licenseClass: row.license_class,
    dateOfBirth: row.date_of_birth ? new Date(row.date_of_birth) : undefined,
    emergencyContactName: row.emergency_contact_name,
    emergencyContactPhone: row.emergency_contact_phone,
    address: row.address,
    hireDate: row.hire_date ? new Date(row.hire_date) : undefined,
    status: row.status,
    safetyScore: parseInt(row.safety_score || 100),
    totalTrips: parseInt(row.total_trips || 0),
    totalDistance: parseFloat(row.total_distance || 0),
    rating: parseFloat(row.rating || 5),
    notes: row.notes,
    isActive: row.is_active,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export class DriverModel {
  static async findById(id: string, companyId: string): Promise<Driver | null> {
    const rows = await query(
      'SELECT * FROM drivers WHERE id = $1 AND company_id = $2',
      [id, companyId]
    );
    return rows.length > 0 ? mapRowToDriver(rows[0]) : null;
  }

  static async findByUserId(userId: string, companyId: string): Promise<Driver | null> {
    const rows = await query(
      'SELECT * FROM drivers WHERE user_id = $1 AND company_id = $2',
      [userId, companyId]
    );
    return rows.length > 0 ? mapRowToDriver(rows[0]) : null;
  }

  static async findByCompany(companyId: string, options?: {
    status?: DriverStatus;
    isActive?: boolean;
    limit?: number;
    offset?: number;
    search?: string;
  }): Promise<{ drivers: Driver[]; total: number }> {
    let sql = 'SELECT * FROM drivers WHERE company_id = $1';
    let countSql = 'SELECT COUNT(*) as total FROM drivers WHERE company_id = $1';
    const params: any[] = [companyId];

    if (options?.status) {
      sql += ` AND status = $${params.length + 1}`;
      countSql += ` AND status = $${params.length + 1}`;
      params.push(options.status);
    }

    if (options?.isActive !== undefined) {
      sql += ` AND is_active = $${params.length + 1}`;
      countSql += ` AND is_active = $${params.length + 1}`;
      params.push(options.isActive);
    }

    if (options?.search) {
      const searchTerm = `%${options.search}%`;
      sql += ` AND (first_name ILIKE $${params.length + 1} OR last_name ILIKE $${params.length + 1} OR email ILIKE $${params.length + 1})`;
      countSql += ` AND (first_name ILIKE $${params.length + 1} OR last_name ILIKE $${params.length + 1} OR email ILIKE $${params.length + 1})`;
      params.push(searchTerm);
    }

    sql += ' ORDER BY created_at DESC';

    if (options?.limit) {
      sql += ` LIMIT $${params.length + 1}`;
      params.push(options.limit);

      if (options?.offset) {
        sql += ` OFFSET $${params.length + 1}`;
        params.push(options.offset);
      }
    }

    const [driverRows, countRows] = await Promise.all([
      query(sql, params),
      query(countSql, params.slice(0, options?.limit ? params.length - (options.offset ? 2 : 1) : params.length))
    ]);

    return {
      drivers: driverRows.map(mapRowToDriver),
      total: parseInt(countRows[0].total)
    };
  }

  static async create(companyId: string, input: CreateDriverInput, userId?: string): Promise<Driver> {
    const rows = await query(
      `INSERT INTO drivers (
        company_id, user_id, first_name, last_name, email, phone,
        license_number, license_expiry, license_class, date_of_birth,
        emergency_contact_name, emergency_contact_phone, address, hire_date, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *`,
      [
        companyId,
        userId || null,
        input.firstName,
        input.lastName,
        input.email || null,
        input.phone || null,
        input.licenseNumber || null,
        input.licenseExpiry || null,
        input.licenseClass || null,
        input.dateOfBirth || null,
        input.emergencyContactName || null,
        input.emergencyContactPhone || null,
        input.address || null,
        input.hireDate || null,
        input.notes || null,
      ]
    );

    return mapRowToDriver(rows[0]);
  }

  static async update(id: string, companyId: string, input: UpdateDriverInput): Promise<Driver | null> {
    const updates: string[] = [];
    const params: any[] = [];

    const fieldMap: Record<string, string> = {
      firstName: 'first_name',
      lastName: 'last_name',
      email: 'email',
      phone: 'phone',
      licenseNumber: 'license_number',
      licenseExpiry: 'license_expiry',
      licenseClass: 'license_class',
      dateOfBirth: 'date_of_birth',
      emergencyContactName: 'emergency_contact_name',
      emergencyContactPhone: 'emergency_contact_phone',
      address: 'address',
      hireDate: 'hire_date',
      status: 'status',
      safetyScore: 'safety_score',
      totalTrips: 'total_trips',
      totalDistance: 'total_distance',
      rating: 'rating',
      notes: 'notes',
      isActive: 'is_active',
    };

    for (const [key, value] of Object.entries(input)) {
      if (value !== undefined && fieldMap[key]) {
        updates.push(`${fieldMap[key]} = $${params.length + 1}`);
        params.push(value);
      }
    }

    if (updates.length === 0) return this.findById(id, companyId);

    params.push(id, companyId);

    const rows = await query(
      `UPDATE drivers SET ${updates.join(', ')} WHERE id = $${params.length - 1} AND company_id = $${params.length} RETURNING *`,
      params
    );

    return rows.length > 0 ? mapRowToDriver(rows[0]) : null;
  }

  static async delete(id: string, companyId: string): Promise<boolean> {
    const result = await query(
      'DELETE FROM drivers WHERE id = $1 AND company_id = $2 RETURNING id',
      [id, companyId]
    );
    return result.length > 0;
  }

  static async getStats(companyId: string): Promise<{
    total: number;
    active: number;
    inactive: number;
    suspended: number;
  }> {
    const rows = await query(
      `SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
        COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive,
        COUNT(CASE WHEN status = 'suspended' THEN 1 END) as suspended
       FROM drivers WHERE company_id = $1 AND is_active = true`,
      [companyId]
    );

    return {
      total: parseInt(rows[0].total),
      active: parseInt(rows[0].active),
      inactive: parseInt(rows[0].inactive),
      suspended: parseInt(rows[0].suspended),
    };
  }

  static async updateTripStats(id: string, companyId: string, distance: number): Promise<void> {
    await query(
      `UPDATE drivers 
       SET total_trips = total_trips + 1, 
           total_distance = total_distance + $1 
       WHERE id = $2 AND company_id = $3`,
      [distance, id, companyId]
    );
  }
}
