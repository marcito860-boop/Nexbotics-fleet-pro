import axios, { AxiosInstance, AxiosError } from 'axios';
import { ApiResponse, LoginCredentials, ChangePasswordData, User, Company, CreateUserData, UpdateUserData, CreateCompanyData, PaginatedResponse } from '../types';
import {
  Vehicle, Driver, Assignment, Alert, Trip, FuelCard, FuelTransaction,
  Requisition, Course, QuizAttempt, Certificate, AuditTemplate, AuditSession,
  Risk, InventoryItem, InventoryCategory, Invoice, DashboardAnalytics,
  FleetUtilization, Document, Supplier, SupplierContract, PlannedRoute,
  StockAlert,
  ServiceProvider, SparePart, MaintenanceSchedule, MaintenanceRecord, 
  VehicleDowntime, MaintenanceReminder
} from '../types/fleet';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: `${API_BASE_URL}/api`,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add auth token to requests
    this.client.interceptors.request.use((config) => {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Handle token expiration
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError<ApiResponse>) => {
        if (error.response?.status === 401) {
          // Don't redirect if this is the login request itself or already on login page
          const isLoginRequest = error.config?.url?.includes('/auth/login');
          const isOnLoginPage = window.location.pathname === '/login';

          if (!isLoginRequest && !isOnLoginPage) {
            localStorage.removeItem('token');
            window.location.href = '/login';
          }
        }
        return Promise.reject(error);
      }
    );
  }

  // Auth
  async login(credentials: LoginCredentials): Promise<ApiResponse<{ token: string; user: User; company?: Company }>> {
    const response = await this.client.post('/auth/login', credentials);
    if (response.data.success && response.data.data?.token) {
      localStorage.setItem('token', response.data.data.token);
    }
    return response.data;
  }

  async changePassword(data: ChangePasswordData): Promise<ApiResponse> {
    const response = await this.client.post('/auth/change-password', data);
    return response.data;
  }

  async getMe(): Promise<ApiResponse<{ user: User; company?: Company; type: 'user' | 'super_admin' }>> {
    const response = await this.client.get('/auth/me');
    return response.data;
  }

  async refreshToken(): Promise<ApiResponse<{ token: string }>> {
    const response = await this.client.post('/auth/refresh');
    if (response.data.success && response.data.data?.token) {
      localStorage.setItem('token', response.data.data.token);
    }
    return response.data;
  }

  logout(): void {
    localStorage.removeItem('token');
  }

  // Users
  async getUsers(params?: { page?: number; perPage?: number; role?: string; isActive?: boolean }): Promise<ApiResponse<PaginatedResponse<User>>> {
    const response = await this.client.get('/users', { params });
    return response.data;
  }

  async getUser(id: string): Promise<ApiResponse<User>> {
    const response = await this.client.get(`/users/${id}`);
    return response.data;
  }

  async createUser(data: CreateUserData): Promise<ApiResponse<{ user: User; tempPassword: string }>> {
    const response = await this.client.post('/users', data);
    return response.data;
  }

  async updateUser(id: string, data: UpdateUserData): Promise<ApiResponse<User>> {
    const response = await this.client.put(`/users/${id}`, data);
    return response.data;
  }

  async deleteUser(id: string, hard?: boolean): Promise<ApiResponse> {
    const response = await this.client.delete(`/users/${id}`, { params: { hard } });
    return response.data;
  }

  async resetPassword(id: string): Promise<ApiResponse<{ tempPassword: string }>> {
    const response = await this.client.post(`/users/${id}/reset-password`);
    return response.data;
  }

  // Companies
  async getCompanies(params?: { page?: number; perPage?: number }): Promise<ApiResponse<PaginatedResponse<Company>>> {
    const response = await this.client.get('/companies', { params });
    return response.data;
  }

  async getCompany(id: string): Promise<ApiResponse<Company>> {
    const response = await this.client.get(`/companies/${id}`);
    return response.data;
  }

  async createCompany(data: CreateCompanyData): Promise<ApiResponse<Company>> {
    const response = await this.client.post('/companies', data);
    return response.data;
  }

  async updateCompany(id: string, data: Partial<CreateCompanyData>): Promise<ApiResponse<Company>> {
    const response = await this.client.put(`/companies/${id}`, data);
    return response.data;
  }

  async updateSubscription(id: string, plan: string, status: string): Promise<ApiResponse<Company>> {
    const response = await this.client.put(`/companies/${id}/subscription`, { plan, status });
    return response.data;
  }

  async deleteCompany(id: string): Promise<ApiResponse> {
    const response = await this.client.delete(`/companies/${id}`);
    return response.data;
  }

  // ==================== FLEET API ====================

  // Vehicles
  async getVehicles(params?: { status?: string; type?: string; search?: string; limit?: number; offset?: number }): Promise<ApiResponse<{ items: Vehicle[]; total: number; page?: number; perPage?: number }>> {
    const response = await this.client.get('/fleet/vehicles', { params });
    return response.data;
  }

  async getVehicle(id: string): Promise<ApiResponse<Vehicle>> {
    const response = await this.client.get(`/fleet/vehicles/${id}`);
    return response.data;
  }

  async createVehicle(data: Partial<Vehicle>): Promise<ApiResponse<Vehicle>> {
    const response = await this.client.post('/fleet/vehicles', data);
    return response.data;
  }

  async updateVehicle(id: string, data: Partial<Vehicle>): Promise<ApiResponse<Vehicle>> {
    const response = await this.client.put(`/fleet/vehicles/${id}`, data);
    return response.data;
  }

  async deleteVehicle(id: string): Promise<ApiResponse> {
    const response = await this.client.delete(`/fleet/vehicles/${id}`);
    return response.data;
  }

  async getVehicleStats(): Promise<ApiResponse<{ total: number; available: number; assigned: number; maintenance: number }>> {
    const response = await this.client.get('/fleet/vehicles/stats/overview');
    return response.data;
  }

  // Drivers
  async getDrivers(params?: { status?: string; search?: string; limit?: number; offset?: number }): Promise<ApiResponse<{ items: Driver[]; total: number; page?: number; perPage?: number }>> {
    const response = await this.client.get('/fleet/drivers', { params });
    return response.data;
  }

  async getDriver(id: string): Promise<ApiResponse<Driver>> {
    const response = await this.client.get(`/fleet/drivers/${id}`);
    return response.data;
  }

  async createDriver(data: Partial<Driver>): Promise<ApiResponse<Driver>> {
    const response = await this.client.post('/fleet/drivers', data);
    return response.data;
  }

  async updateDriver(id: string, data: Partial<Driver>): Promise<ApiResponse<Driver>> {
    const response = await this.client.put(`/fleet/drivers/${id}`, data);
    return response.data;
  }

  async deleteDriver(id: string): Promise<ApiResponse> {
    const response = await this.client.delete(`/fleet/drivers/${id}`);
    return response.data;
  }

  async getDriverStats(): Promise<ApiResponse<{ total: number; active: number; available: number; onLeave: number; suspended: number }>> {
    const response = await this.client.get('/fleet/drivers/stats/overview');
    return response.data;
  }

  // Assignments
  async getAssignments(params?: { status?: string; vehicleId?: string; driverId?: string }): Promise<ApiResponse<{ assignments: Assignment[]; total: number }>> {
    const response = await this.client.get('/fleet/assignments', { params });
    return response.data;
  }

  async createAssignment(data: { vehicleId: string; driverId: string; purpose?: string; expectedReturnAt?: string }): Promise<ApiResponse<Assignment>> {
    const response = await this.client.post('/fleet/assignments', data);
    return response.data;
  }

  async completeAssignment(id: string): Promise<ApiResponse<Assignment>> {
    const response = await this.client.post(`/fleet/assignments/${id}/complete`);
    return response.data;
  }

  async cancelAssignment(id: string, reason?: string): Promise<ApiResponse<Assignment>> {
    const response = await this.client.post(`/fleet/assignments/${id}/cancel`, { reason });
    return response.data;
  }

  // Alerts
  async getAlerts(params?: { status?: string; severity?: string; type?: string; limit?: number }): Promise<ApiResponse<{ items: Alert[]; total: number; unreadCount?: number }>> {
    const response = await this.client.get('/fleet/alerts', { params });
    return response.data;
  }

  async getUnreadAlertsCount(): Promise<ApiResponse<{ count: number }>> {
    const response = await this.client.get('/fleet/alerts/stats/unread-count');
    return response.data;
  }

  async markAlertRead(id: string): Promise<ApiResponse<Alert>> {
    const response = await this.client.post(`/fleet/alerts/${id}/read`);
    return response.data;
  }

  async dismissAlert(id: string): Promise<ApiResponse<Alert>> {
    const response = await this.client.post(`/fleet/alerts/${id}/dismiss`);
    return response.data;
  }

  async generateAlerts(): Promise<ApiResponse<{ generated: number }>> {
    const response = await this.client.post('/fleet/alerts/generate');
    return response.data;
  }

  // Trips
  async getTrips(params?: { status?: string; vehicleId?: string; driverId?: string; dateFrom?: string; dateTo?: string }): Promise<ApiResponse<{ items: Trip[]; total: number; pagination?: { page: number; perPage: number; totalPages: number } }>> {
    const response = await this.client.get('/fleet/trips', { params });
    return response.data;
  }

  async getTrip(id: string): Promise<ApiResponse<Trip>> {
    const response = await this.client.get(`/fleet/trips/${id}`);
    return response.data;
  }

  async createTrip(data: Partial<Trip>): Promise<ApiResponse<Trip>> {
    const response = await this.client.post('/fleet/trips', data);
    return response.data;
  }

  async completeTrip(id: string, data: { endOdometer: number; endLocation?: string }): Promise<ApiResponse<Trip>> {
    const response = await this.client.post(`/fleet/trips/${id}/complete`, data);
    return response.data;
  }

  async getTripStats(period?: string): Promise<ApiResponse<any>> {
    const response = await this.client.get('/fleet/trips/stats/summary', { params: { period } });
    return response.data;
  }

  // Fuel
  async getFuelCards(): Promise<ApiResponse<{ cards: FuelCard[]; total: number }>> {
    const response = await this.client.get('/fleet/fuel/cards');
    return response.data;
  }

  async createFuelCard(data: Partial<FuelCard>): Promise<ApiResponse<FuelCard>> {
    const response = await this.client.post('/fleet/fuel/cards', data);
    return response.data;
  }

  async getFuelTransactions(params?: { vehicleId?: string; driverId?: string; dateFrom?: string; dateTo?: string }): Promise<ApiResponse<{ transactions: FuelTransaction[]; total: number }>> {
    const response = await this.client.get('/fleet/fuel/transactions', { params });
    return response.data;
  }

  async createFuelTransaction(data: Partial<FuelTransaction>): Promise<ApiResponse<FuelTransaction>> {
    const response = await this.client.post('/fleet/fuel/transactions', data);
    return response.data;
  }

  async getFuelStats(dateFrom?: string, dateTo?: string): Promise<ApiResponse<any>> {
    const response = await this.client.get('/fleet/fuel/stats', { params: { dateFrom, dateTo } });
    return response.data;
  }

  // Requisitions
  async getRequisitions(params?: { status?: string; myRequests?: boolean }): Promise<ApiResponse<{ items: Requisition[]; total: number; page?: number; perPage?: number }>> {
    const response = await this.client.get('/fleet/requisitions', { params });
    return response.data;
  }

  async getRequisition(id: string): Promise<ApiResponse<Requisition>> {
    const response = await this.client.get(`/fleet/requisitions/${id}`);
    return response.data;
  }

  async createRequisition(data: Partial<Requisition>): Promise<ApiResponse<Requisition>> {
    const response = await this.client.post('/fleet/requisitions', data);
    return response.data;
  }

  async approveRequisition(id: string, notes?: string): Promise<ApiResponse<Requisition>> {
    const response = await this.client.post(`/fleet/requisitions/${id}/approve`, { notes });
    return response.data;
  }

  async rejectRequisition(id: string, reason: string): Promise<ApiResponse<Requisition>> {
    const response = await this.client.post(`/fleet/requisitions/${id}/reject`, { reason });
    return response.data;
  }

  async allocateRequisition(id: string, vehicleId: string, driverId: string): Promise<ApiResponse<Requisition>> {
    const response = await this.client.post(`/fleet/requisitions/${id}/allocate`, { vehicleId, driverId });
    return response.data;
  }

  async startRequisition(id: string, startingOdometer?: number): Promise<ApiResponse<Requisition>> {
    const response = await this.client.post(`/fleet/requisitions/${id}/start`, { startingOdometer });
    return response.data;
  }

  async completeRequisition(id: string, endingOdometer?: number, notes?: string): Promise<ApiResponse<Requisition>> {
    const response = await this.client.post(`/fleet/requisitions/${id}/complete`, { endingOdometer, notes });
    return response.data;
  }

  async cancelRequisition(id: string, reason: string): Promise<ApiResponse<Requisition>> {
    const response = await this.client.post(`/fleet/requisitions/${id}/cancel`, { reason });
    return response.data;
  }

  // Training
  async getCourses(): Promise<ApiResponse<{ courses: Course[]; total: number }>> {
    const response = await this.client.get('/fleet/training/courses');
    return response.data;
  }

  async getCourse(id: string): Promise<ApiResponse<Course>> {
    const response = await this.client.get(`/fleet/training/courses/${id}`);
    return response.data;
  }

  async getMyEnrollments(): Promise<ApiResponse<{ attempts: QuizAttempt[] }>> {
    const response = await this.client.get('/fleet/training/my-enrollments');
    return response.data;
  }

  async startQuiz(courseId: string): Promise<ApiResponse<QuizAttempt>> {
    const response = await this.client.post('/fleet/training/attempts', { courseId });
    return response.data;
  }

  async submitAnswer(attemptId: string, questionId: string, answer: string): Promise<ApiResponse<any>> {
    const response = await this.client.post(`/fleet/training/attempts/${attemptId}/submit`, { questionId, answer });
    return response.data;
  }

  async completeQuiz(attemptId: string): Promise<ApiResponse<QuizAttempt>> {
    const response = await this.client.post(`/fleet/training/attempts/${attemptId}/complete`);
    return response.data;
  }

  async getMyCertificates(): Promise<ApiResponse<{ certificates: Certificate[] }>> {
    const response = await this.client.get('/fleet/training/my-certificates');
    return response.data;
  }

  async getMyProgress(): Promise<ApiResponse<any>> {
    const response = await this.client.get('/fleet/training/my-progress');
    return response.data;
  }

  // Audits
  async getAuditTemplates(): Promise<ApiResponse<{ templates: AuditTemplate[]; total: number }>> {
    const response = await this.client.get('/fleet/audits/templates');
    return response.data;
  }

  async getAuditTemplate(id: string): Promise<ApiResponse<AuditTemplate>> {
    const response = await this.client.get(`/fleet/audits/templates/${id}`);
    return response.data;
  }

  async getAuditSessions(params?: { status?: string }): Promise<ApiResponse<{ sessions: AuditSession[]; total: number }>> {
    const response = await this.client.get('/fleet/audits/sessions', { params });
    return response.data;
  }

  async getAuditSession(id: string): Promise<ApiResponse<AuditSession>> {
    const response = await this.client.get(`/fleet/audits/sessions/${id}`);
    return response.data;
  }

  async createAuditSession(data: Partial<AuditSession>): Promise<ApiResponse<AuditSession>> {
    const response = await this.client.post('/fleet/audits/sessions', data);
    return response.data;
  }

  async submitAuditResponse(sessionId: string, data: { questionId: string; score: number; notes?: string }): Promise<ApiResponse<any>> {
    const response = await this.client.post(`/fleet/audits/sessions/${sessionId}/responses`, data);
    return response.data;
  }

  async completeAuditSession(id: string): Promise<ApiResponse<AuditSession>> {
    const response = await this.client.post(`/fleet/audits/sessions/${id}/complete`);
    return response.data;
  }

  async getAuditStats(): Promise<ApiResponse<any>> {
    const response = await this.client.get('/fleet/audits/stats/summary');
    return response.data;
  }

  // Risks
  async getRisks(params?: { status?: string; level?: string }): Promise<ApiResponse<{ risks: Risk[]; total: number }>> {
    const response = await this.client.get('/fleet/risks', { params });
    return response.data;
  }

  async getRisk(id: string): Promise<ApiResponse<Risk>> {
    const response = await this.client.get(`/fleet/risks/${id}`);
    return response.data;
  }

  async createRisk(data: Partial<Risk>): Promise<ApiResponse<Risk>> {
    const response = await this.client.post('/fleet/risks', data);
    return response.data;
  }

  async updateRisk(id: string, data: Partial<Risk>): Promise<ApiResponse<Risk>> {
    const response = await this.client.put(`/fleet/risks/${id}`, data);
    return response.data;
  }

  async getRiskHeatmap(): Promise<ApiResponse<any>> {
    const response = await this.client.get('/fleet/risks/heatmap');
    return response.data;
  }

  // Inventory
  async getInventoryCategories(): Promise<ApiResponse<{ categories: InventoryCategory[]; total: number }>> {
    const response = await this.client.get('/fleet/inventory/categories');
    return response.data;
  }

  async getInventoryItems(params?: { categoryId?: string; lowStockOnly?: boolean }): Promise<ApiResponse<{ items: InventoryItem[]; total: number }>> {
    const response = await this.client.get('/fleet/inventory/items', { params });
    return response.data;
  }

  async getInventoryItem(id: string): Promise<ApiResponse<InventoryItem>> {
    const response = await this.client.get(`/fleet/inventory/items/${id}`);
    return response.data;
  }

  async createInventoryItem(data: Partial<InventoryItem>): Promise<ApiResponse<InventoryItem>> {
    const response = await this.client.post('/fleet/inventory/items', data);
    return response.data;
  }

  async adjustStock(id: string, quantity: number, reason: string): Promise<ApiResponse<InventoryItem>> {
    const response = await this.client.post(`/fleet/inventory/items/${id}/adjust`, { quantity, reason });
    return response.data;
  }

  async getStockAlerts(): Promise<ApiResponse<{ items: StockAlert[]; total: number }>> {
    const response = await this.client.get('/fleet/inventory/alerts');
    return response.data;
  }

  async getInventoryStats(): Promise<ApiResponse<any>> {
    const response = await this.client.get('/fleet/inventory/stats');
    return response.data;
  }

  // Invoices
  async getInvoices(params?: { status?: string }): Promise<ApiResponse<{ items: Invoice[]; total: number; pagination?: { page: number; perPage: number; totalPages: number } }>> {
    const response = await this.client.get('/fleet/invoices', { params });
    return response.data;
  }

  async getInvoice(id: string): Promise<ApiResponse<Invoice>> {
    const response = await this.client.get(`/fleet/invoices/${id}`);
    return response.data;
  }

  async createInvoice(data: Partial<Invoice>): Promise<ApiResponse<Invoice>> {
    const response = await this.client.post('/fleet/invoices', data);
    return response.data;
  }

  async approveInvoice(id: string): Promise<ApiResponse<Invoice>> {
    const response = await this.client.post(`/fleet/invoices/${id}/approve`);
    return response.data;
  }

  async markInvoicePaid(id: string, paymentMethod: string, paymentReference?: string): Promise<ApiResponse<Invoice>> {
    const response = await this.client.post(`/fleet/invoices/${id}/pay`, { paymentMethod, paymentReference });
    return response.data;
  }

  async getInvoiceStats(): Promise<ApiResponse<any>> {
    const response = await this.client.get('/fleet/invoices/stats');
    return response.data;
  }

  // Analytics
  async getDashboardAnalytics(period?: string): Promise<ApiResponse<DashboardAnalytics>> {
    const response = await this.client.get('/fleet/analytics/dashboard', { params: { period } });
    return response.data;
  }

  async getFleetUtilization(): Promise<ApiResponse<FleetUtilization>> {
    const response = await this.client.get('/fleet/analytics/utilization');
    return response.data;
  }

  async getAuditPerformance(): Promise<ApiResponse<any>> {
    const response = await this.client.get('/fleet/analytics/audit-performance');
    return response.data;
  }

  async getFuelConsumption(): Promise<ApiResponse<any>> {
    const response = await this.client.get('/fleet/analytics/fuel-consumption');
    return response.data;
  }

  async getPersonalPerformance(): Promise<ApiResponse<any>> {
    const response = await this.client.get('/fleet/analytics/personal-performance');
    return response.data;
  }

  // Documents
  async getDocuments(params?: { entityType?: string; entityId?: string; status?: string }): Promise<ApiResponse<{ documents: Document[]; total: number }>> {
    const response = await this.client.get('/fleet/documents', { params });
    return response.data;
  }

  async getExpiringDocuments(days?: number): Promise<ApiResponse<{ documents: Document[]; total: number }>> {
    const response = await this.client.get('/fleet/documents/expiring', { params: { days } });
    return response.data;
  }

  async createDocument(data: Partial<Document>): Promise<ApiResponse<Document>> {
    const response = await this.client.post('/fleet/documents', data);
    return response.data;
  }

  // Suppliers
  async getSuppliers(): Promise<ApiResponse<{ suppliers: Supplier[]; total: number }>> {
    const response = await this.client.get('/fleet/suppliers');
    return response.data;
  }

  async getSupplier(id: string): Promise<ApiResponse<Supplier>> {
    const response = await this.client.get(`/fleet/suppliers/${id}`);
    return response.data;
  }

  async createSupplier(data: Partial<Supplier>): Promise<ApiResponse<Supplier>> {
    const response = await this.client.post('/fleet/suppliers', data);
    return response.data;
  }

  async getSupplierContracts(params?: { status?: string }): Promise<ApiResponse<{ contracts: SupplierContract[]; total: number }>> {
    const response = await this.client.get('/fleet/suppliers/contracts', { params });
    return response.data;
  }

  async getExpiringContracts(days?: number): Promise<ApiResponse<{ contracts: SupplierContract[]; total: number }>> {
    const response = await this.client.get('/fleet/suppliers/contracts/expiring', { params: { days } });
    return response.data;
  }

  // Route Planning
  async getPlannedRoutes(params?: { status?: string }): Promise<ApiResponse<{ routes: PlannedRoute[]; total: number }>> {
    const response = await this.client.get('/fleet/routes', { params });
    return response.data;
  }

  async createPlannedRoute(data: Partial<PlannedRoute>): Promise<ApiResponse<PlannedRoute>> {
    const response = await this.client.post('/fleet/routes', data);
    return response.data;
  }

  async getActiveRoutes(): Promise<ApiResponse<{ routes: PlannedRoute[]; total: number }>> {
    const response = await this.client.get('/fleet/routes/active');
    return response.data;
  }

  async getRouteAnalytics(dateFrom?: string, dateTo?: string): Promise<ApiResponse<any>> {
    const response = await this.client.get('/fleet/routes/analytics', { params: { dateFrom, dateTo } });
    return response.data;
  }

  // ==================== MAINTENANCE API ====================

  // Maintenance Overview
  async getMaintenanceOverview(): Promise<ApiResponse<any>> {
    const response = await this.client.get('/fleet/maintenance/overview');
    return response.data;
  }

  // Service Providers
  async getServiceProviders(params?: { page?: number; perPage?: number; type?: string; search?: string }): Promise<ApiResponse<{ items: ServiceProvider[]; total: number; page?: number; perPage?: number; totalPages?: number }>> {
    const response = await this.client.get('/fleet/maintenance/providers', { params });
    return response.data;
  }

  async getServiceProvider(id: string): Promise<ApiResponse<ServiceProvider>> {
    const response = await this.client.get(`/fleet/maintenance/providers/${id}`);
    return response.data;
  }

  async createServiceProvider(data: Partial<ServiceProvider>): Promise<ApiResponse<ServiceProvider>> {
    const response = await this.client.post('/fleet/maintenance/providers', data);
    return response.data;
  }

  async updateServiceProvider(id: string, data: Partial<ServiceProvider>): Promise<ApiResponse<ServiceProvider>> {
    const response = await this.client.put(`/fleet/maintenance/providers/${id}`, data);
    return response.data;
  }

  async deleteServiceProvider(id: string): Promise<ApiResponse> {
    const response = await this.client.delete(`/fleet/maintenance/providers/${id}`);
    return response.data;
  }

  // Spare Parts
  async getSpareParts(params?: { page?: number; perPage?: number; category?: string; lowStockOnly?: boolean; search?: string }): Promise<ApiResponse<{ items: SparePart[]; total: number; page?: number; perPage?: number; totalPages?: number }>> {
    const response = await this.client.get('/fleet/maintenance/parts', { params });
    return response.data;
  }

  async getLowStockParts(): Promise<ApiResponse<{ items: SparePart[]; total: number }>> {
    const response = await this.client.get('/fleet/maintenance/parts/low-stock');
    return response.data;
  }

  async createSparePart(data: Partial<SparePart>): Promise<ApiResponse<SparePart>> {
    const response = await this.client.post('/fleet/maintenance/parts', data);
    return response.data;
  }

  async updateSparePart(id: string, data: Partial<SparePart>): Promise<ApiResponse<SparePart>> {
    const response = await this.client.put(`/fleet/maintenance/parts/${id}`, data);
    return response.data;
  }

  async adjustPartStock(id: string, quantity: number, reason?: string): Promise<ApiResponse<SparePart>> {
    const response = await this.client.post(`/fleet/maintenance/parts/${id}/adjust-stock`, { quantity, reason });
    return response.data;
  }

  async deleteSparePart(id: string): Promise<ApiResponse> {
    const response = await this.client.delete(`/fleet/maintenance/parts/${id}`);
    return response.data;
  }

  // Maintenance Schedules
  async getMaintenanceSchedules(params?: { page?: number; perPage?: number; vehicleId?: string; status?: string; upcoming?: boolean; overdue?: boolean }): Promise<ApiResponse<{ items: MaintenanceSchedule[]; total: number; page?: number; perPage?: number; totalPages?: number }>> {
    const response = await this.client.get('/fleet/maintenance/schedules', { params });
    return response.data;
  }

  async getMaintenanceScheduleStats(): Promise<ApiResponse<{ total: number; active: number; overdue: number; dueSoon: number }>> {
    const response = await this.client.get('/fleet/maintenance/schedules/stats');
    return response.data;
  }

  async getMaintenanceSchedule(id: string): Promise<ApiResponse<MaintenanceSchedule>> {
    const response = await this.client.get(`/fleet/maintenance/schedules/${id}`);
    return response.data;
  }

  async createMaintenanceSchedule(data: Partial<MaintenanceSchedule>): Promise<ApiResponse<MaintenanceSchedule>> {
    const response = await this.client.post('/fleet/maintenance/schedules', data);
    return response.data;
  }

  async updateMaintenanceSchedule(id: string, data: Partial<MaintenanceSchedule>): Promise<ApiResponse<MaintenanceSchedule>> {
    const response = await this.client.put(`/fleet/maintenance/schedules/${id}`, data);
    return response.data;
  }

  async deleteMaintenanceSchedule(id: string): Promise<ApiResponse> {
    const response = await this.client.delete(`/fleet/maintenance/schedules/${id}`);
    return response.data;
  }

  // Maintenance Records
  async getMaintenanceRecords(params?: { page?: number; perPage?: number; vehicleId?: string; status?: string; serviceType?: string; category?: string }): Promise<ApiResponse<{ items: MaintenanceRecord[]; total: number; page?: number; perPage?: number; totalPages?: number }>> {
    const response = await this.client.get('/fleet/maintenance/records', { params });
    return response.data;
  }

  async getMaintenanceRecordStats(dateFrom?: string, dateTo?: string): Promise<ApiResponse<any>> {
    const response = await this.client.get('/fleet/maintenance/records/stats', { params: { dateFrom, dateTo } });
    return response.data;
  }

  async getMaintenanceRecord(id: string): Promise<ApiResponse<MaintenanceRecord>> {
    const response = await this.client.get(`/fleet/maintenance/records/${id}`);
    return response.data;
  }

  async createMaintenanceRecord(data: Partial<MaintenanceRecord>): Promise<ApiResponse<MaintenanceRecord>> {
    const response = await this.client.post('/fleet/maintenance/records', data);
    return response.data;
  }

  async updateMaintenanceRecord(id: string, data: Partial<MaintenanceRecord>): Promise<ApiResponse<MaintenanceRecord>> {
    const response = await this.client.put(`/fleet/maintenance/records/${id}`, data);
    return response.data;
  }

  async deleteMaintenanceRecord(id: string): Promise<ApiResponse> {
    const response = await this.client.delete(`/fleet/maintenance/records/${id}`);
    return response.data;
  }

  // Vehicle Downtime
  async getVehicleDowntime(params?: { page?: number; perPage?: number; vehicleId?: string; active?: boolean }): Promise<ApiResponse<{ items: VehicleDowntime[]; total: number; page?: number; perPage?: number; totalPages?: number }>> {
    const response = await this.client.get('/fleet/maintenance/downtime', { params });
    return response.data;
  }

  async getDowntimeStats(): Promise<ApiResponse<any>> {
    const response = await this.client.get('/fleet/maintenance/downtime/stats');
    return response.data;
  }

  async createDowntimeRecord(data: Partial<VehicleDowntime>): Promise<ApiResponse<VehicleDowntime>> {
    const response = await this.client.post('/fleet/maintenance/downtime', data);
    return response.data;
  }

  async endDowntime(id: string, endDate: string, endTime?: string, durationHours?: number): Promise<ApiResponse<VehicleDowntime>> {
    const response = await this.client.post(`/fleet/maintenance/downtime/${id}/end`, { endDate, endTime, durationHours });
    return response.data;
  }

  // Maintenance Reminders
  async getMaintenanceReminders(params?: { page?: number; perPage?: number; status?: string; severity?: string; vehicleId?: string }): Promise<ApiResponse<{ items: MaintenanceReminder[]; total: number; page?: number; perPage?: number; totalPages?: number }>> {
    const response = await this.client.get('/fleet/maintenance/reminders', { params });
    return response.data;
  }

  async getMaintenanceReminderStats(): Promise<ApiResponse<{ total: number; pending: number; acknowledged: number; critical: number; warning: number }>> {
    const response = await this.client.get('/fleet/maintenance/reminders/stats');
    return response.data;
  }

  async generateMaintenanceReminders(): Promise<ApiResponse<{ generated: number }>> {
    const response = await this.client.post('/fleet/maintenance/reminders/generate');
    return response.data;
  }

  async acknowledgeMaintenanceReminder(id: string): Promise<ApiResponse<MaintenanceReminder>> {
    const response = await this.client.post(`/fleet/maintenance/reminders/${id}/acknowledge`);
    return response.data;
  }

  async dismissMaintenanceReminder(id: string): Promise<ApiResponse<MaintenanceReminder>> {
    const response = await this.client.post(`/fleet/maintenance/reminders/${id}/dismiss`);
    return response.data;
  }

  // Settings
  async getSettings(type: string): Promise<ApiResponse<any>> {
    const response = await this.client.get(`/settings/${type}`);
    return response.data;
  }

  async updateSettings(type: string, data: any): Promise<ApiResponse> {
    const response = await this.client.put(`/settings/${type}`, data);
    return response.data;
  }

  // Generic HTTP methods for flexibility
  async get<T = any>(url: string, config?: any): Promise<{ data: T }> {
    const response = await this.client.get(url, config);
    return response;
  }

  async post<T = any>(url: string, data?: any, config?: any): Promise<{ data: T }> {
    const response = await this.client.post(url, data, config);
    return response;
  }

  async put<T = any>(url: string, data?: any, config?: any): Promise<{ data: T }> {
    const response = await this.client.put(url, data, config);
    return response;
  }

  async delete<T = any>(url: string, config?: any): Promise<{ data: T }> {
    const response = await this.client.delete(url, config);
    return response;
  }
}

export const api = new ApiService();
export default api;
