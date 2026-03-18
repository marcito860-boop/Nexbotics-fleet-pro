// Fleet Types - All entities from backend API

export type VehicleStatus = 'available' | 'assigned' | 'maintenance' | 'retired';
export type VehicleType = 'sedan' | 'suv' | 'truck' | 'van' | 'bus' | 'motorcycle' | 'other';
export type FuelType = 'petrol' | 'diesel' | 'electric' | 'hybrid' | 'cng';

export interface Vehicle {
  id: string;
  companyId: string;
  registrationNumber: string;
  make: string;
  model: string;
  year: number;
  type: VehicleType;
  fuelType: FuelType;
  color?: string;
  vin?: string;
  engineNumber?: string;
  mileage: number;
  status: VehicleStatus;
  assignedDriverId?: string;
  purchaseDate?: string;
  purchasePrice?: number;
  insuranceExpiry?: string;
  licenseExpiry?: string;
  lastMaintenanceDate?: string;
  nextMaintenanceDate?: string;
  maintenanceIntervalKm?: number;
  gpsDeviceId?: string;
  currentLatitude?: number;
  currentLongitude?: number;
  currentSpeed?: number;
  lastLocationUpdate?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  // Joined fields
  assignedDriver?: Driver;
}

export type DriverStatus = 'active' | 'on_leave' | 'suspended' | 'terminated';
export type LicenseCategory = 'A' | 'B' | 'C' | 'D' | 'E';

export interface Driver {
  id: string;
  companyId: string;
  employeeNumber?: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone: string;
  dateOfBirth?: string;
  hireDate?: string;
  licenseNumber: string;
  licenseCategory: LicenseCategory;
  licenseExpiry: string;
  employmentStatus: DriverStatus;
  assignedVehicleId?: string;
  userId?: string;
  address?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  medicalCertExpiry?: string;
  lastTrainingDate?: string;
  nextTrainingDate?: string;
  safetyScore: number;
  totalTrips: number;
  totalDistanceKm: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  // Joined fields
  assignedVehicle?: Vehicle;
}

export type AssignmentStatus = 'active' | 'completed' | 'cancelled';

export interface Assignment {
  id: string;
  companyId: string;
  vehicleId: string;
  driverId: string;
  assignedBy: string;
  assignedAt: string;
  expectedReturnAt?: string;
  actualReturnedAt?: string;
  purpose?: string;
  status: AssignmentStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  // Joined fields
  vehicle?: Vehicle;
  driver?: Driver;
  assigner?: {
    firstName: string;
    lastName: string;
  };
}

export type AlertType = 'maintenance_due' | 'insurance_expiry' | 'license_expiry' | 'safety_incident' | 'custom';
export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';
export type AlertStatus = 'unread' | 'read' | 'dismissed';

export interface Alert {
  id: string;
  companyId: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  vehicleId?: string;
  driverId?: string;
  dueDate?: string;
  status: AlertStatus;
  actionTaken?: string;
  createdAt: string;
  updatedAt: string;
  // Joined fields
  vehicle?: Vehicle;
  driver?: Driver;
}

export type TripStatus = 'planned' | 'in_progress' | 'completed' | 'cancelled';

export interface Trip {
  id: string;
  companyId: string;
  vehicleId: string;
  driverId: string;
  assignmentId?: string;
  startTime: string;
  endTime?: string;
  startOdometer: number;
  endOdometer?: number;
  distanceKm: number;
  startLocation?: string;
  endLocation?: string;
  purpose?: string;
  status: TripStatus;
  idleTimeMinutes: number;
  fuelConsumedLiters?: number;
  createdAt: string;
  updatedAt: string;
  // Joined fields
  vehicle?: Vehicle;
  driver?: Driver;
}

