const { query } = require('./dist/database');
const { hashPassword, generateSecurePassword } = require('./dist/utils/password');

async function seedAllData() {
  console.log('🌱 Starting comprehensive data seed...\n');
  
  try {
    // Get company ID
    const companyResult = await query("SELECT id FROM companies WHERE slug = 'fleet-demo'");
    if (companyResult.length === 0) {
      console.log('❌ Company fleet-demo not found');
      return;
    }
    const companyId = companyResult[0].id;
    console.log('✓ Found company:', companyId);

    // Get admin user ID
    const adminResult = await query(
      "SELECT id FROM users WHERE email = 'admin@fleet-demo.com' AND company_id = $1",
      [companyId]
    );
    const adminId = adminResult[0]?.id;
    console.log('✓ Found admin user:', adminId);

    // ==================== VEHICLES ====================
    console.log('\n📦 Creating vehicles...');
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

    const vehicleIds = [];
    for (const v of vehicles) {
      const existing = await query('SELECT id FROM vehicles WHERE plate_number = $1 AND company_id = $2', [v.plate, companyId]);
      if (existing.length > 0) {
        vehicleIds.push(existing[0].id);
        continue;
      }
      
      const result = await query(
        `INSERT INTO vehicles (company_id, plate_number, make, model, year, type, status, fuel_type, current_mileage, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW()) RETURNING id`,
        [companyId, v.plate, v.make, v.model, v.year, v.type, v.status, v.fuelType, v.mileage]
      );
      vehicleIds.push(result[0].id);
      console.log(`  ✓ ${v.plate} - ${v.make} ${v.model}`);
    }

    // ==================== DRIVERS ====================
    console.log('\n👥 Creating drivers...');
    const drivers = [
      { firstName: 'John', lastName: 'Kamau', license: 'DL123456', phone: '+254712345678', status: 'active' },
      { firstName: 'Peter', lastName: 'Ochieng', license: 'DL234567', phone: '+254723456789', status: 'active' },
      { firstName: 'James', lastName: 'Mutua', license: 'DL345678', phone: '+254734567890', status: 'on_leave' },
      { firstName: 'Michael', lastName: 'Wanjala', license: 'DL456789', phone: '+254745678901', status: 'active' },
      { firstName: 'David', lastName: 'Kipchoge', license: 'DL567890', phone: '+254756789012', status: 'suspended' },
      { firstName: 'Daniel', lastName: 'Odhiambo', license: 'DL678901', phone: '+254767890123', status: 'active' },
    ];

    const driverIds = [];
    for (const d of drivers) {
      const existing = await query('SELECT id FROM drivers WHERE license_number = $1 AND company_id = $2', [d.license, companyId]);
      if (existing.length > 0) {
        driverIds.push(existing[0].id);
        continue;
      }
      
      const result = await query(
        `INSERT INTO drivers (company_id, first_name, last_name, license_number, phone, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW()) RETURNING id`,
        [companyId, d.firstName, d.lastName, d.license, d.phone, d.status]
      );
      driverIds.push(result[0].id);
      console.log(`  ✓ ${d.firstName} ${d.lastName} - ${d.license}`);
    }

    // ==================== ASSIGNMENTS ====================
    console.log('\n🔄 Creating assignments...');
    const assignments = [
      { vehicleIdx: 0, driverIdx: 0, status: 'active' },
      { vehicleIdx: 1, driverIdx: 1, status: 'active' },
      { vehicleIdx: 4, driverIdx: 3, status: 'active' },
      { vehicleIdx: 5, driverIdx: 5, status: 'active' },
      { vehicleIdx: 3, driverIdx: 2, status: 'inactive' }, // Maintenance vehicle
    ];

    for (const a of assignments) {
      const existing = await query(
        'SELECT id FROM vehicle_assignments WHERE vehicle_id = $1 AND driver_id = $2 AND status = $3',
        [vehicleIds[a.vehicleIdx], driverIds[a.driverIdx], a.status]
      );
      if (existing.length > 0) continue;
      
      await query(
        `INSERT INTO vehicle_assignments (company_id, vehicle_id, driver_id, assigned_at, status, created_at)
         VALUES ($1, $2, $3, NOW(), $4, NOW())`,
        [companyId, vehicleIds[a.vehicleIdx], driverIds[a.driverIdx], a.status]
      );
      console.log(`  ✓ Assigned ${vehicles[a.vehicleIdx].plate} to ${drivers[a.driverIdx].firstName}`);
    }

    // ==================== TRIPS ====================
    console.log('\n🚗 Creating trips...');
    const trips = [
      { vehicleIdx: 1, driverIdx: 1, status: 'in_progress', start: 'Nairobi', end: 'Mombasa', purpose: 'Cargo delivery', distance: 485 },
      { vehicleIdx: 6, driverIdx: 3, status: 'in_progress', start: 'Nairobi', end: 'Kisumu', purpose: 'Client meeting', distance: 380 },
      { vehicleIdx: 0, driverIdx: 0, status: 'completed', start: 'Nairobi', end: 'Nakuru', purpose: 'Supply run', distance: 160 },
      { vehicleIdx: 2, driverIdx: 5, status: 'completed', start: 'Nairobi', end: 'Thika', purpose: 'Staff transport', distance: 45 },
      { vehicleIdx: 4, driverIdx: 3, status: 'scheduled', start: 'Nairobi', end: 'Eldoret', purpose: 'Warehouse delivery', distance: 320 },
    ];

    for (const t of trips) {
      const startedAt = t.status === 'completed' ? 'NOW() - INTERVAL \'2 days\'' : 
                       t.status === 'in_progress' ? 'NOW() - INTERVAL \'3 hours\'' : 'NOW() + INTERVAL \'1 day\'';
      
      await query(
        `INSERT INTO trips (company_id, vehicle_id, driver_id, start_location, end_location, purpose, status, distance_km, started_at, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, ${startedAt}, NOW(), NOW())`,
        [companyId, vehicleIds[t.vehicleIdx], driverIds[t.driverIdx], t.start, t.end, t.purpose, t.status, t.distance]
      );
      console.log(`  ✓ ${t.start} → ${t.end} (${t.status})`);
    }

    // ==================== FUEL TRANSACTIONS ====================
    console.log('\n⛽ Creating fuel transactions...');
    const fuelTxs = [
      { vehicleIdx: 0, liters: 45, cost: 6120, type: 'diesel' },
      { vehicleIdx: 1, liters: 60, cost: 8160, type: 'diesel' },
      { vehicleIdx: 2, liters: 40, cost: 5600, type: 'petrol' },
      { vehicleIdx: 4, liters: 55, cost: 7480, type: 'diesel' },
      { vehicleIdx: 5, liters: 35, cost: 4900, type: 'petrol' },
      { vehicleIdx: 7, liters: 50, cost: 6800, type: 'diesel' },
    ];

    for (const f of fuelTxs) {
      await query(
        `INSERT INTO fuel_transactions (company_id, vehicle_id, liters, total_cost, fuel_type, transaction_date, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW() - INTERVAL '${Math.floor(Math.random() * 7)} days', NOW())`,
        [companyId, vehicleIds[f.vehicleIdx], f.liters, f.cost, f.type]
      );
      console.log(`  ✓ ${f.liters}L ${f.type} for ${vehicles[f.vehicleIdx].plate}`);
    }

    // ==================== MAINTENANCE ====================
    console.log('\n🔧 Creating maintenance records...');
    const maintenance = [
      { vehicleIdx: 3, type: 'service', description: 'Regular 40,000km service', cost: 15000, status: 'in_progress' },
      { vehicleIdx: 0, type: 'repair', description: 'Brake pad replacement', cost: 8500, status: 'completed' },
      { vehicleIdx: 1, type: 'inspection', description: 'Annual safety inspection', cost: 3000, status: 'completed' },
      { vehicleIdx: 4, type: 'tire_change', description: 'Tire rotation and alignment', cost: 6000, status: 'scheduled' },
    ];

    for (const m of maintenance) {
      const completedAt = m.status === 'completed' ? ', completed_at = NOW() - INTERVAL \'5 days\'' : '';
      await query(
        `INSERT INTO maintenance_records (company_id, vehicle_id, maintenance_type, description, cost, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
        [companyId, vehicleIds[m.vehicleIdx], m.type, m.description, m.cost, m.status]
      );
      console.log(`  ✓ ${m.type}: ${m.description} (${m.status})`);
    }

    // ==================== INVENTORY ====================
    console.log('\n📦 Creating inventory...');
    const inventory = [
      { name: 'Engine Oil (5L)', category: 'fluids', quantity: 20, minStock: 5, unit: 'can', cost: 3500 },
      { name: 'Brake Pads - Toyota', category: 'parts', quantity: 8, minStock: 3, unit: 'set', cost: 4500 },
      { name: 'Air Filter', category: 'parts', quantity: 15, minStock: 5, unit: 'piece', cost: 800 },
      { name: 'Tire - 265/65R17', category: 'tires', quantity: 12, minStock: 4, unit: 'piece', cost: 12000 },
      { name: 'Diesel (Bulk)', category: 'fuel', quantity: 500, minStock: 100, unit: 'liters', cost: 136 },
      { name: 'Windshield Wipers', category: 'parts', quantity: 6, minStock: 4, unit: 'set', cost: 1500 },
    ];

    for (const i of inventory) {
      const existing = await query('SELECT id FROM inventory_items WHERE name = $1 AND company_id = $2', [i.name, companyId]);
      if (existing.length > 0) continue;
      
      await query(
        `INSERT INTO inventory_items (company_id, name, category, quantity, min_stock_level, unit, unit_cost, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
        [companyId, i.name, i.category, i.quantity, i.minStock, i.unit, i.cost]
      );
      console.log(`  ✓ ${i.name}: ${i.quantity} ${i.unit}`);
    }

    // ==================== REQUISITIONS ====================
    console.log('\n📝 Creating requisitions...');
    const requisitions = [
      { type: 'fuel', description: 'Fuel for KDA-001 trip to Mombasa', amount: 8000, status: 'approved' },
      { type: 'maintenance', description: 'Brake pad replacement KDA-002', amount: 4500, status: 'pending' },
      { type: 'supplies', description: 'Office stationery for fleet office', amount: 2500, status: 'approved' },
      { type: 'fuel', description: 'Emergency fuel refill KDA-005', amount: 6000, status: 'pending' },
    ];

    for (const r of requisitions) {
      await query(
        `INSERT INTO requisitions (company_id, requester_id, type, description, amount, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
        [companyId, adminId, r.type, r.description, r.amount, r.status]
      );
      console.log(`  ✓ ${r.type}: ${r.description} (${r.status})`);
    }

    // ==================== ALERTS ====================
    console.log('\n🚨 Creating alerts...');
    const alerts = [
      { type: 'maintenance_due', severity: 'high', message: 'Vehicle KDA-004 maintenance overdue by 5 days', read: false },
      { type: 'document_expiry', severity: 'medium', message: 'Driver John Kamau license expires in 30 days', read: false },
      { type: 'low_fuel', severity: 'low', message: 'Vehicle KDA-003 fuel level below 20%', read: true },
      { type: 'trip_delay', severity: 'medium', message: 'Trip to Kisumu delayed by 2 hours', read: false },
    ];

    for (const a of alerts) {
      await query(
        `INSERT INTO alerts (company_id, type, severity, message, is_read, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW() - INTERVAL '${Math.floor(Math.random() * 3)} days')`,
        [companyId, a.type, a.severity, a.message, a.read]
      );
      console.log(`  ✓ ${a.type}: ${a.message}`);
    }

    // ==================== INVOICES ====================
    console.log('\n💰 Creating invoices...');
    const invoices = [
      { number: 'INV-2024-001', client: 'ABC Logistics Ltd', amount: 125000, status: 'paid' },
      { number: 'INV-2024-002', client: 'XYZ Transport', amount: 85000, status: 'pending' },
      { number: 'INV-2024-003', client: 'Quick Movers', amount: 45000, status: 'overdue' },
      { number: 'INV-2024-004', client: 'Safari Cargo', amount: 230000, status: 'paid' },
    ];

    for (const inv of invoices) {
      const dueDate = inv.status === 'overdue' ? 'NOW() - INTERVAL \'10 days\'' : 'NOW() + INTERVAL \'30 days\'';
      const paidAt = inv.status === 'paid' ? ', paid_at = NOW() - INTERVAL \'5 days\'' : '';
      
      await query(
        `INSERT INTO invoices (company_id, invoice_number, client_name, amount, status, due_date, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, ${dueDate}, NOW(), NOW())`,
        [companyId, inv.number, inv.client, inv.amount, inv.status]
      );
      console.log(`  ✓ ${inv.number}: ${inv.client} - KES ${inv.amount} (${inv.status})`);
    }

    // ==================== AUDITS ====================
    console.log('\n📋 Creating audit sessions...');
    await query(
      `INSERT INTO audit_sessions (company_id, template_id, name, status, started_at, created_at)
       VALUES ($1, 'safety-compliance', 'Q1 2024 Safety Audit', 'completed', NOW() - INTERVAL '30 days', NOW())`,
      [companyId]
    );
    console.log('  ✓ Q1 2024 Safety Audit');

    // ==================== TRAINING ====================
    console.log('\n🎓 Creating training courses...');
    const courses = [
      { title: 'Defensive Driving', duration: '4 hours', category: 'safety' },
      { title: 'Fuel Efficiency', duration: '2 hours', category: 'operations' },
      { title: 'First Aid Basics', duration: '6 hours', category: 'safety' },
      { title: 'Vehicle Inspection', duration: '1 hour', category: 'maintenance' },
    ];

    for (const c of courses) {
      await query(
        `INSERT INTO training_courses (company_id, title, duration, category, status, created_at)
         VALUES ($1, $2, $3, $4, 'active', NOW())`,
        [companyId, c.title, c.duration, c.category]
      );
      console.log(`  ✓ ${c.title} (${c.duration})`);
    }

    // ==================== RISKS ====================
    console.log('\n⚠️  Creating risk assessments...');
    const risks = [
      { title: 'Driver Fatigue', severity: 'high', probability: 'medium', mitigation: 'Enforce mandatory rest breaks' },
      { title: 'Vehicle Breakdown', severity: 'medium', probability: 'high', mitigation: 'Regular maintenance schedule' },
      { title: 'Fuel Theft', severity: 'medium', probability: 'low', mitigation: 'Fuel card tracking system' },
    ];

    for (const r of risks) {
      await query(
        `INSERT INTO risks (company_id, title, severity, probability, mitigation, status, created_at)
         VALUES ($1, $2, $3, $4, $5, 'active', NOW())`,
        [companyId, r.title, r.severity, r.probability, r.mitigation]
      );
      console.log(`  ✓ ${r.title} (${r.severity})`);
    }

    // ==================== INTEGRATIONS ====================
    console.log('\n🔗 Creating integration configs...');
    const integrations = [
      { name: 'ERP System', type: 'erp', status: 'connected', config: { endpoint: 'https://erp.company.com/api' } },
      { name: 'Fleet Telematics', type: 'telematics', status: 'connected', config: { provider: 'TrackGPS' } },
      { name: 'Fuel Card Provider', type: 'fuel_card', status: 'pending', config: { provider: 'PetroCard' } },
    ];

    for (const i of integrations) {
      await query(
        `INSERT INTO integrations (company_id, name, type, status, config, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [companyId, i.name, i.type, i.status, JSON.stringify(i.config)]
      );
      console.log(`  ✓ ${i.name} (${i.status})`);
    }

    // ==================== DOCUMENTS ====================
    console.log('\n📄 Creating documents...');
    const documents = [
      { title: 'Vehicle Registration - KDA-001', type: 'registration', expiryDate: '2025-03-15' },
      { title: 'Insurance Policy 2024', type: 'insurance', expiryDate: '2024-12-31' },
      { title: 'Driver License - John Kamau', type: 'license', expiryDate: '2025-06-20' },
    ];

    for (const d of documents) {
      await query(
        `INSERT INTO documents (company_id, title, document_type, expiry_date, status, created_at)
         VALUES ($1, $2, $3, $4, 'active', NOW())`,
        [companyId, d.title, d.type, d.expiryDate]
      );
      console.log(`  ✓ ${d.title}`);
    }

    console.log('\n✅ Data seeding complete!');
    console.log('\n📊 Summary:');
    console.log(`  • ${vehicles.length} vehicles`);
    console.log(`  • ${drivers.length} drivers`);
    console.log(`  • ${trips.length} trips`);
    console.log(`  • ${fuelTxs.length} fuel transactions`);
    console.log(`  • ${maintenance.length} maintenance records`);
    console.log(`  • ${inventory.length} inventory items`);
    console.log(`  • ${requisitions.length} requisitions`);
    console.log(`  • ${alerts.length} alerts`);
    console.log(`  • ${invoices.length} invoices`);
    console.log(`  • ${courses.length} training courses`);
    console.log(`  • ${risks.length} risks`);
    console.log(`  • ${integrations.length} integrations`);
    console.log(`  • ${documents.length} documents`);
    
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Error seeding data:', err);
    process.exit(1);
  }
}

seedAllData();
