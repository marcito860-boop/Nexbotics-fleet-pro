import { Router } from 'express';
import multer from 'multer';
import * as XLSX from 'xlsx';
import { query } from '../database';
import { v4 as uuidv4 } from 'uuid';

const router = Router();
const upload = multer({ dest: '/tmp/uploads/' });

router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const workbook = XLSX.readFile(req.file.path);
    const results: any = {};

    // Process each sheet
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
      
      if (data.length < 2) continue; // Skip empty sheets

      console.log(`Processing sheet: ${sheetName}, rows: ${data.length}`);

      try {
        switch (sheetName.toLowerCase()) {
          case 'vehicles':
          case 'fleet':
            results.vehicles = await importVehicles(data);
            break;
          case 'staff':
            results.staff = await importStaff(data);
            break;
          case 'routes':
            results.routes = await importRoutes(data);
            break;
          case 'fuel':
          case 'total fuel template':
            results.fuel = await importFuel(data);
            break;
          case 'repairs':
          case 'repairs template':
            results.repairs = await importRepairs(data);
            break;
          case 'accidents':
            results.accidents = await importAccidents(data);
            break;
          case 'requisitions':
            results.requisitions = await importRequisitions(data);
            break;
          default:
            console.log(`Unknown sheet: ${sheetName}`);
        }
      } catch (sheetError: any) {
        console.error(`Error processing ${sheetName}:`, sheetError);
        results[sheetName] = { error: sheetError.message };
      }
    }

    // Build detailed summary
    const summary = [];
    let totalImported = 0;
    
    if (results.vehicles && results.vehicles > 0) {
      summary.push(`${results.vehicles} vehicle(s)`);
      totalImported += results.vehicles;
    }
    if (results.staff && results.staff > 0) {
      summary.push(`${results.staff} staff member(s)`);
      totalImported += results.staff;
    }
    if (results.routes && results.routes > 0) {
      summary.push(`${results.routes} route(s)`);
      totalImported += results.routes;
    }
    if (results.fuel && results.fuel > 0) {
      summary.push(`${results.fuel} fuel record(s)`);
      totalImported += results.fuel;
    }
    if (results.repairs && results.repairs > 0) {
      summary.push(`${results.repairs} repair record(s)`);
      totalImported += results.repairs;
    }
    if (results.accidents && results.accidents > 0) {
      summary.push(`${results.accidents} accident record(s)`);
      totalImported += results.accidents;
    }
    if (results.requisitions && results.requisitions > 0) {
      summary.push(`${results.requisitions} requisition(s)`);
      totalImported += results.requisitions;
    }

    const message = totalImported > 0 
      ? `Successfully imported ${totalImported} record(s): ${summary.join(', ')}`
      : 'No records were imported. Please check your file format and column headers.';

    res.json({ 
      success: totalImported > 0,
      message,
      imported: results,
      total: totalImported
    });
  } catch (error: any) {
    console.error('Import error:', error);
    res.status(500).json({ error: 'Import failed', details: error.message });
  }
});

