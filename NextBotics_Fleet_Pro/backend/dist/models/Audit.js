"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CorrectiveActionModel = exports.AuditSessionModel = exports.AuditTemplateModel = void 0;
const database_1 = require("../database");
class AuditTemplateModel {
    static async findById(id, companyId) {
        const rows = await (0, database_1.query)(`SELECT t.*, COUNT(q.id) as question_count
       FROM audit_templates t
       LEFT JOIN audit_questions q ON t.id = q.template_id AND q.is_active = true
       WHERE t.id = $1 AND (t.company_id = $2 OR t.is_system_template = true)
       GROUP BY t.id`, [id, companyId]);
        return rows.length > 0 ? this.mapTemplateRow(rows[0]) : null;
    }
    static async findByCompany(companyId, options) {
        let sql = `
      SELECT t.*, COUNT(q.id) as question_count
      FROM audit_templates t
      LEFT JOIN audit_questions q ON t.id = q.template_id AND q.is_active = true
      WHERE (t.company_id = $1 OR t.is_system_template = true)
    `;
        const params = [companyId];
        if (options?.isActive !== undefined) {
            sql += ` AND t.is_active = $${params.length + 1}`;
            params.push(options.isActive);
        }
        sql += ' GROUP BY t.id ORDER BY t.is_system_template DESC, t.name ASC';
        const rows = await (0, database_1.query)(sql, params);
        return rows.map(this.mapTemplateRow);
    }
    static async createFromSystemTemplate(systemTemplateId, companyId, createdBy) {
        // Get system template
        const templateRows = await (0, database_1.query)('SELECT * FROM audit_templates WHERE id = $1 AND is_system_template = true', [systemTemplateId]);
        if (templateRows.length === 0)
            return null;
        const systemTemplate = templateRows[0];
        // Create company copy
        const newTemplateRows = await (0, database_1.query)(`INSERT INTO audit_templates (company_id, name, description, category, created_by)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`, [companyId, systemTemplate.name, systemTemplate.description, systemTemplate.category, createdBy]);
        const newTemplateId = newTemplateRows[0].id;
        // Copy questions
        const questionRows = await (0, database_1.query)('SELECT * FROM audit_questions WHERE template_id = $1 AND is_active = true', [systemTemplateId]);
        for (const q of questionRows) {
            await (0, database_1.query)(`INSERT INTO audit_questions (company_id, template_id, question_number, question_text, 
         description, category, weight, evidence_required)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`, [companyId, newTemplateId, q.question_number, q.question_text, q.description,
                q.category, q.weight, q.evidence_required]);
        }
        return this.findById(newTemplateId, companyId);
    }
    static async getQuestions(templateId, companyId) {
        const rows = await (0, database_1.query)(`SELECT * FROM audit_questions 
       WHERE template_id = $1 AND (company_id = $2 OR company_id IS NULL) AND is_active = true
       ORDER BY question_number ASC`, [templateId, companyId]);
        return rows.map(this.mapQuestionRow);
    }
    static async addQuestion(templateId, companyId, data) {
        // Get next question number
        const countRows = await (0, database_1.query)('SELECT COUNT(*) as count FROM audit_questions WHERE template_id = $1', [templateId]);
        const questionNumber = parseInt(countRows[0].count) + 1;
        const rows = await (0, database_1.query)(`INSERT INTO audit_questions (company_id, template_id, question_number, question_text, 
       description, category, weight, evidence_required)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`, [companyId, templateId, questionNumber, data.questionText, data.description,
            data.category, data.weight || 1, data.evidenceRequired || false]);
        return this.mapQuestionRow(rows[0]);
    }
    static mapTemplateRow(row) {
        return {
            id: row.id,
            companyId: row.company_id,
            name: row.name,
            description: row.description,
            category: row.category,
            isSystemTemplate: row.is_system_template,
            isActive: row.is_active,
            createdBy: row.created_by,
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at),
            questionCount: parseInt(row.question_count || 0),
        };
    }
    static mapQuestionRow(row) {
        return {
            id: row.id,
            companyId: row.company_id,
            templateId: row.template_id,
            questionNumber: row.question_number,
            questionText: row.question_text,
            description: row.description,
            category: row.category,
            weight: row.weight,
            evidenceRequired: row.evidence_required,
            isActive: row.is_active,
        };
    }
}
exports.AuditTemplateModel = AuditTemplateModel;
class AuditSessionModel {
    static async findById(id, companyId) {
        const rows = await (0, database_1.query)(`SELECT s.*,
        t.name as t_name, t.category as t_category,
        v.registration_number as v_reg, v.make as v_make, v.model as v_model,
        d.first_name as d_fname, d.last_name as d_lname,
        u.first_name as u_fname, u.last_name as u_lname
       FROM audit_sessions s
       LEFT JOIN audit_templates t ON s.template_id = t.id
       LEFT JOIN vehicles v ON s.vehicle_id = v.id
       LEFT JOIN drivers d ON s.driver_id = d.id
       LEFT JOIN users u ON s.auditor_id = u.id
       WHERE s.id = $1 AND s.company_id = $2`, [id, companyId]);
        if (rows.length === 0)
            return null;
        return this.mapSessionRow(rows[0]);
    }
    static async findByCompany(companyId, options) {
        let sql = `
      SELECT s.*,
        t.name as t_name, t.category as t_category,
        v.registration_number as v_reg, v.make as v_make, v.model as v_model,
        d.first_name as d_fname, d.last_name as d_lname,
        u.first_name as u_fname, u.last_name as u_lname
      FROM audit_sessions s
      LEFT JOIN audit_templates t ON s.template_id = t.id
      LEFT JOIN vehicles v ON s.vehicle_id = v.id
      LEFT JOIN drivers d ON s.driver_id = d.id
      LEFT JOIN users u ON s.auditor_id = u.id
      WHERE s.company_id = $1
    `;
        let countSql = 'SELECT COUNT(*) as total FROM audit_sessions WHERE company_id = $1';
        const params = [companyId];
        if (options?.status) {
            sql += ` AND s.status = $${params.length + 1}`;
            countSql += ` AND status = $${params.length + 1}`;
            params.push(options.status);
        }
        if (options?.templateId) {
            sql += ` AND s.template_id = $${params.length + 1}`;
            countSql += ` AND template_id = $${params.length + 1}`;
            params.push(options.templateId);
        }
        if (options?.vehicleId) {
            sql += ` AND s.vehicle_id = $${params.length + 1}`;
            countSql += ` AND vehicle_id = $${params.length + 1}`;
            params.push(options.vehicleId);
        }
        sql += ' ORDER BY s.created_at DESC';
        if (options?.limit) {
            sql += ` LIMIT $${params.length + 1}`;
            params.push(options.limit);
            if (options?.offset) {
                sql += ` OFFSET $${params.length + 1}`;
                params.push(options.offset);
            }
        }
        const [rows, countRows] = await Promise.all([
            (0, database_1.query)(sql, params),
            (0, database_1.query)(countSql, params.slice(0, options?.limit ? params.length - (options.offset ? 2 : 1) : params.length))
        ]);
        return {
            sessions: rows.map(this.mapSessionRow),
            total: parseInt(countRows[0].total)
        };
    }
    static async create(companyId, data) {
        const rows = await (0, database_1.query)(`INSERT INTO audit_sessions (company_id, template_id, vehicle_id, driver_id, auditor_id,
       audit_reference, location, latitude, longitude, weather_conditions, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`, [companyId, data.templateId, data.vehicleId, data.driverId, data.auditorId,
            data.auditReference, data.location, data.latitude, data.longitude,
            data.weatherConditions, data.notes]);
        return this.mapSessionRow(rows[0]);
    }
    static async submitResponse(sessionId, companyId, data) {
        const rows = await (0, database_1.query)(`INSERT INTO audit_responses (company_id, session_id, question_id, score, notes, evidence_photos, answered_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`, [companyId, sessionId, data.questionId, data.score, data.notes,
            JSON.stringify(data.evidencePhotos || []), data.answeredBy]);
        return {
            id: rows[0].id,
            companyId: rows[0].company_id,
            sessionId: rows[0].session_id,
            questionId: rows[0].question_id,
            score: rows[0].score,
            notes: rows[0].notes,
            evidencePhotos: rows[0].evidence_photos || [],
            answeredAt: new Date(rows[0].answered_at),
            answeredBy: rows[0].answered_by,
        };
    }
    static async complete(sessionId, companyId) {
        // Calculate scores
        const responseRows = await (0, database_1.query)(`SELECT 
        COALESCE(SUM(score * weight), 0) as total_score,
        COALESCE(SUM(2 * weight), 0) as max_score,
        q.category
       FROM audit_responses r
       JOIN audit_questions q ON r.question_id = q.id
       WHERE r.session_id = $1
       GROUP BY q.category`, [sessionId]);
        const totalScore = responseRows.reduce((sum, r) => sum + parseFloat(r.total_score), 0);
        const maxPossibleScore = responseRows.reduce((sum, r) => sum + parseFloat(r.max_score), 0);
        const scorePercentage = maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 100 : 0;
        // Determine maturity rating
        let maturityRating = 'Critical';
        if (scorePercentage >= 90)
            maturityRating = 'Excellent';
        else if (scorePercentage >= 80)
            maturityRating = 'Good';
        else if (scorePercentage >= 60)
            maturityRating = 'Fair';
        else if (scorePercentage >= 40)
            maturityRating = 'Poor';
        // Save category scores
        for (const row of responseRows) {
            await (0, database_1.query)(`INSERT INTO audit_category_scores (company_id, session_id, category, total_score, max_possible_score, score_percentage)
         VALUES ($1, $2, $3, $4, $5, $6)`, [companyId, sessionId, row.category, parseFloat(row.total_score), parseFloat(row.max_score),
                (parseFloat(row.total_score) / parseFloat(row.max_score)) * 100]);
        }
        const rows = await (0, database_1.query)(`UPDATE audit_sessions 
       SET status = 'completed', completed_at = NOW(), total_score = $1, 
           max_possible_score = $2, score_percentage = $3, maturity_rating = $4
       WHERE id = $5 AND company_id = $6
       RETURNING *`, [totalScore, maxPossibleScore, scorePercentage, maturityRating, sessionId, companyId]);
        return rows.length > 0 ? this.findById(rows[0].id, companyId) : null;
    }
    static async getCategoryScores(sessionId, companyId) {
        const rows = await (0, database_1.query)(`SELECT * FROM audit_category_scores 
       WHERE session_id = $1 AND company_id = $2
       ORDER BY category ASC`, [sessionId, companyId]);
        return rows.map((row) => ({
            id: row.id,
            companyId: row.company_id,
            sessionId: row.session_id,
            category: row.category,
            totalScore: parseFloat(row.total_score),
            maxPossibleScore: parseFloat(row.max_possible_score),
            scorePercentage: parseFloat(row.score_percentage),
        }));
    }
    static async getStats(companyId) {
        const rows = await (0, database_1.query)(`SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        COALESCE(AVG(score_percentage), 0) as avg_score,
        maturity_rating
       FROM audit_sessions 
       WHERE company_id = $1
       GROUP BY maturity_rating`, [companyId]);
        let totalAudits = 0;
        let completedAudits = 0;
        let totalScoreSum = 0;
        let scoreCount = 0;
        const byMaturityRating = {};
        for (const row of rows) {
            const count = parseInt(row.total);
            totalAudits += count;
            completedAudits += parseInt(row.completed);
            if (row.maturity_rating) {
                byMaturityRating[row.maturity_rating] = count;
            }
            if (row.avg_score) {
                totalScoreSum += parseFloat(row.avg_score);
                scoreCount++;
            }
        }
        return {
            totalAudits,
            completedAudits,
            averageScore: scoreCount > 0 ? totalScoreSum / scoreCount : 0,
            byMaturityRating,
        };
    }
    static mapSessionRow(row) {
        const session = {
            id: row.id,
            companyId: row.company_id,
            templateId: row.template_id,
            vehicleId: row.vehicle_id,
            driverId: row.driver_id,
            auditorId: row.auditor_id,
            auditReference: row.audit_reference,
            location: row.location,
            latitude: row.latitude ? parseFloat(row.latitude) : undefined,
            longitude: row.longitude ? parseFloat(row.longitude) : undefined,
            startedAt: new Date(row.started_at),
            completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
            status: row.status,
            totalScore: row.total_score ? parseInt(row.total_score) : undefined,
            maxPossibleScore: row.max_possible_score ? parseInt(row.max_possible_score) : undefined,
            scorePercentage: row.score_percentage ? parseFloat(row.score_percentage) : undefined,
            maturityRating: row.maturity_rating,
            notes: row.notes,
            weatherConditions: row.weather_conditions,
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at),
        };
        if (row.t_name) {
            session.template = {
                name: row.t_name,
                category: row.t_category,
            };
        }
        if (row.v_reg) {
            session.vehicle = {
                registrationNumber: row.v_reg,
                make: row.v_make,
                model: row.v_model,
            };
        }
        if (row.d_fname) {
            session.driver = {
                firstName: row.d_fname,
                lastName: row.d_lname,
            };
        }
        if (row.u_fname) {
            session.auditor = {
                firstName: row.u_fname,
                lastName: row.u_lname,
            };
        }
        return session;
    }
}
exports.AuditSessionModel = AuditSessionModel;
class CorrectiveActionModel {
    static async findById(id, companyId) {
        const rows = await (0, database_1.query)(`SELECT ca.*, u.first_name, u.last_name
       FROM corrective_actions ca
       LEFT JOIN users u ON ca.assigned_to = u.id
       WHERE ca.id = $1 AND ca.company_id = $2`, [id, companyId]);
        return rows.length > 0 ? this.mapActionRow(rows[0]) : null;
    }
    static async findByCompany(companyId, options) {
        let sql = `
      SELECT ca.*, u.first_name, u.last_name
      FROM corrective_actions ca
      LEFT JOIN users u ON ca.assigned_to = u.id
      WHERE ca.company_id = $1
    `;
        let countSql = 'SELECT COUNT(*) as total FROM corrective_actions WHERE company_id = $1';
        const params = [companyId];
        if (options?.status) {
            sql += ` AND ca.status = $${params.length + 1}`;
            countSql += ` AND status = $${params.length + 1}`;
            params.push(options.status);
        }
        if (options?.assignedTo) {
            sql += ` AND ca.assigned_to = $${params.length + 1}`;
            countSql += ` AND assigned_to = $${params.length + 1}`;
            params.push(options.assignedTo);
        }
        if (options?.priority) {
            sql += ` AND ca.priority = $${params.length + 1}`;
            countSql += ` AND priority = $${params.length + 1}`;
            params.push(options.priority);
        }
        sql += ' ORDER BY ca.created_at DESC';
        if (options?.limit) {
            sql += ` LIMIT $${params.length + 1}`;
            params.push(options.limit);
            if (options?.offset) {
                sql += ` OFFSET $${params.length + 1}`;
                params.push(options.offset);
            }
        }
        const [rows, countRows] = await Promise.all([
            (0, database_1.query)(sql, params),
            (0, database_1.query)(countSql, params.slice(0, options?.limit ? params.length - (options.offset ? 2 : 1) : params.length))
        ]);
        return {
            actions: rows.map(this.mapActionRow),
            total: parseInt(countRows[0].total)
        };
    }
    static async create(companyId, createdBy, data) {
        const rows = await (0, database_1.query)(`INSERT INTO corrective_actions (company_id, session_id, response_id, title, description,
       priority, assigned_to, due_date, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`, [companyId, data.sessionId, data.responseId, data.title, data.description,
            data.priority || 'medium', data.assignedTo, data.dueDate, createdBy]);
        return this.mapActionRow(rows[0]);
    }
    static async complete(id, companyId, completedBy, notes) {
        const rows = await (0, database_1.query)(`UPDATE corrective_actions 
       SET status = 'completed', completed_at = NOW(), completed_by = $1, completion_notes = $2
       WHERE id = $3 AND company_id = $4
       RETURNING *`, [completedBy, notes, id, companyId]);
        return rows.length > 0 ? this.mapActionRow(rows[0]) : null;
    }
    static async getStats(companyId) {
        const rows = await (0, database_1.query)(`SELECT 
        status,
        priority,
        COUNT(*) as count
       FROM corrective_actions 
       WHERE company_id = $1
       GROUP BY status, priority`, [companyId]);
        const stats = {
            total: 0,
            open: 0,
            inProgress: 0,
            completed: 0,
            overdue: 0,
            byPriority: {},
        };
        for (const row of rows) {
            const count = parseInt(row.count);
            stats.total += count;
            switch (row.status) {
                case 'open':
                    stats.open += count;
                    break;
                case 'in_progress':
                    stats.inProgress += count;
                    break;
                case 'completed':
                    stats.completed += count;
                    break;
                case 'overdue':
                    stats.overdue += count;
                    break;
            }
            if (!stats.byPriority[row.priority])
                stats.byPriority[row.priority] = 0;
            stats.byPriority[row.priority] += count;
        }
        return stats;
    }
    static mapActionRow(row) {
        const action = {
            id: row.id,
            companyId: row.company_id,
            sessionId: row.session_id,
            responseId: row.response_id,
            title: row.title,
            description: row.description,
            priority: row.priority,
            assignedTo: row.assigned_to,
            dueDate: row.due_date ? new Date(row.due_date) : undefined,
            status: row.status,
            completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
            completedBy: row.completed_by,
            completionNotes: row.completion_notes,
            evidencePhotos: row.evidence_photos || [],
            createdBy: row.created_by,
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at),
        };
        if (row.first_name) {
            action.assignee = {
                firstName: row.first_name,
                lastName: row.last_name,
            };
        }
        return action;
    }
}
exports.CorrectiveActionModel = CorrectiveActionModel;
//# sourceMappingURL=Audit.js.map