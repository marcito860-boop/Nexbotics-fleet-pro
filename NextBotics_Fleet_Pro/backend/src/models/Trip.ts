import { query } from '../database';

export type TripStatus = 'in_progress' | 'completed' | 'cancelled';

export interface Trip {
  id: string;
  companyId: string;
  vehicleId: string;
  driverId?: string;
  assignmentId?: string;
  startTime: Date;
  endTime?: Date;
  startLatitude?: number;
  startLongitude?: number;
  endLatitude?: number;
  endLongitude?: number;
  startOdometer?: number;
  endOdometer?: number;
  distanceKm?: number;
  durationMinutes?: number;
  purpose?: string;
  status: TripStatus;
  idleTimeMinutes: number;
  maxSpeed?: number;
  averageSpeed?: number;
  fuelConsumed?: number;
  routeGeometry?: any;
  createdAt: Date;
  updatedAt: Date;
  // Joined fields
  vehicle?: {
    registrationNumber: string;
    make: string;
    model: string;
  };
  driver?: {
    firstName: string;
    lastName: string;
  };
}

export interface CreateTripInput {
  vehicleId: string;
  driverId?: string;
  assignmentId?: string;
  purpose?: string;
  startTime?: Date;
}

export interface UpdateTripInput {
  endTime?: Date;
  endLatitude?: number;
  endLongitude?: number;
  endOdometer?: number;
  distanceKm?: number;
  durationMinutes?: number;
  status?: TripStatus;
  idleTimeMinutes?: number;
  maxSpeed?: number;
  averageSpeed?: number;
  fuelConsumed?: number;
  routeGeometry?: any;
}

