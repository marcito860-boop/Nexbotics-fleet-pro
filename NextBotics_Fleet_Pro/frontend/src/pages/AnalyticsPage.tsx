import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, BarChart3, PieChart, Activity } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { api } from '../services/api';
import { DashboardAnalytics, FleetUtilization } from '../types/fleet';
import DashboardLayout from '../components/Layout';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RePieChart, Pie, Cell, LineChart, Line
} from 'recharts';

const COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6'];

export default function AnalyticsPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [utilization, setUtilization] = useState<FleetUtilization | null>(null);
  const [period, setPeriod] = useState('30d');

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (user?.role !== 'admin' && user?.role !== 'manager') {
      navigate('/dashboard');
      return;
    }
    loadAnalytics();
  }, [isAuthenticated, navigate, user, period]);

  const loadAnalytics = async () => {
    try {
      const [analyticsRes, utilizationRes] = await Promise.all([
        api.getDashboardAnalytics(period),
        api.getFleetUtilization(),
      ]);
      if (analyticsRes.success) {
        setAnalytics(analyticsRes.data || null);
      }
      if (utilizationRes.success) {
        setUtilization(utilizationRes.data || null);
      }
    } catch (error) {
      console.error('Failed to load analytics:', error);
    }
  };

  const auditData = analytics?.auditStats.byMaturityRating
    ? Object.entries(analytics.auditStats.byMaturityRating).map(([name, value]) => ({ name, value }))
    : [];

  const utilizationData = utilization?.utilizationByType || [];

  const fuelTrendData = [
    { day: 'Mon', cost: 15000, liters: 110 },
    { day: 'Tue', cost: 18000, liters: 130 },
    { day: 'Wed', cost: 12000, liters: 90 },
    { day: 'Thu', cost: 22000, liters: 160 },
    { day: 'Fri', cost: 25000, liters: 180 },
    { day: 'Sat', cost: 8000, liters: 60 },
    { day: 'Sun', cost: 5000, liters: 40 },
  ];

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
            <p className="mt-1 text-gray-600">Fleet performance metrics and insights</p>
          </div>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="mt-4 sm:mt-0 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-amber-500"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">Total Trips</p>
                <p className="text-2xl font-bold text-gray-900">{utilization?.totalTrips || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-lg">
                <Activity className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">Total Distance</p>
                <p className="text-2xl font-bold text-gray-900">{(utilization?.totalDistance || 0).toFixed(0)} km</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center">
              <div className="p-3 bg-amber-100 rounded-lg">
                <BarChart3 className="h-6 w-6 text-amber-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">Fuel Cost</p>
                <p className="text-2xl font-bold text-gray-900">KSH {(analytics?.fuelStats.totalCost || 0).toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 rounded-lg">
                <PieChart className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">Audit Score</p>
                <p className="text-2xl font-bold text-gray-900">{(analytics?.auditStats.averageScore || 0).toFixed(1)}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Fuel Trend */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Fuel Consumption Trend</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={fuelTrendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Line yAxisId="left" type="monotone" dataKey="cost" stroke="#f59e0b" strokeWidth={2} name="Cost (KSH)" />
                  <Line yAxisId="right" type="monotone" dataKey="liters" stroke="#3b82f6" strokeWidth={2} name="Liters" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Audit Distribution */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Audit Maturity Distribution</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RePieChart>
                  <Pie
                    data={auditData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                    outerRadius={80}
                    dataKey="value"
                  >
                    {auditData.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RePieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Utilization by Vehicle Type */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Fleet Utilization by Vehicle Type</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={utilizationData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="type" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Bar yAxisId="left" dataKey="vehicleCount" name="Total Vehicles" fill="#3b82f6" />
                <Bar yAxisId="left" dataKey="assignedCount" name="Assigned" fill="#f59e0b" />
                <Bar yAxisId="right" dataKey="totalDistance" name="Distance (km)" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
