import { query } from '../database';

export type VehicleStatus = 'available' | 'assigned' | 'maintenance' | 'retired';
export type FuelType = 'petrol' | 'diesel' | 'electric' | 'hybrid';

export interface Vehicle {
  id: string;
  companyId: string;
  registrationNumber: string;
  make: string;
  model: string;
  year?: number;
  color?: string;
  vin?: string;
  engineNumber?: string;
  chassisNumber?: string;
  fuelType?: FuelType;
  fuelCapacity?: number;
  currentMileage: number;
  status: VehicleStatus;
  category?: string;
  gpsDeviceId?: string;
  gpsProvider?: string;
  purchaseDate?: Date;
  purchasePrice?: number;
  insuranceExpiry?: Date;
  licenseExpiry?: Date;
  lastServiceDate?: Date;
  nextServiceDue?: Date;
  serviceIntervalKm?: number;
  notes?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateVehicleInput {
  registrationNumber: string;
  make: string;
  model: string;
  year?: number;
  color?: string;
  vin?: string;
  engineNumber?: string;
  chassisNumber?: string;
  fuelType?: FuelType;
  fuelCapacity?: number;
  currentMileage?: number;
  category?: string;
  gpsDeviceId?: string;
  gpsProvider?: string;
  purchaseDate?: Date;
  purchasePrice?: number;
  insuranceExpiry?: Date;
  licenseExpiry?: Date;
  serviceIntervalKm?: number;
  notes?: string;
}

export interface UpdateVehicleInput extends Partial<CreateVehicleInput> {
  status?: VehicleStatus;
  isActive?: boolean;
}

function mapRowToVehicle(row: any): Vehicle {
  return {
    id: row.id,
    companyId: row.company_id,
    registrationNumber: row.registration_number,
    make: row.make,
    model: row.model,
    year: row.year,
    color: row.color,
    vin: row.vin,
    engineNumber: row.engine_number,
    chassisNumber: row.chassis_number,
    fuelType: row.fuel_type,
    fuelCapacity: row.fuel_capacity ? parseFloat(row.fuel_capacity) : undefined,
    currentMileage: parseFloat(row.current_mileage || 0),
    status: row.status,
    category: row.category,
    gpsDeviceId: row.gps_device_id,
    gpsProvider: row.gps_provider,
    purchaseDate: row.purchase_date ? new Date(row.purchase_date) : undefined,
    purchasePrice: row.purchase_price ? parseFloat(row.purchase_price) : undefined,
    insuranceExpiry: row.insurance_expiry ? new Date(row.insurance_expiry) : undefined,
    licenseExpiry: row.license_expiry ? new Date(row.license_expiry) : undefined,
    lastServiceDate: row.last_service_date ? new Date(row.last_service_date) : undefined,
    nextServiceDue: row.next_service_due ? new Date(row.next_service_due) : undefined,
    serviceIntervalKm: row.service_interval_km ? parseFloat(row.service_interval_km) : undefined,
    notes: row.notes,
    isActive: row.is_active,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export class VehicleModel {
  static async findById(id: string, companyId: string): Promise<Vehicle | null> {
    const rows = await query(
      'SELECT * FROM vehicles WHERE id = $1 AND company_id = $2',
      [id, companyId]
    );
    return rows.length > 0 ? mapRowToVehicle(rows[0]) : null;
  }

  static async findByRegistration(registrationNumber: string, companyId: string): Promise<Vehicle | null> {
    const rows = await query(
      'SELECT * FROM vehicles WHERE registration_number = $1 AND company_id = $2',
      [registrationNumber.toUpperCase(), companyId]
    );
    return rows.length > 0 ? mapRowToVehicle(rows[0]) : null;
  }

  static async findByCompany(companyId: string, options?: {
    status?: VehicleStatus;
    category?: string;
    isActive?: boolean;
    limit?: number;
    offset?: number;
    search?: string;
  }): Promise<{ vehicles: Vehicle[]; total: number }> {
    let sql = 'SELECT * FROM vehicles WHERE company_id = $1';
    let countSql = 'SELECT COUNT(*) as total FROM vehicles WHERE company_id = $1';
    const params: any[] = [companyId];

    if (options?.status) {
      sql += ` AND status = $${params.length + 1}`;
      countSql += ` AND status = $${params.length + 1}`;
      params.push(options.status);
    }

    if (options?.category) {
      sql += ` AND category = $${params.length + 1}`;
      countSql += ` AND category = $${params.length + 1}`;
      params.push(options.category);
    }

    if (options?.isActive !== undefined) {
      sql += ` AND is_active = $${params.length + 1}`;
      countSql += ` AND is_active = $${params.length + 1}`;
      params.push(options.isActive);
    }

    if (options?.search) {
      const searchTerm = `%${options.search}%`;
      sql += ` AND (registration_number ILIKE $${params.length + 1} OR make ILIKE $${params.length + 1} OR model ILIKE $${params.length + 1})`;
      countSql += ` AND (registration_number ILIKE $${params.length + 1} OR make ILIKE $${params.length + 1} OR model ILIKE $${params.length + 1})`;
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

    const [vehicleRows, countRows] = await Promise.all([
      query(sql, params),
      query(countSql, params.slice(0, options?.limit ? params.length - (options.offset ? 2 : 1) : params.length))
    ]);

    return {
      vehicles: vehicleRows.map(mapRowToVehicle),
      total: parseInt(countRows[0].total)
    };
  }

  static async create(companyId: string, input: CreateVehicleInput): Promise<Vehicle> {
    const rows = await query(
      `INSERT INTO vehicles (
        company_id, registration_number, make, model, year, color, vin, 
        engine_number, chassis_number, fuel_type, fuel_capacity, current_mileage,
        category, gps_device_id, gps_provider, purchase_date, purchase_price,
        insurance_expiry, license_expiry, service_interval_km, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
      RETURNING *`,
      [
        companyId,
        input.registrationNumber.toUpperCase(),
        input.make,
        input.model,
        input.year || null,
        input.color || null,
        input.vin || null,
        input.engineNumber || null,
        input.chassisNumber || null,
        input.fuelType || null,
        input.fuelCapacity || null,
        input.currentMileage || 0,
        input.category || null,
        input.gpsDeviceId || null,
        input.gpsProvider || null,
        input.purchaseDate || null,
        input.purchasePrice || null,
        input.insuranceExpiry || null,
        input.licenseExpiry || null,
        input.serviceIntervalKm || null,
        input.notes || null,
      ]
    );

    return mapRowToVehicle(rows[0]);
  }

  static async update(id: string, companyId: string, input: UpdateVehicleInput): Promise<Vehicle | null> {
    const updates: string[] = [];
    const params: any[] = [];

    const fieldMap: Record<string, string> = {
      registrationNumber: 'registration_number',
      make: 'make',
      model: 'model',
      year: 'year',
      color: 'color',
      vin: 'vin',
      engineNumber: 'engine_number',
      chassisNumber: 'chassis_number',
      fuelType: 'fuel_type',
      fuelCapacity: 'fuel_capacity',
      currentMileage: 'current_mileage',
      status: 'status',
      category: 'category',
      gpsDeviceId: 'gps_device_id',
      gpsProvider: 'gps_provider',
      purchaseDate: 'purchase_date',
      purchasePrice: 'purchase_price',
      insuranceExpiry: 'insurance_expiry',
      licenseExpiry: 'license_expiry',
      lastServiceDate: 'last_service_date',
      nextServiceDue: 'next_service_due',
      serviceIntervalKm: 'service_interval_km',
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
      `UPDATE vehicles SET ${updates.join(', ')} WHERE id = $${params.length - 1} AND company_id = $${params.length} RETURNING *`,
      params
    );

    return rows.length > 0 ? mapRowToVehicle(rows[0]) : null;
  }

  static async delete(id: string, companyId: string): Promise<boolean> {
    const result = await query(
      'DELETE FROM vehicles WHERE id = $1 AND company_id = $2 RETURNING id',
      [id, companyId]
    );
    return result.length > 0;
  }

  static async getStats(companyId: string): Promise<{
    total: number;
    available: number;
    assigned: number;
    maintenance: number;
    retired: number;
  }> {
    const rows = await query(
      `SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'available' THEN 1 END) as available,
        COUNT(CASE WHEN status = 'assigned' THEN 1 END) as assigned,
        COUNT(CASE WHEN status = 'maintenance' THEN 1 END) as maintenance,
        COUNT(CASE WHEN status = 'retired' THEN 1 END) as retired
       FROM vehicles WHERE company_id = $1 AND is_active = true`,
      [companyId]
    );

    return {
      total: parseInt(rows[0].total),
      available: parseInt(rows[0].available),
      assigned: parseInt(rows[0].assigned),
      maintenance: parseInt(rows[0].maintenance),
      retired: parseInt(rows[0].retired),
    };
  }

  static async updateMileage(id: string, companyId: string, mileage: number): Promise<void> {
    await query(
      'UPDATE vehicles SET current_mileage = $1 WHERE id = $2 AND company_id = $3',
      [mileage, id, companyId]
    );
  }
}