function mapRowToTrip(row: any): Trip {
  return {
    id: row.id,
    companyId: row.company_id,
    vehicleId: row.vehicle_id,
    driverId: row.driver_id,
    assignmentId: row.assignment_id,
    startTime: new Date(row.start_time),
    endTime: row.end_time ? new Date(row.end_time) : undefined,
    startLatitude: row.start_latitude ? parseFloat(row.start_latitude) : undefined,
    startLongitude: row.start_longitude ? parseFloat(row.start_longitude) : undefined,
    endLatitude: row.end_latitude ? parseFloat(row.end_latitude) : undefined,
    endLongitude: row.end_longitude ? parseFloat(row.end_longitude) : undefined,
    startOdometer: row.start_odometer ? parseFloat(row.start_odometer) : undefined,
    endOdometer: row.end_odometer ? parseFloat(row.end_odometer) : undefined,
    distanceKm: row.distance_km ? parseFloat(row.distance_km) : undefined,
    durationMinutes: row.duration_minutes,
    purpose: row.purpose,
    status: row.status,
    idleTimeMinutes: row.idle_time_minutes || 0,
    maxSpeed: row.max_speed ? parseFloat(row.max_speed) : undefined,
    averageSpeed: row.average_speed ? parseFloat(row.average_speed) : undefined,
    fuelConsumed: row.fuel_consumed ? parseFloat(row.fuel_consumed) : undefined,
    routeGeometry: row.route_geometry,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export class TripModel {
  static async findById(id: string, companyId: string): Promise<Trip | null> {
    const rows = await query(
      `SELECT t.*, 
        v.registration_number as v_reg, v.make as v_make, v.model as v_model,
        d.first_name as d_fname, d.last_name as d_lname
       FROM trips t
       LEFT JOIN vehicles v ON t.vehicle_id = v.id
       LEFT JOIN drivers d ON t.driver_id = d.id
       WHERE t.id = $1 AND t.company_id = $2`,
      [id, companyId]
    );
    
    if (rows.length === 0) return null;
    
    const trip = mapRowToTrip(rows[0]);
    if (rows[0].v_reg) {
      trip.vehicle = {
        registrationNumber: rows[0].v_reg,
        make: rows[0].v_make,
        model: rows[0].v_model,
      };
    }
    if (rows[0].d_fname) {
      trip.driver = {
        firstName: rows[0].d_fname,
        lastName: rows[0].d_lname,
      };
    }
    return trip;
  }

  static async findByCompany(companyId: string, options?: {
    status?: TripStatus;
    vehicleId?: string;
    driverId?: string;
    dateFrom?: Date;
    dateTo?: Date;
    limit?: number;
    offset?: number;
  }): Promise<{ trips: Trip[]; total: number }> {
    let sql = `
      SELECT t.*, 
        v.registration_number as v_reg, v.make as v_make, v.model as v_model,
        d.first_name as d_fname, d.last_name as d_lname
      FROM trips t
      LEFT JOIN vehicles v ON t.vehicle_id = v.id
      LEFT JOIN drivers d ON t.driver_id = d.id
      WHERE t.company_id = $1
    `;
    let countSql = 'SELECT COUNT(*) as total FROM trips WHERE company_id = $1';
    const params: any[] = [companyId];

    if (options?.status) {
      sql += ` AND t.status = $${params.length + 1}`;
      countSql += ` AND status = $${params.length + 1}`;
      params.push(options.status);
    }

    if (options?.vehicleId) {
      sql += ` AND t.vehicle_id = $${params.length + 1}`;
      countSql += ` AND vehicle_id = $${params.length + 1}`;
      params.push(options.vehicleId);
    }

    if (options?.driverId) {
      sql += ` AND t.driver_id = $${params.length + 1}`;
      countSql += ` AND driver_id = $${params.length + 1}`;
      params.push(options.driverId);
    }

    if (options?.dateFrom) {
      sql += ` AND t.start_time >= $${params.length + 1}`;
      countSql += ` AND start_time >= $${params.length + 1}`;
      params.push(options.dateFrom);
    }

    if (options?.dateTo) {
      sql += ` AND t.start_time <= $${params.length + 1}`;
      countSql += ` AND start_time <= $${params.length + 1}`;
      params.push(options.dateTo);
    }

    sql += ' ORDER BY t.start_time DESC';

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

    const trips = rows.map((row: any) => {
      const trip = mapRowToTrip(row);
      if (row.v_reg) {
        trip.vehicle = {
          registrationNumber: row.v_reg,
          make: row.v_make,
          model: row.v_model,
        };
      }
      if (row.d_fname) {
        trip.driver = {
          firstName: row.d_fname,
          lastName: row.d_lname,
        };
      }
      return trip;
    });

    return { trips, total: parseInt(countRows[0].total) };
  }

  static async create(companyId: string, input: CreateTripInput): Promise<Trip> {
    const rows = await query(
      `INSERT INTO trips (company_id, vehicle_id, driver_id, assignment_id, purpose, start_time, start_odometer)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        companyId,
        input.vehicleId,
        input.driverId || null,
        input.assignmentId || null,
        input.purpose || null,
        input.startTime || new Date(),
        null, // Will be updated with actual odometer
      ]
    );
    return mapRowToTrip(rows[0]);
  }

  static async update(id: string, companyId: string, input: UpdateTripInput): Promise<Trip | null> {
    const updates: string[] = [];
    const params: any[] = [];

    const fieldMap: Record<string, string> = {
      endTime: 'end_time',
      endLatitude: 'end_latitude',
      endLongitude: 'end_longitude',
      endOdometer: 'end_odometer',
      distanceKm: 'distance_km',
      durationMinutes: 'duration_minutes',
      status: 'status',
      idleTimeMinutes: 'idle_time_minutes',
      maxSpeed: 'max_speed',
      averageSpeed: 'average_speed',
      fuelConsumed: 'fuel_consumed',
      routeGeometry: 'route_geometry',
    };

    for (const [key, value] of Object.entries(input)) {
      if (value !== undefined && fieldMap[key]) {
        updates.push(`${fieldMap[key]} = $${params.length + 1}`);
        params.push(typeof value === 'object' ? JSON.stringify(value) : value);
      }
    }

    if (updates.length === 0) return this.findById(id, companyId);

    params.push(id, companyId);

    const rows = await query(
      `UPDATE trips SET ${updates.join(', ')} WHERE id = $${params.length - 1} AND company_id = $${params.length} RETURNING *`,
      params
    );

    return rows.length > 0 ? mapRowToTrip(rows[0]) : null;
  }

  static async complete(id: string, companyId: string, data: {
    endOdometer: number;
    distanceKm: number;
    fuelConsumed?: number;
  }): Promise<Trip | null> {
    const trip = await this.findById(id, companyId);
    if (!trip || !trip.startTime) return null;

    const endTime = new Date();
    const durationMinutes = Math.round((endTime.getTime() - trip.startTime.getTime()) / (1000 * 60));

    const rows = await query(
      `UPDATE trips 
       SET status = 'completed', 
           end_time = $1,
           end_odometer = $2,
           distance_km = $3,
           duration_minutes = $4,
           fuel_consumed = $5
       WHERE id = $6 AND company_id = $7
       RETURNING *`,
      [endTime, data.endOdometer, data.distanceKm, durationMinutes, data.fuelConsumed || null, id, companyId]
    );

    return rows.length > 0 ? mapRowToTrip(rows[0]) : null;
  }

  static async getStats(companyId: string, dateFrom?: Date, dateTo?: Date): Promise<{
    totalTrips: number;
    completedTrips: number;
    totalDistance: number;
    totalFuelConsumed: number;
    averageDistance: number;
  }> {
    let sql = `
      SELECT 
        COUNT(*) as total_trips,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_trips,
        COALESCE(SUM(distance_km), 0) as total_distance,
        COALESCE(SUM(fuel_consumed), 0) as total_fuel
      FROM trips 
      WHERE company_id = $1
    `;
    const params: any[] = [companyId];

    if (dateFrom) {
      sql += ` AND start_time >= $${params.length + 1}`;
      params.push(dateFrom);
    }

    if (dateTo) {
      sql += ` AND start_time <= $${params.length + 1}`;
      params.push(dateTo);
    }

    const rows = await query(sql, params);

    const totalTrips = parseInt(rows[0].total_trips);
    const completedTrips = parseInt(rows[0].completed_trips);
    const totalDistance = parseFloat(rows[0].total_distance);
    const totalFuelConsumed = parseFloat(rows[0].total_fuel);

    return {
      totalTrips,
      completedTrips,
      totalDistance,
      totalFuelConsumed,
      averageDistance: completedTrips > 0 ? totalDistance / completedTrips : 0,
    };
  }
}
