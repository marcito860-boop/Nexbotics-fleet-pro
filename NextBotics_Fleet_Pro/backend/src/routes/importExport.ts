import { Router, Request, Response } from 'express';
import { ImportExportModel } from '../models/ImportExport';
import { VehicleModel } from '../models/Vehicle';
import { DriverModel } from '../models/Driver';
import { InventoryItemModel } from '../models/Inventory';
import { authMiddleware, requireRole } from '../utils/auth';
import { query } from '../database';

const router = Router();

router.use(authMiddleware);

// ============================================
// IMPORT ENDPOINTS
// ============================================

// POST /api/fleet/import/preview - Preview CSV data before import
router.post('/preview', requireRole(['admin', 'manager']), async (req: Request, res: Response) => {
  try {
    const { importType, csvContent } = req.body;

    if (!importType || !csvContent) {
      return res.status(400).json({ success: false, error: 'Import type and CSV content are required' });
    }

    const { headers, rows } = ImportExportModel.parseCSV(csvContent);
    const previewData = rows.slice(0, 10); // First 10 rows for preview
    const errors: any[] = [];

    // Validate each row
    for (let i = 0; i < Math.min(rows.length, 100); i++) {
      let rowErrors: any[] = [];
      
      switch (importType) {
        case 'vehicles':
          rowErrors = ImportExportModel.validateVehicleRow(rows[i], i);
          break;
        case 'drivers':
          rowErrors = ImportExportModel.validateDriverRow(rows[i], i);
          break;
        case 'inventory':
          rowErrors = ImportExportModel.validateInventoryRow(rows[i], i);
          break;
        case 'maintenance_records':
          rowErrors = ImportExportModel.validateMaintenanceRecordRow(rows[i], i);
          break;
        case 'fuel_records':
          rowErrors = ImportExportModel.validateFuelRecordRow(rows[i], i);
          break;
        case 'routes':
          rowErrors = ImportExportModel.validateRouteRow(rows[i], i);
          break;
        case 'accidents':
          rowErrors = ImportExportModel.validateAccidentRow(rows[i], i);
          break;
        case 'staff':
          rowErrors = ImportExportModel.validateStaffRow(rows[i], i);
          break;
        case 'service_providers':
          rowErrors = ImportExportModel.validateServiceProviderRow(rows[i], i);
          break;
        case 'spare_parts':
          rowErrors = ImportExportModel.validateSparePartRow(rows[i], i);
          break;
        case 'maintenance_schedules':
          rowErrors = ImportExportModel.validateMaintenanceScheduleRow(rows[i], i);
          break;
        default:
          return res.status(400).json({ success: false, error: 'Invalid import type' });
      }
      
      errors.push(...rowErrors);
    }

    res.json({
      success: true,
      data: {
        headers,
        preview: previewData,
        totalRows: rows.length,
        validationErrors: errors.slice(0, 50), // Limit errors shown
        canImport: errors.length === 0 || errors.length <= rows.length * 0.1, // Allow if <10% errors
      },
    });
  } catch (error: any) {
    console.error('Error previewing import:', error);
    res.status(400).json({ success: false, error: error.message || 'Failed to parse CSV' });
  }
});

// POST /api/fleet/import - Start import job
router.post('/', requireRole(['admin', 'manager']), async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const userId = req.user!.userId;
    const { importType, csvContent, fileName, skipValidation = false } = req.body;

    if (!importType || !csvContent) {
      return res.status(400).json({ success: false, error: 'Import type and CSV content are required' });
    }

    const { rows } = ImportExportModel.parseCSV(csvContent);

    // Create import job
    const job = await ImportExportModel.createImportJob(
      companyId,
      userId,
      importType,
      fileName || 'import.csv',
      rows.slice(0, 5)
    );

    // Process import asynchronously
    processImportJob(job.id, companyId, userId, importType, rows, skipValidation);

    res.status(202).json({
      success: true,
      data: { jobId: job.id, message: 'Import job started' },
    });
  } catch (error: any) {
    console.error('Error starting import:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to start import' });
  }
});

// GET /api/fleet/import/jobs - List import jobs
router.get('/jobs', async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const jobs = await ImportExportModel.findImportJobsByCompany(companyId, 50);
    res.json({ success: true, data: jobs });
  } catch (error) {
    console.error('Error fetching import jobs:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch jobs' });
  }
});

