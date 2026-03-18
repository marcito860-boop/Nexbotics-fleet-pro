// User types
export type UserRole = 'admin' | 'manager' | 'staff';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  mustChangePassword: boolean;
  type?: 'user' | 'super_admin';
  phone?: string;
  isActive?: boolean;
}

export interface Company {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  address?: string;
  phone?: string;
  email?: string;
  subscriptionPlan: string;
  subscriptionStatus: string;
  maxUsers: number;
  settings: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface AuthState {
  token: string | null;
  user: User | null;
  company: Company | null;
  isAuthenticated: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
  companySlug?: string;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

export interface CreateUserData {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: UserRole;
  companyId?: string;
}

export interface UpdateUserData {
  firstName?: string;
  lastName?: string;
  phone?: string;
  role?: UserRole;
  isActive?: boolean;
}

export interface CreateCompanyData {
  name: string;
  slug?: string;
  address?: string;
  phone?: string;
  email?: string;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export * from './fleet';

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}