async function importVehicles(data: any[][]) {
  const headers = data[0].map((h: string) => h.toLowerCase().trim());
  console.log('Vehicle headers:', headers);
  
  // Find column indices - support multiple possible column names
  const getCol = (names: string[]) => {
    for (const name of names) {
      const idx = headers.findIndex((h: string) => h.includes(name.toLowerCase()));
      if (idx >= 0) return idx;
    }
    return -1;
  };
  
  const regIdx = getCol(['registration', 'reg_num', 'reg no', 'plate', 'vehicle_reg']);
  const yearManIdx = getCol(['manufacture', 'year', 'year_of_manufacture', 'yr']);
  const yearPurIdx = getCol(['purchase', 'year_of_purchase', 'purchase_year']);
  const makeIdx = getCol(['make', 'make_model', 'model', 'brand']);
  const typeIdx = getCol(['type', 'vehicle_type', 'category']);
  const ownershipIdx = getCol(['ownership', 'owner']);
  const deptIdx = getCol(['department', 'dept']);
  const branchIdx = getCol(['branch', 'location', 'office']);
  const minorIdx = getCol(['minor', 'minor_service']);
  const mediumIdx = getCol(['medium', 'medium_service']);
  const majorIdx = getCol(['major', 'major_service']);
  const rateIdx = getCol(['consumption', 'fuel_type', 'target_consumption', 'consumption_rate']);
  const statusIdx = getCol(['status', 'state', 'condition']);
  const mileageIdx = getCol(['mileage', 'odometer', 'current_mileage', 'km']);

  console.log('Column mappings:', { regIdx, yearManIdx, makeIdx, typeIdx, deptIdx, statusIdx });

  let count = 0;

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const regNum = regIdx >= 0 ? row[regIdx] : row[0];
    
    if (!regNum) {
      console.log(`Row ${i}: Skipping - no registration number`);
      continue;
    }

    try {
      const id = uuidv4();
      
      // Build make_model from make + model + type if available
      let makeModel = 'Unknown';
      if (makeIdx >= 0 && row[makeIdx]) {
        makeModel = String(row[makeIdx]);
        // Append type if available and different
        if (typeIdx >= 0 && row[typeIdx] && String(row[typeIdx]) !== makeModel) {
          makeModel += ' ' + String(row[typeIdx]);
        }
      } else if (typeIdx >= 0 && row[typeIdx]) {
        makeModel = String(row[typeIdx]);
      }
      
      await query(`
        INSERT INTO vehicles (
          id, registration_num, year_of_manufacture, year_of_purchase,
          replacement_mileage, replacement_age, make_model, ownership,
          department, branch, minor_service_interval, medium_service_interval,
          major_service_interval, target_consumption_rate, status, current_mileage
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        ON CONFLICT (registration_num) DO UPDATE SET
          year_of_manufacture = EXCLUDED.year_of_manufacture,
          year_of_purchase = EXCLUDED.year_of_purchase,
          make_model = EXCLUDED.make_model,
          ownership = EXCLUDED.ownership,
          department = EXCLUDED.department,
          branch = EXCLUDED.branch,
          status = EXCLUDED.status,
          current_mileage = EXCLUDED.current_mileage,
          updated_at = CURRENT_TIMESTAMP
      `, [
        id, 
        String(regNum).trim(), 
        yearManIdx >= 0 ? parseInt(row[yearManIdx]) || null : null, 
        yearPurIdx >= 0 ? parseInt(row[yearPurIdx]) || null : null,
        200000, // replacement_mileage
        10, // replacement_age
        makeModel, 
        ownershipIdx >= 0 ? row[ownershipIdx] : 'Company',
        deptIdx >= 0 ? row[deptIdx] : 'Transport', 
        branchIdx >= 0 ? row[branchIdx] : 'Nairobi HQ',
        minorIdx >= 0 ? parseInt(row[minorIdx]) || 5000 : 5000, 
        mediumIdx >= 0 ? parseInt(row[mediumIdx]) || 15000 : 15000,
        majorIdx >= 0 ? parseInt(row[majorIdx]) || 30000 : 30000, 
        rateIdx >= 0 ? parseFloat(row[rateIdx]) || 8.0 : 8.0,
        statusIdx >= 0 ? row[statusIdx] : 'Active',
        mileageIdx >= 0 ? parseInt(row[mileageIdx]) || 0 : 0
      ]);
      count++;
      console.log(`Row ${i}: Imported vehicle ${regNum}`);
    } catch (e: any) {
      console.error('Vehicle row error:', e.message, row);
    }
  }
  console.log(`Total vehicles imported: ${count}`);
  return count;
}

