import { query } from '../database';
import { hashPassword, verifyPassword } from '../utils/password';

export interface SuperAdmin {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
}

export class SuperAdminModel {
  static async findByEmail(email: string): Promise<SuperAdmin | null> {
    const rows = await query(
      'SELECT * FROM super_admins WHERE email = $1 AND is_active = true',
      [email.toLowerCase()]
    );
    
    if (rows.length === 0) return null;
    
    const row = rows[0];
    return {
      id: row.id,
      email: row.email,
      firstName: row.first_name,
      lastName: row.last_name,
      isActive: row.is_active,
      lastLoginAt: row.last_login_at ? new Date(row.last_login_at) : undefined,
      createdAt: new Date(row.created_at),
    };
  }

  static async verifyCredentials(email: string, password: string): Promise<SuperAdmin | null> {
    const rows = await query(
      'SELECT * FROM super_admins WHERE email = $1 AND is_active = true',
      [email.toLowerCase()]
    );
    
    if (rows.length === 0) return null;
    
    const valid = await verifyPassword(password, rows[0].password_hash);
    if (!valid) return null;
    
    const row = rows[0];
    return {
      id: row.id,
      email: row.email,
      firstName: row.first_name,
      lastName: row.last_name,
      isActive: row.is_active,
      lastLoginAt: row.last_login_at ? new Date(row.last_login_at) : undefined,
      createdAt: new Date(row.created_at),
    };
  }

  static async updateLastLogin(id: string): Promise<void> {
    await query(
      'UPDATE super_admins SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1',
      [id]
    );
  }

  static async changePassword(id: string, newPassword: string): Promise<void> {
    const passwordHash = await hashPassword(newPassword);
    await query(
      'UPDATE super_admins SET password_hash = $1 WHERE id = $2',
      [passwordHash, id]
    );
  }

  static async create(
    email: string, 
    password: string, 
    firstName: string, 
    lastName: string
  ): Promise<SuperAdmin> {
    const passwordHash = await hashPassword(password);
    
    const rows = await query(
      `INSERT INTO super_admins (email, password_hash, first_name, last_name)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [email.toLowerCase(), passwordHash, firstName, lastName]
    );
    
    const row = rows[0];
    return {
      id: row.id,
      email: row.email,
      firstName: row.first_name,
      lastName: row.last_name,
      isActive: row.is_active,
      lastLoginAt: row.last_login_at ? new Date(row.last_login_at) : undefined,
      createdAt: new Date(row.created_at),
    };
  }
}
