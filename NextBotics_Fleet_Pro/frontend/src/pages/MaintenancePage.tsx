import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Wrench, Calendar, AlertTriangle, Clock, Package, Building2,
  Plus, Search, ChevronLeft, ChevronRight,
  AlertCircle, DollarSign,
  Car, MapPin, Phone, Mail, Star, Edit2, Trash2,
  History, Bell, Activity, X
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { api } from '../services/api';
import DashboardLayout from '../components/Layout';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ==================== TYPES ====================
interface ServiceProvider {
  id: string;
  name: string;
  type: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  isApproved: boolean;
  rating: number;
  reviewCount: number;
  specialties: string[];
  isActive: boolean;
}

interface SparePart {
  id: string;
  partNumber: string;
  name: string;
  category: string;
  manufacturer?: string;
  quantityInStock: number;
  reorderLevel: number;
  unitCost: number;
  locationCode?: string;
}

interface MaintenanceSchedule {
  id: string;
  vehicleId: string;
  vehicleRegistration?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  scheduleType: string;
  serviceType: string;
  title: string;
  description?: string;
  intervalMileage?: number;
  lastServiceMileage: number;
  nextServiceMileage?: number;
  intervalMonths?: number;
  lastServiceDate?: string;
  nextServiceDate?: string;
  status: string;
  priority: string;
  assignedProviderName?: string;
}

interface MaintenanceRecord {
  id: string;
  vehicleId: string;
  vehicleRegistration?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  serviceType: string;
  category: string;
  title: string;
  description?: string;
  providerId?: string;
  providerName?: string;
  scheduledDate?: string;
  startedDate?: string;
  completedDate?: string;
  serviceMileage?: number;
  laborCost: number;
  partsCost: number;
  otherCost: number;
  totalCost: number;
  status: string;
  isEmergency: boolean;
  technicianName?: string;
}

interface JobCard {
  id: string;
  recordId: string;
  providerId: string;
  cardNumber: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  description?: string;
  estimatedCost: number;
  actualCost?: number;
  internalNotes?: string;
  startedAt?: string;
  completedAt?: string;
  providerName?: string;
  vehicleRegistration?: string;
  serviceTitle?: string;
  createdAt: string;
}

interface MaintenanceReminder {
  id: string;
  vehicleId: string;
  vehicleRegistration?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  scheduleTitle?: string;
  reminderType: string;
  title: string;
  message?: string;
  dueMileage?: number;
  dueDate?: string;
  status: string;
  severity: string;
}

interface VehicleDowntime {
  id: string;
  vehicleId: string;
  vehicleRegistration?: string;
  downtimeType: string;
  startDate: string;
  endDate?: string;
  durationDays?: number;
  reason?: string;
  impact?: string;
}

interface Vehicle {
  id: string;
  registration_number: string;
  make: string;
  model: string;
  year?: number;
  status: string;
}

interface MaintenanceStats {
  schedules: {
    total: number;
    active: number;
    overdue: number;
    dueSoon: number;
  };
  records: {
    totalRecords: number;
    totalCost: number;
    preventiveCount: number;
    repairCount: number;
  };
  reminders: {
    total: number;
    pending: number;
    critical: number;
    warning: number;
  };
  downtime: {
    totalDowntimeDays: number;
    activeDowntimeCount: number;
  };
}

