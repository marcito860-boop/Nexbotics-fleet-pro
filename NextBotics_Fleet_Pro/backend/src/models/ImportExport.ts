import { query } from '../database';
import { v4 as uuidv4 } from 'uuid';

export interface ImportJob {
  id: string;
  companyId: string;
  importType: 'vehicles' | 'drivers' | 'inventory' | 'requisitions' | 'audits' | 'invoices' | 'maintenance_records';
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

export class ImportExportModel {
  // ============================================
  // IMPORT JOBS
  // ============================================

  static async createImportJob(
    companyId: string,
    createdBy: string,
    importType: string,
    fileName: string,
    previewData?: any[]
  ): Promise<ImportJob> {
    const rows = await query(
      `INSERT INTO import_jobs (company_id, import_type, file_name, total_rows, preview_data, created_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [companyId, importType, fileName, previewData?.length || 0, 
       previewData ? JSON.stringify(previewData) : null, createdBy]
    );

    return this.mapImportJobRow(rows[0]);
  }

  static async updateImportJob(
    id: string,
    companyId: string,
    updates: Partial<ImportJob>
  ): Promise<ImportJob | null> {
    const setClause: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.status) {
      setClause.push(`status = $${paramIndex++}`);
      values.push(updates.status);
    }
    if (updates.processedRows !== undefined) {
      setClause.push(`processed_rows = $${paramIndex++}`);
      values.push(updates.processedRows);
    }
    if (updates.successfulRows !== undefined) {
      setClause.push(`successful_rows = $${paramIndex++}`);
      values.push(updates.successfulRows);
    }
    if (updates.failedRows !== undefined) {
      setClause.push(`failed_rows = $${paramIndex++}`);
      values.push(updates.failedRows);
    }
    if (updates.errors) {
      setClause.push(`errors = $${paramIndex++}`);
      values.push(JSON.stringify(updates.errors));
    }
    if (updates.status === 'completed' || updates.status === 'failed') {
      setClause.push(`completed_at = NOW()`);
    }

    if (setClause.length === 0) return null;

    values.push(id, companyId);

    const rows = await query(
      `UPDATE import_jobs SET ${setClause.join(', ')} 
       WHERE id = $${paramIndex++} AND company_id = $${paramIndex++}
       RETURNING *`,
      values
    );

    return rows.length > 0 ? this.mapImportJobRow(rows[0]) : null;
  }

  static async findImportJobById(id: string, companyId: string): Promise<ImportJob | null> {
    const rows = await query(
      'SELECT * FROM import_jobs WHERE id = $1 AND company_id = $2',
      [id, companyId]
    );
    return rows.length > 0 ? this.mapImportJobRow(rows[0]) : null;
  }

  static async findImportJobsByCompany(companyId: string, limit = 50): Promise<ImportJob[]> {
    const rows = await query(
      'SELECT * FROM import_jobs WHERE company_id = $1 ORDER BY created_at DESC LIMIT $2',
      [companyId, limit]
    );
    return rows.map(this.mapImportJobRow);
  }

  // ============================================
  // EXPORT JOBS
  // ============================================

  static async createExportJob(
    companyId: string,
    createdBy: string,
    exportType: string,
    format: string,
    filters?: Record<string, any>
  ): Promise<ExportJob> {
    const rows = await query(
      `INSERT INTO export_jobs (company_id, export_type, format, filters, created_by)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [companyId, exportType, format, filters ? JSON.stringify(filters) : null, createdBy]
    );

    return this.mapExportJobRow(rows[0]);
  }

  static async updateExportJob(
    id: string,
    companyId: string,
    updates: Partial<ExportJob>
  ): Promise<ExportJob | null> {
    const setClause: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.status) {
      setClause.push(`status = $${paramIndex++}`);
      values.push(updates.status);
    }
    if (updates.rowCount !== undefined) {
      setClause.push(`row_count = $${paramIndex++}`);
      values.push(updates.rowCount);
    }
    if (updates.fileUrl) {
      setClause.push(`file_url = $${paramIndex++}`);
      values.push(updates.fileUrl);
    }
    if (updates.status === 'completed' || updates.status === 'failed') {
      setClause.push(`completed_at = NOW()`);
    }