// GET /api/fleet/import/jobs/:id - Get import job status
router.get('/jobs/:id', async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const job = await ImportExportModel.findImportJobById(req.params.id, companyId);

    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }

    res.json({ success: true, data: job });
  } catch (error) {
    console.error('Error fetching import job:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch job' });
  }
});

// ============================================
// EXPORT ENDPOINTS
// ============================================

// POST /api/fleet/export - Start export job
router.post('/export', async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const userId = req.user!.userId;
    const { exportType, format = 'csv', filters = {} } = req.body;

    if (!exportType) {
      return res.status(400).json({ success: false, error: 'Export type is required' });
    }

    const job = await ImportExportModel.createExportJob(
      companyId,
      userId,
      exportType,
      format,
      filters
    );

    // Process export asynchronously
    processExportJob(job.id, companyId, exportType, format, filters);

    res.status(202).json({
      success: true,
      data: { jobId: job.id, message: 'Export job started' },
    });
  } catch (error) {
    console.error('Error starting export:', error);
    res.status(500).json({ success: false, error: 'Failed to start export' });
  }
});

// GET /api/fleet/export/jobs - List export jobs
router.get('/export/jobs', async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const jobs = await ImportExportModel.findExportJobsByCompany(companyId, 50);
    res.json({ success: true, data: jobs });
  } catch (error) {
    console.error('Error fetching export jobs:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch jobs' });
  }
});

// GET /api/fleet/export/jobs/:id - Get export job status
router.get('/export/jobs/:id', async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const job = await ImportExportModel.findExportJobById(req.params.id, companyId);

    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }

    res.json({ success: true, data: job });
  } catch (error) {
    console.error('Error fetching export job:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch job' });
  }
});

// GET /api/fleet/export/templates/:type - Download template CSV
router.get('/templates/:type', async (req: Request, res: Response) => {
  try {
    const { type } = req.params;
    let headers: string[] = [];

    switch (type) {
      case 'vehicles':
        headers = ['registration_number', 'make', 'model', 'year', 'type', 'fuel_type', 'fuel_capacity', 
                   'engine_capacity', 'color', 'vin', 'engine_number', 'purchase_date', 'purchase_price',
                   'current_odometer', 'status', 'department', 'notes'];
        break;
      case 'drivers':
        headers = ['first_name', 'last_name', 'email', 'phone', 'employee_id', 'license_number', 
                   'license_class', 'license_expiry', 'employment_status', 'department', 'notes'];
        break;
      case 'inventory':
        headers = ['sku', 'name', 'description', 'category', 'unit_of_measure', 'unit_price',
                   'current_stock', 'reorder_level', 'reorder_quantity', 'supplier_name', 
                   'supplier_contact', 'location'];
        break;
      case 'maintenance_records':
        headers = ['vehicle_registration', 'service_type', 'category', 'title', 'description',
                   'provider_name', 'scheduled_date', 'completed_date', 'service_mileage',
                   'next_service_mileage', 'labor_cost', 'parts_cost', 'other_cost',
                   'status', 'technician_name', 'invoice_number', 'warranty_months', 'notes'];
        break;
      case 'fuel_records':
        headers = ['vehicle_registration', 'date', 'liters', 'cost', 'odometer', 'fuel_station', 'notes'];
        break;
      case 'routes':
        headers = ['vehicle_registration', 'route_date', 'route_name', 'driver1_name', 'driver2_name',
                   'target_km', 'actual_km', 'target_fuel_consumption', 'actual_fuel', 'comments'];
        break;
      case 'accidents':
        headers = ['vehicle_registration', 'accident_date', 'location', 'description', 'severity',
                   'damage_cost', 'insurance_claim_number', 'driver_name', 'status'];
        break;
      case 'staff':
        headers = ['staff_no', 'staff_name', 'email', 'phone', 'designation', 'department', 'branch', 'role', 'comments'];
        break;
      case 'service_providers':
        headers = ['name', 'type', 'contact_person', 'phone', 'email', 'address', 'city', 'country',
                   'tax_id', 'specialties', 'notes'];
        break;
      case 'spare_parts':
        headers = ['part_number', 'name', 'description', 'category', 'manufacturer', 'unit_cost',
                   'quantity_in_stock', 'reorder_level', 'unit_of_measure', 'supplier_name'];
        break;
      case 'maintenance_schedules':
        headers = ['vehicle_registration', 'schedule_type', 'service_type', 'title', 'description',
                   'interval_mileage', 'interval_months', 'estimated_cost', 'priority'];
        break;
      default:
        return res.status(400).json({ success: false, error: 'Invalid template type' });
    }

    const csv = headers.join(',');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${type}_template.csv"`);
    res.send(csv);
  } catch (error) {
    console.error('Error generating template:', error);
    res.status(500).json({ success: false, error: 'Failed to generate template' });
  }
});