// ==================== COMPONENT ====================
export default function MaintenancePage() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'overview' | 'schedules' | 'records' | 'providers' | 'parts' | 'jobcards'>('overview');
  
  // Data states
  const [stats, setStats] = useState<MaintenanceStats | null>(null);
  const [schedules, setSchedules] = useState<MaintenanceSchedule[]>([]);
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [providers, setProviders] = useState<ServiceProvider[]>([]);
  const [parts, setParts] = useState<SparePart[]>([]);
  const [jobCards, setJobCards] = useState<JobCard[]>([]);
  const [_reminders, setReminders] = useState<MaintenanceReminder[]>([]);
  const [downtime, setDowntime] = useState<VehicleDowntime[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehiclesUnderMaintenance, setVehiclesUnderMaintenance] = useState<Vehicle[]>([]);
  const [activeRepairs, setActiveRepairs] = useState<MaintenanceRecord[]>([]);
  
  // Loading states
  const [loading, setLoading] = useState(true);
  const [loadingTab, setLoadingTab] = useState(false);
  
  // Modal states
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [showProviderModal, setShowProviderModal] = useState(false);
  const [showPartModal, setShowPartModal] = useState(false);

  // Form states
  const [scheduleForm, setScheduleForm] = useState({
    vehicleId: '',
    serviceName: '',
    scheduleType: 'time_based',
    serviceType: 'preventive',
    intervalMonths: 3,
    intervalMileage: 5000,
    estimatedCost: 0,
    priority: 'normal',
    reminderDaysBefore: 7,
  });
  const [recordForm, setRecordForm] = useState({
    vehicleId: '',
    title: '',
    serviceType: 'preventive',
    category: 'routine',
    description: '',
    providerId: '',
    providerName: '',
    serviceMileage: 0,
    laborCost: 0,
    partsCost: 0,
    otherCost: 0,
    totalCost: 0,
    status: 'completed',
    isEmergency: false,
    technicianName: '',
    isInternalGarage: false,
    startedDate: '',
    completedDate: '',
  });
  const [providerForm, setProviderForm] = useState({
    name: '',
    type: 'general',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    country: 'Kenya',
    specialties: [] as string[],
    notes: '',
  });
  const [partForm, setPartForm] = useState({
    partNumber: '',
    name: '',
    category: '',
    manufacturer: '',
    description: '',
    quantityInStock: 0,
    reorderLevel: 10,
    unitCost: 0,
    locationCode: '',
  });
  const [submitting, setSubmitting] = useState(false);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const isManager = user?.role === 'admin' || user?.role === 'manager';

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    loadOverview();
    loadVehicles();
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (activeTab === 'schedules') loadSchedules();
    else if (activeTab === 'records') loadRecords();
    else if (activeTab === 'providers') loadProviders();
    else if (activeTab === 'parts') loadParts();
    else if (activeTab === 'jobcards') loadJobCards();
  }, [activeTab, currentPage, searchQuery, statusFilter]);

  // ==================== API CALLS ====================
  const loadOverview = async () => {
    try {
      setLoading(true);
      const response = await api.get('/fleet/maintenance/overview');
      if (response.data?.success) {
        const data = response.data.data;
        setStats({
          schedules: data.schedules,
          records: data.records,
          reminders: data.reminders,
          downtime: data.downtime,
        });
        setReminders(data.reminders?.items || []);
        setDowntime(data.activeDowntime || []);
        setVehiclesUnderMaintenance(data.vehiclesUnderMaintenance || []);
        setActiveRepairs(data.activeRepairs || []);
      }
    } catch (error) {
      console.error('Failed to load overview:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSchedules = async () => {
    try {
      setLoadingTab(true);
      const params = new URLSearchParams();
      params.set('page', currentPage.toString());
      params.set('perPage', '20');
      if (statusFilter) params.set('status', statusFilter);
      
      const response = await api.get(`/fleet/maintenance/schedules?${params}`);
      if (response.data?.success) {
        setSchedules(response.data.data.items || []);
        setTotalPages(response.data.data.totalPages || 1);
      }
    } catch (error) {
      console.error('Failed to load schedules:', error);
    } finally {
      setLoadingTab(false);
    }
  };

  const loadRecords = async () => {
    try {
      setLoadingTab(true);
      const params = new URLSearchParams();
      params.set('page', currentPage.toString());
      params.set('perPage', '20');
      if (statusFilter) params.set('status', statusFilter);
      
      const response = await api.get(`/fleet/maintenance/records?${params}`);
      if (response.data?.success) {
        setRecords(response.data.data.items || []);
        setTotalPages(response.data.data.totalPages || 1);
      }
    } catch (error) {
      console.error('Failed to load records:', error);
    } finally {
      setLoadingTab(false);
    }
  };

  const loadProviders = async () => {
    try {
      setLoadingTab(true);
      const params = new URLSearchParams();
      params.set('page', currentPage.toString());
      params.set('perPage', '20');
      if (searchQuery) params.set('search', searchQuery);
      
      const response = await api.get(`/fleet/maintenance/providers?${params}`);
      if (response.data?.success) {
        setProviders(response.data.data.items || []);
        setTotalPages(response.data.data.totalPages || 1);
      }
    } catch (error) {
      console.error('Failed to load providers:', error);
    } finally {
      setLoadingTab(false);
    }
  };

  const loadParts = async () => {
    try {
      setLoadingTab(true);
      const params = new URLSearchParams();
      params.set('page', currentPage.toString());
      params.set('perPage', '20');
      if (searchQuery) params.set('search', searchQuery);
      if (statusFilter === 'low_stock') params.set('lowStockOnly', 'true');
      
      const response = await api.get(`/fleet/maintenance/parts?${params}`);
      if (response.data?.success) {
        setParts(response.data.data.items || []);
        setTotalPages(response.data.data.totalPages || 1);
      }
    } catch (error) {
      console.error('Failed to load parts:', error);
    } finally {
      setLoadingTab(false);
    }
  };

  const loadJobCards = async () => {
    try {
      setLoadingTab(true);
      const params = new URLSearchParams();
      params.set('page', currentPage.toString());
      params.set('perPage', '20');
      if (statusFilter) params.set('status', statusFilter);
      
      const response = await api.get(`/fleet/maintenance/job-cards?${params}`);
      if (response.data?.success) {
        setJobCards(response.data.data.items || []);
        setTotalPages(response.data.data.totalPages || 1);
      }
    } catch (error) {
      console.error('Failed to load job cards:', error);
    } finally {
      setLoadingTab(false);
    }
  };

  const loadVehicles = async () => {
    try {
      const response = await api.get('/fleet/vehicles?perPage=100');
      if (response.data?.success) {
        setVehicles(response.data.data.items || []);
      }
    } catch (error) {
      console.error('Failed to load vehicles:', error);
    }
  };

  // ==================== CREATE HANDLERS ====================
  const handleCreateSchedule = async () => {
    try {
      setSubmitting(true);
      // Map frontend field names to backend field names
      const payload = {
        vehicleId: scheduleForm.vehicleId,
        title: scheduleForm.serviceName,  // Map serviceName to title
        scheduleType: scheduleForm.scheduleType,
        serviceType: scheduleForm.serviceType,
        intervalMonths: scheduleForm.intervalMonths,
        intervalMileage: scheduleForm.intervalMileage,
        estimatedCost: scheduleForm.estimatedCost,
        priority: scheduleForm.priority,
        reminderDaysBefore: scheduleForm.reminderDaysBefore,
      };
      
      console.log('Creating schedule with payload:', payload);
      
      const response = await api.post('/fleet/maintenance/schedules', payload);
      console.log('Schedule created:', response.data);
      if (response.data?.success) {
        setShowScheduleModal(false);
        setScheduleForm({
          vehicleId: '',
          serviceName: '',
          scheduleType: 'time_based',
          serviceType: 'preventive',
          intervalMonths: 3,
          intervalMileage: 5000,
          estimatedCost: 0,
          priority: 'normal',
          reminderDaysBefore: 7,
        });
        loadSchedules();
        loadOverview();
      }
    } catch (error: any) {
      console.error('Failed to create schedule:', error);
      console.error('Error response:', error?.response);
      console.error('Error response data:', error?.response?.data);
      const errorMsg = error?.response?.data?.error 
        || error?.response?.data?.details?.[0]?.msg 
        || error?.message
        || 'Failed to create schedule';
      alert('Error: ' + JSON.stringify(errorMsg));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateRecord = async () => {
    try {
      setSubmitting(true);
      // Calculate total cost
      const totalCost = (recordForm.laborCost || 0) + (recordForm.partsCost || 0) + (recordForm.otherCost || 0);
      const formData = { ...recordForm, totalCost };
      
      const response = await api.post('/fleet/maintenance/records', formData);
      if (response.data?.success) {
        setShowRecordModal(false);
        setRecordForm({
          vehicleId: '',
          title: '',
          serviceType: 'preventive',
          category: 'routine',
          description: '',
          providerId: '',
          providerName: '',
          serviceMileage: 0,
          laborCost: 0,
          partsCost: 0,
          otherCost: 0,
          totalCost: 0,
          status: 'completed',
          isEmergency: false,
          technicianName: '',
          isInternalGarage: false,
          startedDate: '',
          completedDate: '',
        });
        loadRecords();
        loadOverview();
      }
    } catch (error) {
      console.error('Failed to create record:', error);
      alert('Failed to create record');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateProvider = async () => {
    try {
      setSubmitting(true);
      const response = await api.post('/fleet/maintenance/providers', providerForm);
      if (response.data?.success) {
        setShowProviderModal(false);
        setProviderForm({
          name: '',
          type: 'general',
          contactPerson: '',
          phone: '',
          email: '',
          address: '',
          city: '',
          country: 'Kenya',
          specialties: [],
          notes: '',
        });
        loadProviders();
      }
    } catch (error) {
      console.error('Failed to create provider:', error);
      alert('Failed to create provider');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreatePart = async () => {
    try {
      setSubmitting(true);
      const response = await api.post('/fleet/maintenance/parts', partForm);
      if (response.data?.success) {
        setShowPartModal(false);
        setPartForm({
          partNumber: '',
          name: '',
          category: '',
          manufacturer: '',
          description: '',
          quantityInStock: 0,
          reorderLevel: 10,
          unitCost: 0,
          locationCode: '',
        });
        loadParts();
      }
    } catch (error) {
      console.error('Failed to create part:', error);
      alert('Failed to create part');
    } finally {
      setSubmitting(false);
    }
  };

  // ==================== HELPER FUNCTIONS ====================
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
      case 'completed':
      case 'available':
        return 'bg-green-100 text-green-700';
      case 'scheduled':
      case 'in_progress':
      case 'pending':
        return 'bg-amber-100 text-amber-700';
      case 'overdue':
      case 'critical':
      case 'emergency':
      case 'breakdown':
        return 'bg-red-100 text-red-700';
      case 'paused':
      case 'cancelled':
      case 'dismissed':
        return 'bg-gray-100 text-gray-700';
      case 'warning':
      case 'repair':
        return 'bg-orange-100 text-orange-700';
      default:
        return 'bg-blue-100 text-blue-700';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'critical':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'high':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'normal':
        return <Bell className="h-4 w-4 text-amber-500" />;
      default:
        return <Bell className="h-4 w-4 text-gray-400" />;
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('zh-CN');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }).format(amount);
  };

  // ==================== RENDER ====================
  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <Wrench className="h-7 w-7 mr-2 text-amber-500" />
              Maintenance Management
            </h1>
            <p className="text-gray-500 mt-1">Manage preventive maintenance, repairs, and service providers</p>
          </div>
          {isManager && (
            <div className="mt-4 sm:mt-0 flex space-x-2">
              {activeTab === 'schedules' && (
                <button
                  onClick={() => setShowScheduleModal(true)}
                  className="inline-flex items-center px-4 py-2 bg-amber-500 text-slate-900 rounded-lg font-medium hover:bg-amber-600 transition-colors"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Add Schedule
                </button>
              )}
              {activeTab === 'records' && (
                <button
                  onClick={() => setShowRecordModal(true)}
                  className="inline-flex items-center px-4 py-2 bg-amber-500 text-slate-900 rounded-lg font-medium hover:bg-amber-600 transition-colors"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Add Record
                </button>
              )}
              {activeTab === 'providers' && (
                <button
                  onClick={() => setShowProviderModal(true)}
                  className="inline-flex items-center px-4 py-2 bg-amber-500 text-slate-900 rounded-lg font-medium hover:bg-amber-600 transition-colors"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Add Provider
                </button>
              )}
              {activeTab === 'parts' && (
                <button
                  onClick={() => setShowPartModal(true)}
                  className="inline-flex items-center px-4 py-2 bg-amber-500 text-slate-900 rounded-lg font-medium hover:bg-amber-600 transition-colors"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Add Part
                </button>
              )}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
          <div className="flex overflow-x-auto">
            {[
              { id: 'overview', label: 'Overview', icon: Activity },
              { id: 'schedules', label: 'Schedules', icon: Calendar },
              { id: 'records', label: 'History', icon: History },
              { id: 'providers', label: 'Providers', icon: Building2 },
              { id: 'parts', label: 'Spare Parts', icon: Package },
              { id: 'jobcards', label: 'Job Cards', icon: Wrench },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  setCurrentPage(1);
                  setSearchQuery('');
                  setStatusFilter('');
                }}
                className={cn(
                  'flex items-center px-6 py-4 text-sm font-medium border-b-2 whitespace-nowrap transition-colors',
                  activeTab === tab.id
                    ? 'border-amber-500 text-amber-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                )}
              >
                <tab.icon className="h-4 w-4 mr-2" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                title="Active Schedules"
                value={stats?.schedules.active || 0}
                subtext={`${stats?.schedules.overdue || 0} overdue`}
                icon={Calendar}
                color="amber"
              />
              <StatCard
                title="Monthly Costs"
                value={formatCurrency(stats?.records.totalCost || 0)}
                subtext={`${stats?.records.totalRecords || 0} records`}
                icon={DollarSign}
                color="green"
              />
              <StatCard
                title="Pending Reminders"
                value={stats?.reminders.pending || 0}
                subtext={`${stats?.reminders.critical || 0} critical`}
                icon={Bell}
                color="red"
              />
              <StatCard
                title="Downtime Days"
                value={stats?.downtime.totalDowntimeDays || 0}
                subtext={`${stats?.downtime.activeDowntimeCount || 0} active`}
                icon={Clock}
                color="blue"
              />
            </div>

            {/* Vehicles Under Maintenance */}
            {(vehiclesUnderMaintenance.length > 0 || activeRepairs.length > 0) && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <Wrench className="h-5 w-5 mr-2 text-orange-500" />
                    Vehicles Currently Under Maintenance / Repair
                  </h3>
                  <span className="px-3 py-1 text-sm font-medium rounded-full bg-orange-100 text-orange-700">
                    {vehiclesUnderMaintenance.length + activeRepairs.length} Active
                  </span>
                </div>                <div className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {vehiclesUnderMaintenance.map((vehicle) => (
                      <div key={vehicle.id} className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <Car className="h-8 w-8 text-orange-500 mr-3" />
                            <div>
                              <p className="font-semibold text-gray-900">{vehicle.registration_number}</p>
                              <p className="text-sm text-gray-600">{vehicle.make} {vehicle.model} {vehicle.year && `(${vehicle.year})`}</p>
                            </div>
                          </div>
                          <span className="px-3 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-700">
                            In Garage
                          </span>
                        </div>
                      </div>
                    ))}
                    {activeRepairs.map((repair) => (
                      <div key={repair.id} className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center">
                            <Wrench className="h-8 w-8 text-blue-500 mr-3" />
                            <div>
                              <p className="font-semibold text-gray-900">{repair.vehicleRegistration || repair.vehicleId}</p>
                              <p className="text-sm text-gray-600">{repair.title}</p>
                            </div>
                          </div>
                          <span className={cn(
                            "px-3 py-1 text-xs font-medium rounded-full",
                            repair.isEmergency ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"
                          )}>
                            {repair.isEmergency ? "🔴 Emergency" : "🔧 In Progress"}
                          </span>
                        </div>                        <div className="mt-3 pt-3 border-t border-blue-200">
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <p className="text-gray-500">Labor</p>
                              <p className="font-medium">{formatCurrency(repair.laborCost || 0)}</p>
                            </div>
                            <div>
                              <p className="text-gray-500">Parts</p>
                              <p className="font-medium">{formatCurrency(repair.partsCost || 0)}</p>
                            </div>
                            <div>
                              <p className="text-gray-500">Total</p>
                              <p className="font-bold text-blue-600">{formatCurrency(repair.totalCost || 0)}</p>
                            </div>
                          </div>                          {repair.technicianName && (
                            <p className="text-sm text-gray-600 mt-2">
                              <span className="text-gray-500">Technician: </span>{repair.technicianName}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>                </div>
              </div>
            )}

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Overdue Maintenance */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <AlertTriangle className="h-5 w-5 mr-2 text-red-500" />
                    Overdue Maintenance
                  </h3>
                  <button
                    onClick={() => setActiveTab('schedules')}
                    className="text-sm text-amber-600 hover:text-amber-700"
                  >
                    View All
                  </button>
                </div>
                <div className="p-4">
                  {loading ? (
                    <LoadingState />
                  ) : schedules.filter(s => s.status === 'active' && new Date(s.nextServiceDate || '') < new Date()).length === 0 ? (
                    <EmptyState message="No overdue maintenance" />
                  ) : (
                    <div className="space-y-3">
                      {schedules
                        .filter(s => s.status === 'active' && new Date(s.nextServiceDate || '') < new Date())
                        .slice(0, 5)
                        .map((schedule) => (
                          <div key={schedule.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                            <div>
                              <p className="font-medium text-gray-900">{schedule.vehicleRegistration}</p>
                              <p className="text-sm text-gray-500">{schedule.title}</p>
                              <p className="text-xs text-red-600">Due: {formatDate(schedule.nextServiceDate)}</p>
                            </div>
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700">
                              Overdue
                            </span>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Low Stock Parts */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <Package className="h-5 w-5 mr-2 text-amber-500" />
                    Low Stock Parts
                  </h3>
                  <button
                    onClick={() => {
                      setActiveTab('parts');
                      setStatusFilter('low_stock');
                    }}
                    className="text-sm text-amber-600 hover:text-amber-700"
                  >
                    View All
                  </button>
                </div>
                <div className="p-4">
                  {loading ? (
                    <LoadingState />
                  ) : (
                    <div className="space-y-3">
                      {parts
                        .filter(p => p.quantityInStock <= p.reorderLevel)
                        .slice(0, 5)
                        .map((part) => (
                          <div key={part.id} className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                            <div>
                              <p className="font-medium text-gray-900">{part.name}</p>
                              <p className="text-sm text-gray-500">{part.partNumber}</p>
                              <p className="text-xs text-amber-600">
                                Stock: {part.quantityInStock} / Min: {part.reorderLevel}
                              </p>
                            </div>
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-700">
                              Low Stock
                            </span>
                          </div>
                        ))}
                      {parts.filter(p => p.quantityInStock <= p.reorderLevel).length === 0 && (
                        <EmptyState message="All parts are well stocked" />
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Active Downtime */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Clock className="h-5 w-5 mr-2 text-blue-500" />
                  Active Vehicle Downtime
                </h3>
              </div>
              <div className="p-4">
                {loading ? (
                  <LoadingState />
                ) : downtime.length === 0 ? (
                  <EmptyState message="No active downtime" />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {downtime.map((dt) => (
                      <div key={dt.id} className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-gray-900">{dt.vehicleRegistration}</span>
                          <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700">
                            {dt.downtimeType}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 mb-1">Started: {formatDate(dt.startDate)}</p>
                        <p className="text-sm text-gray-700">{dt.reason}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Schedules Tab */}
        {activeTab === 'schedules' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            {/* Filters */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search schedules..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">All Status</option>
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vehicle</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Service</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Next Due</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loadingTab ? (
                    <tr><td colSpan={6} className="px-6 py-12"><LoadingState /></td></tr>
                  ) : schedules.length === 0 ? (
                    <tr><td colSpan={6} className="px-6 py-12"><EmptyState message="No maintenance schedules found" /></td></tr>
                  ) : (
                    schedules.map((schedule) => (
                      <tr key={schedule.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <Car className="h-5 w-5 text-gray-400 mr-2" />
                            <div>
                              <p className="font-medium text-gray-900">{schedule.vehicleRegistration}</p>
                              <p className="text-sm text-gray-500">{schedule.vehicleMake} {schedule.vehicleModel}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-medium text-gray-900">{schedule.title}</p>
                          <p className="text-sm text-gray-500 capitalize">{schedule.serviceType}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-900 capitalize">{(schedule.scheduleType || '').replace('_', ' ')}</span>
                          {schedule.nextServiceMileage && (
                            <p className="text-xs text-gray-500">@ {schedule.nextServiceMileage.toLocaleString()} km</p>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            {getPriorityIcon(schedule.priority)}
                            <span className="ml-2 text-sm text-gray-900">{formatDate(schedule.nextServiceDate)}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn('px-2 py-1 text-xs font-medium rounded-full capitalize', getStatusColor(schedule.status))}>
                            {schedule.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {isManager && (
                            <>
                              <button className="text-amber-600 hover:text-amber-700 mr-3">
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button className="text-red-600 hover:text-red-700">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-gray-200 flex items-center justify-between">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </button>
                <span className="text-sm text-gray-700">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Records Tab */}
        {activeTab === 'records' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            {/* Filters */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search maintenance records..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">All Status</option>
                  <option value="completed">Completed</option>
                  <option value="in_progress">In Progress</option>
                  <option value="scheduled">Scheduled</option>
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vehicle</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Service</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cost</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loadingTab ? (
                    <tr><td colSpan={6} className="px-6 py-12"><LoadingState /></td></tr>
                  ) : records.length === 0 ? (
                    <tr><td colSpan={6} className="px-6 py-12"><EmptyState message="No maintenance records found" /></td></tr>
                  ) : (
                    records.map((record) => (
                      <tr key={record.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <Car className="h-5 w-5 text-gray-400 mr-2" />
                            <div>
                              <p className="font-medium text-gray-900">{record.vehicleRegistration}</p>
                              <p className="text-sm text-gray-500">{record.vehicleMake} {record.vehicleModel}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-medium text-gray-900">{record.title}</p>
                          <p className="text-sm text-gray-500">{record.providerName || 'N/A'}</p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            {record.isEmergency && <AlertCircle className="h-4 w-4 text-red-500 mr-1" />}
                            <span className="text-sm text-gray-900 capitalize">{record.serviceType}</span>
                          </div>
                          <p className="text-xs text-gray-500 capitalize">{record.category}</p>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {formatDate(record.completedDate)}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {formatCurrency(record.totalCost)}
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn('px-2 py-1 text-xs font-medium rounded-full capitalize', getStatusColor(record.status))}>
                            {record.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-gray-200 flex items-center justify-between">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </button>
                <span className="text-sm text-gray-700">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Providers Tab */}
        {activeTab === 'providers' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            {/* Filters */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search providers..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Grid */}
            <div className="p-4">
              {loadingTab ? (
                <LoadingState />
              ) : providers.length === 0 ? (
                <EmptyState message="No service providers found" />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {providers.map((provider) => (
                    <div key={provider.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold text-gray-900">{provider.name}</h3>
                          <p className="text-sm text-gray-500 capitalize">{provider.type}</p>
                        </div>
                        <span className={cn(
                          'px-2 py-0.5 text-xs rounded-full',
                          provider.isApproved ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                        )}>
                          {provider.isApproved ? 'Approved' : 'Pending'}
                        </span>
                      </div>
                      
                      <div className="space-y-2 text-sm text-gray-600 mb-3">
                        {provider.contactPerson && (
                          <p className="flex items-center">
                            <Building2 className="h-4 w-4 mr-2 text-gray-400" />
                            {provider.contactPerson}
                          </p>
                        )}
                        {provider.phone && (
                          <p className="flex items-center">
                            <Phone className="h-4 w-4 mr-2 text-gray-400" />
                            {provider.phone}
                          </p>
                        )}
                        {provider.email && (
                          <p className="flex items-center">
                            <Mail className="h-4 w-4 mr-2 text-gray-400" />
                            {provider.email}
                          </p>
                        )}
                        {provider.city && (
                          <p className="flex items-center">
                            <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                            {provider.city}
                          </p>
                        )}
                      </div>

                      {provider.rating > 0 && (
                        <div className="flex items-center mb-3">
                          <Star className="h-4 w-4 text-amber-400 mr-1" />
                          <span className="text-sm font-medium text-gray-900">{provider.rating}</span>
                          <span className="text-sm text-gray-500 ml-1">({provider.reviewCount} reviews)</span>
                        </div>
                      )}

                      {provider.specialties?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {provider.specialties.slice(0, 3).map((specialty, idx) => (
                            <span key={idx} className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                              {specialty}
                            </span>
                          ))}
                        </div>
                      )}

                      {isManager && (
                        <div className="flex justify-end space-x-2 pt-3 border-t border-gray-200">
                          <button className="text-amber-600 hover:text-amber-700">
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button className="text-red-600 hover:text-red-700">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Parts Tab */}
        {activeTab === 'parts' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            {/* Filters */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search parts..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">All Parts</option>
                  <option value="low_stock">Low Stock Only</option>
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Part</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit Cost</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loadingTab ? (
                    <tr><td colSpan={6} className="px-6 py-12"><LoadingState /></td></tr>
                  ) : parts.length === 0 ? (
                    <tr><td colSpan={6} className="px-6 py-12"><EmptyState message="No spare parts found" /></td></tr>
                  ) : (
                    parts.map((part) => (
                      <tr key={part.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <Package className="h-5 w-5 text-gray-400 mr-2" />
                            <div>
                              <p className="font-medium text-gray-900">{part.name}</p>
                              <p className="text-sm text-gray-500">{part.partNumber}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 capitalize">{part.category}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <span className={cn(
                              'text-sm font-medium',
                              part.quantityInStock <= part.reorderLevel ? 'text-red-600' : 'text-green-600'
                            )}>
                              {part.quantityInStock}
                            </span>
                            <span className="text-xs text-gray-500 ml-1">/ {part.reorderLevel} min</span>
                          </div>
                          {part.quantityInStock <= part.reorderLevel && (
                            <span className="text-xs text-red-600">Low stock</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">{formatCurrency(part.unitCost)}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">{part.locationCode || 'N/A'}</td>
                        <td className="px-6 py-4 text-right">
                          {isManager && (
                            <>
                              <button className="text-amber-600 hover:text-amber-700 mr-3">
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button className="text-red-600 hover:text-red-700">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Job Cards Tab */}
        {activeTab === 'jobcards' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            {/* Filters */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex flex-col sm:flex-row gap-4">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Card #</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vehicle</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Service</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Provider</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Est. Cost</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loadingTab ? (
                    <tr><td colSpan={7} className="px-6 py-12"><LoadingState /></td></tr>
                  ) : jobCards.length === 0 ? (
                    <tr><td colSpan={7} className="px-6 py-12"><EmptyState message="No job cards found" /></td></tr>
                  ) : (
                    jobCards.map((card) => (
                      <tr key={card.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <span className="font-mono text-sm font-medium text-amber-600">{card.cardNumber}</span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">{card.vehicleRegistration || 'N/A'}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{card.serviceTitle || 'N/A'}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{card.providerName || 'N/A'}</td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            'px-2 py-1 text-xs font-medium rounded-full capitalize',
                            card.status === 'completed' ? 'bg-green-100 text-green-800' :
                            card.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                            card.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          )}>
                            {card.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">{formatCurrency(card.estimatedCost)}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">{formatDate(card.createdAt)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
      {/* Add Schedule Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Add Maintenance Schedule</h3>
              <button onClick={() => setShowScheduleModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle *</label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500"
                  value={scheduleForm.vehicleId}
                  onChange={(e) => setScheduleForm({...scheduleForm, vehicleId: e.target.value})}
                >
                  <option value="">Select Vehicle</option>
                  {vehicles.map(v => (
                    <option key={v.id} value={v.id}>{v.registration_number} - {v.make} {v.model}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Service Name *</label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500"
                  value={scheduleForm.serviceName}
                  onChange={(e) => setScheduleForm({...scheduleForm, serviceName: e.target.value})}
                  placeholder="e.g., Oil Change"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Schedule Type</label>
                  <select
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500"
                    value={scheduleForm.scheduleType}
                    onChange={(e) => setScheduleForm({...scheduleForm, scheduleType: e.target.value})}
                  >
                    <option value="time_based">Time Based</option>
                    <option value="mileage_based">Mileage Based</option>
                    <option value="both">Both</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Service Type</label>
                  <select
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500"
                    value={scheduleForm.serviceType}
                    onChange={(e) => setScheduleForm({...scheduleForm, serviceType: e.target.value})}
                  >
                    <option value="preventive">Preventive</option>
                    <option value="repair">Repair</option>
                    <option value="inspection">Inspection</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Interval (Months)</label>
                  <input
                    type="number"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500"
                    value={scheduleForm.intervalMonths}
                    onChange={(e) => setScheduleForm({...scheduleForm, intervalMonths: parseInt(e.target.value)})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Interval (Mileage)</label>
                  <input
                    type="number"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500"
                    value={scheduleForm.intervalMileage}
                    onChange={(e) => setScheduleForm({...scheduleForm, intervalMileage: parseInt(e.target.value)})}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Cost</label>
                <input
                  type="number"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500"
                  value={scheduleForm.estimatedCost}
                  onChange={(e) => setScheduleForm({...scheduleForm, estimatedCost: parseFloat(e.target.value)})}
                />
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowScheduleModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateSchedule}
                disabled={submitting || !scheduleForm.vehicleId || !scheduleForm.serviceName}
                className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50"
              >
                {submitting ? 'Saving...' : 'Save Schedule'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Record Modal */}
      {showRecordModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Add Maintenance Record</h3>
              <button onClick={() => setShowRecordModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle *</label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500"
                  value={recordForm.vehicleId}
                  onChange={(e) => setRecordForm({...recordForm, vehicleId: e.target.value})}
                >
                  <option value="">Select Vehicle</option>
                  {vehicles.map(v => (
                    <option key={v.id} value={v.id}>{v.registration_number} - {v.make} {v.model}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500"
                  value={recordForm.title}
                  onChange={(e) => setRecordForm({...recordForm, title: e.target.value})}
                  placeholder="e.g., Oil Change Service"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Service Type</label>
                  <select
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500"
                    value={recordForm.serviceType}
                    onChange={(e) => setRecordForm({...recordForm, serviceType: e.target.value})}
                  >
                    <option value="preventive">Preventive</option>
                    <option value="repair">Repair</option>
                    <option value="breakdown">Breakdown</option>
                    <option value="emergency">Emergency</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500"
                    value={recordForm.category}
                    onChange={(e) => setRecordForm({...recordForm, category: e.target.value})}
                  >
                    <option value="routine">Routine</option>
                    <option value="engine">Engine</option>
                    <option value="brakes">Brakes</option>
                    <option value="transmission">Transmission</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500"
                  rows={3}
                  value={recordForm.description}
                  onChange={(e) => setRecordForm({...recordForm, description: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Service Mileage</label>
                  <input
                    type="number"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500"
                    value={recordForm.serviceMileage}
                    onChange={(e) => setRecordForm({...recordForm, serviceMileage: parseInt(e.target.value)})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500"
                    value={recordForm.status}
                    onChange={(e) => setRecordForm({...recordForm, status: e.target.value})}
                  >
                    <option value="scheduled">Scheduled</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>

              {/* Cost Breakdown */}
              <div className="border-t border-gray-200 pt-4 mt-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Cost Breakdown</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Labor Cost</label>
                    <input
                      type="number"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500"
                      value={recordForm.laborCost}
                      onChange={(e) => setRecordForm({...recordForm, laborCost: parseFloat(e.target.value)})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Parts Cost</label>
                    <input
                      type="number"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500"
                      value={recordForm.partsCost}
                      onChange={(e) => setRecordForm({...recordForm, partsCost: parseFloat(e.target.value)})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Other Cost</label>
                    <input
                      type="number"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500"
                      value={recordForm.otherCost}
                      onChange={(e) => setRecordForm({...recordForm, otherCost: parseFloat(e.target.value)})}
                    />
                  </div>
                </div>
                <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">
                    Total Cost: <span className="font-bold text-gray-900">{formatCurrency((recordForm.laborCost || 0) + (recordForm.partsCost || 0) + (recordForm.otherCost || 0))}</span>
                  </p>
                </div>
              </div>

              {/* Internal Garage / Provider */}
              <div className="border-t border-gray-200 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-gray-900">Service Provider</h4>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-amber-500 focus:ring-amber-500"
                      checked={recordForm.isInternalGarage}
                      onChange={(e) => setRecordForm({...recordForm, isInternalGarage: e.target.checked, providerId: '', providerName: ''})}
                    />
                    <span className="ml-2 text-sm text-gray-700">Internal Garage (G4S)</span>
                  </label>
                </div>
                
                {!recordForm.isInternalGarage ? (
                  <select
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500"
                    value={recordForm.providerId}
                    onChange={(e) => {
                      const provider = providers.find(p => p.id === e.target.value);
                      setRecordForm({...recordForm, providerId: e.target.value, providerName: provider?.name || ''});
                    }}
                  >
                    <option value="">Select External Provider</option>
                    {providers.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.type})</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-100 text-gray-600"
                    value="G4S Internal Garage"
                    disabled
                  />
                )}
              </div>

              {/* Technician & Dates */}
              <div className="border-t border-gray-200 pt-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Work Details</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Technician Name</label>
                    <input
                      type="text"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500"
                      value={recordForm.technicianName}
                      onChange={(e) => setRecordForm({...recordForm, technicianName: e.target.value})}
                      placeholder={recordForm.isInternalGarage ? "e.g., G4S Mechanic John" : "External technician name"}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Started Date</label>
                      <input
                        type="date"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500"
                        value={recordForm.startedDate}
                        onChange={(e) => setRecordForm({...recordForm, startedDate: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Completed Date</label>
                      <input
                        type="date"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500"
                        value={recordForm.completedDate}
                        onChange={(e) => setRecordForm({...recordForm, completedDate: e.target.value})}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-amber-500 focus:ring-amber-500"
                  checked={recordForm.isEmergency}
                  onChange={(e) => setRecordForm({...recordForm, isEmergency: e.target.checked})}
                />
                <span className="ml-2 text-sm text-gray-700">Emergency Repair</span>
              </label>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowRecordModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateRecord}
                disabled={submitting || !recordForm.vehicleId || !recordForm.title}
                className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50"
              >
                {submitting ? 'Saving...' : 'Save Record'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Provider Modal */}
      {showProviderModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Add Service Provider</h3>
              <button onClick={() => setShowProviderModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Provider Name *</label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500"
                  value={providerForm.name}
                  onChange={(e) => setProviderForm({...providerForm, name: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500"
                    value={providerForm.type}
                    onChange={(e) => setProviderForm({...providerForm, type: e.target.value})}
                  >
                    <option value="general">General</option>
                    <option value="specialist">Specialist</option>
                    <option value="dealership">Dealership</option>
                    <option value="emergency">Emergency</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person</label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500"
                    value={providerForm.contactPerson}
                    onChange={(e) => setProviderForm({...providerForm, contactPerson: e.target.value})}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500"
                    value={providerForm.phone}
                    onChange={(e) => setProviderForm({...providerForm, phone: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500"
                    value={providerForm.email}
                    onChange={(e) => setProviderForm({...providerForm, email: e.target.value})}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500"
                  value={providerForm.address}
                  onChange={(e) => setProviderForm({...providerForm, address: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500"
                    value={providerForm.city}
                    onChange={(e) => setProviderForm({...providerForm, city: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500"
                    value={providerForm.country}
                    onChange={(e) => setProviderForm({...providerForm, country: e.target.value})}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500"
                  rows={2}
                  value={providerForm.notes}
                  onChange={(e) => setProviderForm({...providerForm, notes: e.target.value})}
                />
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowProviderModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateProvider}
                disabled={submitting || !providerForm.name}
                className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50"
              >
                {submitting ? 'Saving...' : 'Save Provider'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Part Modal */}
      {showPartModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Add Spare Part</h3>
              <button onClick={() => setShowPartModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Part Number *</label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500"
                    value={partForm.partNumber}
                    onChange={(e) => setPartForm({...partForm, partNumber: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Part Name *</label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500"
                    value={partForm.name}
                    onChange={(e) => setPartForm({...partForm, name: e.target.value})}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500"
                  value={partForm.category}
                  onChange={(e) => setPartForm({...partForm, category: e.target.value})}
                >
                  <option value="">Select Category</option>
                  <option value="Filters">Filters</option>
                  <option value="Brakes">Brakes</option>
                  <option value="Engine">Engine</option>
                  <option value="Transmission">Transmission</option>
                  <option value="Suspension">Suspension</option>
                  <option value="Electrical">Electrical</option>
                  <option value="Body">Body</option>
                  <option value="Fluids">Fluids</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Manufacturer</label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500"
                  value={partForm.manufacturer}
                  onChange={(e) => setPartForm({...partForm, manufacturer: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stock Qty</label>
                  <input
                    type="number"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500"
                    value={partForm.quantityInStock}
                    onChange={(e) => setPartForm({...partForm, quantityInStock: parseInt(e.target.value)})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reorder Level</label>
                  <input
                    type="number"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500"
                    value={partForm.reorderLevel}
                    onChange={(e) => setPartForm({...partForm, reorderLevel: parseInt(e.target.value)})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit Cost</label>
                  <input
                    type="number"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500"
                    value={partForm.unitCost}
                    onChange={(e) => setPartForm({...partForm, unitCost: parseFloat(e.target.value)})}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location Code</label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500"
                  value={partForm.locationCode}
                  onChange={(e) => setPartForm({...partForm, locationCode: e.target.value})}
                  placeholder="e.g., A-01-02"
                />
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowPartModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleCreatePart}
                disabled={submitting || !partForm.partNumber || !partForm.name || !partForm.category}
                className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50"
              >
                {submitting ? 'Saving...' : 'Save Part'}
              </button>
            </div>
          </div>
        </div>
      )}

    </DashboardLayout>
  );
}

// ==================== SUB-COMPONENTS ====================

function StatCard({ title, value, subtext, icon: Icon, color }: {
  title: string;
  value: string | number;
  subtext: string;
  icon: any;
  color: 'amber' | 'green' | 'red' | 'blue';
}) {
  const colors = {
    amber: 'bg-amber-50 text-amber-600',
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600',
    blue: 'bg-blue-50 text-blue-600',
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          <p className="text-sm text-gray-500 mt-1">{subtext}</p>
        </div>
        <div className={cn('p-3 rounded-lg', colors[color])}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center h-32">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-8 text-gray-500">
      <p>{message}</p>
    </div>
  );
}