async function importStaff(data: any[][]) {
  const headers = data[0].map((h: string) => h.toLowerCase().trim());
  console.log('Staff headers:', headers);
  
  // Support multiple possible column names
  const getCol = (names: string[]) => {
    for (const name of names) {
      const idx = headers.findIndex((h: string) => h.includes(name.toLowerCase()));
      if (idx >= 0) return idx;
    }
    return -1;
  };
  
  const staffNoIdx = getCol(['staff_no', 'employee_id', 'staff id', 'emp_id', 'employee no', 'id']);
  const nameIdx = getCol(['name', 'staff_name', 'full_name', 'employee_name']);
  const emailIdx = getCol(['email', 'email_address', 'e-mail']);
  const phoneIdx = getCol(['phone', 'mobile', 'telephone', 'contact', 'phone_number']);
  const desigIdx = getCol(['designation', 'position', 'title', 'job_title']);
  const deptIdx = getCol(['department', 'dept']);
  const branchIdx = getCol(['branch', 'location', 'office']);
  const roleIdx = getCol(['role', 'job_role', 'type']);

  console.log('Staff column mappings:', { staffNoIdx, nameIdx, emailIdx, phoneIdx, roleIdx });

  let count = 0;
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const staffName = nameIdx >= 0 ? row[nameIdx] : row[0];
    
    if (!staffName) {
      console.log(`Row ${i}: Skipping - no staff name`);
      continue;
    }

    try {
      const id = uuidv4();
      const staffNo = staffNoIdx >= 0 ? row[staffNoIdx] : `ST${1000 + i}`;
      
      await query(`
        INSERT INTO staff (id, staff_no, staff_name, email, phone, designation, department, branch, role, comments)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (staff_no) DO UPDATE SET
          staff_name = EXCLUDED.staff_name,
          email = EXCLUDED.email,
          phone = EXCLUDED.phone,
          designation = EXCLUDED.designation,
          department = EXCLUDED.department,
          branch = EXCLUDED.branch,
          role = EXCLUDED.role,
          updated_at = CURRENT_TIMESTAMP
      `, [
        id, 
        staffNo,
        staffName,
        emailIdx >= 0 ? row[emailIdx] : null,
        phoneIdx >= 0 ? row[phoneIdx] : null,
        desigIdx >= 0 ? row[desigIdx] : 'Driver',
        deptIdx >= 0 ? row[deptIdx] : 'Transport',
        branchIdx >= 0 ? row[branchIdx] : 'Nairobi HQ',
        roleIdx >= 0 ? row[roleIdx] : 'Driver',
        ''
      ]);
      count++;
      console.log(`Row ${i}: Imported staff ${staffName} (${staffNo})`);
    } catch (e: any) {
      console.error('Staff row error:', e.message, row);
    }
  }
  console.log(`Total staff imported: ${count}`);
  return count;
}

async function importRoutes(data: any[][]) {
  const headers = data[0].map((h: string) => h.toLowerCase().trim());
  console.log('Routes headers:', headers);
  
  // Support multiple possible column names
  const getCol = (names: string[]) => {
    for (const name of names) {
      const idx = headers.findIndex((h: string) => h.includes(name.toLowerCase()));
      if (idx >= 0) return idx;
    }
    return -1;
  };
  
  const dateIdx = getCol(['route_date', 'date', 'trip_date', 'assignment_date']);
  const nameIdx = getCol(['route_name', 'route', 'trip', 'assignment', 'destination']);
  const driverIdx = getCol(['driver', 'driver1', 'driver_id', 'staff_no', 'driver_name']);
  const vehicleIdx = getCol(['vehicle', 'vehicle_reg', 'registration', 'reg_num', 'plate']);
  const targetKmIdx = getCol(['target_km', 'expected_km', 'planned_km', 'estimated_km']);
  const actualKmIdx = getCol(['actual_km', 'km', 'distance', 'mileage']);
  const targetFuelIdx = getCol(['target_fuel', 'expected_fuel', 'planned_fuel', 'fuel_target']);
  const actualFuelIdx = getCol(['actual_fuel', 'fuel_used', 'fuel_consumed', 'consumption']);
  const varianceIdx = getCol(['variance', 'difference', 'deviation']);

  console.log('Routes column mappings:', { dateIdx, nameIdx, driverIdx, vehicleIdx });

  let count = 0;
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const routeName = nameIdx >= 0 ? row[nameIdx] : row[1];
    
    if (!routeName) {
      console.log(`Row ${i}: Skipping - no route name`);
      continue;
    }

    try {
      // Look up driver by staff_no or name
      let driverId = null;
      const driverRef = driverIdx >= 0 ? row[driverIdx] : '';
      if (driverRef) {
        const driverRes = await query('SELECT id FROM staff WHERE staff_no = $1 OR staff_name = $1', [driverRef]);
        if (driverRes.length > 0) driverId = driverRes[0].id;
      }
      
      // Look up vehicle by registration_num
      let vehicleId = null;
      const vehicleRef = vehicleIdx >= 0 ? row[vehicleIdx] : '';
      if (vehicleRef) {
        const vehRes = await query('SELECT id FROM vehicles WHERE registration_num = $1', [vehicleRef]);
        if (vehRes.length > 0) vehicleId = vehRes[0].id;
      }

      const id = uuidv4();
      const targetKm = targetKmIdx >= 0 ? parseFloat(row[targetKmIdx]) || 0 : 0;
      const actualKm = actualKmIdx >= 0 ? parseFloat(row[actualKmIdx]) || 0 : 0;
      const targetFuel = targetFuelIdx >= 0 ? parseFloat(row[targetFuelIdx]) || 0 : 0;
      const actualFuel = actualFuelIdx >= 0 ? parseFloat(row[actualFuelIdx]) || 0 : 0;
      const variance = varianceIdx >= 0 ? parseFloat(row[varianceIdx]) || 0 : (actualFuel - targetFuel);
      
      await query(`
        INSERT INTO routes (id, route_date, route_name, driver1_id, vehicle_id, 
          target_km, actual_km, target_fuel_consumption, actual_fuel, variance, comments)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `, [
        id,
        dateIdx >= 0 ? row[dateIdx] : new Date().toISOString().split('T')[0],
        routeName,
        driverId,
        vehicleId,
        targetKm,
        actualKm,
        targetFuel,
        actualFuel,
        variance,
        ''
      ]);
      count++;
      console.log(`Row ${i}: Imported route ${routeName}`);
    } catch (e: any) {
      console.error('Routes row error:', e.message, row);
    }
  }
  
  console.log(`Total routes imported: ${count}`);
  return count;
}

