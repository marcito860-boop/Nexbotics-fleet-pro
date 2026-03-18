export type FuelCardStatus = 'active' | 'blocked' | 'expired';
export interface FuelCard {
    id: string;
    companyId: string;
    cardNumber: string;
    cardProvider?: string;
    vehicleId?: string;
    driverId?: string;
    monthlyLimit?: number;
    currentBalance?: number;
    status: FuelCardStatus;
    expiryDate?: Date;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export interface FuelTransaction {
    id: string;
    companyId: string;
    fuelCardId?: string;
    vehicleId: string;
    driverId?: string;
    transactionDate: Date;
    stationName?: string;
    stationLocation?: string;
    latitude?: number;
    longitude?: number;
    fuelType?: string;
    liters: number;
    pricePerLiter?: number;
    totalCost: number;
    odometerReading?: number;
    receiptNumber?: string;
    isAnomaly: boolean;
    anomalyReason?: string;
    approvedBy?: string;
    approvedAt?: Date;
    notes?: string;
    createdAt: Date;
    vehicle?: {
        registrationNumber: string;
    };
    driver?: {
        firstName: string;
        lastName: string;
    };
}
export interface Expense {
    id: string;
    companyId: string;
    vehicleId?: string;
    driverId?: string;
    expenseType: string;
    amount: number;
    expenseDate: Date;
    description?: string;
    vendorName?: string;
    receiptUrl?: string;
    approvedBy?: string;
    approvedAt?: Date;
    status: 'pending' | 'approved' | 'rejected';
    isReimbursable: boolean;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
}
export declare class FuelCardModel {
    static findById(id: string, companyId: string): Promise<FuelCard | null>;
    static findByCompany(companyId: string): Promise<FuelCard[]>;
    static create(companyId: string, data: Partial<FuelCard>): Promise<FuelCard>;
    static updateBalance(id: string, companyId: string, amount: number): Promise<void>;
    private static mapRow;
}
export declare class FuelTransactionModel {
    static findByCompany(companyId: string, options?: {
        vehicleId?: string;
        dateFrom?: Date;
        dateTo?: Date;
        isAnomaly?: boolean;
        limit?: number;
        offset?: number;
    }): Promise<{
        transactions: FuelTransaction[];
        total: number;
    }>;
    static create(companyId: string, data: Partial<FuelTransaction>): Promise<FuelTransaction>;
    static getStats(companyId: string, dateFrom?: Date, dateTo?: Date): Promise<{
        totalCost: number;
        totalLiters: number;
        transactionCount: number;
        averagePricePerLiter: number;
        anomaliesCount: number;
    }>;
    private static detectAnomaly;
    private static mapRow;
}
export declare class ExpenseModel {
    static findByCompany(companyId: string, options?: {
        status?: string;
        vehicleId?: string;
        expenseType?: string;
        dateFrom?: Date;
        dateTo?: Date;
        limit?: number;
        offset?: number;
    }): Promise<{
        expenses: Expense[];
        total: number;
    }>;
    static create(companyId: string, createdBy: string, data: Partial<Expense>): Promise<Expense>;
    static getStats(companyId: string, dateFrom?: Date, dateTo?: Date): Promise<{
        totalAmount: number;
        byType: Record<string, number>;
        pendingAmount: number;
        approvedAmount: number;
    }>;
}
//# sourceMappingURL=Fuel.d.ts.map