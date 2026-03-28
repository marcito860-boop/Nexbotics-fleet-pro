/**
 * AI Service for Fleet Management
 * Provides intelligent insights, predictions, and recommendations
 */
/**
 * Generate AI-powered fleet recommendations
 */
export declare const generateFleetRecommendations: () => Promise<string[]>;
/**
 * Generate AI notes for training slides
 */
export declare const generateSlideNotes: (slideTitle: string, content: string) => Promise<string>;
interface NaturalLanguageQuery {
    query: string;
    chartType?: 'bar' | 'line' | 'pie';
    data?: any[];
    title?: string;
    message?: string;
}
/**
 * Process natural language analytics queries
 */
export declare const processAnalyticsQuery: (queryText: string) => Promise<NaturalLanguageQuery>;
/**
 * Generate corrective actions for accidents
 */
export declare const generateCorrectiveActions: (accidentDescription: string, severity: string) => Promise<string[]>;
interface DriverBehaviorScore {
    driverId: string;
    driverName: string;
    overallScore: number;
    fuelEfficiencyScore: number;
    safetyScore: number;
    reliabilityScore: number;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    insights: string[];
    recommendations: string[];
}
/**
 * Analyze driver behavior using AI
 */
export declare const analyzeDriverBehavior: (driverId?: string) => Promise<DriverBehaviorScore | DriverBehaviorScore[] | null>;
interface Anomaly {
    type: 'fuel' | 'cost' | 'behavior' | 'maintenance';
    severity: 'low' | 'medium' | 'high' | 'critical';
    entity: string;
    entityId: string;
    message: string;
    detectedAt: string;
    value: number;
    expectedRange: {
        min: number;
        max: number;
    };
}
/**
 * Detect anomalies in fleet data using statistical analysis
 */
export declare const detectAnomalies: () => Promise<Anomaly[]>;
interface CostForecast {
    vehicleId: string;
    registrationNum: string;
    next30Days: number;
    next90Days: number;
    nextYear: number;
    confidence: 'low' | 'medium' | 'high';
    factors: string[];
}
/**
 * Predict future maintenance costs using trend analysis
 */
export declare const predictMaintenanceCosts: (vehicleId?: string) => Promise<CostForecast | CostForecast[] | null>;
interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}
/**
 * Process chatbot queries about fleet data
 */
export declare const processChatQuery: (messages: ChatMessage[]) => Promise<string>;
/**
 * Process fleet copilot query with comprehensive context
 */
export declare const processFleetCopilotQuery: (userQuestion: string) => Promise<string>;
export declare const AI_ENABLED: boolean;
declare const _default: {
    generateFleetRecommendations: () => Promise<string[]>;
    generateSlideNotes: (slideTitle: string, content: string) => Promise<string>;
    processAnalyticsQuery: (queryText: string) => Promise<NaturalLanguageQuery>;
    generateCorrectiveActions: (accidentDescription: string, severity: string) => Promise<string[]>;
    analyzeDriverBehavior: (driverId?: string) => Promise<DriverBehaviorScore | DriverBehaviorScore[] | null>;
    detectAnomalies: () => Promise<Anomaly[]>;
    predictMaintenanceCosts: (vehicleId?: string) => Promise<CostForecast | CostForecast[] | null>;
    processChatQuery: (messages: ChatMessage[]) => Promise<string>;
    processFleetCopilotQuery: (userQuestion: string) => Promise<string>;
    AI_ENABLED: boolean;
};
export default _default;
export interface VehicleRiskProfile {
    vehicleId: string;
    registrationNum: string;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    riskScore: number;
    factors: RiskFactor[];
    recommendations: string[];
    lastUpdated: string;
}
export interface RiskFactor {
    type: 'defects' | 'maintenance' | 'accidents' | 'inspection' | 'usage' | 'driver';
    severity: 'low' | 'medium' | 'high';
    description: string;
    count?: number;
}
export interface RiskAlert {
    id: string;
    type: 'vehicle' | 'driver' | 'inspection' | 'maintenance' | 'route';
    severity: 'low' | 'medium' | 'high' | 'critical';
    title: string;
    description: string;
    entityId: string;
    entityName: string;
    createdAt: string;
    acknowledged: boolean;
}
export interface FleetIntelligenceSummary {
    totalVehiclesAtRisk: number;
    criticalAlerts: number;
    highAlerts: number;
    mediumAlerts: number;
    overdueInspections: number;
    maintenanceDueSoon: number;
    driverSafetyAlerts: number;
    vehiclesByRiskLevel: {
        low: number;
        medium: number;
        high: number;
        critical: number;
    };
}
/**
 * Calculate vehicle risk score based on multiple factors
 */
export declare const calculateVehicleRisk: (vehicleId?: string) => Promise<VehicleRiskProfile | VehicleRiskProfile[] | null>;
/**
 * Generate risk alerts for the fleet
 */
export declare const generateRiskAlerts: () => Promise<RiskAlert[]>;
/**
 * Get fleet intelligence summary for dashboard
 */
export declare const getFleetIntelligenceSummary: () => Promise<FleetIntelligenceSummary>;
/**
 * Get predictive maintenance suggestions
 */
export declare const getPredictiveMaintenanceSuggestions: () => Promise<Array<{
    vehicleId: string;
    registrationNum: string;
    suggestion: string;
    priority: "low" | "medium" | "high";
    predictedSavings?: string;
}>>;
/**
 * Generate training quiz questions based on course content
 */
export declare const generateTrainingQuestions: (content: string, numQuestions?: number) => Promise<Array<{
    question: string;
    options: string[];
    correctAnswer: string;
}>>;
//# sourceMappingURL=ai.d.ts.map