async function importFuel(data: any[][]) {
  const headers = data[0].map((h: string) => h.toLowerCase().trim());
  console.log('Fuel headers:', headers);
  
  // Support multiple possible column names
  const getCol = (names: string[]) => {
    for (const name of names) {
      const idx = headers.findIndex((h: string) => h.includes(name.toLowerCase()));
      if (idx >= 0) return idx;
    }
    return -1;
  };
  
  const deptIdx = getCol(['department', 'dept']);
  const dateIdx = getCol(['date', 'fuel_date', 'transaction_date']);
  const regIdx = getCol(['registration', 'vehicle_reg', 'reg_num', 'plate', 'vehicle']);
  const cardNumIdx = getCol(['card_num', 'card_number', 'fuel_card']);
  const cardNameIdx = getCol(['card_name', 'station', 'vendor', 'supplier']);
  const pastIdx = getCol(['past', 'past_mileage', 'previous_km', 'start_km']);
  const currentIdx = getCol(['current', 'current_mileage', 'odometer', 'km', 'end_km']);
  const qtyIdx = getCol(['quantity', 'liters', 'qty', 'volume', 'fuel_qty']);
  const amtIdx = getCol(['amount', 'cost', 'total', 'price', 'value']);
  const placeIdx = getCol(['place', 'location', 'station', 'vendor']);

  console.log('Fuel column mappings:', { regIdx, dateIdx, qtyIdx, amtIdx, currentIdx });

  let count = 0;
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const regNum = regIdx >= 0 ? row[regIdx] : row[2];
    
    if (!regNum) {
      console.log(`Row ${i}: Skipping - no vehicle registration`);
      continue;
    }

    try {
      // Lookup vehicle
      const vehicleRes = await query('SELECT id FROM vehicles WHERE registration_num = $1', [String(regNum).trim()]);
      if (vehicleRes.length === 0) {
        console.log(`Row ${i}: Vehicle not found: ${regNum}`);
        continue;
      }
      const vehicleId = vehicleRes[0].id;

      const past = pastIdx >= 0 ? parseInt(row[pastIdx]) || 0 : 0;
      const current = currentIdx >= 0 ? parseInt(row[currentIdx]) || 0 : 0;
      const qty = qtyIdx >= 0 ? parseFloat(row[qtyIdx]) || 0 : 0;
      const amt = amtIdx >= 0 ? parseFloat(row[amtIdx]) || 0 : 0;
      const kmpl = qty > 0 ? parseFloat(((current - past) / qty).toFixed(2)) : 0;
      const cpk = (current - past) > 0 ? parseFloat((amt / (current - past)).toFixed(4)) : 0;

      const id = uuidv4();
      await query(`
        INSERT INTO fuel_records 
        (id, department, fuel_date, vehicle_id, card_num, card_name, past_mileage, 
         current_mileage, quantity_liters, km_per_liter, amount, cost_per_km, place)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      `, [
        id, 
        deptIdx >= 0 ? row[deptIdx] : 'Transport',
        dateIdx >= 0 ? row[dateIdx] : new Date().toISOString().split('T')[0],
        vehicleId, 
        cardNumIdx >= 0 ? row[cardNumIdx] : '',
        cardNameIdx >= 0 ? row[cardNameIdx] : 'Shell',
        past, 
        current,
        qty, 
        kmpl, 
        amt, 
        cpk, 
        placeIdx >= 0 ? row[placeIdx] : 'Nairobi'
      ]);
      count++;
      console.log(`Row ${i}: Imported fuel record for ${regNum} - ${qty}L`);
    } catch (e: any) {
      console.error('Fuel row error:', e.message, row);
    }
  }
  console.log(`Total fuel records imported: ${count}`);
  return count;
}

