import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Car, Users, Activity, Fuel, MapPin, Clock, AlertTriangle,
  TrendingUp, Navigation
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { api } from '../services/api';
import { DashboardAnalytics, Trip, Alert } from '../types/fleet';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';

export default function TVDisplay() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [activeTrips, setActiveTrips] = useState<Trip[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    // Update time every second
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    // Load data
    loadData();
    const dataInterval = setInterval(loadData, 30000); // Refresh every 30 seconds

    return () => {
      clearInterval(timeInterval);
      clearInterval(dataInterval);
    };
  }, [isAuthenticated, navigate]);

  const loadData = async () => {
    try {
      const [analyticsRes, tripsRes, alertsRes] = await Promise.all([
        api.getDashboardAnalytics('24h'),
        api.getTrips({ status: 'in_progress' }),
        api.getAlerts({ status: 'unread', severity: 'high' }),
      ]);

      if (analyticsRes.success) {
        setAnalytics(analyticsRes.data || null);
      }
      if (tripsRes.success) {
        setActiveTrips(tripsRes.data?.items?.slice(0, 10) || []);
      }
      if (alertsRes.success) {
        setAlerts(alertsRes.data?.items?.slice(0, 5) || []);
      }
    } catch (error) {
      console.error('Failed to load TV data:', error);
    }
  };

  const vehicleStatusData = analytics ? [
    { name: 'Available', value: analytics.vehicleStats.available, color: '#10b981' },
    { name: 'Assigned', value: analytics.vehicleStats.assigned, color: '#f59e0b' },
    { name: 'Maintenance', value: analytics.vehicleStats.maintenance, color: '#ef4444' },
  ] : [];

  const fuelTrendData = [
    { hour: '06:00', liters: 120 },
    { hour: '08:00', liters: 280 },
    { hour: '10:00', liters: 350 },
    { hour: '12:00', liters: 200 },
    { hour: '14:00', liters: 180 },
    { hour: '16:00', liters: 250 },
    { hour: '18:00', liters: 300 },
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 border-b border-slate-700 pb-4">
        <div className="flex items-center">
          <div className="bg-amber-500 p-3 rounded-lg mr-4">
            <Activity className="h-8 w-8 text-slate-900" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Fleet Operations Center</h1>
            <p className="text-slate-400">Live Operations Dashboard</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-4xl font-mono font-bold">
            {currentTime.toLocaleTimeString('en-US', { hour12: false })}
          </p>
          <p className="text-slate-400">
            {currentTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm uppercase tracking-wider">Total Vehicles</p>
              <p className="text-5xl font-bold mt-2">{analytics?.vehicleStats.total || 0}</p>
            </div>
            <div className="bg-blue-500/20 p-4 rounded-xl">
              <Car className="h-10 w-10 text-blue-400" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-green-400 flex items-center">
              <TrendingUp className="h-4 w-4 mr-1" />
              {analytics?.vehicleStats.available || 0} available
            </span>
          </div>
        </div>

        <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm uppercase tracking-wider">Active Trips</p>
              <p className="text-5xl font-bold mt-2">{analytics?.summary.activeTrips || 0}</p>
            </div>
            <div className="bg-amber-500/20 p-4 rounded-xl">
              <Navigation className="h-10 w-10 text-amber-400" />
            </div>
          </div>
          <div className="mt-4 text-sm text-slate-400">
            {activeTrips.length} vehicles on road now
          </div>
        </div>

        <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm uppercase tracking-wider">Active Drivers</p>
              <p className="text-5xl font-bold mt-2">{analytics?.driverStats.active || 0}</p>
            </div>
            <div className="bg-green-500/20 p-4 rounded-xl">
              <Users className="h-10 w-10 text-green-400" />
            </div>
          </div>
          <div className="mt-4 text-sm text-slate-400">
            {analytics?.driverStats.onLeave || 0} on leave
          </div>
        </div>

        <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm uppercase tracking-wider">Fuel Today</p>
              <p className="text-5xl font-bold mt-2">
                KSH {(analytics?.fuelStats.totalCost || 0).toLocaleString()}
              </p>
            </div>
            <div className="bg-red-500/20 p-4 rounded-xl">
              <Fuel className="h-10 w-10 text-red-400" />
            </div>
          </div>
          <div className="mt-4 text-sm text-slate-400">
            {(analytics?.fuelStats.totalLiters || 0).toFixed(0)} liters consumed
          </div>
        </div>
      </div>

      {/* Middle Section */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        {/* Vehicle Status Chart */}
        <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
          <h3 className="text-lg font-semibold mb-4">Vehicle Status</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={vehicleStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {vehicleStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Fuel Trend */}
        <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
          <h3 className="text-lg font-semibold mb-4">Today's Fuel Consumption</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={fuelTrendData}>
                <XAxis dataKey="hour" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Bar dataKey="liters" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Critical Alerts */}
        <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2 text-red-400" />
              Critical Alerts
            </h3>
            <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
              {alerts.length}
            </span>
          </div>
          <div className="space-y-3 max-h-48 overflow-y-auto">
            {alerts.length === 0 ? (
              <p className="text-slate-400 text-center py-8">No critical alerts</p>
            ) : (
              alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="bg-red-500/10 border border-red-500/30 rounded-lg p-3"
                >
                  <p className="font-medium text-red-400">{alert.title}</p>
                  <p className="text-sm text-slate-400 mt-1">{alert.message}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Bottom Section - Active Trips */}
      <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <MapPin className="h-5 w-5 mr-2 text-green-400" />
          Active Trips
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeTrips.length === 0 ? (
            <p className="text-slate-400 col-span-full text-center py-8">No active trips</p>
          ) : (
            activeTrips.slice(0, 6).map((trip) => (
              <div
                key={trip.id}
                className="bg-slate-700/50 rounded-xl p-4 flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center">
                    <Car className="h-5 w-5 text-amber-400 mr-2" />
                    <span className="font-semibold">{trip.vehicle?.registrationNumber}</span>
                  </div>
                  <p className="text-sm text-slate-400 mt-1">
                    {trip.driver?.firstName} {trip.driver?.lastName}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">{trip.purpose}</p>
                </div>
                <div className="text-right">
                  <div className="flex items-center text-green-400">
                    <Clock className="h-4 w-4 mr-1" />
                    <span className="text-sm">
                      {Math.round((Date.now() - new Date(trip.startTime).getTime()) / 60000)} min
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {trip.distanceKm.toFixed(1)} km
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 flex items-center justify-between text-slate-500 text-sm">
        <p>NextBotics Fleet Pro - Live Operations</p>
        <p>Auto-refresh every 30 seconds</p>
      </div>
    </div>
  );
}