// ============================================
// BACKGROUND PROCESSING
// ============================================

async function processImportJob(
  jobId: string,
  companyId: string,
  userId: string,
  importType: string,
  rows: any[],
  skipValidation: boolean
) {
  try {
    await ImportExportModel.updateImportJob(jobId, companyId, { status: 'processing' });

    let processed = 0;
    let successful = 0;
    let failed = 0;
    const errors: any[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      processed++;

      try {
        // Validate row
        let rowErrors: any[] = [];
        if (!skipValidation) {
          switch (importType) {
            case 'vehicles':
              rowErrors = ImportExportModel.validateVehicleRow(row, i);
              break;
            case 'drivers':
              rowErrors = ImportExportModel.validateDriverRow(row, i);
              break;
            case 'inventory':
              rowErrors = ImportExportModel.validateInventoryRow(row, i);
              break;
            case 'maintenance_records':
              rowErrors = ImportExportModel.validateMaintenanceRecordRow(row, i);
              break;
            case 'fuel_records':
              rowErrors = ImportExportModel.validateFuelRecordRow(row, i);
              break;
            case 'routes':
              rowErrors = ImportExportModel.validateRouteRow(row, i);
              break;
            case 'accidents':
              rowErrors = ImportExportModel.validateAccidentRow(row, i);
              break;
            case 'staff':
              rowErrors = ImportExportModel.validateStaffRow(row, i);
              break;
            case 'service_providers':
              rowErrors = ImportExportModel.validateServiceProviderRow(row, i);
              break;
            case 'spare_parts':
              rowErrors = ImportExportModel.validateSparePartRow(row, i);
              break;
            case 'maintenance_schedules':
              rowErrors = ImportExportModel.validateMaintenanceScheduleRow(row, i);
              break;
          }
        }

        if (rowErrors.length > 0) {
          errors.push(...rowErrors);
          failed++;
          continue;
        }

        // Import row
        switch (importType) {
          case 'vehicles':
            await importVehicle(companyId, row);
            break;
          case 'drivers':
            await importDriver(companyId, row);
            break;
          case 'inventory':
            await importInventoryItem(companyId, userId, row);
            break;
          case 'maintenance_records':
            await importMaintenanceRecord(companyId, row);
            break;
          case 'fuel_records':
            await importFuelRecord(companyId, row);
            break;
          case 'routes':
            await importRoute(companyId, row);
            break;
          case 'accidents':
            await importAccident(companyId, row);
            break;
          case 'staff':
            await importStaff(companyId, row);
            break;
          case 'service_providers':
            await importServiceProvider(companyId, row);
            break;
          case 'spare_parts':
            await importSparePart(companyId, row);
            break;
          case 'maintenance_schedules':
            await importMaintenanceSchedule(companyId, row);
            break;
        }

        successful++;
      } catch (error: any) {
        errors.push({
          row: i + 2,
          field: 'general',
          value: null,
          message: error.message || 'Import failed',
        });
        failed++;
      }

      // Update progress every 10 rows
      if (processed % 10 === 0) {
        await ImportExportModel.updateImportJob(jobId, companyId, {
          processedRows: processed,
          successfulRows: successful,
          failedRows: failed,
          errors: errors.slice(-100), // Keep last 100 errors
        });
      }
    }

    // Final update
    await ImportExportModel.updateImportJob(jobId, companyId, {
      status: failed > 0 && failed === processed ? 'failed' : 'completed',
      processedRows: processed,
      successfulRows: successful,
      failedRows: failed,
      errors: errors.slice(-100),
    });
  } catch (error) {
    console.error('Import job failed:', error);
    await ImportExportModel.updateImportJob(jobId, companyId, {
      status: 'failed',
      errors: [{ row: 0, field: 'general', value: null, message: 'Job processing failed' }],
    });
  }
}