async function importRepairs(data: any[][]) {
  const headers = data[0].map((h: string) => h.toLowerCase().trim());
  console.log('Repairs headers:', headers);
  
  // Support multiple possible column names
  const getCol = (names: string[]) => {
    for (const name of names) {
      const idx = headers.findIndex((h: string) => h.includes(name.toLowerCase()));
      if (idx >= 0) return idx;
    }
    return -1;
  };
  
  const dateIdx = getCol(['date_in', 'date', 'repair_date', 'start_date']);
  const regIdx = getCol(['registration', 'vehicle_reg', 'reg_num', 'plate', 'vehicle']);
  const maintIdx = getCol(['maintenance', 'service_type', 'repair_type', 'type']);
  const descIdx = getCol(['description', 'issue', 'problem', 'details', 'breakdown']);
  const odoIdx = getCol(['odometer', 'mileage', 'km', 'odometer_reading']);
  const techIdx = getCol(['technician', 'mechanic', 'assigned_to', 'repairer']);
  const garageIdx = getCol(['garage', 'workshop', 'service_center', 'vendor']);

  console.log('Repairs column mappings:', { dateIdx, regIdx, descIdx, techIdx });

  let count = 0;
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const regNum = regIdx >= 0 ? row[regIdx] : row[1];
    
    if (!regNum) {
      console.log(`Row ${i}: Skipping - no vehicle registration`);
      continue;
    }

    try {
      const vehicleRes = await query('SELECT id FROM vehicles WHERE registration_num = $1', [String(regNum).trim()]);
      if (vehicleRes.length === 0) {
        console.log(`Row ${i}: Vehicle not found for repair: ${regNum}`);
        continue;
      }
      
      const id = uuidv4();
      await query(`
        INSERT INTO repairs 
        (id, date_in, vehicle_id, preventative_maintenance, breakdown_description,
         odometer_reading, assigned_technician, garage_name, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Pending')
      `, [
        id, 
        dateIdx >= 0 ? row[dateIdx] : new Date().toISOString().split('T')[0],
        vehicleRes[0].id, 
        maintIdx >= 0 ? row[maintIdx] : 'General Service',
        descIdx >= 0 ? row[descIdx] : '',
        odoIdx >= 0 ? parseInt(row[odoIdx]) || 0 : 0,
        techIdx >= 0 ? row[techIdx] : 'Technician',
        garageIdx >= 0 ? row[garageIdx] : 'City Garage'
      ]);
      count++;
      console.log(`Row ${i}: Imported repair for ${regNum}`);
    } catch (e: any) {
      console.error('Repair row error:', e.message, row);
    }
  }
  console.log(`Total repairs imported: ${count}`);
  return count;
}

// Generate case number for accidents
const generateCaseNumber = async () => {
  const year = new Date().getFullYear();
  const result = await query(
    "SELECT COUNT(*) as count FROM accidents WHERE EXTRACT(YEAR FROM created_at) = $1",
    [year]
  );
  const count = parseInt(result[0].count) + 1;
  return `ACC-${year}-${String(count).padStart(4, '0')}`;
};

