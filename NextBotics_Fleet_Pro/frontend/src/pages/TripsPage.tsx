import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Route, Plus, Clock, MapPin } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { api } from '../services/api';
import { Trip } from '../types/fleet';
import DashboardLayout from '../components/Layout';

export default function TripsPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    loadTrips();
  }, [isAuthenticated, navigate, activeTab]);

  const loadTrips = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (activeTab !== 'all') {
        params.status = activeTab;
      }
      const response = await api.getTrips(params);
      if (response.success) {
        setTrips(response.data?.items || []);
      }
    } catch (error) {
      console.error('Failed to load trips:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planned': return 'bg-gray-100 text-gray-700';
      case 'in_progress': return 'bg-amber-100 text-amber-700';
      case 'completed': return 'bg-green-100 text-green-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Trips</h1>
          <button
            onClick={() => alert('New trip feature coming soon')}
            className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 bg-amber-500 text-slate-900 rounded-lg font-medium hover:bg-amber-600"
          >
            <Plus className="h-5 w-5 mr-2" />
            Start Trip
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {['all', 'planned', 'in_progress', 'completed'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm capitalize ${
                    activeTab === tab
                      ? 'border-amber-500 text-amber-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.replace('_', ' ')}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500" />
              </div>
            ) : trips.length === 0 ? (
              <div className="text-center py-12">
                <Route className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No trips found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {trips.map((trip) => (
                  <div key={trip.id} className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start">
                        <div className="p-2 bg-white rounded-lg shadow-sm mr-4">
                          <Route className="h-5 w-5 text-amber-500" />
                        </div>
                        <div>
                          <div className="flex items-center">
                            <span className="font-semibold text-gray-900">{trip.vehicle?.registrationNumber || 'N/A'}</span>
                            <span className={`ml-3 px-2 py-0.5 text-xs font-medium rounded-full capitalize ${getStatusColor(trip.status)}`}>
                              {(trip.status || '').replace('_', ' ')}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{trip.purpose || 'No purpose'}</p>
                          <div className="flex items-center mt-2 text-sm text-gray-500 space-x-4">
                            <span className="flex items-center">
                              <Clock className="h-4 w-4 mr-1" />
                              {trip.startTime ? new Date(trip.startTime).toLocaleString() : 'N/A'}
                            </span>
                            <span className="flex items-center">
                              <MapPin className="h-4 w-4 mr-1" />
                              {(trip.distanceKm || 0).toFixed(1)} km
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">{trip.driver?.firstName} {trip.driver?.lastName}</p>
                        {trip.endTime && (
                          <p className="text-xs text-gray-400 mt-1">
                            Ended: {new Date(trip.endTime).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
