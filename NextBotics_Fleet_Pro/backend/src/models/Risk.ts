import { query } from '../database';

export interface Risk {
  id: string;
  companyId: string;
  riskReference: string;
  title: string;
  description: string;
  category: string;
  likelihood: number;
  impact: number;
  riskScore: number;
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
  identifiedBy?: string;
  identifiedAt: Date;
  mitigatingActions?: string;
  ownerId?: string;
  reviewDate?: Date;
  status: 'open' | 'mitigated' | 'accepted' | 'transferred' | 'closed';
  relatedAuditSessionId?: string;
  relatedCorrectiveActionId?: string;
  createdAt: Date;
  updatedAt: Date;
  // Joined fields
  identifiedByUser?: {
    firstName: string;
    lastName: string;
  };
  owner?: {
    firstName: string;
    lastName: string;
  };
}

export interface RiskHistory {
  id: string;
  companyId: string;
  riskId: string;
  action: string;
  actionBy: string;
  actionAt: Date;
  oldValues?: any;
  newValues?: any;
  notes?: string;
  actor?: {
    firstName: string;
    lastName: string;
  };
}

export interface InspectionRecord {
  id: string;
  companyId: string;
  inspectionType: string;
  vehicleId?: string;
  driverId?: string;
  inspectedBy: string;
  inspectionDate: Date;
  location?: string;
  latitude?: number;
  longitude?: number;
  overallStatus?: 'pass' | 'fail' | 'conditional';
  findings?: string;
  correctiveActionNeeded: boolean;
  photos: string[];
  signatureUrl?: string;
  createdAt: Date;
  // Joined fields
  vehicle?: {
    registrationNumber: string;
    make: string;
    model: string;
  };
  driver?: {
    firstName: string;
    lastName: string;
  };
  inspector?: {
    firstName: string;
    lastName: string;
  };
}

