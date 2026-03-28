interface VehicleHealth {
    vehicleId: string;
    registrationNum: string;
    healthScore: number;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    predictedIssues: string[];
    recommendedActions: string[];
    nextServiceDue: Date | null;
    daysUntilService: number | null;
}
export declare const analyzeVehicleHealth: (vehicleId?: string) => Promise<VehicleHealth | VehicleHealth[] | null>;
export declare const getFleetHealthSummary: () => Promise<{
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    averageHealth: number;
    atRiskVehicles: VehicleHealth[];
    topRecommendations: {
        action: string;
        vehicle: string;
        priority: "medium" | "high" | "low" | "critical";
    }[];
}>;
interface RouteOptimizationRequest {
    vehicleId: string;
    stops: Array<{
        id: string;
        lat: number;
        lng: number;
        priority: number;
        timeWindow?: {
            start: string;
            end: string;
        };
    }>;
    startLocation: {
        lat: number;
        lng: number;
    };
    endLocation?: {
        lat: number;
        lng: number;
    };
    constraints?: {
        maxDrivingHours?: number;
        fuelStops?: boolean;
        restBreaks?: boolean;
    };
}
export declare const optimizeRoute: (request: RouteOptimizationRequest) => Promise<{
    optimizedStops: never[];
    totalDistance: number;
    estimatedTime: number;
    fuelStops?: undefined;
    savings?: undefined;
} | {
    optimizedStops: {
        id: string;
        lat: number;
        lng: number;
        priority: number;
        timeWindow?: {
            start: string;
            end: string;
        };
    }[];
    totalDistance: number;
    estimatedTime: number;
    fuelStops: {
        lat: number;
        lng: number;
        reason: string;
    }[];
    savings: {
        distanceKm: number;
        timeMinutes: number;
        fuelLiters: number;
    };
}>;
export declare const getLiveFleetStatus: () => Promise<{
    summary: {
        totalRoutes: any;
        activeVehicles: any;
        availableVehicles: number;
        pendingRequisitions: number;
    };
    todaysRoutes: any;
    criticalAlerts: any;
    recentAccidents: any;
}>;
export declare const broadcastOperationsUpdate: () => Promise<void>;
export {};
//# sourceMappingURL=operationsAI.d.ts.map