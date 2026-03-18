import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Wrench, Calendar, AlertTriangle, Clock, Package, Building2,
  Plus, Search, Filter, ChevronLeft, ChevronRight, MoreVertical,
  CheckCircle, AlertCircle, XCircle, TrendingUp, DollarSign,
  Car, MapPin, Phone, Mail, Star, Edit2, Trash2, X,
  Settings, History, Bell, Activity
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
  providerName?: string;
  completedDate?: string;
  serviceMileage?: number;
  totalCost: number;
  status: string;
  isEmergency: boolean;
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
  const [activeTab, setActiveTab] = useState<'overview' | 'schedules' | 'records' | 'providers' | 'parts'>('overview');
  
  // Data states
  const [stats, setStats] = useState<MaintenanceStats | null>(null);
  const [schedules, setSchedules] = useState<MaintenanceSchedule[]>([]);
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [providers, setProviders] = useState<ServiceProvider[]>([]);
  const [parts, setParts] = useState<SparePart[]>([]);
  const [reminders, setReminders] = useState<MaintenanceReminder[]>([]);
  const [downtime, setDowntime] = useState<VehicleDowntime[]>([]);
  
  // Loading states
  const [loading, setLoading] = useState(true);
  const [loadingTab, setLoadingTab] = useState(false);
  
  // Modal states
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [showProviderModal, setShowProviderModal] = useState(false);
  const [showPartModal, setShowPartModal] = useState(false);
  
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
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (activeTab === 'schedules') loadSchedules();
    else if (activeTab === 'records') loadRecords();
    else if (activeTab === 'providers') loadProviders();
    else if (activeTab === 'parts') loadParts();
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
                          <span className="text-sm text-gray-900 capitalize">{schedule.scheduleType.replace('_', ' ')}</span>
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
      </div>
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