function mapRowToRisk(row: any): Risk {
  return {
    id: row.id,
    companyId: row.company_id,
    riskReference: row.risk_reference,
    title: row.title,
    description: row.description,
    category: row.category,
    likelihood: row.likelihood,
    impact: row.impact,
    riskScore: row.risk_score,
    riskLevel: row.risk_level,
    identifiedBy: row.identified_by,
    identifiedAt: new Date(row.identified_at),
    mitigatingActions: row.mitigating_actions,
    ownerId: row.owner_id,
    reviewDate: row.review_date ? new Date(row.review_date) : undefined,
    status: row.status,
    relatedAuditSessionId: row.related_audit_session_id,
    relatedCorrectiveActionId: row.related_corrective_action_id,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export class RiskModel {
  static async generateRiskReference(companyId: string): Promise<string> {
    const date = new Date();
    const prefix = `RISK-${date.getFullYear()}`;
    
    const rows = await query(
      `SELECT COUNT(*) as count FROM risk_register 
       WHERE company_id = $1 AND risk_reference LIKE $2`,
      [companyId, `${prefix}-%`]
    );
    
    const count = parseInt(rows[0].count) + 1;
    return `${prefix}-${String(count).padStart(4, '0')}`;
  }

  static async findById(id: string, companyId: string): Promise<Risk | null> {
    const rows = await query(
      `SELECT r.*,
        u1.first_name as u1_fname, u1.last_name as u1_lname,
        u2.first_name as u2_fname, u2.last_name as u2_lname
       FROM risk_register r
       LEFT JOIN users u1 ON r.identified_by = u1.id
       LEFT JOIN users u2 ON r.owner_id = u2.id
       WHERE r.id = $1 AND r.company_id = $2`,
      [id, companyId]
    );
    
    if (rows.length === 0) return null;
    
    const risk = mapRowToRisk(rows[0]);
    if (rows[0].u1_fname) {
      risk.identifiedByUser = {
        firstName: rows[0].u1_fname,
        lastName: rows[0].u1_lname,
      };
    }
    if (rows[0].u2_fname) {
      risk.owner = {
        firstName: rows[0].u2_fname,
        lastName: rows[0].u2_lname,
      };
    }
    return risk;
  }

  static async findByCompany(companyId: string, options?: {
    status?: string;
    riskLevel?: string;
    category?: string;
    ownerId?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ risks: Risk[]; total: number }> {
    let sql = `
      SELECT r.*,
        u1.first_name as u1_fname, u1.last_name as u1_lname,
        u2.first_name as u2_fname, u2.last_name as u2_lname
      FROM risk_register r
      LEFT JOIN users u1 ON r.identified_by = u1.id
      LEFT JOIN users u2 ON r.owner_id = u2.id
      WHERE r.company_id = $1
    `;
    let countSql = 'SELECT COUNT(*) as total FROM risk_register WHERE company_id = $1';
    const params: any[] = [companyId];

    if (options?.status) {
      sql += ` AND r.status = $${params.length + 1}`;
      countSql += ` AND status = $${params.length + 1}`;
      params.push(options.status);
    }

    if (options?.riskLevel) {
      sql += ` AND r.risk_level = $${params.length + 1}`;
      countSql += ` AND risk_level = $${params.length + 1}`;
      params.push(options.riskLevel);
    }

    if (options?.category) {
      sql += ` AND r.category = $${params.length + 1}`;
      countSql += ` AND category = $${params.length + 1}`;
      params.push(options.category);
    }

    if (options?.ownerId) {
      sql += ` AND r.owner_id = $${params.length + 1}`;
      countSql += ` AND owner_id = $${params.length + 1}`;
      params.push(options.ownerId);
    }

    sql += ' ORDER BY r.risk_score DESC, r.created_at DESC';

    if (options?.limit) {
      sql += ` LIMIT $${params.length + 1}`;
      params.push(options.limit);
      if (options?.offset) {
        sql += ` OFFSET $${params.length + 1}`;
        params.push(options.offset);
      }
    }

    const [rows, countRows] = await Promise.all([
      query(sql, params),
      query(countSql, params.slice(0, options?.limit ? params.length - (options.offset ? 2 : 1) : params.length))
    ]);

    const risks = rows.map((row: any) => {
      const risk = mapRowToRisk(row);
      if (row.u1_fname) {
        risk.identifiedByUser = {
          firstName: row.u1_fname,
          lastName: row.u1_lname,
        };
      }
      if (row.u2_fname) {
        risk.owner = {
          firstName: row.u2_fname,
          lastName: row.u2_lname,
        };
      }
      return risk;
    });

    return { risks, total: parseInt(countRows[0].total) };
  }

  static async create(companyId: string, data: Partial<Risk>): Promise<Risk> {
    const riskReference = await this.generateRiskReference(companyId);
    
    const rows = await query(
      `INSERT INTO risk_register (company_id, risk_reference, title, description, category,
       likelihood, impact, identified_by, mitigating_actions, owner_id, review_date,
       related_audit_session_id, related_corrective_action_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
      [companyId, riskReference, data.title, data.description, data.category,
       data.likelihood, data.impact, data.identifiedBy, data.mitigatingActions,
       data.ownerId, data.reviewDate, data.relatedAuditSessionId, data.relatedCorrectiveActionId]
    );

    const risk = mapRowToRisk(rows[0]);
    await this.logHistory(companyId, risk.id, 'created', data.identifiedBy!, { risk }, null, 'Risk created');
    return risk;
  }

  static async update(id: string, companyId: string, data: Partial<Risk>, updatedBy: string): Promise<Risk | null> {
    const oldRisk = await this.findById(id, companyId);
    if (!oldRisk) return null;

    const updates: string[] = [];
    const params: any[] = [];

    const fieldMap: Record<string, string> = {
      title: 'title',
      description: 'description',
      category: 'category',
      likelihood: 'likelihood',
      impact: 'impact',
      mitigatingActions: 'mitigating_actions',
      ownerId: 'owner_id',
      reviewDate: 'review_date',
      status: 'status',
    };

    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined && fieldMap[key]) {
        updates.push(`${fieldMap[key]} = $${params.length + 1}`);
        params.push(value);
      }
    }

    if (updates.length === 0) return oldRisk;

    params.push(id, companyId);

    const rows = await query(
      `UPDATE risk_register SET ${updates.join(', ')} WHERE id = $${params.length - 1} AND company_id = $${params.length} RETURNING *`,
      params
    );

    if (rows.length === 0) return null;

    const newRisk = mapRowToRisk(rows[0]);
    await this.logHistory(companyId, id, 'updated', updatedBy, { risk: oldRisk }, { risk: newRisk }, 'Risk updated');
    return newRisk;
  }

  static async getHistory(riskId: string, companyId: string): Promise<RiskHistory[]> {
    const rows = await query(
      `SELECT h.*, u.first_name, u.last_name
       FROM risk_history h
       LEFT JOIN users u ON h.action_by = u.id
       WHERE h.risk_id = $1 AND h.company_id = $2
       ORDER BY h.action_at DESC`,
      [riskId, companyId]
    );

    return rows.map((row: any) => ({
      id: row.id,
      companyId: row.company_id,
      riskId: row.risk_id,
      action: row.action,
      actionBy: row.action_by,
      actionAt: new Date(row.action_at),
      oldValues: row.old_values,
      newValues: row.new_values,
      notes: row.notes,
      actor: row.first_name ? {
        firstName: row.first_name,
        lastName: row.last_name,
      } : undefined,
    }));
  }

  static async getStats(companyId: string): Promise<{
    total: number;
    byLevel: Record<string, number>;
    byStatus: Record<string, number>;
    byCategory: Record<string, number>;
    criticalOpen: number;
  }> {
    const rows = await query(
      `SELECT 
        risk_level,
        status,
        category,
        COUNT(*) as count
       FROM risk_register 
       WHERE company_id = $1
       GROUP BY risk_level, status, category`,
      [companyId]
    );

    const stats = {
      total: 0,
      byLevel: {} as Record<string, number>,
      byStatus: {} as Record<string, number>,
      byCategory: {} as Record<string, number>,
      criticalOpen: 0,
    };

    for (const row of rows) {
      const count = parseInt(row.count);
      stats.total += count;

      if (!stats.byLevel[row.risk_level]) stats.byLevel[row.risk_level] = 0;
      stats.byLevel[row.risk_level] += count;

      if (!stats.byStatus[row.status]) stats.byStatus[row.status] = 0;
      stats.byStatus[row.status] += count;

      if (!stats.byCategory[row.category]) stats.byCategory[row.category] = 0;
      stats.byCategory[row.category] += count;

      if (row.risk_level === 'critical' && row.status === 'open') {
        stats.criticalOpen += count;
      }
    }

    return stats;
  }

  private static async logHistory(
    companyId: string,
    riskId: string,
    action: string,
    actionBy: string,
    oldValues: any,
    newValues: any,
    notes?: string
  ): Promise<void> {
    await query(
      `INSERT INTO risk_history (company_id, risk_id, action, action_by, old_values, new_values, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [companyId, riskId, action, actionBy, JSON.stringify(oldValues), JSON.stringify(newValues), notes]
    );
  }
}

export class InspectionModel {
  static async findById(id: string, companyId: string): Promise<InspectionRecord | null> {
    const rows = await query(
      `SELECT i.*,
        v.registration_number as v_reg, v.make as v_make, v.model as v_model,
        d.first_name as d_fname, d.last_name as d_lname,
        u.first_name as u_fname, u.last_name as u_lname
       FROM inspection_records i
       LEFT JOIN vehicles v ON i.vehicle_id = v.id
       LEFT JOIN drivers d ON i.driver_id = d.id
       LEFT JOIN users u ON i.inspected_by = u.id
       WHERE i.id = $1 AND i.company_id = $2`,
      [id, companyId]
    );
    
    if (rows.length === 0) return null;
    return this.mapInspectionRow(rows[0]);
  }

  static async findByCompany(companyId: string, options?: {
    inspectionType?: string;
    vehicleId?: string;
    status?: string;
    dateFrom?: Date;
    dateTo?: Date;
    limit?: number;
    offset?: number;
  }): Promise<{ inspections: InspectionRecord[]; total: number }> {
    let sql = `
      SELECT i.*,
        v.registration_number as v_reg, v.make as v_make, v.model as v_model,
        d.first_name as d_fname, d.last_name as d_lname,
        u.first_name as u_fname, u.last_name as u_lname
      FROM inspection_records i
      LEFT JOIN vehicles v ON i.vehicle_id = v.id
      LEFT JOIN drivers d ON i.driver_id = d.id
      LEFT JOIN users u ON i.inspected_by = u.id
      WHERE i.company_id = $1
    `;
    let countSql = 'SELECT COUNT(*) as total FROM inspection_records WHERE company_id = $1';
    const params: any[] = [companyId];

    if (options?.inspectionType) {
      sql += ` AND i.inspection_type = $${params.length + 1}`;
      countSql += ` AND inspection_type = $${params.length + 1}`;
      params.push(options.inspectionType);
    }

    if (options?.vehicleId) {
      sql += ` AND i.vehicle_id = $${params.length + 1}`;
      countSql += ` AND vehicle_id = $${params.length + 1}`;
      params.push(options.vehicleId);
    }

    if (options?.status) {
      sql += ` AND i.overall_status = $${params.length + 1}`;
      countSql += ` AND overall_status = $${params.length + 1}`;
      params.push(options.status);
    }

    sql += ' ORDER BY i.inspection_date DESC';

    if (options?.limit) {
      sql += ` LIMIT $${params.length + 1}`;
      params.push(options.limit);
      if (options?.offset) {
        sql += ` OFFSET $${params.length + 1}`;
        params.push(options.offset);
      }
    }

    const [rows, countRows] = await Promise.all([
      query(sql, params),
      query(countSql, params.slice(0, options?.limit ? params.length - (options.offset ? 2 : 1) : params.length))
    ]);

    return {
      inspections: rows.map(this.mapInspectionRow),
      total: parseInt(countRows[0].total)
    };
  }

  static async create(companyId: string, data: Partial<InspectionRecord>): Promise<InspectionRecord> {
    const rows = await query(
      `INSERT INTO inspection_records (company_id, inspection_type, vehicle_id, driver_id,
       inspected_by, location, latitude, longitude, overall_status, findings,
       corrective_action_needed, photos, signature_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
      [companyId, data.inspectionType, data.vehicleId, data.driverId, data.inspectedBy,
       data.location, data.latitude, data.longitude, data.overallStatus, data.findings,
       data.correctiveActionNeeded || false, JSON.stringify(data.photos || []), data.signatureUrl]
    );
    return this.mapInspectionRow(rows[0]);
  }

  static async linkToCorrectiveAction(inspectionId: string, correctiveActionId: string, linkedBy: string): Promise<void> {
    await query(
      `INSERT INTO corrective_action_inspection_links (corrective_action_id, inspection_id, linked_by)
       VALUES ($1, $2, $3)
       ON CONFLICT (corrective_action_id, inspection_id) DO NOTHING`,
      [correctiveActionId, inspectionId, linkedBy]
    );
  }

  static async getLinkedInspections(correctiveActionId: string, companyId: string): Promise<InspectionRecord[]> {
    const rows = await query(
      `SELECT i.*,
        v.registration_number as v_reg, v.make as v_make, v.model as v_model,
        d.first_name as d_fname, d.last_name as d_lname,
        u.first_name as u_fname, u.last_name as u_lname
       FROM inspection_records i
       JOIN corrective_action_inspection_links l ON i.id = l.inspection_id
       LEFT JOIN vehicles v ON i.vehicle_id = v.id
       LEFT JOIN drivers d ON i.driver_id = d.id
       LEFT JOIN users u ON i.inspected_by = u.id
       WHERE l.corrective_action_id = $1 AND i.company_id = $2`,
      [correctiveActionId, companyId]
    );
    return rows.map(this.mapInspectionRow);
  }

  private static mapInspectionRow(row: any): InspectionRecord {
    const inspection: InspectionRecord = {
      id: row.id,
      companyId: row.company_id,
      inspectionType: row.inspection_type,
      vehicleId: row.vehicle_id,
      driverId: row.driver_id,
      inspectedBy: row.inspected_by,
      inspectionDate: new Date(row.inspection_date),
      location: row.location,
      latitude: row.latitude ? parseFloat(row.latitude) : undefined,
      longitude: row.longitude ? parseFloat(row.longitude) : undefined,
      overallStatus: row.overall_status,
      findings: row.findings,
      correctiveActionNeeded: row.corrective_action_needed,
      photos: row.photos || [],
      signatureUrl: row.signature_url,
      createdAt: new Date(row.created_at),
    };

    if (row.v_reg) {
      inspection.vehicle = {
        registrationNumber: row.v_reg,
        make: row.v_make,
        model: row.v_model,
      };
    }

    if (row.d_fname) {
      inspection.driver = {
        firstName: row.d_fname,
        lastName: row.d_lname,
      };
    }

    if (row.u_fname) {
      inspection.inspector = {
        firstName: row.u_fname,
        lastName: row.u_lname,
      };
    }

    return inspection;
  }
}