    if (setClause.length === 0) return null;

    values.push(id, companyId);

    const rows = await query(
      `UPDATE export_jobs SET ${setClause.join(', ')} 
       WHERE id = $${paramIndex++} AND company_id = $${paramIndex++}
       RETURNING *`,
      values
    );

    return rows.length > 0 ? this.mapExportJobRow(rows[0]) : null;
  }

  static async findExportJobById(id: string, companyId: string): Promise<ExportJob | null> {
    const rows = await query(
      'SELECT * FROM export_jobs WHERE id = $1 AND company_id = $2',
      [id, companyId]
    );
    return rows.length > 0 ? this.mapExportJobRow(rows[0]) : null;
  }

  static async findExportJobsByCompany(companyId: string, limit = 50): Promise<ExportJob[]> {
    const rows = await query(
      'SELECT * FROM export_jobs WHERE company_id = $1 ORDER BY created_at DESC LIMIT $2',
      [companyId, limit]
    );
    return rows.map(this.mapExportJobRow);
  }

  // ============================================
  // CSV PARSING & VALIDATION
  // ============================================

  static parseCSV(csvContent: string): { headers: string[]; rows: any[] } {
    const lines = csvContent.split('\n').filter(line => line.trim());
    if (lines.length < 2) throw new Error('CSV must have at least a header row and one data row');

    const headers = this.parseCSVLine(lines[0]);
    const rows: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      const row: Record<string, any> = {};
      headers.forEach((header, index) => {
        row[header.trim()] = values[index]?.trim() || '';
      });
      rows.push(row);
    }

