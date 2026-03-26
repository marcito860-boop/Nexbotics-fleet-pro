export interface ImportJob {
    id: string;
    companyId: string;
    importType: 'vehicles' | 'drivers' | 'inventory' | 'maintenance_records' | 'fuel_records' | 'routes' | 'accidents' | 'staff' | 'service_providers' | 'spare_parts' | 'maintenance_schedules';
    status: 'pending' | 'processing' | 'completed' | 'failed';
    fileName: string;
    totalRows: number;
    processedRows: number;
    successfulRows: number;
    failedRows: number;
    errors: ImportError[];
    previewData?: any[];
    createdBy: string;
    createdAt: Date;
    completedAt?: Date;
}
export interface ImportError {
    row: number;
    field: string;
    value: any;
    message: string;
}
export interface ExportJob {
    id: string;
    companyId: string;
    exportType: string;
    format: 'csv' | 'excel' | 'json';
    status: 'pending' | 'processing' | 'completed' | 'failed';
    filters?: Record<string, any>;
    fileUrl?: string;
    rowCount: number;
    createdBy: string;
    createdAt: Date;
    completedAt?: Date;
}
export declare class ImportExportModel {
    static createImportJob(companyId: string, createdBy: string, importType: string, fileName: string, previewData?: any[]): Promise<ImportJob>;
    static updateImportJob(id: string, companyId: string, updates: Partial<ImportJob>): Promise<ImportJob | null>;
    static findImportJobById(id: string, companyId: string): Promise<ImportJob | null>;
    static findImportJobsByCompany(companyId: string, limit?: number): Promise<ImportJob[]>;
    static createExportJob(companyId: string, createdBy: string, exportType: string, format: string, filters?: Record<string, any>): Promise<ExportJob>;
    static updateExportJob(id: string, companyId: string, updates: Partial<ExportJob>): Promise<ExportJob | null>;
    static findExportJobById(id: string, companyId: string): Promise<ExportJob | null>;
    static findExportJobsByCompany(companyId: string, limit?: number): Promise<ExportJob[]>;
    static parseCSV(csvContent: string): {
        headers: string[];
        rows: any[];
    };
    private static parseCSVLine;
    static validateVehicleRow(row: any, index: number): ImportError[];
    static validateDriverRow(row: any, index: number): ImportError[];
    static validateInventoryRow(row: any, index: number): ImportError[];
    static validateMaintenanceRecordRow(row: any, index: number): ImportError[];
    static validateFuelRecordRow(row: any, index: number): ImportError[];
    static validateRouteRow(row: any, index: number): ImportError[];
    static validateAccidentRow(row: any, index: number): ImportError[];
    static validateStaffRow(row: any, index: number): ImportError[];
    static validateServiceProviderRow(row: any, index: number): ImportError[];
    static validateSparePartRow(row: any, index: number): ImportError[];
    static validateMaintenanceScheduleRow(row: any, index: number): ImportError[];
    private static isValidDate;
    private static mapImportJobRow;
    private static mapExportJobRow;
}
//# sourceMappingURL=ImportExport.d.ts.map