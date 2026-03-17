import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Plus, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { api } from '../services/api';
import { Requisition } from '../types/fleet';
import DashboardLayout from '../components/Layout';

export default function RequisitionsPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const isManager = user?.role === 'admin' || user?.role === 'manager';

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    loadRequisitions();
  }, [isAuthenticated, navigate, activeTab]);

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

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Vehicle Requisitions</h1>
          <button
            onClick={() => alert('New requisition form coming soon')}
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
                              {req.status.replace('_', ' ')}
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
                          onClick={() => api.approveRequisition(req.id)}
                          className="px-4 py-2 bg-green-500 text-white text-sm font-medium rounded-lg hover:bg-green-600"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => api.rejectRequisition(req.id, 'Rejected by manager')}
                          className="px-4 py-2 bg-red-500 text-white text-sm font-medium rounded-lg hover:bg-red-600"
                        >
                          Reject
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
    </DashboardLayout>
  );
}