async function importAccidents(data: any[][]) {
  const headers = data[0].map((h: string) => h.toLowerCase().trim());
  console.log('Accident headers:', headers);
  
  // Support multiple possible column names
  const getCol = (names: string[]) => {
    for (const name of names) {
      const idx = headers.findIndex((h: string) => h.includes(name.toLowerCase()));
      if (idx >= 0) return idx;
    }
    return -1;
  };
  
  const caseIdx = getCol(['case_number', 'case_no', 'case', 'ref']);
  const dateIdx = getCol(['accident_date', 'date', 'incident_date', 'occurred']);
  const gpsIdx = getCol(['gps_location', 'gps', 'location', 'coordinates', 'place']);
  const regIdx = getCol(['registration', 'vehicle_reg', 'reg_num', 'plate', 'vehicle']);
  const driverIdx = getCol(['driver', 'driver_id', 'staff_no', 'driver_name', 'operator']);
  const typeIdx = getCol(['accident_type', 'type', 'incident_type', 'classification']);
  const severityIdx = getCol(['severity', 'severity_level', 'impact', 'seriousness']);
  const injuriesIdx = getCol(['injuries', 'injuries_reported', 'casualties', 'hurt']);
  const policeIdx = getCol(['police', 'police_notified', 'authorities', 'reported']);
  const thirdPartyIdx = getCol(['third_party', 'thirdparty', 'other_party', 'external']);
  const weatherIdx = getCol(['weather', 'weather_condition', 'conditions']);
  const roadIdx = getCol(['road', 'road_condition', 'surface']);
  const descIdx = getCol(['description', 'incident_description', 'details', 'narrative', 'what_happened']);
  const statusIdx = getCol(['status', 'state', 'case_status']);

  console.log('Accidents column mappings:', { caseIdx, dateIdx, regIdx, driverIdx, typeIdx });

  let count = 0;
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    
    // Require at least a date or description to process
    const hasData = (dateIdx >= 0 && row[dateIdx]) || (descIdx >= 0 && row[descIdx]) || row[0];
    if (!hasData) {
      console.log(`Row ${i}: Skipping - no accident data`);
      continue;
    }

    try {
      // Look up vehicle by registration
      let vehicleId = null;
      const regRef = regIdx >= 0 ? row[regIdx] : '';
      if (regRef) {
        const vehRes = await query('SELECT id FROM vehicles WHERE registration_num = $1', [regRef]);
        if (vehRes.length > 0) vehicleId = vehRes[0].id;
      }
      
      // Look up driver by staff_no
      let driverId = null;
      const driverRef = driverIdx >= 0 ? row[driverIdx] : '';
      if (driverRef) {
        const drvRes = await query('SELECT id FROM staff WHERE staff_no = $1 OR staff_name = $1', [driverRef]);
        if (drvRes.length > 0) driverId = drvRes[0].id;
      }

      const caseNumber = caseIdx >= 0 && row[caseIdx] 
        ? row[caseIdx] 
        : await generateCaseNumber();
      
      const id = uuidv4();
      await query(`
        INSERT INTO accidents 
        (id, case_number, accident_date, gps_location, vehicle_id, driver_id,
         accident_type, severity, injuries_reported, police_notified, 
         third_party_involved, weather_condition, road_condition, 
         incident_description, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        ON CONFLICT (case_number) DO UPDATE SET
          accident_date = EXCLUDED.accident_date,
          incident_description = EXCLUDED.incident_description,
          vehicle_id = EXCLUDED.vehicle_id,
          driver_id = EXCLUDED.driver_id,
          updated_at = CURRENT_TIMESTAMP
      `, [
        id,
        caseNumber,
        dateIdx >= 0 ? row[dateIdx] : new Date().toISOString(),
        gpsIdx >= 0 ? row[gpsIdx] : null,
        vehicleId,
        driverId,
        typeIdx >= 0 ? row[typeIdx] : 'Collision',
        severityIdx >= 0 ? row[severityIdx] : 'Minor',
        injuriesIdx >= 0 ? (row[injuriesIdx] === true || row[injuriesIdx] === 'true' || row[injuriesIdx] === 'yes' || row[injuriesIdx] === 'YES') : false,
        policeIdx >= 0 ? (row[policeIdx] === true || row[policeIdx] === 'true' || row[policeIdx] === 'yes' || row[policeIdx] === 'YES') : false,
        thirdPartyIdx >= 0 ? (row[thirdPartyIdx] === true || row[thirdPartyIdx] === 'true' || row[thirdPartyIdx] === 'yes' || row[thirdPartyIdx] === 'YES') : false,
        weatherIdx >= 0 ? row[weatherIdx] : 'Clear',
        roadIdx >= 0 ? row[roadIdx] : 'Dry',
        descIdx >= 0 ? row[descIdx] : '',
        statusIdx >= 0 ? row[statusIdx] : 'Reported'
      ]);
      count++;
      console.log(`Row ${i}: Imported accident case ${caseNumber}`);
    } catch (e: any) {
      console.error('Accident row error:', e.message, row);
    }
  }
  
  console.log(`Total accidents imported: ${count}`);
  return count;
}