export interface FuelCard {
  id: string;
  companyId: string;
  cardNumber: string;
  provider: string;
  vehicleId?: string;
  driverId?: string;
  monthlyLimit: number;
  dailyLimit: number;
  isActive: boolean;
  issuedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface FuelTransaction {
  id: string;
  companyId: string;
  fuelCardId: string;
  vehicleId: string;
  driverId: string;
  stationName: string;
  liters: number;
  pricePerLiter: number;
  totalCost: number;
  currency: string;
  odometerReading: number;
  transactionTime: string;
  isAnomaly: boolean;
  anomalyReason?: string;
  createdAt: string;
  // Joined fields
  vehicle?: Vehicle;
  driver?: Driver;
}

export type RequisitionStatus = 'pending' | 'approved' | 'rejected' | 'allocated' | 'in_progress' | 'completed' | 'cancelled';
export type RequisitionPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface Requisition {
  id: string;
  companyId: string;
  requestNumber: string;
  requestedBy: string;
  requesterDepartment?: string;
  purpose: string;
  preferredVehicleType?: VehicleType;
  requiredFrom: string;
  requiredUntil: string;
  numberOfPassengers?: number;
  pickupLocation?: string;
  destination?: string;
  priority: RequisitionPriority;
  status: RequisitionStatus;
  approvedBy?: string;
  approvedAt?: string;
  approvedNotes?: string;
  allocatedVehicleId?: string;
  allocatedDriverId?: string;
  allocatedAt?: string;
  createdAt: string;
  updatedAt: string;
  // Joined fields
  requester?: {
    firstName: string;
    lastName: string;
  };
  approver?: {
    firstName: string;
    lastName: string;
  };
  allocatedVehicle?: Vehicle;
  allocatedDriver?: Driver;
}

// Training Types
export interface Course {
  id: string;
  companyId: string;
  title: string;
  description?: string;
  category: string;
  durationMinutes: number;
  passingScore: number;
  isMandatory: boolean;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CourseSlide {
  id: string;
  courseId: string;
  slideNumber: number;
  title: string;
  content: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  durationSeconds: number;
}

export interface QuizAttempt {
  id: string;
  companyId: string;
  userId: string;
  courseId: string;
  startedAt: string;
  completedAt?: string;
  score?: number;
  passed?: boolean;
  certificateId?: string;
  createdAt: string;
}

export interface Certificate {
  id: string;
  companyId: string;
  userId: string;
  courseId: string;
  certificateNumber: string;
  issuedAt: string;
  expiresAt?: string;
  createdAt: string;
}

// Audit Types
export type AuditStatus = 'in_progress' | 'completed' | 'cancelled';
export type MaturityRating = 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Critical';

export interface AuditTemplate {
  id: string;
  companyId: string;
  name: string;
  description?: string;
  category: string;
  isSystemTemplate: boolean;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  questionCount?: number;
}

export interface AuditSession {
  id: string;
  companyId: string;
  templateId: string;
  vehicleId?: string;
  driverId?: string;
  auditorId: string;
  auditReference?: string;
  location?: string;
  startedAt: string;
  completedAt?: string;
  status: AuditStatus;
  totalScore?: number;
  maxPossibleScore?: number;
  scorePercentage?: number;
  maturityRating?: MaturityRating;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  // Joined fields
  template?: AuditTemplate;
  vehicle?: Vehicle;
  driver?: Driver;
  auditor?: {
    firstName: string;
    lastName: string;
  };
}

// Risk Types
export type RiskLikelihood = 'rare' | 'unlikely' | 'possible' | 'likely' | 'almost_certain';
export type RiskImpact = 'insignificant' | 'minor' | 'moderate' | 'major' | 'catastrophic';
export type RiskStatus = 'active' | 'mitigated' | 'accepted' | 'transferred';

export interface Risk {
  id: string;
  companyId: string;
  riskNumber: string;
  title: string;
  description: string;
  category: string;
  likelihood: RiskLikelihood;
  impact: RiskImpact;
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'extreme';
  mitigationStrategy?: string;
  mitigationOwner?: string;
  targetDate?: string;
  status: RiskStatus;
  vehicleId?: string;
  driverId?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// Inventory Types
export interface InventoryCategory {
  id: string;
  companyId: string;
  name: string;
  description?: string;
  createdAt: string;
}

export interface InventoryItem {
  id: string;
  companyId: string;
  categoryId?: string;
  sku: string;
  name: string;
  description?: string;
  unitOfMeasure: string;
  currentStock: number;
  unitPrice: number;
  reorderLevel: number;
  location?: string;
  supplierId?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  // Computed
  isLowStock?: boolean;
  stockValue?: number;
}

export interface StockAlert {
  id: string;
  companyId: string;
  itemId: string;
  alertType: 'low_stock' | 'expiring' | 'reorder';
  severity: 'low' | 'medium' | 'high';
  message: string;
  isResolved: boolean;
  createdAt: string;
}

// Invoice Types
export type InvoiceStatus = 'draft' | 'pending' | 'approved' | 'paid' | 'overdue' | 'cancelled';

export interface Invoice {
  id: string;
  companyId: string;
  invoiceNumber: string;
  categoryId: string;
  supplierId?: string;
  vehicleId?: string;
  invoiceDate: string;
  dueDate: string;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  amountPaid: number;
  status: InvoiceStatus;
  description?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  paidAt?: string;
  paidBy?: string;
  paymentMethod?: string;
  paymentReference?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// Analytics Types
export interface DashboardSummary {
  totalVehicles: number;
  totalDrivers: number;
  activeTrips: number;
  pendingRequisitions: number;
  lowStockItems: number;
  overdueInvoices: number;
}

export interface VehicleStats {
  total: number;
  available: number;
  assigned: number;
  maintenance: number;
}

export interface DriverStats {
  total: number;
  active: number;
  onLeave: number;
}

export interface AuditStats {
  totalAudits: number;
  completedAudits: number;
  averageScore: number;
  byMaturityRating: Record<string, number>;
}

export interface FuelStats {
  totalCost: number;
  totalLiters: number;
  transactionCount: number;
  averagePricePerLiter: number;
}

export interface InventoryStats {
  totalItems: number;
  totalValue: number;
  lowStockCount: number;
}

export interface InvoiceStats {
  total: number;
  pendingAmount: number;
  paidAmount: number;
  overdueAmount: number;
}

export interface DashboardAnalytics {
  summary: DashboardSummary;
  vehicleStats: VehicleStats;
  driverStats: DriverStats;
  auditStats: AuditStats;
  fuelStats: FuelStats;
  inventoryStats: InventoryStats;
  invoiceStats: InvoiceStats;
  period: {
    from: string;
    to: string;
  };
}

export interface UtilizationByType {
  type: string;
  vehicleCount: number;
  assignedCount: number;
  utilizationRate: number;
  totalDistance: number;
}

export interface FleetUtilization {
  totalTrips: number;
  totalDistance: number;
  averageDistance: number;
  utilizationByType: UtilizationByType[];
}

// Document Types
export interface Document {
  id: string;
  companyId: string;
  documentType: 'vehicle_registration' | 'insurance' | 'license' | 'contract' | 'other';
  title: string;
  entityType: 'vehicle' | 'driver' | 'company' | 'supplier';
  entityId: string;
  fileUrl?: string;
  fileName?: string;
  issueDate?: string;
  expiryDate?: string;
  reminderDays: number;
  status: 'valid' | 'expiring_soon' | 'expired';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// Supplier Types
export interface Supplier {
  id: string;
  companyId: string;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  serviceType?: string;
  paymentTerms?: string;
  isActive: boolean;
  rating?: number;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierContract {
  id: string;
  companyId: string;
  supplierId: string;
  contractNumber: string;
  startDate: string;
  endDate: string;
  value: number;
  currency: string;
  terms?: string;
  autoRenew: boolean;
  status: 'active' | 'expired' | 'terminated';
  createdAt: string;
  updatedAt: string;
}

// Route Planning
export interface PlannedRoute {
  id: string;
  companyId: string;
  routeName: string;
  vehicleId?: string;
  driverId?: string;
  plannedStops: Array<{
    sequence: number;
    location: string;
    latitude?: number;
    longitude?: number;
    estimatedArrival: string;
    estimatedDeparture: string;
  }>;
  plannedDistance: number;
  plannedDuration: number;
  actualStartTime?: string;
  actualEndTime?: string;
  actualDistance?: number;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

// ==================== MAINTENANCE MODULE TYPES ====================

export type ServiceProviderType = 'general' | 'specialist' | 'dealership' | 'emergency';
export type MaintenanceScheduleType = 'mileage_based' | 'time_based' | 'both';
export type MaintenanceScheduleStatus = 'active' | 'paused' | 'completed' | 'cancelled';
export type MaintenancePriority = 'low' | 'normal' | 'high' | 'critical';
export type ServiceRecordType = 'preventive' | 'repair' | 'breakdown' | 'emergency';
export type MaintenanceRecordStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
export type DowntimeType = 'maintenance' | 'repair' | 'accident' | 'other';
export type ReminderStatus = 'pending' | 'sent' | 'acknowledged' | 'dismissed';
export type ReminderSeverity = 'info' | 'warning' | 'critical';

export interface ServiceProvider {
  id: string;
  companyId: string;
  name: string;
  type: ServiceProviderType;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  country: string;
  taxId?: string;
  bankAccount?: string;
  isApproved: boolean;
  rating: number;
  reviewCount: number;
  specialties: string[];
  workingHours?: Record<string, { open: string; close: string }>;
  isActive: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SparePart {
  id: string;
  companyId: string;
  partNumber: string;
  name: string;
  description?: string;
  category: string;
  manufacturer?: string;
  compatibleVehicles: string[];
  unitCost: number;
  sellingPrice: number;
  quantityInStock: number;
  reorderLevel: number;
  reorderQuantity: number;
  unitOfMeasure: string;
  locationCode?: string;
  supplierId?: string;
  leadTimeDays: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MaintenanceSchedule {
  id: string;
  companyId: string;
  vehicleId: string;
  scheduleType: MaintenanceScheduleType;
  serviceType: string;
  title: string;
  description?: string;
  intervalMileage?: number;
  lastServiceMileage: number;
  nextServiceMileage?: number;
  intervalMonths?: number;
  lastServiceDate?: string;
  nextServiceDate?: string;
  status: MaintenanceScheduleStatus;
  priority: MaintenancePriority;
  estimatedCost?: number;
  estimatedDurationHours?: number;
  assignedProviderId?: string;
  reminderDaysBefore: number;
  reminderMileageBefore: number;
  createdAt: string;
  updatedAt: string;
  // Joined fields
  vehicleRegistration?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  assignedProviderName?: string;
}

export interface MaintenancePart {
  id: string;
  recordId: string;
  partId?: string;
  partNumber: string;
  partName: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  createdAt: string;
}

export interface MaintenanceRecord {
  id: string;
  companyId: string;
  vehicleId: string;
  scheduleId?: string;
  serviceType: ServiceRecordType;
  category: string;
  title: string;
  description?: string;
  providerId?: string;
  providerName?: string;
  scheduledDate?: string;
  startedDate?: string;
  completedDate?: string;
  serviceMileage?: number;
  nextServiceMileage?: number;
  laborCost: number;
  partsCost: number;
  otherCost: number;
  totalCost: number;
  status: MaintenanceRecordStatus;
  breakdownLocation?: string;
  breakdownCause?: string;
  isEmergency: boolean;
  technicianName?: string;
  driverId?: string;
  warrantyMonths?: number;
  warrantyExpiry?: string;
  invoiceNumber?: string;
  documents?: any[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
  // Joined fields
  vehicleRegistration?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  parts?: MaintenancePart[];
}

export interface VehicleDowntime {
  id: string;
  companyId: string;
  vehicleId: string;
  recordId?: string;
  downtimeType: DowntimeType;
  startDate: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  durationHours?: number;
  durationDays?: number;
  reason?: string;
  impact?: string;
  replacementVehicleId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  // Joined fields
  vehicleRegistration?: string;
  replacementVehicleRegistration?: string;
}

export interface MaintenanceReminder {
  id: string;
  companyId: string;
  scheduleId?: string;
  vehicleId: string;
  reminderType: string;
  title: string;
  message?: string;
  dueMileage?: number;
  dueDate?: string;
  status: ReminderStatus;
  severity: ReminderSeverity;
  notifiedAt?: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  createdAt: string;
  // Joined fields
  vehicleRegistration?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  scheduleTitle?: string;
}
