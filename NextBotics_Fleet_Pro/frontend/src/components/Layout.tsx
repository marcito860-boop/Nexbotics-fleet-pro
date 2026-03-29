import { ReactNode, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Car, Users, ClipboardList, Route,
  Fuel, FileText, GraduationCap, ClipboardCheck, ShieldAlert,
  Package, Receipt, BarChart3, Settings, LogOut, Menu, X,
  Bell, ChevronDown, Zap, Tv, Wrench, Plug, Building2,
  FolderOpen, PieChart, Map, Database
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface DashboardLayoutProps {
  children: ReactNode;
}

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  roles?: string[];
  badge?: number;
  showFor?: 'super_admin';
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, company, clearAuth } = useAuthStore();

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  const navigation: NavItem[] = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Companies', href: '/companies', icon: Building2, showFor: 'super_admin' },
    { name: 'Fleet Overview', href: '/fleet', icon: Car, roles: ['admin', 'manager'] },
    { name: 'Vehicles', href: '/vehicles', icon: Car },
    { name: 'Drivers', href: '/drivers', icon: Users },
    { name: 'Users', href: '/users', icon: Users, roles: ['admin', 'manager'] },
    { name: 'Assignments', href: '/assignments', icon: ClipboardList },
    { name: 'Trips', href: '/trips', icon: Route },
    { name: 'Route Planning', href: '/routes', icon: Map },
    { name: 'Fuel', href: '/fuel', icon: Fuel, roles: ['admin', 'manager'] },
    { name: 'Requisitions', href: '/requisitions', icon: FileText },
    { name: 'Training', href: '/training', icon: GraduationCap },
    { name: 'Audits', href: '/audits', icon: ClipboardCheck },
    { name: 'Risk Management', href: '/risks', icon: ShieldAlert, roles: ['admin', 'manager'] },
    { name: 'Maintenance', href: '/maintenance', icon: Wrench, roles: ['admin', 'manager'] },
    { name: 'Inventory', href: '/inventory', icon: Package },
    { name: 'Documents', href: '/documents', icon: FolderOpen },
    { name: 'Invoices', href: '/invoices', icon: Receipt, roles: ['admin', 'manager'] },
    { name: 'Analytics', href: '/analytics', icon: BarChart3, roles: ['admin', 'manager'] },
    { name: 'Reports', href: '/reports', icon: PieChart, roles: ['admin', 'manager'] },
    { name: 'Integrations', href: '/integrations', icon: Plug, roles: ['admin', 'manager'] },
    { name: 'Import / Export', href: '/import-export', icon: Database, roles: ['admin', 'manager'] },
    { name: 'Live TV', href: '/tv', icon: Tv },
  ];

  const filteredNav = navigation.filter(
    (item) => {
      if (item.showFor === 'super_admin') {
        return user?.type === 'super_admin';
      }
      return !item.roles || (user?.role && item.roles.includes(user.role));
    }
  );

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-gray-900/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed lg:static inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white transform transition-transform duration-200 ease-in-out lg:transform-none',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-slate-800">
            <div className="flex items-center">
              <Zap className="h-8 w-8 text-amber-400" />
              <span className="ml-2 text-lg font-bold">Fleet Pro</span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-slate-400 hover:text-white"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
            {filteredNav.map((item) => {
              const isActive = location.pathname === item.href ||
                location.pathname.startsWith(`${item.href}/`);
              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    'flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors',
                    isActive
                      ? 'bg-amber-500 text-slate-900'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  )}
                >
                  <item.icon className="h-5 w-5 mr-3 flex-shrink-0" />
                  <span className="flex-1">{item.name}</span>
                  {item.badge ? (
                    <span className="ml-auto bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                      {item.badge}
                    </span>
                  ) : null}
                </NavLink>
              );
            })}
          </nav>

          {/* Bottom section */}
          <div className="border-t border-slate-800 p-4">
            <button
              onClick={() => navigate('/settings')}
              className="flex items-center w-full px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white rounded-lg"
            >
              <Settings className="h-5 w-5 mr-3" />
              Settings
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center w-full px-3 py-2 mt-1 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-red-400 rounded-lg"
            >
              <LogOut className="h-5 w-5 mr-3" />
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top header */}
        <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 text-gray-500 hover:text-gray-700"
            >
              <Menu className="h-6 w-6" />
            </button>
            <h1 className="ml-2 lg:ml-0 text-xl font-semibold text-gray-900">
              {company?.name || 'Fleet Management'}
            </h1>
          </div>

          <div className="flex items-center space-x-4">
            {/* Notifications */}
            <button className="relative p-2 text-gray-500 hover:text-gray-700">
              <Bell className="h-6 w-6" />
              <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full" />
            </button>

            {/* User menu */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center space-x-2 text-sm text-gray-700 hover:text-gray-900"
              >
                <div className="h-8 w-8 rounded-full bg-amber-500 flex items-center justify-center text-slate-900 font-semibold">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </div>
                <span className="hidden sm:block">{user?.firstName} {user?.lastName}</span>
                <ChevronDown className="h-4 w-4" />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900">{user?.firstName} {user?.lastName}</p>
                    <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
                  </div>
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      navigate('/change-password');
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Change Password
                  </button>
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      handleLogout();
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