async function importRequisitions(data: any[][]) {
  const headers = data[0].map((h: string) => h.toLowerCase().trim());
  console.log('Requisition headers:', headers);
  
  // Support multiple possible column names
  const getCol = (names: string[]) => {
    for (const name of names) {
      const idx = headers.findIndex((h: string) => h.includes(name.toLowerCase()));
      if (idx >= 0) return idx;
    }
    return -1;
  };
  
  const requesterIdx = getCol(['requested_by', 'requester', 'staff_no', 'employee_id', 'requester_id']);
  const originIdx = getCol(['departure', 'origin', 'from', 'start_point', 'pickup']);
  const destIdx = getCol(['destination', 'to', 'end_point', 'dropoff', 'drop_off']);
  const purposeIdx = getCol(['purpose', 'reason', 'objective', 'for']);
  const travelDateIdx = getCol(['travel_date', 'date', 'trip_date', 'departure_date']);
  const travelTimeIdx = getCol(['travel_time', 'time', 'departure_time', 'start_time']);
  const returnDateIdx = getCol(['return_date', 'back_date', 'end_date']);
  const returnTimeIdx = getCol(['return_time', 'back_time', 'end_time']);
  const passengersIdx = getCol(['passengers', 'num_passengers', 'pax', 'count', 'passenger_count']);
  const namesIdx = getCol(['passenger_names', 'names', 'travellers', 'who', 'passenger_list']);
  const statusIdx = getCol(['status', 'state', 'req_status']);

  console.log('Requisitions column mappings:', { requesterIdx, travelDateIdx, originIdx, destIdx, purposeIdx });

  let count = 0;
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    
    // Require at least purpose or destination to process
    const hasData = (purposeIdx >= 0 && row[purposeIdx]) || (destIdx >= 0 && row[destIdx]) || row[0];
    if (!hasData) {
      console.log(`Row ${i}: Skipping - no requisition data`);
      continue;
    }

    try {
      // Look up requester by staff_no or name
      let requesterId = null;
      const reqRef = requesterIdx >= 0 ? row[requesterIdx] : '';
      if (reqRef) {
        const reqRes = await query('SELECT id FROM staff WHERE staff_no = $1 OR staff_name = $1', [reqRef]);
        if (reqRes.length > 0) requesterId = reqRes[0].id;
      }

      const id = uuidv4();
      const reqNumber = `REQ-${new Date().getFullYear()}-${String(i).padStart(4, '0')}`;
      
      await query(`
        INSERT INTO requisitions 
        (id, request_no, requested_by, department_id, purpose,
         place_of_departure, destination, travel_date, travel_time,
         return_date, return_time, num_passengers, passenger_names, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      `, [
        id,
        reqNumber,
        requesterId,
        null, // department_id - can be looked up from staff
        purposeIdx >= 0 ? row[purposeIdx] : '',
        originIdx >= 0 ? row[originIdx] : '',
        destIdx >= 0 ? row[destIdx] : '',
        travelDateIdx >= 0 ? row[travelDateIdx] : new Date().toISOString().split('T')[0],
        travelTimeIdx >= 0 ? row[travelTimeIdx] : '09:00',
        returnDateIdx >= 0 ? row[returnDateIdx] : new Date().toISOString().split('T')[0],
        returnTimeIdx >= 0 ? row[returnTimeIdx] : '17:00',
        passengersIdx >= 0 ? parseInt(row[passengersIdx]) || 1 : 1,
        namesIdx >= 0 ? row[namesIdx] : '',
        statusIdx >= 0 ? row[statusIdx] : 'Draft'
      ]);
      count++;
      console.log(`Row ${i}: Imported requisition ${reqNumber}`);
    } catch (e: any) {
      console.error('Requisition row error:', e.message, row);
    }
  }
  
  console.log(`Total requisitions imported: ${count}`);
  return count;
}

export default router;
