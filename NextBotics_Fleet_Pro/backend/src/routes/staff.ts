import { Router } from 'express';
import { query } from '../database';
import { v4 as uuidv4 } from 'uuid';
import { UserModel } from '../models/User';
import { generateSecurePassword, hashPassword } from '../utils/password';

const router = Router();

// Helper to map staff role to user role
function mapStaffRoleToUserRole(staffRole: string): 'admin' | 'manager' | 'staff' {
  const role = (staffRole || '').toLowerCase();
  if (role.includes('admin') || role.includes('director') || role.includes('ceo')) {
    return 'admin';
  }
  if (role.includes('manager') || role.includes('supervisor') || role.includes('head')) {
    return 'manager';
  }
  return 'staff';
}

// Helper to extract first and last name
function extractNames(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: '' };
  }
  return { 
    firstName: parts[0], 
    lastName: parts.slice(1).join(' ') 
  };
}

// Get all staff
router.get('/', async (req: any, res) => {
  try {
    const companyId = req.user?.companyId;
    let sql = 'SELECT * FROM staff';
    let params: any[] = [];
    
    // Filter by company if not super admin
    if (companyId && companyId !== 'super_admin') {
      sql += ' WHERE company_id = $1';
      params.push(companyId);
    }
    
    sql += ' ORDER BY created_at DESC';
    const result = await query(sql, params);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch staff' });
  }
});

// Get drivers only
router.get('/drivers', async (req: any, res) => {
  try {
    const companyId = req.user?.companyId;
    let sql = "SELECT * FROM staff WHERE (role = 'Driver' OR designation LIKE '%driver%')";
    let params: any[] = [];
    
    if (companyId && companyId !== 'super_admin') {
      sql += ' AND (company_id = $1 OR company_id IS NULL)';
      params.push(companyId);
    }
    
    sql += ' ORDER BY staff_name';
    const result = await query(sql, params);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch drivers' });
  }
});

// Create staff with auto user account creation
router.post('/', async (req: any, res) => {
  const { 
    staff_no, staff_name, email, phone, 
    designation, department, branch, role, comments,
    create_user_account = true // Default to creating user account
  } = req.body;
  
  const companyId = req.user?.companyId;
  
  try {
    const id = uuidv4();
    
    // Create staff record
    await query(`
      INSERT INTO staff (id, staff_no, staff_name, email, phone, designation, department, branch, role, comments, company_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `, [id, staff_no, staff_name, email, phone, designation, department, branch, role, comments, companyId]);
    
    let userAccount = null;
    
    // Auto-create user account if email provided and flag is set
    if (create_user_account && email && companyId && companyId !== 'super_admin') {
      try {
        // Check if user already exists
        const existingUser = await UserModel.findByEmail(email, companyId);
        
        if (!existingUser) {
          const { firstName, lastName } = extractNames(staff_name);
          const userRole = mapStaffRoleToUserRole(role);
          
          const { user, tempPassword } = await UserModel.create({
            email,
            firstName,
            lastName,
            phone,
            role: userRole,
            companyId
          });
          
          userAccount = {
            userId: user.id,
            email: user.email,
            role: user.role,
            tempPassword
          };
        } else {
          userAccount = {
            userId: existingUser.id,
            email: existingUser.email,
            role: existingUser.role,
            tempPassword: null,
            note: 'User account already existed'
          };
        }
      } catch (userError: any) {
        console.error('Auto-create user error:', userError);
        userAccount = { error: 'Failed to create user account: ' + userError.message };
      }
    }
    
    const result = await query('SELECT * FROM staff WHERE id = $1', [id]);
    
    res.status(201).json({
      staff: result[0],
      userAccount
    });
  } catch (error: any) {
    console.error('Create staff error:', error);
    res.status(500).json({ error: 'Failed to create staff', details: error.message });
  }
});

