import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Route, Plus, Clock, MapPin, X } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { api } from '../services/api';
import { Trip, Vehicle, Driver } from '../types/fleet';
import DashboardLayout from '../components/Layout';

interface TripFormData {
  vehicleId: string;
  driverId: string;
  purpose: string;
  startLocation: string;
  endLocation: string;
  estimatedDistanceKm: number;
}

export default function TripsPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<TripFormData>({
    vehicleId: '',
    driverId: '',
    purpose: '',
    startLocation: '',
    endLocation: '',
    estimatedDistanceKm: 0,
  });

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    loadTrips();
    loadVehiclesAndDrivers();
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

  const loadVehiclesAndDrivers = async () => {
    try {
      const [vehiclesRes, driversRes] = await Promise.all([
        api.getVehicles({ limit: 100 }),
        api.getDrivers({ limit: 100 }),
      ]);
      if (vehiclesRes.success) {
        setVehicles(vehiclesRes.data?.items || []);
      }
      if (driversRes.success) {
        setDrivers(driversRes.data?.items || []);
      }
    } catch (error) {
      console.error('Failed to load vehicles/drivers:', error);
    }
  };

  const handleCreateTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.vehicleId || !formData.driverId || !formData.purpose) {
      alert('Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      const response = await api.createTrip({
        ...formData,
        status: 'planned',
      });
      if (response.success) {
        setShowModal(false);
        setFormData({
          vehicleId: '',
          driverId: '',
          purpose: '',
          startLocation: '',
          endLocation: '',
          estimatedDistanceKm: 0,
        });
        loadTrips();
      } else {
        alert(response.error || 'Failed to create trip');
      }
    } catch (error: any) {
      alert(error.message || 'Error creating trip');
    } finally {
      setSaving(false);
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

  const availableVehicles = vehicles.filter(v => v.status === 'available');

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Trips</h1>
          <button
            onClick={() => setShowModal(true)}
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

      {/* Create Trip Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Create New Trip</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleCreateTrip} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle *</label>
                <select
                  value={formData.vehicleId}
                  onChange={(e) => setFormData({ ...formData, vehicleId: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500"
                  required
                >
                  <option value="">Select Vehicle</option>
                  {availableVehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.registrationNumber} - {v.make} {v.model}
                    </option>
                  ))}
                </select>
                {availableVehicles.length === 0 && (
                  <p className="text-sm text-red-500 mt-1">No available vehicles. All vehicles are assigned or in maintenance.</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Driver *</label>
                <select
                  value={formData.driverId}
                  onChange={(e) => setFormData({ ...formData, driverId: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500"
                  required
                >
                  <option value="">Select Driver</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.firstName} {d.lastName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Purpose *</label>
                <input
                  type="text"
                  value={formData.purpose}
                  onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                  placeholder="e.g., Delivery to Nairobi"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Location</label>
                <input
                  type="text"
                  value={formData.startLocation}
                  onChange={(e) => setFormData({ ...formData, startLocation: e.target.value })}
                  placeholder="e.g., Main Office"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Location</label>
                <input
                  type="text"
                  value={formData.endLocation}
                  onChange={(e) => setFormData({ ...formData, endLocation: e.target.value })}
                  placeholder="e.g., Client Site"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Distance (km)</label>
                <input
                  type="number"
                  value={formData.estimatedDistanceKm}
                  onChange={(e) => setFormData({ ...formData, estimatedDistanceKm: parseFloat(e.target.value) || 0 })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500"
                  min="0"
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !formData.vehicleId || !formData.driverId}
                  className="flex-1 px-4 py-2 bg-amber-500 text-slate-900 rounded-lg font-medium hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Creating...' : 'Create Trip'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
