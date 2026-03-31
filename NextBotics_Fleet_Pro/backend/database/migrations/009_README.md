# Maintenance Module Fix

## Problem
The maintenance module was failing to create maintenance schedules and records due to database schema mismatches.

### Issues Found:

1. **Maintenance Schedules Table Mismatch**
   - The `maintenance_schedules` table was created with a `title` column
   - But the model was inserting into a `service_name` column
   - This caused INSERT failures when creating schedules

2. **Maintenance Records Missing Column**
   - The `maintenance_records` table was missing the `service_date` column
   - The model INSERT statement included this column
   - This caused INSERT failures when creating records

3. **Missing Columns in maintenance_records**
   - Various columns like `title`, `category`, `provider_id`, etc. were missing from older deployments

## Solution

### Migration File: `009_fix_maintenance_module.sql`

This migration:
1. Adds `service_name` column to `maintenance_schedules` and syncs it with `title`
2. Adds `service_date` column to `maintenance_records`
3. Adds all missing columns to `maintenance_records` table
4. Adds all missing columns to `maintenance_parts` table
5. Creates `job_cards` table if it doesn't exist
6. Adds necessary indexes for performance

### Model Updates: `Maintenance.ts`

Updated the `MaintenanceScheduleModel` to:
1. Insert into both `service_name` and `title` columns for consistency
2. Keep both columns in sync during updates

## How to Apply

### Option 1: Run the migration manually
```bash
cd /root/.openclaw/workspace/NextBotics_Fleet_Pro/backend
psql $DATABASE_URL -f database/migrations/009_fix_maintenance_module.sql
```

### Option 2: Restart the backend (if using a migration runner)
If your backend has an automatic migration runner on startup, simply restart the server.

### Option 3: Apply via database admin tool
1. Connect to your PostgreSQL database
2. Run the SQL commands from `009_fix_maintenance_module.sql`

## Verification

After applying the fix, test by:
1. Going to the Maintenance page
2. Creating a new maintenance schedule
3. Creating a new maintenance record

Both operations should succeed without errors.

## Files Modified

1. `backend/database/migrations/009_fix_maintenance_module.sql` (new file)
2. `backend/src/models/Maintenance.ts` (updated INSERT and UPDATE for schedules)

## Rollback

If you need to rollback:
```sql
-- Note: This will drop data in these columns!
ALTER TABLE maintenance_schedules DROP COLUMN IF EXISTS service_name;
ALTER TABLE maintenance_records DROP COLUMN IF EXISTS service_date;
```
