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
export declare class TripModel {
    static findById(id: string, companyId: string): Promise<Trip | null>;
    static findByCompany(companyId: string, options?: {
        status?: TripStatus;
        vehicleId?: string;
        driverId?: string;
        dateFrom?: Date;
        dateTo?: Date;
        limit?: number;
        offset?: number;
    }): Promise<{
        trips: Trip[];
        total: number;
    }>;
    static create(companyId: string, input: CreateTripInput): Promise<Trip>;
    static update(id: string, companyId: string, input: UpdateTripInput): Promise<Trip | null>;
    static complete(id: string, companyId: string, data: {
        endOdometer: number;
        distanceKm: number;
        fuelConsumed?: number;
    }): Promise<Trip | null>;
    static getStats(companyId: string, dateFrom?: Date, dateTo?: Date): Promise<{
        totalTrips: number;
        completedTrips: number;
        totalDistance: number;
        totalFuelConsumed: number;
        averageDistance: number;
    }>;
}
//# sourceMappingURL=Trip.d.ts.map