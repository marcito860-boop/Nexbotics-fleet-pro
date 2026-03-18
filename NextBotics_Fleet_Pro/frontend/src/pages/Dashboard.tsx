import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, Building2, Settings, Shield, 
  ChevronRight, User as UserIcon 
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, company, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  if (!user) return null;

  const stats = [
    { name: 'Role', value: (user.role || '').charAt(0).toUpperCase() + (user.role || '').slice(1), icon: Shield },
    { name: 'Company', value: company?.name || 'N/A', icon: Building2 },
    { name: 'Status', value: 'Active', icon: UserIcon },
  ];

  const quickActions = [
    {
      name: 'Manage Users',
      description: 'Add, edit, or remove team members',
      icon: Users,
      href: '/users',
      show: user.role === 'admin' || user.role === 'manager',
    },
    {
      name: 'Company Settings',
      description: 'Update company information',
      icon: Building2,
      href: '/company',
      show: user.role === 'admin',
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
              <Building2 className="h-8 w-8 text-primary-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">
                NextBotics Fleet Pro
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                {user.firstName} {user.lastName}
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
            Here's an overview of your account
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 mb-8">
          {stats.map((stat) => (
            <div key={stat.name} className="card overflow-hidden">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <stat.icon className="h-6 w-6 text-gray-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        {stat.name}
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {stat.value}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <h2 className="text-lg font-medium text-gray-900 mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {quickActions.filter(a => a.show).map((action) => (
            <button
              key={action.name}
              onClick={() => navigate(action.href)}
              className="card p-6 text-left hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <action.icon className="h-6 w-6 text-primary-600" />
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
        <div className="mt-8 card p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            System Information
          </h3>
          <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-gray-500">Version</dt>
              <dd className="mt-1 text-sm text-gray-900">1.0.0</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Environment</dt>
              <dd className="mt-1 text-sm text-gray-900">Production</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">User ID</dt>
              <dd className="mt-1 text-sm text-gray-900 font-mono">{user.id}</dd>
            </div>
            {company && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Company ID</dt>
                <dd className="mt-1 text-sm text-gray-900 font-mono">{company.id}</dd>
              </div>
            )}
          </dl>
        </div>
      </main>
    </div>
  );
}
