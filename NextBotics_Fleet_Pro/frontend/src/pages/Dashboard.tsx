import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, Building2, Settings, Car, UserCircle, AlertTriangle,
  ChevronRight, GraduationCap 
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { api } from '../services/api';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, company, isAuthenticated } = useAuthStore();
  const [fleetStats, setFleetStats] = useState({
    vehicles: 0,
    drivers: 0,
    alerts: 0,
    training: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    fetchFleetStats();
  }, [isAuthenticated, navigate]);

  const fetchFleetStats = async () => {
    try {
      const [vehiclesRes, driversRes, alertsRes, trainingRes] = await Promise.all([
        api.getVehicles({ limit: 1 }),
        api.getDrivers({ limit: 1 }),
        api.getAlerts({ limit: 1 }),
        api.getCourses(),
      ]);

      setFleetStats({
        vehicles: vehiclesRes.data?.total || 0,
        drivers: driversRes.data?.total || driversRes.data?.items?.length || 0,
        alerts: alertsRes.data?.total || alertsRes.data?.items?.length || 0,
        training: trainingRes.data?.total || trainingRes.data?.courses?.length || 0,
      });
    } catch (error) {
      console.error('Failed to fetch fleet stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  const stats = [
    { name: 'Vehicles', value: fleetStats.vehicles, icon: Car, color: 'text-blue-600', bg: 'bg-blue-100' },
    { name: 'Drivers', value: fleetStats.drivers, icon: UserCircle, color: 'text-green-600', bg: 'bg-green-100' },
    { name: 'Alerts', value: fleetStats.alerts, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-100' },
    { name: 'Training', value: fleetStats.training, icon: GraduationCap, color: 'text-purple-600', bg: 'bg-purple-100' },
  ];

  const quickActions = [
    {
      name: 'Fleet Overview',
      description: 'View all vehicles and fleet metrics',
      icon: Car,
      href: '/fleet',
      show: true,
    },
    {
      name: 'Manage Vehicles',
      description: 'Add, edit, or remove vehicles',
      icon: Car,
      href: '/vehicles',
      show: true,
    },
    {
      name: 'Manage Drivers',
      description: 'View and manage drivers',
      icon: Users,
      href: '/drivers',
      show: true,
    },
    {
      name: 'View Alerts',
      description: 'Check system alerts and notifications',
      icon: AlertTriangle,
      href: '/alerts',
      show: fleetStats.alerts > 0,
    },
    {
      name: 'Training',
      description: 'Access training courses',
      icon: GraduationCap,
      href: '/training',
      show: true,
    },
    {
      name: 'Change Password',
      description: 'Update your security credentials',
      icon: Settings,
      href: '/change-password',
      show: true,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Building2 className="h-8 w-8 text-amber-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">
                NextBotics Fleet Pro
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                {user.firstName} {user.lastName}
              </span>
              <span className="px-2 py-1 text-xs bg-amber-100 text-amber-800 rounded-full">
                {(user.role || '').charAt(0).toUpperCase() + (user.role || '').slice(1)}
              </span>
              <button
                onClick={() => {
                  useAuthStore.getState().clearAuth();
                  navigate('/login');
                }}
                className="text-sm text-red-600 hover:text-red-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {user.firstName}!
          </h1>
          <p className="mt-1 text-gray-600">
            {company?.name || 'Fleet Dashboard'} - Here's your fleet overview
          </p>
        </div>

        {/* Fleet Stats */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-4 mb-8">
            {stats.map((stat) => (
              <div key={stat.name} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className={`flex-shrink-0 p-3 rounded-lg ${stat.bg}`}>
                      <stat.icon className={`h-6 w-6 ${stat.color}`} />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500">{stat.name}</p>
                      <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Quick Actions */}
        <h2 className="text-lg font-medium text-gray-900 mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {quickActions.filter(a => a.show).map((action) => (
            <button
              key={action.name}
              onClick={() => navigate(action.href)}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-left hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="flex-shrink-0 p-2 bg-amber-100 rounded-lg">
                    <action.icon className="h-6 w-6 text-amber-600" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-gray-900">
                      {action.name}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {action.description}
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </div>
            </button>
          ))}
        </div>

        {/* System Info */}
        <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            System Information
          </h3>
          <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-gray-500">Company</dt>
              <dd className="mt-1 text-sm text-gray-900">{company?.name || 'N/A'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Role</dt>
              <dd className="mt-1 text-sm text-gray-900 capitalize">{user.role || 'N/A'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Version</dt>
              <dd className="mt-1 text-sm text-gray-900">1.0.0</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Environment</dt>
              <dd className="mt-1 text-sm text-gray-900">Production</dd>
            </div>
          </dl>
        </div>
      </main>
    </div>
  );
}
