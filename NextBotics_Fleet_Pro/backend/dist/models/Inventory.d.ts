export interface InventoryCategory {
    id: string;
    companyId: string;
    name: string;
    description?: string;
    createdAt: Date;
}
export interface InventoryItem {
    id: string;
    companyId: string;
    sku: string;
    name: string;
    description?: string;
    categoryId?: string;
    unitOfMeasure: string;
    unitPrice?: number;
    supplierName?: string;
    supplierContact?: string;
    reorderLevel: number;
    reorderQuantity: number;
    currentStock: number;
    location?: string;
    isActive: boolean;
    createdBy?: string;
    createdAt: Date;
    updatedAt: Date;
    category?: {
        name: string;
    };
    isLowStock?: boolean;
}
export interface InventoryTransaction {
    id: string;
    companyId: string;
    itemId: string;
    transactionType: 'purchase' | 'consumption' | 'adjustment' | 'return' | 'transfer';
    quantity: number;
    unitCost?: number;
    totalCost?: number;
    referenceType?: string;
    referenceId?: string;
    performedBy: string;
    notes?: string;
    createdAt: Date;
    item?: {
        name: string;
        sku: string;
    };
    performer?: {
        firstName: string;
        lastName: string;
    };
}
export interface StockAlert {
    id: string;
    companyId: string;
    itemId: string;
    alertType: 'low_stock' | 'expiring' | 'overstock';
    message: string;
    isRead: boolean;
    acknowledgedBy?: string;
    acknowledgedAt?: Date;
    createdAt: Date;
    item?: {
        name: string;
        sku: string;
        currentStock: number;
        reorderLevel: number;
    };
}
export declare class InventoryCategoryModel {
    static findByCompany(companyId: string): Promise<InventoryCategory[]>;
    static create(companyId: string, name: string, description?: string): Promise<InventoryCategory>;
}
export declare class InventoryItemModel {
    static findById(id: string, companyId: string): Promise<InventoryItem | null>;
    static findByCompany(companyId: string, options?: {
        categoryId?: string;
        isActive?: boolean;
        lowStockOnly?: boolean;
        search?: string;
        limit?: number;
        offset?: number;
    }): Promise<{
        items: InventoryItem[];
        total: number;
    }>;
    static create(companyId: string, createdBy: string, data: Partial<InventoryItem>): Promise<InventoryItem>;
    static update(id: string, companyId: string, data: Partial<InventoryItem>): Promise<InventoryItem | null>;
    static adjustStock(id: string, companyId: string, quantity: number, performedBy: string, notes?: string): Promise<InventoryItem | null>;
    static bulkImport(companyId: string, createdBy: string, items: Partial<InventoryItem>[]): Promise<{
        imported: number;
        errors: string[];
    }>;
    private static mapItemRow;
}
export declare class InventoryTransactionModel {
    static findByCompany(companyId: string, options?: {
        itemId?: string;
        transactionType?: string;
        dateFrom?: Date;
        dateTo?: Date;
        limit?: number;
        offset?: number;
    }): Promise<{
        transactions: InventoryTransaction[];
        total: number;
    }>;
    static create(companyId: string, data: Partial<InventoryTransaction>): Promise<InventoryTransaction>;
    static getStats(companyId: string): Promise<{
        totalTransactions: number;
        byType: Record<string, number>;
        totalValue: number;
        lowStockItems: number;
    }>;
    private static mapTransactionRow;
}
export declare class StockAlertModel {
    static findByCompany(companyId: string, options?: {
        isRead?: boolean;
        limit?: number;
    }): Promise<StockAlert[]>;
    static create(companyId: string, itemId: string, alertType: string, message: string): Promise<StockAlert>;
    static acknowledge(id: string, companyId: string, userId: string): Promise<void>;
    static getUnreadCount(companyId: string): Promise<number>;
    private static mapAlertRow;
}
//# sourceMappingURL=Inventory.d.ts.map