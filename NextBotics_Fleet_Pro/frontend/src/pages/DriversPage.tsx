import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Plus, Search, Phone, Award } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { api } from '../services/api';
import { Driver } from '../types/fleet';
import DashboardLayout from '../components/Layout';

export default function DriversPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    loadDrivers();
  }, [isAuthenticated, navigate]);

  const loadDrivers = async () => {
    try {
      setLoading(true);
      const response = await api.getDrivers({ limit: 50 });
      if (response.success) {
        // Backend returns { items: [], total, page, perPage }
        setDrivers(response.data?.items || []);
      }
    } catch (error) {
      console.error('Failed to load drivers:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredDrivers = drivers.filter(d =>
    (d.firstName || '').toLowerCase().includes(search.toLowerCase()) ||
    (d.lastName || '').toLowerCase().includes(search.toLowerCase()) ||
    (d.licenseNumber || '').toLowerCase().includes(search.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700';
      case 'on_leave': return 'bg-yellow-100 text-yellow-700';
      case 'suspended': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Drivers</h1>
          <button
            onClick={() => alert('Add driver feature coming soon')}
            className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 bg-amber-500 text-slate-900 rounded-lg font-medium hover:bg-amber-600 transition-colors"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Driver
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search drivers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
              {filteredDrivers.length === 0 ? (
                <p className="text-gray-500 text-center col-span-full py-12">No drivers found</p>
              ) : (
                filteredDrivers.map((driver) => (
                  <div
                    key={driver.id}
                    className="bg-gray-50 rounded-xl p-5 border border-gray-200 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center">
                        <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center">
                          <Users className="h-6 w-6 text-amber-600" />
                        </div>
                        <div className="ml-3">
                          <h3 className="font-semibold text-gray-900">{driver.firstName} {driver.lastName}</h3>
                          <p className="text-sm text-gray-500">{driver.employeeNumber || 'No ID'}</p>
                        </div>
                      </div>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full capitalize ${getStatusColor(driver.employmentStatus)}`}>
                        {(driver.employmentStatus || '').replace('_', ' ')}
                      </span>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center text-gray-600">
                        <Phone className="h-4 w-4 mr-2" />
                        {driver.phone}
                      </div>
                      <div className="flex items-center text-gray-600">
                        <Award className="h-4 w-4 mr-2" />
                        License: {driver.licenseNumber} (Cat {driver.licenseCategory})
                      </div>
                      <div className="flex items-center text-gray-600">
                        <span className="text-gray-500">Expires: {new Date(driver.licenseExpiry).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-gray-500">Safety Score</p>
                          <p className="text-lg font-semibold text-gray-900">{driver.safetyScore}/100</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500">Total Trips</p>
                          <p className="text-lg font-semibold text-gray-900">{driver.totalTrips}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
