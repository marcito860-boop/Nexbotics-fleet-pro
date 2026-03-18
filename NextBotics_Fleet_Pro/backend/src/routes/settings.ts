import { Router, Request, Response } from 'express';
import { authMiddleware, requireRole } from '../utils/auth';
import { query } from '../database';

const router = Router();

router.use(authMiddleware);

// ==========================================
// COMPANY SETTINGS
// ==========================================

router.get('/company', async (req: Request, res: Response) => {
  try {
    const result = await query(`
      SELECT * FROM company_settings
      ORDER BY created_at DESC
      LIMIT 1
    `);
    
    if (!result || result.length === 0) {
      return res.json({
        name: '',
        legalName: '',
        taxId: '',
        registrationNumber: '',
        email: '',
        phone: '',
        website: '',
        address: { street: '', city: '', state: '', zipCode: '', country: '' },
        timezone: 'UTC',
        currency: 'USD',
        dateFormat: 'MM/DD/YYYY',
        fiscalYearStart: '01-01',
      });
    }
    
    res.json(result[0]);
  } catch (error) {
    console.error('Error fetching company settings:', error);
    res.status(500).json({ error: 'Failed to fetch company settings' });
  }
});

router.put('/company', requireRole(['admin', 'manager']), async (req: Request, res: Response) => {
  try {
    const {
      name, legalName, taxId, registrationNumber,
      email, phone, website, address,
      timezone, currency, dateFormat, fiscalYearStart, logoUrl
    } = req.body;

    const existing = await query('SELECT id FROM company_settings LIMIT 1');
    
    if (existing && existing.length > 0) {
      const result = await query(`
        UPDATE company_settings
        SET name = $1, legal_name = $2, tax_id = $3, registration_number = $4,
            email = $5, phone = $6, website = $7, address = $8,
            timezone = $9, currency = $10, date_format = $11, fiscal_year_start = $12,
            logo_url = $13, updated_at = CURRENT_TIMESTAMP
        WHERE id = $14
        RETURNING *
      `, [
        name, legalName, taxId, registrationNumber,
        email, phone, website, JSON.stringify(address),
        timezone, currency, dateFormat, fiscalYearStart,
        logoUrl, existing[0].id
      ]);
      res.json(result[0]);
    } else {
      const result = await query(`
        INSERT INTO company_settings (
          name, legal_name, tax_id, registration_number,
          email, phone, website, address, timezone, currency, 
          date_format, fiscal_year_start, logo_url
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *
      `, [
        name, legalName, taxId, registrationNumber,
        email, phone, website, JSON.stringify(address),
        timezone, currency, dateFormat, fiscalYearStart, logoUrl
      ]);
      res.json(result[0]);
    }
  } catch (error) {
    console.error('Error saving company settings:', error);
    res.status(500).json({ error: 'Failed to save company settings' });
  }
});

// ==========================================
// FLEET SETTINGS
// ==========================================

router.get('/fleet', async (req: Request, res: Response) => {
  try {
    const result = await query(`
      SELECT * FROM fleet_settings
      ORDER BY created_at DESC
      LIMIT 1
    `);
    
    if (!result || result.length === 0) {
      return res.json({
        defaultFuelType: 'Diesel',
        fuelUnit: 'liters',
        distanceUnit: 'km',
        currency: 'USD',
        maintenanceReminderDays: 7,
        insuranceReminderDays: 30,
        licenseReminderDays: 14,
        speedLimit: 80,
        idleTimeThreshold: 10,
        geofenceAlertEnabled: true,
        fuelEfficiencyTarget: 8,
        co2EmissionFactor: 2.68,
      });
    }
    
    res.json(result[0]);
  } catch (error) {
    console.error('Error fetching fleet settings:', error);
    res.status(500).json({ error: 'Failed to fetch fleet settings' });
  }
});

