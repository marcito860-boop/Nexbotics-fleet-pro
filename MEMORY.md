# Fleet Management System - Memory Log

## Project Overview
- **Owner:** Trevis Masai (masaitrevis)
- **Repository:** https://github.com/masaitrevis/fleet-system
- **API URL:** https://fleet-api-0272.onrender.com
- **Frontend URL:** https://fleet-pro-omega.vercel.app/
- **Status:** MVP deployed and operational
- **Date Deployed:** March 13, 2026

## Current System Features (Working)
- JWT Authentication (admin@fleet.local / admin123)
- Role-based access control (Admin, Manager, Viewer)
- Fleet inventory management
- Staff/Driver management with roles
- Route logging with fuel tracking
- Fuel records with auto-efficiency calculation
- Repairs & maintenance tracking
- Excel import from master data template
- Dashboard with charts (Pie, Bar)
- Reports export (Excel, CSV, PDF)
- Real-time updates via WebSocket

## Staff Roles Implemented
1. **Driver** - Drives vehicles, assigned to routes
2. **Transport Supervisor** - Oversees transport operations
3. **Departmental Supervisor** - Manages department fleet
4. **Head of Department** - HOD approval level
5. **Security Personnel** - Security staff

## User Roles Implemented
1. **Admin** - Full access to everything
2. **Manager** - Can add/edit fleet, staff, routes, fuel, repairs
3. **Viewer** - Read-only access to all data

## Security Personnel Future Features (To Be Added)
Trevis requested these upgrades for Security Personnel role:

### 1. Gate Log System
- Check in/out vehicles at security gate
- Log departure/arrival times
- Verify driver identity
- Validate route authorization

### 2. Vehicle Inspection Reports
- Pre-trip vehicle inspection forms
- Post-trip condition checks
- Damage/documentation of issues
- Fuel tank seal verification

### 3. Incident Tracking
- Log security incidents per vehicle
- Report accidents or breaches
- Document theft attempts
- Escalation workflow to supervisors

### 4. Access Control
- Approve which vehicles can leave premises
- Verify cargo/load security
- Check vehicle documentation

### Example Workflow for Security:
```
Staff: James Kamau
Role: Security Personnel  
Duty: Gate A - Morning Shift

Actions:
- Checks vehicle "KBC 123X" leaving at 6:00 AM
- Verifies driver John Doe has valid route assignment
- Logs departure in system
- Notes: "Vehicle condition good, fuel tank sealed"
```

## Planned Future Upgrades (When Trevis Returns)
1. User management page (create managers/viewers)
2. Additional user roles:
   - Fleet Manager (fleet only, no staff management)
   - Accountant (fuel costs and reports only)
   - Mechanic (repairs section only)
3. Security Personnel features (listed above)
4. Email notifications
5. Mobile app improvements
6. Custom reports
7. GPS tracker integration
8. Multi-language support

## Technical Stack
- **Backend:** Node.js + Express + TypeScript + SQLite
- **Frontend:** React + TypeScript + Tailwind CSS + Recharts
- **Real-time:** Socket.io
- **Auth:** JWT with bcrypt
- **Deployment:** Cloudflare Tunnel (temporary)

## Notes for Future Upgrades
- Trevis will test the system for a few days with admin account
- After testing approval, will request final touches
- System is stable and fully functional for testing
- All code is on GitHub for easy updates

## Admin Credentials
- **Email:** admin@fleet.local
- **Password:** admin123
- **Role:** Admin (full access)

## Contact
- Return to this project when ready for upgrades
- Reference this memory file for all planned features

---

# NextBotics Fleet Pro (New Project)

## Project Overview
- **Owner:** Trevis Masai
- **Location:** `/root/.openclaw/workspace/NextBotics_Fleet_Pro/`
- **Status:** Core system complete, ready for development
- **Date Created:** March 17, 2026

## Description
Multi-company SaaS fleet management backbone with complete data isolation.

## Features Implemented
- Multi-company SaaS architecture
- JWT Authentication with role-based access
- User roles: admin, manager, staff
- Auto-generated passwords for new users
- Mandatory password change on first login
- Company data isolation at database level
- Super admin cross-company access

## Technical Stack
- **Backend:** Node.js + Express + TypeScript + PostgreSQL
- **Frontend:** React + TypeScript + Tailwind CSS + Vite
- **State Management:** Zustand
- **Auth:** JWT with bcrypt
- **Forms:** React Hook Form + Zod

## Default Credentials
**Super Admin:**
- Email: `superadmin@nextbotics.com`
- Password: `SuperAdmin123!`

## Project Structure
```
NextBotics_Fleet_Pro/
├── backend/     # API server (port 3001)
└── frontend/    # React app (port 5173)
```

## Quick Start
```bash
# Backend
cd backend && npm install && npm run db:init && npm run dev

# Frontend
cd frontend && npm install && npm run dev
```

## API Endpoints
- `POST /api/auth/login` - Login
- `POST /api/auth/change-password` - Change password
- `GET /api/auth/me` - Current user
- `GET /api/users` - List users
- `POST /api/users` - Create user
- `GET /api/companies` - List companies
- `POST /api/companies` - Create company

## Notes
- Backend and frontend are fully connected
- Not deployed (local development only)
- Ready for extension with fleet-specific features
