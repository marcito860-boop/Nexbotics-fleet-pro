import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navigation, Plus, Search, Play, CheckCircle, AlertTriangle, Clock, Route, Truck, User, Calendar, X } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { api } from '../services/api';
import { PlannedRoute, Vehicle, Driver } from '../types/fleet';
import DashboardLayout from '../components/Layout';

interface PlannedRouteWithJoins extends PlannedRoute {
  vehicle?: {
    id: string;
    registrationNumber: string;
    make: string;
    model: string;
  };
  driver?: string;
  deviationAlerts?: number;
  startLocation?: string;
  endLocation?: string;
}

interface RouteFormData {
  routeName: string;
  vehicleId: string;
  driverId: string;
  plannedStops: Array<{
    sequence: number;
    location: string;
    latitude?: number;
    longitude?: number;
    estimatedArrival: string;
    estimatedDeparture: string;
  }>;
  plannedDistance: number;
  plannedDuration: number;
  notes: string;
}

interface RouteAnalytics {
  totalRoutes: number;
  activeRoutes: number;
  completedRoutes: number;
  avgDeviation: number;
  totalDistance: number;
}

const initialFormData: RouteFormData = {
  routeName: '',
  vehicleId: '',
  driverId: '',
  plannedStops: [],
  plannedDistance: 0,
  plannedDuration: 0,
  notes: '',
};