router.put('/fleet', requireRole(['admin', 'manager']), async (req: Request, res: Response) => {
  try {
    const {
      defaultFuelType, fuelUnit, distanceUnit, currency,
      maintenanceReminderDays, insuranceReminderDays, licenseReminderDays,
      speedLimit, idleTimeThreshold, geofenceAlertEnabled,
      fuelEfficiencyTarget, co2EmissionFactor
    } = req.body;

    const existing = await query('SELECT id FROM fleet_settings LIMIT 1');
    
    if (existing && existing.length > 0) {
      const result = await query(`
        UPDATE fleet_settings
        SET default_fuel_type = $1, fuel_unit = $2, distance_unit = $3, currency = $4,
            maintenance_reminder_days = $5, insurance_reminder_days = $6, license_reminder_days = $7,
            speed_limit = $8, idle_time_threshold = $9, geofence_alert_enabled = $10,
            fuel_efficiency_target = $11, co2_emission_factor = $12, updated_at = CURRENT_TIMESTAMP
        WHERE id = $13
        RETURNING *
      `, [
        defaultFuelType, fuelUnit, distanceUnit, currency,
        maintenanceReminderDays, insuranceReminderDays, licenseReminderDays,
        speedLimit, idleTimeThreshold, geofenceAlertEnabled,
        fuelEfficiencyTarget, co2EmissionFactor, existing[0].id
      ]);
      res.json(result[0]);
    } else {
      const result = await query(`
        INSERT INTO fleet_settings (
          default_fuel_type, fuel_unit, distance_unit, currency,
          maintenance_reminder_days, insurance_reminder_days, license_reminder_days,
          speed_limit, idle_time_threshold, geofence_alert_enabled,
          fuel_efficiency_target, co2_emission_factor
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `, [
        defaultFuelType, fuelUnit, distanceUnit, currency,
        maintenanceReminderDays, insuranceReminderDays, licenseReminderDays,
        speedLimit, idleTimeThreshold, geofenceAlertEnabled,
        fuelEfficiencyTarget, co2EmissionFactor
      ]);
      res.json(result[0]);
    }
  } catch (error) {
    console.error('Error saving fleet settings:', error);
    res.status(500).json({ error: 'Failed to save fleet settings' });
  }
});

// ==========================================
// NOTIFICATION SETTINGS
// ==========================================

router.get('/notifications', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const result = await query(`
      SELECT * FROM notification_settings
      WHERE user_id = $1
    `, [userId]);
    
    if (!result || result.length === 0) {
      return res.json({
        emailEnabled: true,
        pushEnabled: true,
        smsEnabled: false,
        maintenanceAlerts: true,
        fuelAlerts: true,
        documentExpiryAlerts: true,
        assignmentAlerts: true,
        systemAnnouncements: true,
        weeklyReports: true,
        monthlyReports: false,
      });
    }
    
    res.json(result[0]);
  } catch (error) {
    console.error('Error fetching notification settings:', error);
    res.status(500).json({ error: 'Failed to fetch notification settings' });
  }
});

router.put('/notifications', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const {
      emailEnabled, pushEnabled, smsEnabled,
      maintenanceAlerts, fuelAlerts, documentExpiryAlerts,
      assignmentAlerts, systemAnnouncements, weeklyReports, monthlyReports
    } = req.body;

    const existing = await query('SELECT id FROM notification_settings WHERE user_id = $1', [userId]);
    
    if (existing && existing.length > 0) {
      const result = await query(`
        UPDATE notification_settings
        SET email_enabled = $1, push_enabled = $2, sms_enabled = $3,
            maintenance_alerts = $4, fuel_alerts = $5, document_expiry_alerts = $6,
            assignment_alerts = $7, system_announcements = $8, weekly_reports = $9, monthly_reports = $10,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $11
        RETURNING *
      `, [
        emailEnabled, pushEnabled, smsEnabled,
        maintenanceAlerts, fuelAlerts, documentExpiryAlerts,
        assignmentAlerts, systemAnnouncements, weeklyReports, monthlyReports,
        existing[0].id
      ]);
      res.json(result[0]);
    } else {
      const result = await query(`
        INSERT INTO notification_settings (
          user_id, email_enabled, push_enabled, sms_enabled,
          maintenance_alerts, fuel_alerts, document_expiry_alerts,
          assignment_alerts, system_announcements, weekly_reports, monthly_reports
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `, [
        userId, emailEnabled, pushEnabled, smsEnabled,
        maintenanceAlerts, fuelAlerts, documentExpiryAlerts,
        assignmentAlerts, systemAnnouncements, weeklyReports, monthlyReports
      ]);
      res.json(result[0]);
    }
  } catch (error) {
    console.error('Error saving notification settings:', error);
    res.status(500).json({ error: 'Failed to save notification settings' });
  }
});

// ==========================================
// USER PREFERENCES
// ==========================================

router.get('/preferences', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const result = await query(`
      SELECT * FROM user_preferences
      WHERE user_id = $1
    `, [userId]);
    
    if (!result || result.length === 0) {
      return res.json({
        theme: 'system',
        language: 'en',
        dateFormat: 'MM/DD/YYYY',
        timeFormat: '12h',
        timezone: 'UTC',
        sidebarCollapsed: false,
        dashboardView: 'default',
        emailNotifications: true,
        pushNotifications: true,
      });
    }
    
    res.json(result[0]);
  } catch (error) {
    console.error('Error fetching user preferences:', error);
    res.status(500).json({ error: 'Failed to fetch user preferences' });
  }
});

