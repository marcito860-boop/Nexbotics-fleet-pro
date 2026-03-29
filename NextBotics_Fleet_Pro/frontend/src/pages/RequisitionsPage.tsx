import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Plus, Clock, CheckCircle, XCircle, AlertCircle, X, Car, User } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { api } from '../services/api';
import { Requisition, Vehicle, Driver } from '../types/fleet';
import DashboardLayout from '../components/Layout';

interface RequisitionFormData {
  purpose: string;
  requiredFrom: string;
  requiredUntil: string;
  fromLocation: string;
  destination: string;
  numberOfPassengers: number;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  notes: string;
}

export default function RequisitionsPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [showAllocateModal, setShowAllocateModal] = useState(false);
  const [selectedRequisition, setSelectedRequisition] = useState<Requisition | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [selectedDriver, setSelectedDriver] = useState('');
  const [saving, setSaving] = useState(false);
  const isManager = user?.role === 'admin' || user?.role === 'manager';
  
  const [formData, setFormData] = useState<RequisitionFormData>({
    purpose: '',
    requiredFrom: '',
    requiredUntil: '',
    fromLocation: '',
    destination: '',
    numberOfPassengers: 1,
    priority: 'normal',
    notes: '',
  });

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    loadRequisitions();
    if (isManager) {
      loadVehiclesAndDrivers();
    }
  }, [isAuthenticated, navigate, activeTab]);

  const loadVehiclesAndDrivers = async () => {
    try {
      console.log('Loading vehicles and drivers...');
      const [vehiclesRes, driversRes] = await Promise.all([
        api.getVehicles(),
        api.getDrivers()
      ]);
      console.log('Vehicles response:', vehiclesRes);
      console.log('Drivers response:', driversRes);
      
      if (vehiclesRes.success) {
        const vehicleItems = vehiclesRes.data?.items || [];
        console.log(`Loaded ${vehicleItems.length} vehicles:`, vehicleItems);
        setVehicles(vehicleItems);
      } else {
        console.error('Vehicles API error:', vehiclesRes.error);
      }
      
      if (driversRes.success) {
        const driverItems = driversRes.data?.items || [];
        console.log(`Loaded ${driverItems.length} drivers:`, driverItems);
        setDrivers(driverItems);
      } else {
        console.error('Drivers API error:', driversRes.error);
      }
    } catch (error) {
      console.error('Failed to load vehicles/drivers:', error);
    }
  };

  const loadRequisitions = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (activeTab !== 'all') {
        params.status = activeTab;
      }
      if (!isManager && activeTab === 'my') {
        params.myRequests = true;
      }
      const response = await api.getRequisitions(params);
      if (response.success) {
        setRequisitions(response.data?.items || []);
      }
    } catch (error) {
      console.error('Failed to load requisitions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRequisition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.purpose || !formData.requiredFrom || !formData.requiredUntil || !formData.fromLocation || !formData.destination) {
      alert('Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      console.log('Submitting requisition:', formData);
      const response = await api.createRequisition(formData);
      console.log('Response:', response);
      if (response.success) {
        setShowModal(false);
        setFormData({
          purpose: '',
          requiredFrom: '',
          requiredUntil: '',
          fromLocation: '',
          destination: '',
          numberOfPassengers: 1,
          priority: 'normal',
          notes: '',
        });
        loadRequisitions();
      } else {
        alert(response.error || 'Failed to create requisition');
      }
    } catch (error: any) {
      console.error('Requisition error:', error);
      console.error('Error response:', error.response?.data);
      const details = error.response?.data?.details;
      let errorMsg = error.response?.data?.error || error.message || 'Error creating requisition';
      
      // Add details about what's missing
      if (details) {
        const missing = [];
        if (!details.received?.hasRequesterId) missing.push('Requester (staff record)');
        if (!details.received?.hasDeparture) missing.push('From Location');
        if (!details.received?.hasDestination) missing.push('Destination');
        if (!details.received?.hasPurpose) missing.push('Purpose');
        if (!details.received?.hasTravelDate) missing.push('Travel Date');
        
        if (missing.length > 0) {
          errorMsg += '\n\nMissing: ' + missing.join(', ');
        }
        
        if (details.staffCreationError) {
          errorMsg += '\n\nStaff creation error: ' + details.staffCreationError;
        }
      }
      
      alert(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      const response = await api.approveRequisition(id);
      if (response.success) {
        loadRequisitions();
      } else {
        alert(response.error || 'Failed to approve');
      }
    } catch (error: any) {
      alert(error.message || 'Error approving requisition');
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;
    
    try {
      const response = await api.rejectRequisition(id, reason);
      if (response.success) {
        loadRequisitions();
      } else {
        alert(response.error || 'Failed to reject');
      }
    } catch (error: any) {
      alert(error.message || 'Error rejecting requisition');
    }
  };

  const openAllocateModal = (req: Requisition) => {
    setSelectedRequisition(req);
    setSelectedVehicle('');
    setSelectedDriver('');
    setShowAllocateModal(true);
  };

  const handleAllocate = async () => {
    if (!selectedRequisition || !selectedVehicle || !selectedDriver) {
      alert('Please select both vehicle and driver');
      return;
    }
    
    setSaving(true);
    try {
      const response = await api.allocateRequisition(selectedRequisition.id, selectedVehicle, selectedDriver);
      if (response.success) {
        setShowAllocateModal(false);
        setSelectedRequisition(null);
        loadRequisitions();
      } else {
        alert(response.error || 'Failed to allocate');
      }
    } catch (error: any) {
      alert(error.message || 'Error allocating requisition');
    } finally {
      setSaving(false);
    }
  };

  const handleStart = async (id: string) => {
    const startingOdometer = prompt('Enter starting odometer reading:');
    if (!startingOdometer) return;
    
    try {
      console.log('Starting trip:', { id, startingOdometer });
      const response = await api.startRequisition(id, parseInt(startingOdometer));
      if (response.success) {
        loadRequisitions();
      } else {
        alert(response.error || 'Failed to start trip');
      }
    } catch (error: any) {
      console.error('Start trip error:', error);
      alert(error.response?.data?.error || error.message || 'Error starting trip');
    }
  };

  const handleComplete = async (id: string) => {
    const endingOdometer = prompt('Enter ending odometer reading:');
    if (!endingOdometer) return;
    
    const notes = prompt('Enter completion notes (optional):') || '';
    
    try {
      console.log('Completing trip:', { id, endingOdometer, notes });
      const response = await api.completeRequisition(id, parseInt(endingOdometer), notes);
      if (response.success) {
        loadRequisitions();
      } else {
        alert(response.error || 'Failed to complete trip');
      }
    } catch (error: any) {
      console.error('Complete trip error:', error);
      alert(error.response?.data?.error || error.message || 'Error completing trip');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'approved': return <CheckCircle className="h-5 w-5 text-blue-500" />;
      case 'allocated': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'completed': return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'rejected': return <XCircle className="h-5 w-5 text-red-500" />;
      case 'cancelled': return <XCircle className="h-5 w-5 text-gray-500" />;
      default: return <AlertCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'approved': return 'bg-blue-100 text-blue-700';
      case 'allocated': return 'bg-green-100 text-green-700';
      case 'in_progress': return 'bg-amber-100 text-amber-700';
      case 'completed': return 'bg-green-100 text-green-700';
      case 'rejected': return 'bg-red-100 text-red-700';
      case 'cancelled': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-700';
      case 'high': return 'bg-orange-100 text-orange-700';
      case 'normal': return 'bg-blue-100 text-blue-700';
      case 'low': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  // Set default dates for form
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Vehicle Requisitions</h1>
          <button
            onClick={() => {
              setFormData(prev => ({
                ...prev,
                requiredFrom: today,
                requiredUntil: tomorrow,
              }));
              setShowModal(true);
            }}
            className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 bg-amber-500 text-slate-900 rounded-lg font-medium hover:bg-amber-600 transition-colors"
          >
            <Plus className="h-5 w-5 mr-2" />
            New Requisition
          </button>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {['all', 'pending', 'approved', 'allocated', 'completed'].map((tab) => (
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
            ) : requisitions.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No requisitions found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {requisitions.map((req) => (
                  <div
                    key={req.id}
                    className="bg-gray-50 rounded-xl p-5 border border-gray-200 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start">
                        <div className="p-2 bg-white rounded-lg shadow-sm mr-4">
                          {getStatusIcon(req.status)}
                        </div>
                        <div>
                          <div className="flex items-center">
                            <h3 className="font-semibold text-gray-900">{req.requestNumber}</h3>
                            <span className={`ml-3 px-2 py-0.5 text-xs font-medium rounded-full capitalize ${getStatusColor(req.status)}`}>
                              {(req.status || '').replace('_', ' ')}
                            </span>
                            <span className={`ml-2 px-2 py-0.5 text-xs font-medium rounded-full capitalize ${getPriorityColor(req.priority)}`}>
                              {req.priority}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{req.purpose}</p>
                          <div className="flex items-center mt-2 text-sm text-gray-500">
                            <span>Requested by: {req.requester?.firstName} {req.requester?.lastName}</span>
                            <span className="mx-2">•</span>
                            <span>
                              {new Date(req.requiredFrom).toLocaleDateString()} - {new Date(req.requiredUntil).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-sm text-gray-500">
                          Created {new Date(req.createdAt).toLocaleDateString()}
                        </p>
                        {req.allocatedVehicle && (
                          <p className="text-sm text-gray-900 mt-1">
                            Assigned: {req.allocatedVehicle.registrationNumber}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    {isManager && req.status === 'pending' && (
                      <div className="mt-4 flex items-center space-x-3 pt-4 border-t border-gray-200">
                        <button
                          onClick={() => handleApprove(req.id)}
                          className="px-4 py-2 bg-green-500 text-white text-sm font-medium rounded-lg hover:bg-green-600"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(req.id)}
                          className="px-4 py-2 bg-red-500 text-white text-sm font-medium rounded-lg hover:bg-red-600"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                    
                    {isManager && req.status === 'approved' && (
                      <div className="mt-4 flex items-center space-x-3 pt-4 border-t border-gray-200">
                        <button
                          onClick={() => openAllocateModal(req)}
                          className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 flex items-center"
                        >
                          <Car className="h-4 w-4 mr-2" />
                          Allocate Vehicle
                        </button>
                      </div>
                    )}
                    
                    {req.status === 'allocated' && (
                      <div className="mt-4 flex items-center space-x-3 pt-4 border-t border-gray-200">
                        <button
                          onClick={() => handleStart(req.id)}
                          className="px-4 py-2 bg-amber-500 text-white text-sm font-medium rounded-lg hover:bg-amber-600"
                        >
                          Start Trip
                        </button>
                      </div>
                    )}
                    
                    {req.status === 'in_progress' && (
                      <div className="mt-4 flex items-center space-x-3 pt-4 border-t border-gray-200">
                        <button
                          onClick={() => handleComplete(req.id)}
                          className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700"
                        >
                          Complete Trip
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Requisition Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">New Vehicle Requisition</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleCreateRequisition} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Purpose *</label>
                <input
                  type="text"
                  value={formData.purpose}
                  onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                  placeholder="e.g., Client meeting in Nairobi"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Required From *</label>
                  <input
                    type="date"
                    value={formData.requiredFrom}
                    onChange={(e) => setFormData({ ...formData, requiredFrom: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Required Until *</label>
                  <input
                    type="date"
                    value={formData.requiredUntil}
                    onChange={(e) => setFormData({ ...formData, requiredUntil: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">From Location *</label>
                  <input
                    type="text"
                    value={formData.fromLocation}
                    onChange={(e) => setFormData({ ...formData, fromLocation: e.target.value })}
                    placeholder="e.g., Office"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Destination *</label>
                  <input
                    type="text"
                    value={formData.destination}
                    onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                    placeholder="e.g., Nairobi CBD"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Passengers</label>
                  <input
                    type="number"
                    value={formData.numberOfPassengers}
                    onChange={(e) => setFormData({ ...formData, numberOfPassengers: parseInt(e.target.value) || 1 })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500"
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional details..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500"
                  rows={3}
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
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-amber-500 text-slate-900 rounded-lg font-medium hover:bg-amber-600 disabled:opacity-50"
                >
                  {saving ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Allocate Vehicle Modal */}
      {showAllocateModal && selectedRequisition && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Allocate Vehicle & Driver</h2>
              <button
                onClick={() => setShowAllocateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Car className="h-4 w-4 inline mr-1" />
                  Select Vehicle *
                </label>
                <select
                  value={selectedVehicle}
                  onChange={(e) => setSelectedVehicle(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500"
                  required
                >
                  <option value="">Choose a vehicle...</option>
                  {vehicles.filter(v => v.status === 'available').map(v => (
                    <option key={v.id} value={v.id}>
                      {v.registrationNumber} - {v.make} {v.model}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <User className="h-4 w-4 inline mr-1" />
                  Select Driver *
                </label>
                <select
                  value={selectedDriver}
                  onChange={(e) => setSelectedDriver(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500"
                  required
                >
                  <option value="">Choose a driver...</option>
                  {drivers.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.firstName} {d.lastName} {d.phone ? `- ${d.phone}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAllocateModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAllocate}
                  disabled={saving || !selectedVehicle || !selectedDriver}
                  className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 disabled:opacity-50"
                >
                  {saving ? 'Allocating...' : 'Allocate'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