export default function RoutePlanningPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const [routes, setRoutes] = useState<PlannedRouteWithJoins[]>([]);
  const [activeRoutes, setActiveRoutes] = useState<PlannedRouteWithJoins[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [analytics, setAnalytics] = useState<RouteAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<PlannedRouteWithJoins | null>(null);
  
  // Form states
  const [formData, setFormData] = useState<RouteFormData>(initialFormData);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [stopInput, setStopInput] = useState('');

  const isManager = user?.role === 'admin' || user?.role === 'manager';

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    loadData();
  }, [isAuthenticated, navigate]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [routesRes, activeRes, vehiclesRes, driversRes, analyticsRes] = await Promise.all([
        api.get('/fleet/route-planning'),
        api.get('/fleet/route-planning/active'),
        api.getVehicles({ limit: 100 }),
        api.getDrivers({ limit: 100 }),
        api.get('/fleet/routes/analytics'),
      ]);
      
      if (routesRes.data.success) {
        setRoutes(routesRes.data.data?.routes || []);
      }
      if (activeRes.data.success) {
        setActiveRoutes(activeRes.data.data?.routes || []);
      }
      if (vehiclesRes.success) {
        setVehicles(vehiclesRes.data?.items || []);
      }
      if (driversRes.success) {
        setDrivers(driversRes.data?.items || []);
      }
      if (analyticsRes.data?.success) {
        setAnalytics(analyticsRes.data.data);
      }
    } catch (error) {
      console.error('Failed to load routes:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredRoutes = routes.filter(r => {
    const matchesSearch = (r.routeName || '').toLowerCase().includes(search.toLowerCase()) ||
      (r.vehicle?.registrationNumber || '').toLowerCase().includes(search.toLowerCase()) ||
      r.plannedStops.some(s => s.location.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const payload = {
        routeName: formData.routeName,
        vehicleId: formData.vehicleId || undefined,
        driverId: formData.driverId || undefined,
        plannedStops: formData.plannedStops,
        plannedDistance: formData.plannedDistance,
        plannedDuration: formData.plannedDuration,
        notes: formData.notes || undefined,
      };
      
      const response = await api.post('/fleet/route-planning', payload);
      if (response.data.success) {
        setShowCreateModal(false);
        setFormData(initialFormData);
        loadData();
      } else {
        setError(response.data.error || 'Failed to create route');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create route');
    } finally {
      setSaving(false);
    }
  };

  const handleStartRoute = async (routeId: string) => {
    try {
      const response = await api.post(`/fleet/route-planning/${routeId}/start`, {});
      if (response.data.success) {
        loadData();
      }
    } catch (error) {
      console.error('Failed to start route:', error);
    }
  };

  const handleCompleteRoute = async (routeId: string) => {
    try {
      const response = await api.post(`/fleet/route-planning/${routeId}/complete`, { 
        actualDistance: 0
      });
      if (response.data.success) {
        loadData();
      }
    } catch (error) {
      console.error('Failed to complete route:', error);
    }
  };

  const addStop = () => {
    if (stopInput.trim()) {
      const now = new Date();
      const arrival = new Date(now.getTime() + formData.plannedStops.length * 60 * 60 * 1000);
      const departure = new Date(arrival.getTime() + 30 * 60 * 1000);
      
      setFormData({
        ...formData,
        plannedStops: [...formData.plannedStops, {
          sequence: formData.plannedStops.length + 1,
          location: stopInput.trim(),
          estimatedArrival: arrival.toISOString(),
          estimatedDeparture: departure.toISOString(),
        }]
      });
      setStopInput('');
    }
  };

  const removeStop = (index: number) => {
    const newStops = formData.plannedStops.filter((_, i) => i !== index)
      .map((s, i) => ({ ...s, sequence: i + 1 }));
    setFormData({
      ...formData,
      plannedStops: newStops
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'planned':
        return <Calendar className="h-5 w-5 text-blue-500" />;
      case 'in_progress':
        return <Play className="h-5 w-5 text-green-500" />;
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-gray-500" />;
      case 'cancelled':
        return <X className="h-5 w-5 text-red-500" />;
      default:
        return <Route className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'planned':
        return 'bg-blue-100 text-blue-800';
      case 'in_progress':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatStatus = (status: string) => {
    return status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const getStartLocation = (route: PlannedRouteWithJoins) => {
    return route.plannedStops[0]?.location || route.startLocation || 'N/A';
  };

  const getEndLocation = (route: PlannedRouteWithJoins) => {
    return route.plannedStops[route.plannedStops.length - 1]?.location || route.endLocation || 'N/A';
  };

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Route Planning</h1>
            <p className="text-gray-500 mt-1">Plan and track vehicle routes with deviation detection</p>
          </div>
          {isManager && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors"
            >
              <Plus className="h-5 w-5 mr-2" />
              Plan Route
            </button>
          )}
        </div>

        {/* Analytics Cards */}
        {analytics && (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <p className="text-sm text-gray-500">Total Routes</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.totalRoutes}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <p className="text-sm text-gray-500">Active</p>
              <p className="text-2xl font-bold text-green-600">{analytics.activeRoutes}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <p className="text-sm text-gray-500">Completed</p>
              <p className="text-2xl font-bold text-blue-600">{analytics.completedRoutes}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <p className="text-sm text-gray-500">Avg Deviation</p>
              <p className="text-2xl font-bold text-amber-600">{analytics.avgDeviation.toFixed(1)}%</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <p className="text-sm text-gray-500">Total Distance</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.totalDistance.toFixed(0)} km</p>
            </div>
          </div>
        )}

        {/* Active Routes */}
        {activeRoutes.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Active Routes</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeRoutes.map((route) => (
                <div key={route.id} className="bg-white rounded-xl shadow-sm border-2 border-green-200 p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Play className="h-5 w-5 text-green-500" />
                      <h3 className="font-semibold text-gray-900">{route.routeName}</h3>
                    </div>
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                      In Progress
                    </span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4 text-gray-400" />
                      <span>{route.vehicle?.registrationNumber || 'Unassigned'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-400" />
                      <span>{route.driver || 'Unassigned'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Navigation className="h-4 w-4 text-gray-400" />
                      <span className="truncate">{getStartLocation(route)} → {getEndLocation(route)}</span>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => handleCompleteRoute(route.id)}
                      className="flex-1 px-3 py-2 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600 transition-colors"
                    >
                      Complete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search routes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
          >
            <option value="all">All Status</option>
            <option value="planned">Planned</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {/* Routes List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin h-8 w-8 border-2 border-amber-500 border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-gray-500">Loading routes...</p>
            </div>
          ) : filteredRoutes.length === 0 ? (
            <div className="p-8 text-center">
              <Route className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No routes found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">Route</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">Vehicle/Driver</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">Stops</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">Est. Distance</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">Status</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredRoutes.map((route) => (
                    <tr key={route.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {getStatusIcon(route.status)}
                          <div>
                            <p className="font-medium text-gray-900">{route.routeName}</p>
                            <p className="text-sm text-gray-500">
                              {route.plannedStops.length} stops
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm">
                          <p className="text-gray-900">{route.vehicle?.registrationNumber || 'Unassigned'}</p>
                          <p className="text-gray-500">{route.driver || 'Unassigned'}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm space-y-1">
                          {route.plannedStops.slice(0, 2).map((stop, i) => (
                            <div key={i} className="text-gray-600">
                              {i + 1}. {stop.location}
                            </div>
                          ))}
                          {route.plannedStops.length > 2 && (
                            <p className="text-gray-400">+{route.plannedStops.length - 2} more</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm">
                          <p className="text-gray-900">{route.plannedDistance} km</p>
                          <p className="text-gray-500">
                            <Clock className="h-3 w-3 inline mr-1" />
                            {formatDuration(route.plannedDuration)}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusClass(route.status)}`}>
                          {formatStatus(route.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedRoute(route);
                              setShowViewModal(true);
                            }}
                            className="p-2 text-gray-600 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                          >
                            View
                          </button>
                          {route.status === 'planned' && isManager && (
                            <button
                              onClick={() => handleStartRoute(route.id)}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            >
                              <Play className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Create Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">Plan New Route</h2>
              </div>
              <form onSubmit={handleCreate} className="p-6 space-y-4">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                    {error}
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Route Name *</label>
                  <input
                    type="text"
                    value={formData.routeName}
                    onChange={(e) => setFormData({ ...formData, routeName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    placeholder="e.g. Nairobi to Mombasa Delivery"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle *</label>
                    <select
                      value={formData.vehicleId}
                      onChange={(e) => setFormData({ ...formData, vehicleId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                      required
                    >
                      <option value="">Select Vehicle</option>
                      {vehicles.map(v => (
                        <option key={v.id} value={v.id}>{v.registrationNumber} - {v.make} {v.model}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Driver</label>
                    <select
                      value={formData.driverId}
                      onChange={(e) => setFormData({ ...formData, driverId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    >
                      <option value="">Select Driver (Optional)</option>
                      {drivers.map(d => (
                        <option key={d.id} value={d.id}>{d.firstName} {d.lastName}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Planned Stops *</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={stopInput}
                      onChange={(e) => setStopInput(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                      placeholder="Add a stop location"
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addStop())}
                    />
                    <button
                      type="button"
                      onClick={addStop}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Add
                    </button>
                  </div>
                  {formData.plannedStops.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {formData.plannedStops.map((stop, index) => (
                        <div key={index} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-lg">
                          <span className="text-sm">{stop.sequence}. {stop.location}</span>
                          <button
                            type="button"
                            onClick={() => removeStop(index)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Planned Distance (km)</label>
                    <input
                      type="number"
                      value={formData.plannedDistance}
                      onChange={(e) => setFormData({ ...formData, plannedDistance: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                      placeholder="e.g. 485"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Planned Duration (minutes)</label>
                    <input
                      type="number"
                      value={formData.plannedDuration}
                      onChange={(e) => setFormData({ ...formData, plannedDuration: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                      placeholder="e.g. 480"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    rows={3}
                    placeholder="Additional notes..."
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving || formData.plannedStops.length < 2}
                    className="flex-1 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50"
                  >
                    {saving ? 'Planning...' : 'Plan Route'}
                  </button>
                </div>
                {formData.plannedStops.length < 2 && (
                  <p className="text-sm text-amber-600 text-center">Add at least 2 stops to create a route</p>
                )}
              </form>
            </div>
          </div>
        )}

        {/* View Modal */}
        {showViewModal && selectedRoute && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
              <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Route Details</h2>
                <button
                  onClick={() => setShowViewModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-4">
                  {getStatusIcon(selectedRoute.status)}
                  <div>
                    <h3 className="font-semibold text-gray-900">{selectedRoute.routeName}</h3>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusClass(selectedRoute.status)}`}>
                      {formatStatus(selectedRoute.status)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Vehicle</p>
                    <p className="font-medium">{selectedRoute.vehicle?.registrationNumber || 'Unassigned'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Driver</p>
                    <p className="font-medium">{selectedRoute.driver || 'Unassigned'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Planned Distance</p>
                    <p className="font-medium">{selectedRoute.plannedDistance} km</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Planned Duration</p>
                    <p className="font-medium">{formatDuration(selectedRoute.plannedDuration)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Actual Distance</p>
                    <p className="font-medium">{selectedRoute.actualDistance ? `${selectedRoute.actualDistance} km` : 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Stops</p>
                    <p className="font-medium">{selectedRoute.plannedStops.length}</p>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <p className="text-gray-500 text-sm mb-2">Planned Stops</p>
                  <div className="space-y-2">
                    {selectedRoute.plannedStops.map((stop, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${
                          i === 0 ? 'bg-green-500' : 
                          i === selectedRoute.plannedStops.length - 1 ? 'bg-red-500' : 
                          'bg-amber-500'
                        }`} />
                        <span className="text-sm">{stop.sequence}. {stop.location}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {selectedRoute.deviationAlerts && selectedRoute.deviationAlerts > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                      <p className="text-red-700 font-medium">{selectedRoute.deviationAlerts} deviation alerts</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
