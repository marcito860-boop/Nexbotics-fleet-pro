import { Router, Request, Response } from 'express';
import { authMiddleware } from '../utils/auth';
import { query } from '../database';

const router = Router();

// POST /api/admin/seed-data - Seed comprehensive test data (super admin only)
router.post('/seed-data', authMiddleware, async (req: Request, res: Response) => {
  // Only super admins can seed data
  if (req.user?.type !== 'super_admin' && req.user?.companyId !== 'super_admin') {
    return res.status(403).json({ success: false, error: 'Super admin access required' });
  }

  const { companySlug } = req.body;
  if (!companySlug) {
    return res.status(400).json({ success: false, error: 'Company slug required' });
  }

  try {
    // Get company ID
    const companyResult = await query('SELECT id FROM companies WHERE slug = $1', [companySlug]);
    if (companyResult.length === 0) {
      return res.status(404).json({ success: false, error: 'Company not found' });
    }
    const companyId = companyResult[0].id;

    const results: Record<string, number> = {};

    // ==================== VEHICLES ====================
    const vehicles = [
      { plate: 'KDA-001', make: 'Toyota', model: 'Hilux', year: 2022, type: 'truck', status: 'available', fuelType: 'diesel', mileage: 15000 },
      { plate: 'KDA-002', make: 'Mitsubishi', model: 'Canter', year: 2021, type: 'truck', status: 'on_trip', fuelType: 'diesel', mileage: 28000 },
      { plate: 'KDA-003', make: 'Toyota', model: 'Hiace', year: 2023, type: 'van', status: 'available', fuelType: 'petrol', mileage: 8000 },
      { plate: 'KDA-004', make: 'Nissan', model: 'Navara', year: 2020, type: 'truck', status: 'maintenance', fuelType: 'diesel', mileage: 45000 },
      { plate: 'KDA-005', make: 'Isuzu', model: 'D-Max', year: 2022, type: 'truck', status: 'available', fuelType: 'diesel', mileage: 22000 },
      { plate: 'KDA-006', make: 'Toyota', model: 'Corolla', year: 2023, type: 'car', status: 'available', fuelType: 'petrol', mileage: 12000 },
      { plate: 'KDA-007', make: 'Mazda', model: 'CX-5', year: 2021, type: 'suv', status: 'on_trip', fuelType: 'petrol', mileage: 35000 },
      { plate: 'KDA-008', make: 'Ford', model: 'Ranger', year: 2022, type: 'truck', status: 'available', fuelType: 'diesel', mileage: 18000 },
    ];

    let vehicleCount = 0;
    for (const v of vehicles) {
      const existing = await query('SELECT id FROM vehicles WHERE registration_number = $1 AND company_id = $2', [v.plate, companyId]);
      if (existing.length === 0) {
        await query(
          `INSERT INTO vehicles (company_id, registration_number, make, model, year, type, status, fuel_type, current_mileage, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())`,
          [companyId, v.plate, v.make, v.model, v.year, v.type, v.status, v.fuelType, v.mileage]
        );
        vehicleCount++;
      }
    }
    results.vehicles = vehicleCount;

    // ==================== DRIVERS ====================
    const drivers = [
      { firstName: 'John', lastName: 'Kamau', license: 'DL123456', phone: '+254712345678', status: 'active' },
      { firstName: 'Peter', lastName: 'Ochieng', license: 'DL234567', phone: '+254723456789', status: 'active' },
      { firstName: 'James', lastName: 'Mutua', license: 'DL345678', phone: '+254734567890', status: 'on_leave' },
      { firstName: 'Michael', lastName: 'Wanjala', license: 'DL456789', phone: '+254745678901', status: 'active' },
      { firstName: 'David', lastName: 'Kipchoge', license: 'DL567890', phone: '+254756789012', status: 'suspended' },
      { firstName: 'Daniel', lastName: 'Odhiambo', license: 'DL678901', phone: '+254767890123', status: 'active' },
    ];

    const driverIds: string[] = [];
    let driverCount = 0;
    for (const d of drivers) {
      const existing = await query('SELECT id FROM drivers WHERE license_number = $1 AND company_id = $2', [d.license, companyId]);
      if (existing.length > 0) {
        driverIds.push(existing[0].id);
      } else {
        const result = await query(
          `INSERT INTO drivers (company_id, first_name, last_name, license_number, phone, status, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW()) RETURNING id`,
          [companyId, d.firstName, d.lastName, d.license, d.phone, d.status]
        );
        driverIds.push(result[0].id);
        driverCount++;
      }
    }
    results.drivers = driverCount;

    // Get vehicle IDs for assignments
    const vehicleRows = await query('SELECT id FROM vehicles WHERE company_id = $1 ORDER BY created_at LIMIT 8', [companyId]);
    const vehicleIds = vehicleRows.map((r: any) => r.id);

    // ==================== TRIPS ====================
    if (vehicleIds.length >= 2 && driverIds.length >= 2) {
      const trips = [
        { vehicleIdx: 1, driverIdx: 1, status: 'in_progress', start: 'Nairobi', end: 'Mombasa', purpose: 'Cargo delivery', distance: 485 },
        { vehicleIdx: 6, driverIdx: 3, status: 'in_progress', start: 'Nairobi', end: 'Kisumu', purpose: 'Client meeting', distance: 380 },
        { vehicleIdx: 0, driverIdx: 0, status: 'completed', start: 'Nairobi', end: 'Nakuru', purpose: 'Supply run', distance: 160 },
        { vehicleIdx: 2, driverIdx: 5, status: 'completed', start: 'Nairobi', end: 'Thika', purpose: 'Staff transport', distance: 45 },
        { vehicleIdx: 4, driverIdx: 3, status: 'scheduled', start: 'Nairobi', end: 'Eldoret', purpose: 'Warehouse delivery', distance: 320 },
      ];

      let tripCount = 0;
      for (const t of trips) {
        if (vehicleIds[t.vehicleIdx] && driverIds[t.driverIdx]) {
          const startedAt = t.status === 'completed' ? 'NOW() - INTERVAL \'2 days\'' : 
                           t.status === 'in_progress' ? 'NOW() - INTERVAL \'3 hours\'' : 'NOW() + INTERVAL \'1 day\'';
          
          await query(
            `INSERT INTO trips (company_id, vehicle_id, driver_id, start_location, end_location, purpose, status, distance_km, started_at, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, ${startedAt}, NOW(), NOW())`,
            [companyId, vehicleIds[t.vehicleIdx], driverIds[t.driverIdx], t.start, t.end, t.purpose, t.status, t.distance]
          );
          tripCount++;
        }
      }
      results.trips = tripCount;
    }

    // ==================== FUEL TRANSACTIONS ====================
    if (vehicleIds.length > 0) {
      const fuelTxs = [
        { vehicleIdx: 0, liters: 45, cost: 6120, type: 'diesel' },
        { vehicleIdx: 1, liters: 60, cost: 8160, type: 'diesel' },
        { vehicleIdx: 2, liters: 40, cost: 5600, type: 'petrol' },
        { vehicleIdx: 4, liters: 55, cost: 7480, type: 'diesel' },
        { vehicleIdx: 5, liters: 35, cost: 4900, type: 'petrol' },
        { vehicleIdx: 7, liters: 50, cost: 6800, type: 'diesel' },
      ];

      let fuelCount = 0;
      for (const f of fuelTxs) {
        if (vehicleIds[f.vehicleIdx]) {
          await query(
            `INSERT INTO fuel_transactions (company_id, vehicle_id, liters, total_cost, fuel_type, transaction_date, created_at)
             VALUES ($1, $2, $3, $4, $5, NOW() - INTERVAL '${Math.floor(Math.random() * 7)} days', NOW())`,
            [companyId, vehicleIds[f.vehicleIdx], f.liters, f.cost, f.type]
          );
          fuelCount++;
        }
      }
      results.fuelTransactions = fuelCount;
    }

    // ==================== MAINTENANCE ====================
    if (vehicleIds.length > 0) {
      const maintenance = [
        { vehicleIdx: 3, type: 'service', description: 'Regular 40,000km service', cost: 15000, status: 'in_progress' },
        { vehicleIdx: 0, type: 'repair', description: 'Brake pad replacement', cost: 8500, status: 'completed' },
        { vehicleIdx: 1, type: 'inspection', description: 'Annual safety inspection', cost: 3000, status: 'completed' },
        { vehicleIdx: 4, type: 'tire_change', description: 'Tire rotation and alignment', cost: 6000, status: 'scheduled' },
      ];

      let maintCount = 0;
      for (const m of maintenance) {
        if (vehicleIds[m.vehicleIdx]) {
          await query(
            `INSERT INTO maintenance_records (company_id, vehicle_id, maintenance_type, description, cost, status, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
            [companyId, vehicleIds[m.vehicleIdx], m.type, m.description, m.cost, m.status]
          );
          maintCount++;
        }
      }
      results.maintenance = maintCount;
    }

    // ==================== INVENTORY ====================
    const inventory = [
      { name: 'Engine Oil (5L)', category: 'fluids', quantity: 20, minStock: 5, unit: 'can', cost: 3500 },
      { name: 'Brake Pads - Toyota', category: 'parts', quantity: 8, minStock: 3, unit: 'set', cost: 4500 },
      { name: 'Air Filter', category: 'parts', quantity: 15, minStock: 5, unit: 'piece', cost: 800 },
      { name: 'Tire - 265/65R17', category: 'tires', quantity: 12, minStock: 4, unit: 'piece', cost: 12000 },
      { name: 'Diesel (Bulk)', category: 'fuel', quantity: 500, minStock: 100, unit: 'liters', cost: 136 },
      { name: 'Windshield Wipers', category: 'parts', quantity: 6, minStock: 4, unit: 'set', cost: 1500 },
    ];

    let invCount = 0;
    for (const i of inventory) {
      const existing = await query('SELECT id FROM inventory_items WHERE name = $1 AND company_id = $2', [i.name, companyId]);
      if (existing.length === 0) {
        await query(
          `INSERT INTO inventory_items (company_id, name, category, quantity, min_stock_level, unit, unit_cost, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
          [companyId, i.name, i.category, i.quantity, i.minStock, i.unit, i.cost]
        );
        invCount++;
      }
    }
    results.inventory = invCount;

    // ==================== REQUISITIONS ====================
    const adminResult = await query('SELECT id FROM users WHERE company_id = $1 AND role = $2 LIMIT 1', [companyId, 'admin']);
    const requesterId = adminResult[0]?.id;
    
    if (requesterId) {
      const requisitions = [
        { type: 'fuel', description: 'Fuel for KDA-001 trip to Mombasa', amount: 8000, status: 'approved' },
        { type: 'maintenance', description: 'Brake pad replacement KDA-002', amount: 4500, status: 'pending' },
        { type: 'supplies', description: 'Office stationery for fleet office', amount: 2500, status: 'approved' },
        { type: 'fuel', description: 'Emergency fuel refill KDA-005', amount: 6000, status: 'pending' },
      ];

      let reqCount = 0;
      for (const r of requisitions) {
        await query(
          `INSERT INTO requisitions (company_id, requester_id, type, description, amount, status, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
          [companyId, requesterId, r.type, r.description, r.amount, r.status]
        );
        reqCount++;
      }
      results.requisitions = reqCount;
    }

    // ==================== ALERTS ====================
    const alerts = [
      { type: 'maintenance_due', severity: 'high', message: 'Vehicle KDA-004 maintenance overdue by 5 days', read: false },
      { type: 'document_expiry', severity: 'medium', message: 'Driver John Kamau license expires in 30 days', read: false },
      { type: 'low_fuel', severity: 'low', message: 'Vehicle KDA-003 fuel level below 20%', read: true },
      { type: 'trip_delay', severity: 'medium', message: 'Trip to Kisumu delayed by 2 hours', read: false },
    ];

    let alertCount = 0;
    for (const a of alerts) {
      await query(
        `INSERT INTO alerts (company_id, type, severity, message, is_read, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW() - INTERVAL '${Math.floor(Math.random() * 3)} days')`,
        [companyId, a.type, a.severity, a.message, a.read]
      );
      alertCount++;
    }
    results.alerts = alertCount;

    // ==================== INVOICES ====================
    const invoices = [
      { number: 'INV-2024-001', client: 'ABC Logistics Ltd', amount: 125000, status: 'paid' },
      { number: 'INV-2024-002', client: 'XYZ Transport', amount: 85000, status: 'pending' },
      { number: 'INV-2024-003', client: 'Quick Movers', amount: 45000, status: 'overdue' },
      { number: 'INV-2024-004', client: 'Safari Cargo', amount: 230000, status: 'paid' },
    ];

    let invCount2 = 0;
    for (const inv of invoices) {
      const existing = await query('SELECT id FROM invoices WHERE invoice_number = $1 AND company_id = $2', [inv.number, companyId]);
      if (existing.length === 0) {
        const dueDate = inv.status === 'overdue' ? 'NOW() - INTERVAL \'10 days\'' : 'NOW() + INTERVAL \'30 days\'';
        
        await query(
          `INSERT INTO invoices (company_id, invoice_number, client_name, amount, status, due_date, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, ${dueDate}, NOW(), NOW())`,
          [companyId, inv.number, inv.client, inv.amount, inv.status]
        );
        invCount2++;
      }
    }
    results.invoices = invCount2;

    res.json({
      success: true,
      message: 'Test data seeded successfully',
      data: results
    });

  } catch (error: any) {
    console.error('Seed data error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to seed data' });
  }
});

// POST /api/admin/create-g4s-user - Create G4S pilot user
router.post('/create-g4s-user', async (req: Request, res: Response) => {
  try {
    const bcrypt = await import('bcryptjs');
    
    // Check if G4S company exists
    const companyResult = await query('SELECT id FROM companies WHERE slug = $1', ['g4s-security']);
    let companyId;
    
    if (companyResult.length === 0) {
      // Create G4S company
      const companyInsert = await query(
        `INSERT INTO companies (name, slug, email, phone, address, city, country, timezone, currency, subscription_plan, subscription_status, max_users, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW()) RETURNING id`,
        ['G4S Security Services', 'g4s-security', 'info@g4s.com', '+254 20 2228000', 'G4S House, Waiyaki Way', 'Nairobi', 'Kenya', 'Africa/Nairobi', 'KES', 'enterprise', 'active', 50]
      );
      companyId = companyInsert[0].id;
    } else {
      companyId = companyResult[0].id;
    }
    
    // Check if user exists
    const existingUser = await query('SELECT id FROM users WHERE email = $1', ['pilot@g4s.com']);
    
    if (existingUser.length > 0) {
      // Update password
      const hashedPassword = await bcrypt.hash('G4SPilot2024!', 10);
      await query('UPDATE users SET password_hash = $1 WHERE email = $2', [hashedPassword, 'pilot@g4s.com']);
      
      return res.json({
        success: true,
        message: 'G4S pilot user password updated',
        data: {
          email: 'pilot@g4s.com',
          password: 'G4SPilot2024!',
          companyId: companyId
        }
      });
    }
    
    // Create new user
    const hashedPassword = await bcrypt.hash('G4SPilot2024!', 10);
    const userResult = await query(
      `INSERT INTO users (company_id, email, password_hash, first_name, last_name, role, department, is_active, must_change_password, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW()) RETURNING id`,
      [companyId, 'pilot@g4s.com', hashedPassword, 'G4S', 'Pilot', 'admin', 'Operations', true, false]
    );
    
    res.json({
      success: true,
      message: 'G4S pilot user created successfully',
      data: {
        id: userResult[0].id,
        email: 'pilot@g4s.com',
        password: 'G4SPilot2024!',
        companyId: companyId
      }
    });
    
  } catch (error: any) {
    console.error('Create G4S user error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to create G4S user' });
  }
});

export default router;
