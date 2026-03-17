import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Car, Users, AlertTriangle, Fuel, Package, Receipt,
  TrendingUp, Activity, Clock, CheckCircle, ArrowRight
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { api } from '../services/api';
import { DashboardAnalytics, Alert, Requisition } from '../types/fleet';
import DashboardLayout from '../components/Layout';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';

const COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6'];

export default function FleetDashboard() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [loading, setLoading] = useState(true);
  const isManager = user?.role === 'admin' || user?.role === 'manager';

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    loadDashboardData();
  }, [isAuthenticated, navigate]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [analyticsRes, alertsRes, requisitionsRes] = await Promise.all([
        api.getDashboardAnalytics('30d'),
        api.getAlerts({ status: 'unread', limit: 5 }),
        api.getRequisitions({ status: 'pending' }),
      ]);

      if (analyticsRes.success) {
        setAnalytics(analyticsRes.data || null);
      }
      if (alertsRes.success) {
        setAlerts(alertsRes.data?.items || []);
      }
      if (requisitionsRes.success) {
        setRequisitions(requisitionsRes.data?.items?.slice(0, 5) || []);
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500" />
        </div>
      </DashboardLayout>
    );
  }

  const stats = [
    {
      name: 'Total Vehicles',
      value: analytics?.vehicleStats.total || 0,
      icon: Car,
      color: 'bg-blue-500',
      link: '/vehicles',
      subtext: `${analytics?.vehicleStats.available || 0} available`,
    },
    {
      name: 'Active Drivers',
      value: analytics?.driverStats.active || 0,
      icon: Users,
      color: 'bg-green-500',
      link: '/drivers',
      subtext: `${analytics?.driverStats.total || 0} total`,
    },
    {
      name: 'Active Trips',
      value: analytics?.summary.activeTrips || 0,
      icon: Activity,
      color: 'bg-amber-500',
      link: '/trips',
      subtext: 'In progress now',
    },
    {
      name: 'Pending Requisitions',
      value: analytics?.summary.pendingRequisitions || 0,
      icon: Receipt,
      color: 'bg-purple-500',
      link: '/requisitions',
      subtext: 'Awaiting approval',
    },
  ];

  const managerStats = isManager ? [
    {
      name: 'Fuel Cost (30d)',
      value: `KSH ${(analytics?.fuelStats.totalCost || 0).toLocaleString()}`,
      icon: Fuel,
      color: 'bg-red-500',
      link: '/fuel',
      subtext: `${analytics?.fuelStats.totalLiters.toFixed(0) || 0} liters`,
    },
    {
      name: 'Low Stock Items',
      value: analytics?.inventoryStats.lowStockCount || 0,
      icon: Package,
      color: 'bg-orange-500',
      link: '/inventory',
      subtext: 'Need reordering',
    },
    {
      name: 'Overdue Invoices',
      value: analytics?.summary.overdueInvoices || 0,
      icon: Receipt,
      color: 'bg-red-600',
      link: '/invoices',
      subtext: 'Action required',
    },
    {
      name: 'Audit Score',
      value: `${(analytics?.auditStats.averageScore || 0).toFixed(1)}%`,
      icon: CheckCircle,
      color: 'bg-teal-500',
      link: '/audits',
      subtext: 'Average rating',
    },
  ] : [];

  const auditData = analytics?.auditStats.byMaturityRating
    ? Object.entries(analytics.auditStats.byMaturityRating).map(([name, value]) => ({
        name,
        value,
      }))
    : [];

  const fuelData = [
    { name: 'Week 1', cost: 45000, liters: 320 },
    { name: 'Week 2', cost: 52000, liters: 380 },
    { name: 'Week 3', cost: 48000, liters: 350 },
    { name: 'Week 4', cost: 55000, liters: 400 },
  ];

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {user?.firstName}!
          </h1>
          <p className="mt-1 text-gray-600">
            Here's what's happening with your fleet today
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((stat) => (
            <button
              key={stat.name}
              onClick={() => navigate(stat.link)}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 text-left hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                  <p className="mt-2 text-3xl font-bold text-gray-900">{stat.value}</p>
                  <p className="mt-1 text-sm text-gray-500">{stat.subtext}</p>
                </div>
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <stat.icon className="h-6 w-6 text-white" />
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Manager Stats */}
        {isManager && managerStats.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {managerStats.map((stat) => (
              <button
                key={stat.name}
                onClick={() => navigate(stat.link)}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 text-left hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                    <p className="mt-2 text-2xl font-bold text-gray-900">{stat.value}</p>
                    <p className="mt-1 text-sm text-gray-500">{stat.subtext}</p>
                  </div>
                  <div className={`${stat.color} p-3 rounded-lg`}>
                    <stat.icon className="h-6 w-6 text-white" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Charts Column */}
          <div className="lg:col-span-2 space-y-8">
            {/* Fuel Trends */}
            {isManager && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Fuel Consumption Trends</h3>
                  <button
                    onClick={() => navigate('/fuel')}
                    className="text-sm text-amber-600 hover:text-amber-700 flex items-center"
                  >
                    View details <ArrowRight className="h-4 w-4 ml-1" />
                  </button>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={fuelData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip />
                      <Bar yAxisId="left" dataKey="cost" name="Cost (KSH)" fill="#f59e0b" />
                      <Bar yAxisId="right" dataKey="liters" name="Liters" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Audit Performance */}
            {isManager && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Audit Performance Distribution</h3>
                  <button
                    onClick={() => navigate('/audits')}
                    className="text-sm text-amber-600 hover:text-amber-700 flex items-center"
                  >
                    View all audits <ArrowRight className="h-4 w-4 ml-1" />
                  </button>
                </div>
                <div className="h-64 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={auditData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {auditData.map((_entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { name: 'Request Vehicle', icon: Car, action: () => navigate('/requisitions/new'), color: 'bg-blue-100 text-blue-600' },
                  { name: 'Start Trip', icon: TrendingUp, action: () => navigate('/trips/new'), color: 'bg-green-100 text-green-600' },
                  { name: 'Report Issue', icon: AlertTriangle, action: () => navigate('/alerts/new'), color: 'bg-red-100 text-red-600' },
                  { name: 'View Training', icon: Clock, action: () => navigate('/training'), color: 'bg-purple-100 text-purple-600' },
                ].map((action) => (
                  <button
                    key={action.name}
                    onClick={action.action}
                    className="flex flex-col items-center p-4 rounded-lg border border-gray-200 hover:border-amber-500 hover:bg-amber-50 transition-colors"
                  >
                    <div className={`p-3 rounded-lg ${action.color} mb-2`}>
                      <action.icon className="h-6 w-6" />
                    </div>
                    <span className="text-sm font-medium text-gray-900">{action.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar Column */}
          <div className="space-y-8">
            {/* Alerts Panel */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <AlertTriangle className="h-5 w-5 mr-2 text-red-500" />
                  Alerts
                </h3>
                <button
                  onClick={() => navigate('/alerts')}
                  className="text-sm text-amber-600 hover:text-amber-700"
                >
                  View all
                </button>
              </div>
              {alerts.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No unread alerts</p>
              ) : (
                <div className="space-y-3">
                  {alerts.slice(0, 5).map((alert) => (
                    <div
                      key={alert.id}
                      className="flex items-start p-3 rounded-lg bg-gray-50 hover:bg-gray-100 cursor-pointer"
                      onClick={() => navigate('/alerts')}
                    >
                      <div className={`w-2 h-2 rounded-full mt-2 mr-3 ${
                        alert.severity === 'critical' ? 'bg-red-500' :
                        alert.severity === 'high' ? 'bg-orange-500' :
                        alert.severity === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{alert.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{alert.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pending Requisitions */}
            {isManager && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Pending Requisitions</h3>
                  <button
                    onClick={() => navigate('/requisitions')}
                    className="text-sm text-amber-600 hover:text-amber-700"
                  >
                    View all
                  </button>
                </div>
                {requisitions.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No pending requisitions</p>
                ) : (
                  <div className="space-y-3">
                    {requisitions.map((req) => (
                      <div
                        key={req.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 cursor-pointer"
                        onClick={() => navigate(`/requisitions/${req.id}`)}
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-900">{req.requestNumber}</p>
                          <p className="text-xs text-gray-500">{req.purpose}</p>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          req.priority === 'urgent' ? 'bg-red-100 text-red-700' :
                          req.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {req.priority}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Recent Activity */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
              <div className="space-y-4">
                {[
                  { action: 'Vehicle assigned', detail: 'KBC 123X → John Doe', time: '2 min ago', icon: Car },
                  { action: 'Trip completed', detail: 'KYZ 789A - 45km', time: '15 min ago', icon: Activity },
                  { action: 'Fuel transaction', detail: 'KSH 5,000 - Shell', time: '1 hour ago', icon: Fuel },
                  { action: 'Audit completed', detail: 'Vehicle inspection #124', time: '3 hours ago', icon: CheckCircle },
                ].map((item, i) => (
                  <div key={i} className="flex items-start space-x-3">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <item.icon className="h-4 w-4 text-gray-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{item.action}</p>
                      <p className="text-xs text-gray-500">{item.detail}</p>
                    </div>
                    <span className="text-xs text-gray-400">{item.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