// Bulk import staff with auto user account creation
router.post('/bulk-import', async (req: any, res) => {
  const { staff_list, create_user_accounts = true } = req.body;
  
  if (!Array.isArray(staff_list) || staff_list.length === 0) {
    return res.status(400).json({ error: 'staff_list must be a non-empty array' });
  }
  
  const companyId = req.user?.companyId;
  if (!companyId || companyId === 'super_admin') {
    return res.status(400).json({ error: 'Company context required for bulk import' });
  }
  
  const results = {
    total: staff_list.length,
    staffCreated: 0,
    staffFailed: 0,
    usersCreated: 0,
    usersFailed: 0,
    skippedNoEmail: 0,
    details: [] as any[]
  };
  
  try {
    for (const staffData of staff_list) {
      const {
        staff_no, staff_name, email, phone,
        designation, department, branch, role, comments
      } = staffData;
      
      const detail: any = {
        staff_name,
        email,
        staffCreated: false,
        userCreated: false
      };
      
      try {
        // Check for duplicate staff_no or email
        if (email) {
          const existing = await query(
            'SELECT id FROM staff WHERE (email = $1 OR staff_no = $2) AND company_id = $3',
            [email, staff_no, companyId]
          );
          if (existing.length > 0) {
            detail.status = 'skipped';
            detail.reason = 'Staff with this email or staff number already exists';
            results.details.push(detail);
            continue;
          }
        }
        
        const staffId = uuidv4();
        await query(`
          INSERT INTO staff (id, staff_no, staff_name, email, phone, designation, department, branch, role, comments, company_id)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        `, [staffId, staff_no, staff_name, email, phone, designation, department, branch, role, comments, companyId]);
        
        results.staffCreated++;
        detail.staffCreated = true;
        detail.staffId = staffId;
        
        // Create user account if email provided
        if (create_user_accounts && email) {
          try {
            const existingUser = await UserModel.findByEmail(email, companyId);
            
            if (!existingUser) {
              const { firstName, lastName } = extractNames(staff_name);
              const userRole = mapStaffRoleToUserRole(role);
              
              const { user, tempPassword } = await UserModel.create({
                email,
                firstName,
                lastName,
                phone,
                role: userRole,
                companyId
              });
              
              results.usersCreated++;
              detail.userCreated = true;
              detail.userId = user.id;
              detail.tempPassword = tempPassword;
              detail.userRole = userRole;
            } else {
              detail.userNote = 'User account already existed';
            }
          } catch (userError: any) {
            results.usersFailed++;
            detail.userError = userError.message;
          }
        } else if (!email) {
          results.skippedNoEmail++;
          detail.userNote = 'No email provided - user account not created';
        }
        
        detail.status = 'success';
      } catch (error: any) {
        results.staffFailed++;
        detail.status = 'failed';
        detail.error = error.message;
      }
      
      results.details.push(detail);
    }
    
    res.json({
      success: true,
      summary: {
        total: results.total,
        staffCreated: results.staffCreated,
        staffFailed: results.staffFailed,
        usersCreated: results.usersCreated,
        usersFailed: results.usersFailed,
        skippedNoEmail: results.skippedNoEmail
      },
      details: results.details
    });
  } catch (error: any) {
    console.error('Bulk import error:', error);
    res.status(500).json({ error: 'Bulk import failed', details: error.message });
  }
});

// Update staff
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  
  try {
    // Build dynamic query with proper PostgreSQL parameters
    const allowedFields = ['staff_no', 'staff_name', 'email', 'phone', 'designation', 'department', 'branch', 'role', 'comments'];
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;
    
    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        fields.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }
    
    if (fields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }
    
    values.push(id);
    
    await query(`
      UPDATE staff SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramIndex}
    `, values);
    
    const result = await query('SELECT * FROM staff WHERE id = $1', [id]);
    res.json(result[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update staff' });
  }
});

// Delete staff (and optionally their user account)
router.delete('/:id', async (req: any, res) => {
  const { id } = req.params;
  const { delete_user_account = false } = req.query;
  const companyId = req.user?.companyId;
  
  try {
    // Get staff email before deleting
    const staffResult = await query('SELECT email FROM staff WHERE id = $1', [id]);
    const staffEmail = staffResult[0]?.email;
    
    // Delete staff
    await query('DELETE FROM staff WHERE id = $1', [id]);
    
    // Optionally delete associated user account
    if (delete_user_account && staffEmail && companyId) {
      try {
        const user = await UserModel.findByEmail(staffEmail, companyId);
        if (user) {
          await UserModel.delete(user.id, companyId, true);
        }
      } catch (userError) {
        console.error('Error deleting user account:', userError);
      }
    }
    
    res.json({ 
      message: 'Staff deleted',
      userAccountDeleted: delete_user_account && staffEmail
    });
  } catch (error: any) {
    console.error('Delete staff error:', error);
    res.status(500).json({ error: 'Failed to delete staff', details: error.message });
  }
});

export default router;
