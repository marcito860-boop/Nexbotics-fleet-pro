import { query, transaction } from '../database';
import { User, CreateUserInput, UpdateUserInput, UserRole, SafeUser } from '../types';
import { hashPassword, generateSecurePassword, verifyPassword } from '../utils/password';

function toSafeUser(user: User): SafeUser {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    mustChangePassword: user.mustChangePassword,
  };
}

function mapRowToUser(row: any): User {
  return {
    id: row.id,
    companyId: row.company_id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    phone: row.phone,
    role: row.role as UserRole,
    isActive: row.is_active,
    mustChangePassword: row.must_change_password,
    lastLoginAt: row.last_login_at ? new Date(row.last_login_at) : undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export class UserModel {
  // Find user by email within a company
  static async findByEmail(email: string, companyId: string): Promise<User | null> {
    const rows = await query(
      'SELECT * FROM users WHERE email = $1 AND company_id = $2',
      [email.toLowerCase(), companyId]
    );
    return rows.length > 0 ? mapRowToUser(rows[0]) : null;
  }

  // Verify credentials and return user
static async verifyCredentials(email: string, companyId: string, password: string): Promise<User | null> {
    const rows = await query(
      'SELECT * FROM users WHERE email = $1 AND company_id = $2 AND is_active = true',
      [email.toLowerCase(), companyId]
    );
    
    if (rows.length === 0) return null;
    
    const valid = await verifyPassword(password, rows[0].password_hash);
    if (!valid) return null;
    
    return mapRowToUser(rows[0]);
  }

  // Find user by ID
  static async findById(id: string): Promise<User | null> {
    const rows = await query('SELECT * FROM users WHERE id = $1', [id]);
    return rows.length > 0 ? mapRowToUser(rows[0]) : null;
  }

  // Find user by ID within company (for company isolation)
  static async findByIdAndCompany(id: string, companyId: string): Promise<User | null> {
    const rows = await query(
      'SELECT * FROM users WHERE id = $1 AND company_id = $2',
      [id, companyId]
    );
    return rows.length > 0 ? mapRowToUser(rows[0]) : null;
  }

  // Get all users for a company
  static async findByCompany(companyId: string, options?: { 
    role?: UserRole; 
    isActive?: boolean;
    limit?: number; 
    offset?: number;
  }): Promise<{ users: User[]; total: number }> {
    let sql = 'SELECT * FROM users WHERE company_id = $1';
    let countSql = 'SELECT COUNT(*) as total FROM users WHERE company_id = $1';
    const params: any[] = [companyId];
    
    if (options?.role) {
      sql += ` AND role = $${params.length + 1}`;
      countSql += ` AND role = $${params.length + 1}`;
      params.push(options.role);
    }
    
    if (options?.isActive !== undefined) {
      sql += ` AND is_active = $${params.length + 1}`;
      countSql += ` AND is_active = $${params.length + 1}`;
      params.push(options.isActive);
    }
    
    sql += ' ORDER BY created_at DESC';
    
    if (options?.limit) {
      sql += ` LIMIT $${params.length + 1}`;
      params.push(options.limit);
      
      if (options?.offset) {
        sql += ` OFFSET $${params.length + 1}`;
        params.push(options.offset);
      }
    }
    
    const [userRows, countRows] = await Promise.all([
      query(sql, params),
      query(countSql, params.slice(0, options?.limit ? params.length - (options.offset ? 2 : 1) : params.length))
    ]);
    
    return {
      users: userRows.map(mapRowToUser),
      total: parseInt(countRows[0].total)
    };
  }

  // Create new user with auto-generated password
  static async create(input: CreateUserInput): Promise<{ user: User; tempPassword: string }> {
    const tempPassword = generateSecurePassword();
    const passwordHash = await hashPassword(tempPassword);
    
    const rows = await query(
      `INSERT INTO users (company_id, email, password_hash, first_name, last_name, phone, role, must_change_password)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        input.companyId,
        input.email.toLowerCase(),
        passwordHash,
        input.firstName,
        input.lastName,
        input.phone || null,
        input.role,
        true // Must change password on first login
      ]
    );
    
    return {
      user: mapRowToUser(rows[0]),
      tempPassword
    };
  }

  // Update user
  static async update(id: string, companyId: string, input: UpdateUserInput): Promise<User | null> {
    const updates: string[] = [];
    const params: any[] = [];
    
    if (input.firstName !== undefined) {
      updates.push(`first_name = $${params.length + 1}`);
      params.push(input.firstName);
    }
    
    if (input.lastName !== undefined) {
      updates.push(`last_name = $${params.length + 1}`);
      params.push(input.lastName);
    }
    
    if (input.phone !== undefined) {
      updates.push(`phone = $${params.length + 1}`);
      params.push(input.phone);
    }
    
    if (input.role !== undefined) {
      updates.push(`role = $${params.length + 1}`);
      params.push(input.role);
    }
    
    if (input.isActive !== undefined) {
      updates.push(`is_active = $${params.length + 1}`);
      params.push(input.isActive);
    }
    
    if (updates.length === 0) return this.findByIdAndCompany(id, companyId);
    
    params.push(id, companyId);
    
    const rows = await query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${params.length - 1} AND company_id = $${params.length} RETURNING *`,
      params
    );
    
    return rows.length > 0 ? mapRowToUser(rows[0]) : null;
  }

  // Change password
  static async changePassword(id: string, newPassword: string, companyId?: string): Promise<void> {
    const passwordHash = await hashPassword(newPassword);
    
    let sql = 'UPDATE users SET password_hash = $1, must_change_password = $2';
    const params: any[] = [passwordHash, false];
    
    if (companyId) {
      sql += `, updated_at = CURRENT_TIMESTAMP WHERE id = $3 AND company_id = $4`;
      params.push(id, companyId);
    } else {
      sql += `, updated_at = CURRENT_TIMESTAMP WHERE id = $3`;
      params.push(id);
    }
    
    await query(sql, params);
  }

  // Update last login
  static async updateLastLogin(id: string): Promise<void> {
    await query(
      'UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1',
      [id]
    );
  }

  // Delete user (soft delete via is_active = false, or hard delete)
  static async delete(id: string, companyId: string, hardDelete: boolean = false): Promise<boolean> {
    if (hardDelete) {
      const result = await query(
        'DELETE FROM users WHERE id = $1 AND company_id = $2',
        [id, companyId]
      );
      return result.length > 0;
    } else {
      const result = await query(
        'UPDATE users SET is_active = false WHERE id = $1 AND company_id = $2 RETURNING id',
        [id, companyId]
      );
      return result.length > 0;
    }
  }

  // Count users in company
  static async countByCompany(companyId: string): Promise<number> {
    const rows = await query(
      'SELECT COUNT(*) as count FROM users WHERE company_id = $1 AND is_active = true',
      [companyId]
    );
    return parseInt(rows[0].count);
  }
}

export { toSafeUser };
