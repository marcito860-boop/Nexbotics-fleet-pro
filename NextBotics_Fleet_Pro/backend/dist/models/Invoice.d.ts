export interface InvoiceCategory {
    id: string;
    companyId: string;
    name: string;
    description?: string;
    createdAt: Date;
}
export interface Invoice {
    id: string;
    companyId: string;
    invoiceNumber: string;
    categoryId?: string;
    invoiceType: 'fleet_operations' | 'vehicle_hire' | 'fuel' | 'stock' | 'maintenance' | 'other';
    vendorName: string;
    vendorTaxId?: string;
    vendorAddress?: string;
    vendorContact?: string;
    invoiceDate: Date;
    dueDate?: Date;
    subtotal: number;
    taxAmount: number;
    totalAmount: number;
    currency: string;
    status: 'pending' | 'validated' | 'approved' | 'paid' | 'overdue' | 'cancelled';
    paymentMethod?: string;
    paymentDate?: Date;
    paymentReference?: string;
    validationErrors: string[];
    validatedBy?: string;
    validatedAt?: Date;
    approvedBy?: string;
    approvedAt?: Date;
    notes?: string;
    attachmentUrl?: string;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
    category?: {
        name: string;
    };
    creator?: {
        firstName: string;
        lastName: string;
    };
    validator?: {
        firstName: string;
        lastName: string;
    };
    approver?: {
        firstName: string;
        lastName: string;
    };
    items?: InvoiceItem[];
}
export interface InvoiceItem {
    id: string;
    companyId: string;
    invoiceId: string;
    description: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    referenceType?: string;
    referenceId?: string;
    createdAt: Date;
}
export declare class InvoiceCategoryModel {
    static findByCompany(companyId: string): Promise<InvoiceCategory[]>;
    static create(companyId: string, name: string, description?: string): Promise<InvoiceCategory>;
}
export declare class InvoiceModel {
    static findById(id: string, companyId: string): Promise<Invoice | null>;
    static findByCompany(companyId: string, options?: {
        status?: string;
        invoiceType?: string;
        vendorName?: string;
        dateFrom?: Date;
        dateTo?: Date;
        overdueOnly?: boolean;
        limit?: number;
        offset?: number;
    }): Promise<{
        invoices: Invoice[];
        total: number;
    }>;
    static create(companyId: string, createdBy: string, data: Partial<Invoice>, items: Partial<InvoiceItem>[]): Promise<Invoice>;
    static validate(id: string, companyId: string, validatedBy: string): Promise<Invoice | null>;
    static approve(id: string, companyId: string, approvedBy: string): Promise<Invoice | null>;
    static markPaid(id: string, companyId: string, paidBy: string, data: {
        paymentMethod: string;
        paymentDate: Date;
        paymentReference?: string;
    }): Promise<Invoice | null>;
    static cancel(id: string, companyId: string, cancelledBy: string, reason?: string): Promise<Invoice | null>;
    static getItems(invoiceId: string, companyId: string): Promise<InvoiceItem[]>;
    static getStats(companyId: string): Promise<{
        total: number;
        byStatus: Record<string, number>;
        byType: Record<string, number>;
        totalAmount: number;
        paidAmount: number;
        overdueAmount: number;
        overdueCount: number;
    }>;
    private static validateInvoice;
    private static logAudit;
    private static mapInvoiceRow;
}
//# sourceMappingURL=Invoice.d.ts.map