router.put('/preferences', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const {
      theme, language, dateFormat, timeFormat, timezone,
      sidebarCollapsed, dashboardView, emailNotifications, pushNotifications
    } = req.body;

    const existing = await query('SELECT id FROM user_preferences WHERE user_id = $1', [userId]);
    
    if (existing && existing.length > 0) {
      const result = await query(`
        UPDATE user_preferences
        SET theme = $1, language = $2, date_format = $3, time_format = $4, timezone = $5,
            sidebar_collapsed = $6, dashboard_view = $7, email_notifications = $8, push_notifications = $9,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $10
        RETURNING *
      `, [
        theme, language, dateFormat, timeFormat, timezone,
        sidebarCollapsed, dashboardView, emailNotifications, pushNotifications,
        existing[0].id
      ]);
      res.json(result[0]);
    } else {
      const result = await query(`
        INSERT INTO user_preferences (
          user_id, theme, language, date_format, time_format, timezone,
          sidebar_collapsed, dashboard_view, email_notifications, push_notifications
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `, [
        userId, theme, language, dateFormat, timeFormat, timezone,
        sidebarCollapsed, dashboardView, emailNotifications, pushNotifications
      ]);
      res.json(result[0]);
    }
  } catch (error) {
    console.error('Error saving user preferences:', error);
    res.status(500).json({ error: 'Failed to save user preferences' });
  }
});

// ==========================================
// SECURITY SETTINGS (2FA, Password Policy, etc.)
// ==========================================

router.get('/security', requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).user?.companyId;
    const result = await query(`
      SELECT * FROM security_settings
      WHERE company_id = $1
    `, [companyId]);
    
    if (!result || result.length === 0) {
      return res.json({
        require2FA: false,
        passwordMinLength: 8,
        passwordRequireUppercase: true,
        passwordRequireNumbers: true,
        passwordRequireSymbols: false,
        sessionTimeoutMinutes: 60,
        maxLoginAttempts: 5,
        lockoutDurationMinutes: 30,
        ipWhitelistEnabled: false,
        ipWhitelist: [],
        auditLogRetentionDays: 365,
      });
    }
    
    res.json(result[0]);
  } catch (error) {
    console.error('Error fetching security settings:', error);
    res.status(500).json({ error: 'Failed to fetch security settings' });
  }
});

router.put('/security', requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).user?.companyId;
    const {
      require2FA, passwordMinLength, passwordRequireUppercase, passwordRequireNumbers,
      passwordRequireSymbols, sessionTimeoutMinutes, maxLoginAttempts, lockoutDurationMinutes,
      ipWhitelistEnabled, ipWhitelist, auditLogRetentionDays
    } = req.body;

    const existing = await query('SELECT id FROM security_settings WHERE company_id = $1', [companyId]);
    
    if (existing && existing.length > 0) {
      const result = await query(`
        UPDATE security_settings
        SET require_2fa = $1, password_min_length = $2, password_require_uppercase = $3, 
            password_require_numbers = $4, password_require_symbols = $5, 
            session_timeout_minutes = $6, max_login_attempts = $7, lockout_duration_minutes = $8,
            ip_whitelist_enabled = $9, ip_whitelist = $10, audit_log_retention_days = $11,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $12
        RETURNING *
      `, [
        require2FA, passwordMinLength, passwordRequireUppercase, passwordRequireNumbers,
        passwordRequireSymbols, sessionTimeoutMinutes, maxLoginAttempts, lockoutDurationMinutes,
        ipWhitelistEnabled, ipWhitelist, auditLogRetentionDays, existing[0].id
      ]);
      res.json(result[0]);
    } else {
      const result = await query(`
        INSERT INTO security_settings (
          company_id, require_2fa, password_min_length, password_require_uppercase, 
          password_require_numbers, password_require_symbols, session_timeout_minutes, 
          max_login_attempts, lockout_duration_minutes, ip_whitelist_enabled, ip_whitelist, 
          audit_log_retention_days
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `, [
        companyId, require2FA, passwordMinLength, passwordRequireUppercase, passwordRequireNumbers,
        passwordRequireSymbols, sessionTimeoutMinutes, maxLoginAttempts, lockoutDurationMinutes,
        ipWhitelistEnabled, ipWhitelist, auditLogRetentionDays
      ]);
      res.json(result[0]);
    }
  } catch (error) {
    console.error('Error saving security settings:', error);
    res.status(500).json({ error: 'Failed to save security settings' });
  }
});

export default router;