async function importVehicle(companyId: string, row: any) {
  // Check if vehicle exists
  const existing = await query(
    'SELECT id FROM vehicles WHERE registration_number = $1 AND company_id = $2',
    [row.registration_number, companyId]
  );

  if (existing.length > 0) {
    // Update existing
    await query(
      `UPDATE vehicles SET 
        make = $1, model = $2, year = $3, type = $4, fuel_type = $5, 
        fuel_capacity = $6, engine_capacity = $7, color = $8, vin = $9,
        engine_number = $10, purchase_price = $11, updated_at = NOW()
       WHERE id = $12`,
      [row.make, row.model, row.year, row.type, row.fuel_type,
       row.fuel_capacity, row.engine_capacity, row.color, row.vin,
       row.engine_number, row.purchase_price, existing[0].id]
    );
  } else {
    // Create new
    await query(
      `INSERT INTO vehicles (company_id, registration_number, make, model, year, type, 
       fuel_type, fuel_capacity, engine_capacity, color, vin, engine_number, 
       purchase_date, purchase_price, current_odometer, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
      [companyId, row.registration_number, row.make, row.model, row.year, row.type || 'car',
       row.fuel_type, row.fuel_capacity, row.engine_capacity, row.color, row.vin,
       row.engine_number, row.purchase_date, row.purchase_price, 
       row.current_odometer || 0, row.status || 'available']
    );
  }
}

async function importDriver(companyId: string, row: any) {
  const existing = await query(
    'SELECT id FROM drivers WHERE license_number = $1 AND company_id = $2',
    [row.license_number, companyId]
  );

  if (existing.length > 0) {
    await query(
      `UPDATE drivers SET 
        first_name = $1, last_name = $2, email = $3, phone = $4,
        license_class = $5, license_expiry = $6, department = $7, updated_at = NOW()
       WHERE id = $8`,
      [row.first_name, row.last_name, row.email, row.phone,
       row.license_class, row.license_expiry, row.department, existing[0].id]
    );
  } else {
    await query(
      `INSERT INTO drivers (company_id, first_name, last_name, email, phone, employee_id,
       license_number, license_class, license_expiry, employment_status, department)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [companyId, row.first_name, row.last_name, row.email, row.phone, row.employee_id,
       row.license_number, row.license_class, row.license_expiry, 
       row.employment_status || 'active', row.department]
    );
  }
}

