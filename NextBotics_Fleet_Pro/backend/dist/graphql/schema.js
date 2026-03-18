"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.typeDefs = void 0;
exports.typeDefs = `#graphql
  scalar DateTime

  type Query {
    # Vehicles
    vehicles(limit: Int, offset: Int, status: String): VehicleConnection!
    vehicle(id: ID!): Vehicle
    
    # Drivers
    drivers(limit: Int, offset: Int, status: String): DriverConnection!
    driver(id: ID!): Driver
    
    # Audits
    auditTemplates(limit: Int): [AuditTemplate!]!
    auditSessions(limit: Int, status: String): [AuditSession!]!
    auditSession(id: ID!): AuditSession
    
    # Requisitions
    requisitions(limit: Int, status: String): [Requisition!]!
    requisition(id: ID!): Requisition
    
    # Inventory
    inventoryItems(limit: Int, lowStockOnly: Boolean): [InventoryItem!]!
    inventoryItem(id: ID!): InventoryItem
    
    # Analytics
    dashboardAnalytics(period: String): DashboardAnalytics!
    fleetUtilization: FleetUtilization!
    
    # Invoices
    invoices(limit: Int, status: String): [Invoice!]!
    invoice(id: ID!): Invoice
  }

  type Mutation {
    # Vehicles
    createVehicle(input: CreateVehicleInput!): Vehicle!
    updateVehicle(id: ID!, input: UpdateVehicleInput!): Vehicle!
    
    # Audits
    createAuditSession(input: CreateAuditSessionInput!): AuditSession!
    submitAuditResponse(sessionId: ID!, input: AuditResponseInput!): AuditResponse!
    completeAuditSession(id: ID!): AuditSession!
    
    # Requisitions
    createRequisition(input: CreateRequisitionInput!): Requisition!
    approveRequisition(id: ID!, notes: String): Requisition!
    allocateRequisition(id: ID!, vehicleId: ID!, driverId: ID): Requisition!
    
    # Corrective Actions
    createCorrectiveAction(input: CreateCorrectiveActionInput!): CorrectiveAction!
    completeCorrectiveAction(id: ID!, notes: String): CorrectiveAction!
    
    # Inventory
    adjustStock(id: ID!, quantity: Int!, reason: String): InventoryItem!
  }

  # Vehicle Types
  type Vehicle {
    id: ID!
    registrationNumber: String!
    make: String!
    model: String!
    year: Int
    type: String!
    fuelType: String
    fuelCapacity: Float
    currentOdometer: Float
    status: String!
    department: String
    createdAt: DateTime!
    updatedAt: DateTime!
    driver: Driver
    trips: [Trip!]!
  }

  type VehicleConnection {
    items: [Vehicle!]!
    total: Int!
    hasMore: Boolean!
  }

  input CreateVehicleInput {
    registrationNumber: String!
    make: String!
    model: String!
    year: Int
    type: String
    fuelType: String
    fuelCapacity: Float
    department: String
  }

  input UpdateVehicleInput {
    make: String
    model: String
    year: Int
    status: String
    currentOdometer: Float
  }

  # Driver Types
  type Driver {
    id: ID!
    firstName: String!
    lastName: String!
    email: String
    phone: String
    licenseNumber: String!
    licenseExpiry: DateTime
    employmentStatus: String!
    department: String
    createdAt: DateTime!
    vehicle: Vehicle
  }

  type DriverConnection {
    items: [Driver!]!
    total: Int!
    hasMore: Boolean!
  }

  # Trip Types
  type Trip {
    id: ID!
    vehicle: Vehicle!
    driver: Driver
    startTime: DateTime!
    endTime: DateTime
    startLocation: String
    endLocation: String
    distanceKm: Float
    purpose: String
    status: String!
  }

  # Audit Types
  type AuditTemplate {
    id: ID!
    name: String!
    description: String
    category: String!
    questionCount: Int!
    isActive: Boolean!
    questions: [AuditQuestion!]!
  }

  type AuditQuestion {
    id: ID!
    questionNumber: Int!
    questionText: String!
    description: String
    category: String
    weight: Int!
    evidenceRequired: Boolean!
  }

  type AuditSession {
    id: ID!
    template: AuditTemplate!
    vehicle: Vehicle
    driver: Driver
    auditorId: ID!
    auditReference: String
    location: String
    startedAt: DateTime!
    completedAt: DateTime
    status: String!
    totalScore: Int
    maxPossibleScore: Int
    scorePercentage: Float
    maturityRating: String
    responses: [AuditResponse!]!
    correctiveActions: [CorrectiveAction!]!
  }

  type AuditResponse {
    id: ID!
    question: AuditQuestion!
    score: Int!
    notes: String
    evidencePhotos: [String!]!
    answeredAt: DateTime!
  }

  input CreateAuditSessionInput {
    templateId: ID!
    vehicleId: ID
    driverId: ID
    location: String
    auditReference: String
  }

  input AuditResponseInput {
    questionId: ID!
    score: Int!
    notes: String
    evidencePhotos: [String!]
  }

  # Corrective Action Types
  type CorrectiveAction {
    id: ID!
    session: AuditSession!
    title: String!
    description: String
    priority: String!
    assignedTo: ID
    assignee: User
    dueDate: DateTime
    status: String!
    completedAt: DateTime
    evidencePhotos: [String!]!
  }

  input CreateCorrectiveActionInput {
    sessionId: ID!
    title: String!
    description: String
    priority: String
    assignedTo: ID
    dueDate: DateTime
  }

  # Requisition Types
  type Requisition {
    id: ID!
    requestNumber: String!
    requesterName: String!
    purpose: String!
    destination: String
    startDate: DateTime!
    endDate: DateTime
    status: String!
    priority: String!
    allocatedVehicle: Vehicle
    allocatedDriver: Driver
    actualStartTime: DateTime
    actualEndTime: DateTime
    createdAt: DateTime!
  }

  input CreateRequisitionInput {
    requesterName: String!
    purpose: String!
    destination: String
    startDate: DateTime!
    endDate: DateTime
    priority: String
    estimatedPassengers: Int
  }

  # Inventory Types
  type InventoryItem {
    id: ID!
    sku: String!
    name: String!
    description: String
    category: InventoryCategory
    unitOfMeasure: String
    unitPrice: Float
    currentStock: Int!
    reorderLevel: Int!
    reorderQuantity: Int
    supplierName: String
    location: String
    isLowStock: Boolean!
    createdAt: DateTime!
  }

  type InventoryCategory {
    id: ID!
    name: String!
    description: String
  }

  # Invoice Types
  type Invoice {
    id: ID!
    invoiceNumber: String!
    invoiceType: String!
    vendorName: String!
    invoiceDate: DateTime!
    dueDate: DateTime
    subtotal: Float!
    taxAmount: Float!
    totalAmount: Float!
    status: String!
    items: [InvoiceItem!]!
    createdAt: DateTime!
  }

  type InvoiceItem {
    id: ID!
    description: String!
    quantity: Float!
    unitPrice: Float!
    totalPrice: Float!
  }

  # User Types
  type User {
    id: ID!
    firstName: String!
    lastName: String!
    email: String!
    role: String!
  }

  # Analytics Types
  type DashboardAnalytics {
    summary: DashboardSummary!
    vehicleStats: VehicleStats!
    driverStats: DriverStats!
    auditStats: AuditStats!
    fuelStats: FuelStats!
    inventoryStats: InventoryStats!
    invoiceStats: InvoiceStats!
    period: Period!
  }

  type DashboardSummary {
    totalVehicles: Int!
    totalDrivers: Int!
    activeTrips: Int!
    pendingRequisitions: Int!
    lowStockItems: Int!
    overdueInvoices: Int!
  }

  type VehicleStats {
    total: Int!
    available: Int!
    assigned: Int!
    maintenance: Int!
  }

  type DriverStats {
    total: Int!
    active: Int!
    onLeave: Int!
  }

  type AuditStats {
    totalAudits: Int!
    completedAudits: Int!
    averageScore: Float!
    byMaturityRating: MaturityRatingBreakdown!
  }

  type MaturityRatingBreakdown {
    excellent: Int!
    good: Int!
    fair: Int!
    poor: Int!
    critical: Int!
  }

  type FuelStats {
    totalCost: Float!
    totalLiters: Float!
    transactionCount: Int!
    averagePricePerLiter: Float!
  }

  type InventoryStats {
    totalItems: Int!
    totalValue: Float!
    lowStockCount: Int!
  }

  type InvoiceStats {
    total: Int!
    pendingAmount: Float!
    paidAmount: Float!
    overdueAmount: Float!
  }

  type FleetUtilization {
    totalTrips: Int!
    totalDistance: Float!
    averageDistance: Float!
    utilizationByType: [UtilizationByType!]!
  }

  type UtilizationByType {
    type: String!
    vehicleCount: Int!
    assignedCount: Int!
    utilizationRate: Float!
    totalDistance: Float!
  }

  type Period {
    from: DateTime!
    to: DateTime!
  }
`;
//# sourceMappingURL=schema.js.map