    return { headers, rows };
  }

  private static parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  }

  // ============================================
  // VALIDATION HELPERS
  // ============================================

  static validateVehicleRow(row: any, index: number): ImportError[] {
    const errors: ImportError[] = [];

    if (!row.registration_number?.trim()) {
      errors.push({ row: index + 2, field: 'registration_number', value: row.registration_number, message: 'Registration number is required' });
    }
    if (!row.make?.trim()) {
      errors.push({ row: index + 2, field: 'make', value: row.make, message: 'Make is required' });
    }
    if (!row.model?.trim()) {
      errors.push({ row: index + 2, field: 'model', value: row.model, message: 'Model is required' });
    }
    if (row.year && (isNaN(parseInt(row.year)) || parseInt(row.year) < 1900 || parseInt(row.year) > new Date().getFullYear() + 1)) {
      errors.push({ row: index + 2, field: 'year', value: row.year, message: 'Invalid year' });
    }
    if (row.fuel_capacity && isNaN(parseFloat(row.fuel_capacity))) {
      errors.push({ row: index + 2, field: 'fuel_capacity', value: row.fuel_capacity, message: 'Fuel capacity must be a number' });
    }

    return errors;
  }

  static validateDriverRow(row: any, index: number): ImportError[] {
    const errors: ImportError[] = [];

    if (!row.first_name?.trim()) {
      errors.push({ row: index + 2, field: 'first_name', value: row.first_name, message: 'First name is required' });
    }
    if (!row.last_name?.trim()) {
      errors.push({ row: index + 2, field: 'last_name', value: row.last_name, message: 'Last name is required' });
    }
    if (!row.license_number?.trim()) {
      errors.push({ row: index + 2, field: 'license_number', value: row.license_number, message: 'License number is required' });
    }
    if (row.license_expiry && !this.isValidDate(row.license_expiry)) {
      errors.push({ row: index + 2, field: 'license_expiry', value: row.license_expiry, message: 'Invalid date format (use YYYY-MM-DD)' });
    }

    return errors;
  }

  static validateInventoryRow(row: any, index: number): ImportError[] {
    const errors: ImportError[] = [];

    if (!row.sku?.trim()) {
      errors.push({ row: index + 2, field: 'sku', value: row.sku, message: 'SKU is required' });
    }
    if (!row.name?.trim()) {
      errors.push({ row: index + 2, field: 'name', value: row.name, message: 'Name is required' });
    }
    if (row.current_stock && isNaN(parseInt(row.current_stock))) {
      errors.push({ row: index + 2, field: 'current_stock', value: row.current_stock, message: 'Current stock must be a number' });
    }
    if (row.unit_price && isNaN(parseFloat(row.unit_price))) {
      errors.push({ row: index + 2, field: 'unit_price', value: row.unit_price, message: 'Unit price must be a number' });
    }

    return errors;
  }

  static validateMaintenanceRecordRow(row: any, index: number): ImportError[] {
    const errors: ImportError[] = [];

    if (!row.vehicle_registration?.trim()) {
      errors.push({ row: index + 2, field: 'vehicle_registration', value: row.vehicle_registration, message: 'Vehicle registration is required' });
    }
    if (!row.service_type?.trim()) {
      errors.push({ row: index + 2, field: 'service_type', value: row.service_type, message: 'Service type is required (preventive, repair, breakdown, emergency)' });
    } else {
      const validTypes = ['preventive', 'repair', 'breakdown', 'emergency'];
      if (!validTypes.includes(row.service_type.toLowerCase())) {
        errors.push({ row: index + 2, field: 'service_type', value: row.service_type, message: 'Service type must be: preventive, repair, breakdown, or emergency' });
      }
    }
    if (!row.category?.trim()) {
      errors.push({ row: index + 2, field: 'category', value: row.category, message: 'Category is required' });
    }
    if (!row.title?.trim()) {
      errors.push({ row: index + 2, field: 'title', value: row.title, message: 'Title is required' });
    }
    if (row.scheduled_date && !this.isValidDate(row.scheduled_date)) {
      errors.push({ row: index + 2, field: 'scheduled_date', value: row.scheduled_date, message: 'Invalid date format (use YYYY-MM-DD)' });
    }
    if (row.completed_date && !this.isValidDate(row.completed_date)) {
      errors.push({ row: index + 2, field: 'completed_date', value: row.completed_date, message: 'Invalid date format (use YYYY-MM-DD)' });
    }
    if (row.service_mileage && isNaN(parseFloat(row.service_mileage))) {
      errors.push({ row: index + 2, field: 'service_mileage', value: row.service_mileage, message: 'Service mileage must be a number' });
    }
    if (row.labor_cost && isNaN(parseFloat(row.labor_cost))) {
      errors.push({ row: index + 2, field: 'labor_cost', value: row.labor_cost, message: 'Labor cost must be a number' });
    }
    if (row.parts_cost && isNaN(parseFloat(row.parts_cost))) {
      errors.push({ row: index + 2, field: 'parts_cost', value: row.parts_cost, message: 'Parts cost must be a number' });
    }

    return errors;
  }

  private static isValidDate(dateString: string): boolean {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateString)) return false;
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date.getTime());
  }

  // ============================================
  // MAPPERS
  // ============================================

  private static mapImportJobRow(row: any): ImportJob {
    return {
      id: row.id,
      companyId: row.company_id,
      importType: row.import_type,
      status: row.status,
      fileName: row.file_name,
      totalRows: parseInt(row.total_rows),
      processedRows: parseInt(row.processed_rows),
      successfulRows: parseInt(row.successful_rows),
      failedRows: parseInt(row.failed_rows),
      errors: row.errors ? JSON.parse(row.errors) : [],
      previewData: row.preview_data ? JSON.parse(row.preview_data) : undefined,
      createdBy: row.created_by,
      createdAt: new Date(row.created_at),
      completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
    };
  }

  private static mapExportJobRow(row: any): ExportJob {
    return {
      id: row.id,
      companyId: row.company_id,
      exportType: row.export_type,
      format: row.format,
      status: row.status,
      filters: row.filters ? JSON.parse(row.filters) : undefined,
      fileUrl: row.file_url,
      rowCount: parseInt(row.row_count),
      createdBy: row.created_by,
      createdAt: new Date(row.created_at),
      completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
    };
  }
}