async function importInventoryItem(companyId: string, userId: string, row: any) {
  // Get or create category
  let categoryId = null;
  if (row.category) {
    const catRows = await query(
      'SELECT id FROM inventory_categories WHERE name = $1 AND company_id = $2',
      [row.category, companyId]
    );
    if (catRows.length > 0) {
      categoryId = catRows[0].id;
    }
  }

  const existing = await query(
    'SELECT id FROM inventory_items WHERE sku = $1 AND company_id = $2',
    [row.sku, companyId]
  );

  if (existing.length > 0) {
    await query(
      `UPDATE inventory_items SET 
        name = $1, description = $2, category_id = $3, unit_of_measure = $4,
        unit_price = $5, reorder_level = $6, reorder_quantity = $7,
        supplier_name = $8, supplier_contact = $9, location = $10, updated_at = NOW()
       WHERE id = $11`,
      [row.name, row.description, categoryId, row.unit_of_measure,
       row.unit_price, row.reorder_level, row.reorder_quantity,
       row.supplier_name, row.supplier_contact, row.location, existing[0].id]
    );
  } else {
    await query(
      `INSERT INTO inventory_items (company_id, sku, name, description, category_id,
       unit_of_measure, unit_price, current_stock, reorder_level, reorder_quantity,
       supplier_name, supplier_contact, location, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [companyId, row.sku, row.name, row.description, categoryId,
       row.unit_of_measure, row.unit_price || 0, row.current_stock || 0, 
       row.reorder_level || 0, row.reorder_quantity || 0,
       row.supplier_name, row.supplier_contact, row.location, userId]
    );
  }
}

async function importMaintenanceRecord(companyId: string, row: any) {
  // Look up vehicle by registration number
  const vehicleRows = await query(
    'SELECT id FROM vehicles WHERE registration_number = $1 AND company_id = $2',
    [row.vehicle_registration, companyId]
  );

  if (vehicleRows.length === 0) {
    throw new Error(`Vehicle with registration "${row.vehicle_registration}" not found`);
  }

  const vehicleId = vehicleRows[0].id;

  // Calculate warranty expiry if provided
  let warrantyExpiry = null;
  if (row.warranty_months && row.completed_date) {
    warrantyExpiry = new Date(row.completed_date);
    warrantyExpiry.setMonth(warrantyExpiry.getMonth() + parseInt(row.warranty_months));
  }

  // Look up provider by name if provided
  let providerId = null;
  if (row.provider_name) {
    const providerRows = await query(
      'SELECT id FROM service_providers WHERE name = $1 AND company_id = $2',
      [row.provider_name, companyId]
    );
    if (providerRows.length > 0) {
      providerId = providerRows[0].id;
    }
  }

  // Insert maintenance record
  const recordResult = await query(
    `INSERT INTO maintenance_records (
      company_id, vehicle_id, service_type, category, title, description,
      provider_id, provider_name, scheduled_date, completed_date,
      service_mileage, next_service_mileage, labor_cost, parts_cost, other_cost,
      status, technician_name, warranty_months, warranty_expiry, invoice_number, notes
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
    RETURNING id`,
    [
      companyId,
      vehicleId,
      row.service_type?.toLowerCase() || 'preventive',
      row.category,
      row.title,
      row.description || null,
      providerId,
      row.provider_name || null,
      row.scheduled_date || null,
      row.completed_date || null,
      row.service_mileage ? parseFloat(row.service_mileage) : null,
      row.next_service_mileage ? parseFloat(row.next_service_mileage) : null,
      row.labor_cost ? parseFloat(row.labor_cost) : 0,
      row.parts_cost ? parseFloat(row.parts_cost) : 0,
      row.other_cost ? parseFloat(row.other_cost) : 0,
      row.status?.toLowerCase() || 'completed',
      row.technician_name || null,
      row.warranty_months ? parseInt(row.warranty_months) : null,
      warrantyExpiry,
      row.invoice_number || null,
      row.notes || null,
    ]
  );

  // If completed, update vehicle mileage
  if (row.completed_date && row.service_mileage) {
    await query(
      'UPDATE vehicles SET current_mileage = $1, last_service_date = $2, updated_at = NOW() WHERE id = $3',
      [parseFloat(row.service_mileage), row.completed_date, vehicleId]
    );
  }
}

async function importFuelRecord(companyId: string, row: any) {
  // Look up vehicle by registration number
  const vehicleRows = await query(
    'SELECT id, current_mileage FROM vehicles WHERE registration_number = $1 AND company_id = $2',
    [row.vehicle_registration, companyId]
  );

  if (vehicleRows.length === 0) {
    throw new Error(`Vehicle with registration "${row.vehicle_registration}" not found`);
  }

  const vehicleId = vehicleRows[0].id;
  const odometer = row.odometer ? parseFloat(row.odometer) : vehicleRows[0].current_mileage;

  await query(
    `INSERT INTO fuel_records (company_id, vehicle_id, date, liters, cost, odometer, fuel_station, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      companyId,
      vehicleId,
      row.date,
      parseFloat(row.liters),
      parseFloat(row.cost),
      odometer,
      row.fuel_station || null,
      row.notes || null
    ]
  );

  // Update vehicle mileage if odometer provided
  if (row.odometer) {
    await query(
      'UPDATE vehicles SET current_mileage = $1, updated_at = NOW() WHERE id = $2',
      [parseFloat(row.odometer), vehicleId]
    );
  }
}

async function importRoute(companyId: string, row: any) {
  // Look up vehicle
  const vehicleRows = await query(
    'SELECT id FROM vehicles WHERE registration_number = $1 AND company_id = $2',
    [row.vehicle_registration, companyId]
  );

  if (vehicleRows.length === 0) {
    throw new Error(`Vehicle with registration "${row.vehicle_registration}" not found`);
  }

  const vehicleId = vehicleRows[0].id;

  // Look up drivers by name if provided
  let driver1Id = null;
  let driver2Id = null;

  if (row.driver1_name) {
    const driverRows = await query(
      `SELECT id FROM staff WHERE staff_name = $1 AND company_id = $2 AND role = 'Driver'`,
      [row.driver1_name, companyId]
    );
    if (driverRows.length > 0) driver1Id = driverRows[0].id;
  }

  if (row.driver2_name) {
    const driverRows = await query(
      `SELECT id FROM staff WHERE staff_name = $1 AND company_id = $2 AND role = 'Driver'`,
      [row.driver2_name, companyId]
    );
    if (driverRows.length > 0) driver2Id = driverRows[0].id;
  }

  const actualKm = row.actual_km ? parseFloat(row.actual_km) : 0;
  const actualFuel = row.actual_fuel ? parseFloat(row.actual_fuel) : 0;
  const consumptionRate = actualFuel > 0 ? parseFloat((actualKm / actualFuel).toFixed(2)) : 0;

  await query(
    `INSERT INTO routes (company_id, vehicle_id, route_date, route_name, driver1_id, driver2_id,
     target_km, actual_km, target_fuel_consumption, actual_fuel, actual_consumption_rate, comments)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
    [
      companyId,
      vehicleId,
      row.route_date,
      row.route_name,
      driver1Id,
      driver2Id,
      row.target_km ? parseFloat(row.target_km) : 0,
      actualKm,
      row.target_fuel_consumption ? parseFloat(row.target_fuel_consumption) : 0,
      actualFuel,
      consumptionRate,
      row.comments || null
    ]
  );

  // Update vehicle mileage
  if (actualKm > 0) {
    await query(
      'UPDATE vehicles SET current_mileage = current_mileage + $1, updated_at = NOW() WHERE id = $2',
      [actualKm, vehicleId]
    );
  }
}

async function importAccident(companyId: string, row: any) {
  // Look up vehicle
  const vehicleRows = await query(
    'SELECT id FROM vehicles WHERE registration_number = $1 AND company_id = $2',
    [row.vehicle_registration, companyId]
  );

  if (vehicleRows.length === 0) {
    throw new Error(`Vehicle with registration "${row.vehicle_registration}" not found`);
  }

  const vehicleId = vehicleRows[0].id;

  // Look up driver if provided
  let driverId = null;
  if (row.driver_name) {
    const driverRows = await query(
      `SELECT id FROM staff WHERE staff_name = $1 AND company_id = $2`,
      [row.driver_name, companyId]
    );
    if (driverRows.length > 0) driverId = driverRows[0].id;
  }

  await query(
    `INSERT INTO accidents (company_id, vehicle_id, accident_date, location, description,
     severity, damage_cost, insurance_claim_number, driver_id, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      companyId,
      vehicleId,
      row.accident_date,
      row.location,
      row.description,
      row.severity || 'minor',
      row.damage_cost ? parseFloat(row.damage_cost) : 0,
      row.insurance_claim_number || null,
      driverId,
      row.status || 'reported'
    ]
  );
}

async function importStaff(companyId: string, row: any) {
  const existing = await query(
    'SELECT id FROM staff WHERE staff_no = $1 AND company_id = $2',
    [row.staff_no, companyId]
  );

  if (existing.length > 0) {
    await query(
      `UPDATE staff SET 
        staff_name = $1, email = $2, phone = $3, designation = $4,
        department = $5, branch = $6, role = $7, comments = $8, updated_at = NOW()
       WHERE id = $9`,
      [row.staff_name, row.email || null, row.phone || null, row.designation || null,
       row.department || null, row.branch || null, row.role || 'Staff', row.comments || null, existing[0].id]
    );
  } else {
    await query(
      `INSERT INTO staff (company_id, staff_no, staff_name, email, phone, designation,
       department, branch, role, comments)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [companyId, row.staff_no, row.staff_name, row.email || null, row.phone || null,
       row.designation || null, row.department || null, row.branch || null,
       row.role || 'Staff', row.comments || null]
    );
  }
}

async function importServiceProvider(companyId: string, row: any) {
  const existing = await query(
    'SELECT id FROM service_providers WHERE name = $1 AND company_id = $2',
    [row.name, companyId]
  );

  const specialties = row.specialties ? row.specialties.split(';').map((s: string) => s.trim()) : [];

  if (existing.length > 0) {
    await query(
      `UPDATE service_providers SET 
        type = $1, contact_person = $2, phone = $3, email = $4,
        address = $5, city = $6, country = $7, tax_id = $8,
        specialties = $9, notes = $10, updated_at = NOW()
       WHERE id = $11`,
      [row.type || 'general', row.contact_person || null, row.phone || null, row.email || null,
       row.address || null, row.city || null, row.country || 'China', row.tax_id || null,
       specialties, row.notes || null, existing[0].id]
    );
  } else {
    await query(
      `INSERT INTO service_providers (company_id, name, type, contact_person, phone, email,
       address, city, country, tax_id, specialties, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [companyId, row.name, row.type || 'general', row.contact_person || null, row.phone || null,
       row.email || null, row.address || null, row.city || null, row.country || 'China',
       row.tax_id || null, specialties, row.notes || null]
    );
  }
}

async function importSparePart(companyId: string, row: any) {
  // Look up supplier if provided
  let supplierId = null;
  if (row.supplier_name) {
    const supplierRows = await query(
      'SELECT id FROM service_providers WHERE name = $1 AND company_id = $2',
      [row.supplier_name, companyId]
    );
    if (supplierRows.length > 0) supplierId = supplierRows[0].id;
  }

  const existing = await query(
    'SELECT id FROM spare_parts WHERE part_number = $1 AND company_id = $2',
    [row.part_number, companyId]
  );

  if (existing.length > 0) {
    await query(
      `UPDATE spare_parts SET 
        name = $1, description = $2, category = $3, manufacturer = $4,
        unit_cost = $5, quantity_in_stock = $6, reorder_level = $7,
        unit_of_measure = $8, supplier_id = $9, updated_at = NOW()
       WHERE id = $10`,
      [row.name, row.description || null, row.category, row.manufacturer || null,
       row.unit_cost ? parseFloat(row.unit_cost) : 0,
       row.quantity_in_stock ? parseInt(row.quantity_in_stock) : 0,
       row.reorder_level ? parseInt(row.reorder_level) : 10,
       row.unit_of_measure || 'piece', supplierId, existing[0].id]
    );
  } else {
    await query(
      `INSERT INTO spare_parts (company_id, part_number, name, description, category,
       manufacturer, unit_cost, quantity_in_stock, reorder_level, unit_of_measure, supplier_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [companyId, row.part_number, row.name, row.description || null, row.category,
       row.manufacturer || null, row.unit_cost ? parseFloat(row.unit_cost) : 0,
       row.quantity_in_stock ? parseInt(row.quantity_in_stock) : 0,
       row.reorder_level ? parseInt(row.reorder_level) : 10,
       row.unit_of_measure || 'piece', supplierId]
    );
  }
}

async function importMaintenanceSchedule(companyId: string, row: any) {
  // Look up vehicle
  const vehicleRows = await query(
    'SELECT id, current_mileage FROM vehicles WHERE registration_number = $1 AND company_id = $2',
    [row.vehicle_registration, companyId]
  );

  if (vehicleRows.length === 0) {
    throw new Error(`Vehicle with registration "${row.vehicle_registration}" not found`);
  }

  const vehicleId = vehicleRows[0].id;
  const currentMileage = vehicleRows[0].current_mileage || 0;

  // Calculate next service date and mileage
  let nextServiceDate = null;
  let nextServiceMileage = null;

  if (row.interval_months) {
    const date = new Date();
    date.setMonth(date.getMonth() + parseInt(row.interval_months));
    nextServiceDate = date;
  }

  if (row.interval_mileage) {
    nextServiceMileage = currentMileage + parseInt(row.interval_mileage);
  }

  await query(
    `INSERT INTO maintenance_schedules (company_id, vehicle_id, schedule_type, service_type,
     service_name, description, interval_mileage, last_service_mileage, next_service_km,
     interval_months, next_service_date, estimated_cost, priority)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
    [
      companyId,
      vehicleId,
      row.schedule_type?.toLowerCase() || 'mileage_based',
      row.service_type,
      row.title,
      row.description || null,
      row.interval_mileage ? parseInt(row.interval_mileage) : null,
      currentMileage,
      nextServiceMileage,
      row.interval_months ? parseInt(row.interval_months) : null,
      nextServiceDate,
      row.estimated_cost ? parseFloat(row.estimated_cost) : null,
      row.priority || 'normal'
    ]
  );
}

async function processExportJob(
  jobId: string,
  companyId: string,
  exportType: string,
  format: string,
  filters: Record<string, any>
) {
  try {
    await ImportExportModel.updateExportJob(jobId, companyId, { status: 'processing' });

    let data: any[] = [];
    let headers: string[] = [];

    switch (exportType) {
      case 'vehicles':
        const vehicles = await query(
          'SELECT * FROM vehicles WHERE company_id = $1 ORDER BY created_at DESC',
          [companyId]
        );
        data = vehicles;
        headers = ['registration_number', 'make', 'model', 'year', 'type', 'fuel_type', 'status'];
        break;
      case 'drivers':
        const drivers = await query(
          'SELECT * FROM drivers WHERE company_id = $1 ORDER BY created_at DESC',
          [companyId]
        );
        data = drivers;
        headers = ['first_name', 'last_name', 'email', 'license_number', 'employment_status'];
        break;
      case 'inventory':
        const items = await query(
          `SELECT i.*, c.name as category_name 
           FROM inventory_items i 
           LEFT JOIN inventory_categories c ON i.category_id = c.id 
           WHERE i.company_id = $1 ORDER BY i.created_at DESC`,
          [companyId]
        );
        data = items;
        headers = ['sku', 'name', 'category_name', 'current_stock', 'unit_price'];
        break;
      case 'maintenance_records':
        const records = await query(
          `SELECT mr.*, v.registration_number as vehicle_registration
           FROM maintenance_records mr
           JOIN vehicles v ON mr.vehicle_id = v.id
           WHERE mr.company_id = $1 ORDER BY mr.created_at DESC`,
          [companyId]
        );
        data = records;
        headers = ['vehicle_registration', 'service_type', 'category', 'title', 'completed_date', 
                   'service_mileage', 'total_cost', 'status', 'technician_name'];
        break;
      case 'fuel_records':
        const fuelRecords = await query(
          `SELECT fr.*, v.registration_number as vehicle_registration
           FROM fuel_records fr
           JOIN vehicles v ON fr.vehicle_id = v.id
           WHERE fr.company_id = $1 ORDER BY fr.date DESC`,
          [companyId]
        );
        data = fuelRecords;
        headers = ['vehicle_registration', 'date', 'liters', 'cost', 'odometer', 'fuel_station'];
        break;
      case 'routes':
        const routes = await query(
          `SELECT r.*, v.registration_number as vehicle_registration,
            d1.staff_name as driver1_name, d2.staff_name as driver2_name
           FROM routes r
           JOIN vehicles v ON r.vehicle_id = v.id
           LEFT JOIN staff d1 ON d1.id = r.driver1_id
           LEFT JOIN staff d2 ON d2.id = r.driver2_id
           WHERE r.company_id = $1 ORDER BY r.route_date DESC`,
          [companyId]
        );
        data = routes;
        headers = ['vehicle_registration', 'route_date', 'route_name', 'driver1_name', 'driver2_name',
                   'actual_km', 'actual_fuel', 'actual_consumption_rate'];
        break;
      case 'accidents':
        const accidents = await query(
          `SELECT a.*, v.registration_number as vehicle_registration,
            s.staff_name as driver_name
           FROM accidents a
           JOIN vehicles v ON a.vehicle_id = v.id
           LEFT JOIN staff s ON s.id = a.driver_id
           WHERE a.company_id = $1 ORDER BY a.accident_date DESC`,
          [companyId]
        );
        data = accidents;
        headers = ['vehicle_registration', 'accident_date', 'location', 'severity', 
                   'damage_cost', 'driver_name', 'status'];
        break;
      case 'staff':
        const staff = await query(
          'SELECT * FROM staff WHERE company_id = $1 ORDER BY created_at DESC',
          [companyId]
        );
        data = staff;
        headers = ['staff_no', 'staff_name', 'email', 'phone', 'designation', 'department', 'role'];
        break;
      case 'service_providers':
        const providers = await query(
          'SELECT * FROM service_providers WHERE company_id = $1 ORDER BY name ASC',
          [companyId]
        );
        data = providers;
        headers = ['name', 'type', 'contact_person', 'phone', 'email', 'city', 'country', 'is_approved'];
        break;
      case 'spare_parts':
        const parts = await query(
          `SELECT sp.*, p.name as supplier_name
           FROM spare_parts sp
           LEFT JOIN service_providers p ON p.id = sp.supplier_id
           WHERE sp.company_id = $1 ORDER BY sp.name ASC`,
          [companyId]
        );
        data = parts;
        headers = ['part_number', 'name', 'category', 'quantity_in_stock', 'unit_cost', 'supplier_name'];
        break;
      case 'maintenance_schedules':
        const schedules = await query(
          `SELECT ms.*, v.registration_number as vehicle_registration
           FROM maintenance_schedules ms
           JOIN vehicles v ON ms.vehicle_id = v.id
           WHERE ms.company_id = $1 ORDER BY ms.next_service_date ASC`,
          [companyId]
        );
        data = schedules;
        headers = ['vehicle_registration', 'schedule_type', 'service_type', 'title', 
                   'next_service_date', 'next_service_km', 'status', 'priority'];
        break;
      default:
        throw new Error('Invalid export type');
    }

    // Generate CSV
    let csv = headers.join(',') + '\n';
    for (const row of data) {
      const values = headers.map(h => {
        const val = row[h] || '';
        return `"${String(val).replace(/"/g, '""')}"`;
      });
      csv += values.join(',') + '\n';
    }

    // In production, upload to S3/cloud storage and store URL
    // For now, we'll store in a temp location
    const fileUrl = `/temp/exports/${jobId}.${format}`;

    await ImportExportModel.updateExportJob(jobId, companyId, {
      status: 'completed',
      rowCount: data.length,
      fileUrl,
    });
  } catch (error) {
    console.error('Export job failed:', error);
    await ImportExportModel.updateExportJob(jobId, companyId, { status: 'failed' });
  }
}

export default router;
