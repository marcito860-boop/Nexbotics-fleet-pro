# NextBotics Fleet Pro

A multi-company SaaS fleet management system with role-based access control.

## Features

- **Multi-company SaaS**: Complete data isolation between companies
- **Role-based Access Control**: Admin, Manager, and Staff roles
- **Secure Authentication**: JWT-based auth with password change on first login
- **Auto-generated Passwords**: New users get secure temporary passwords
- **Company Data Isolation**: Users can only access data within their company

## Project Structure

```
NextBotics_Fleet_Pro/
├── backend/           # Node.js + Express + TypeScript API
│   ├── src/
│   │   ├── database/  # Database configuration and schema
│   │   ├── models/    # Data models (User, Company, SuperAdmin)
│   │   ├── routes/    # API routes (auth, users, companies)
│   │   ├── types/     # TypeScript type definitions
│   │   ├── utils/     # Utilities (auth, password)
│   │   └── index.ts   # Main server entry
│   └── package.json
├── frontend/          # React + TypeScript + Tailwind CSS
│   ├── src/
│   │   ├── pages/     # Login, ChangePassword, Dashboard
│   │   ├── services/  # API service
│   │   ├── store/     # Zustand auth store
│   │   └── types/     # TypeScript types
│   └── package.json
└── README.md
```

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 14+

### Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your database credentials

# Initialize database
npm run db:init

# Run development server
npm run dev
```

The backend will run on http://localhost:3001

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env

# Run development server
npm run dev
```

The frontend will run on http://localhost:5173

## Default Credentials

### Super Admin
- Email: `superadmin@nextbotics.com`
- Password: (set during database initialization)

### Creating Companies and Users

1. Login as Super Admin
2. Create a company via `/api/companies` (POST)
3. Create users for that company via `/api/users` (POST)
4. New users receive auto-generated temporary passwords
5. Users must change password on first login

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login with email/password
- `POST /api/auth/change-password` - Change password
- `GET /api/auth/me` - Get current user info
- `POST /api/auth/refresh` - Refresh JWT token

### Users (requires auth)
- `GET /api/users` - List users (admin/manager only)
- `GET /api/users/:id` - Get user details
- `POST /api/users` - Create new user (admin/manager only)
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Deactivate/delete user (admin only)
- `POST /api/users/:id/reset-password` - Reset user password

### Companies (requires auth)
- `GET /api/companies` - List companies (super admin) or current company
- `GET /api/companies/:id` - Get company details
- `POST /api/companies` - Create company (super admin only)
- `PUT /api/companies/:id` - Update company
- `PUT /api/companies/:id/subscription` - Update subscription (super admin only)
- `DELETE /api/companies/:id` - Delete company (super admin only)

## Security Features

- Passwords hashed with bcrypt
- JWT tokens with expiration
- Company data isolation via database context
- Role-based access control on all endpoints
- Password change required on first login
- Secure auto-generated passwords for new users
- Rate limiting support (ready for implementation)

## License

MIT
