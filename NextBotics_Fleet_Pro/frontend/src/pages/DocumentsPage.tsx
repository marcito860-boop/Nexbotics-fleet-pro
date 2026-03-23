import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Plus, Search, Calendar, AlertTriangle, CheckCircle, XCircle, Upload, Download, Eye } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { api } from '../services/api';
import { Document } from '../types/fleet';
import DashboardLayout from '../components/Layout';

interface DocumentWithDays extends Document {
  daysUntilExpiry?: number | null;
  entityName?: string;
  documentNumber?: string;
}

interface DocumentStats {
  total: number;
  valid: number;
  expiringSoon: number;
  expired: number;
  byType: {
    licenses: number;
    insurance: number;
    permits: number;
  };
}

interface DocumentFormData {
  documentType: 'vehicle_registration' | 'insurance' | 'license' | 'contract' | 'other';
  title: string;
  documentNumber: string;
  entityType: 'vehicle' | 'driver' | 'company';
  entityId: string;
  issueDate: string;
  expiryDate: string;
  fileUrl: string;
  notes: string;
}

const documentTypes = [
  { value: 'license', label: 'License', icon: '🪪' },
  { value: 'insurance', label: 'Insurance', icon: '🛡️' },
  { value: 'permit', label: 'Permit', icon: '📋' },
  { value: 'registration', label: 'Registration', icon: '📄' },
  { value: 'inspection', label: 'Inspection Certificate', icon: '🔍' },
  { value: 'other', label: 'Other', icon: '📎' },
];

const entityTypes = [
  { value: 'vehicle', label: 'Vehicle' },
  { value: 'driver', label: 'Driver' },
  { value: 'company', label: 'Company' },
];

const initialFormData: DocumentFormData = {
  documentType: 'license',
  title: '',
  documentNumber: '',
  entityType: 'vehicle',
  entityId: '',
  issueDate: '',
  expiryDate: '',
  fileUrl: '',
  notes: '',
};

export default function DocumentsPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const [documents, setDocuments] = useState<DocumentWithDays[]>([]);
  const [expiringDocuments, setExpiringDocuments] = useState<DocumentWithDays[]>([]);
  const [stats, setStats] = useState<DocumentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<DocumentWithDays | null>(null);
  
  // Form states
  const [formData, setFormData] = useState<DocumentFormData>(initialFormData);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'expiring'>('all');

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
      const [docsRes, expiringRes, statsRes] = await Promise.all([
        api.getDocuments(),
        api.getExpiringDocuments(30),
        api.get('/fleet/documents/stats'),
      ]);
      
      if (docsRes.success) {
        setDocuments(docsRes.data?.documents || []);
      }
      if (expiringRes.success) {
        setExpiringDocuments(expiringRes.data?.documents || []);
      }
      if (statsRes.data.success) {
        setStats(statsRes.data.data);
      }
    } catch (error) {
      console.error('Failed to load documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredDocuments = (activeTab === 'expiring' ? expiringDocuments : documents).filter(d => {
    const matchesSearch = (d.title || '').toLowerCase().includes(search.toLowerCase()) ||
      (d.documentNumber || '').toLowerCase().includes(search.toLowerCase()) ||
      (d.entityName || '').toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === 'all' || d.documentType === typeFilter;
    const matchesStatus = statusFilter === 'all' || d.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const response = await api.createDocument(formData);
      if (response.success) {
        setShowCreateModal(false);
        setFormData(initialFormData);
        loadData();
      } else {
        setError(response.error || 'Failed to create document');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create document');
    } finally {
      setSaving(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'valid':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'expiring_soon':
        return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      case 'expired':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <FileText className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'valid':
        return 'bg-green-100 text-green-800';
      case 'expiring_soon':
        return 'bg-amber-100 text-amber-800';
      case 'expired':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatStatus = (status: string) => {
    return status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getDaysUntilExpiry = (days: number | null) => {
    if (days === null) return 'No expiry';
    if (days < 0) return `Expired ${Math.abs(days)} days ago`;
    if (days === 0) return 'Expires today';
    if (days === 1) return 'Expires tomorrow';
    return `${days} days left`;
  };

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
            <p className="text-gray-500 mt-1">Manage vehicle, driver and company documents</p>
          </div>
          {isManager && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors"
            >
              <Plus className="h-5 w-5 mr-2" />
              Add Document
            </button>
          )}
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <p className="text-sm text-gray-500">Total Documents</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <p className="text-sm text-gray-500">Valid</p>
              <p className="text-2xl font-bold text-green-600">{stats.valid}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <p className="text-sm text-gray-500">Expiring Soon</p>
              <p className="text-2xl font-bold text-amber-600">{stats.expiringSoon}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <p className="text-sm text-gray-500">Expired</p>
              <p className="text-2xl font-bold text-red-600">{stats.expired}</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'all'
                ? 'bg-amber-500 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            All Documents
          </button>
          <button
            onClick={() => setActiveTab('expiring')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'expiring'
                ? 'bg-amber-500 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            <AlertTriangle className="h-4 w-4" />
            Expiring Soon
            {expiringDocuments.length > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                {expiringDocuments.length}
              </span>
            )}
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search documents..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
          >
            <option value="all">All Types</option>
            {documentTypes.map(t => (
              <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
          >
            <option value="all">All Status</option>
            <option value="valid">Valid</option>
            <option value="expiring_soon">Expiring Soon</option>
            <option value="expired">Expired</option>
          </select>
        </div>

        {/* Documents Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin h-8 w-8 border-2 border-amber-500 border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-gray-500">Loading documents...</p>
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="p-8 text-center">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No documents found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">Document</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">Entity</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">Number</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">Status</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">Expiry</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredDocuments.map((doc) => (
                    <tr key={doc.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {getStatusIcon(doc.status)}
                          <div>
                            <p className="font-medium text-gray-900">{doc.title}</p>
                            <p className="text-sm text-gray-500 capitalize">{doc.documentType}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm capitalize text-gray-600">{doc.entityType}</span>
                        {doc.entityName && (
                          <p className="text-sm text-gray-900">{doc.entityName}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-mono text-gray-600">{doc.documentNumber || '-'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusClass(doc.status)}`}>
                          {formatStatus(doc.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span className={`text-sm ${doc.daysUntilExpiry != null && doc.daysUntilExpiry < 0 ? 'text-red-600' : doc.daysUntilExpiry != null && doc.daysUntilExpiry <= 30 ? 'text-amber-600' : 'text-gray-600'}`}>
                            {doc.expiryDate 
                              ? new Date(doc.expiryDate).toLocaleDateString()
                              : 'No expiry'
                            }
                          </span>
                        </div>
                        {doc.daysUntilExpiry != null && (
                          <p className={`text-xs mt-0.5 ${doc.daysUntilExpiry < 0 ? 'text-red-600' : doc.daysUntilExpiry <= 30 ? 'text-amber-600' : 'text-gray-500'}`}>
                            {getDaysUntilExpiry(doc.daysUntilExpiry)}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedDocument(doc);
                              setShowViewModal(true);
                            }}
                            className="p-2 text-gray-600 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                            title="View"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          {doc.fileUrl && (
                            <a
                              href={doc.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Download"
                            >
                              <Download className="h-4 w-4" />
                            </a>
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
                <h2 className="text-xl font-bold text-gray-900">Add New Document</h2>
              </div>
              <form onSubmit={handleCreate} className="p-6 space-y-4">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                    {error}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Document Type *</label>
                    <select
                      value={formData.documentType}
                      onChange={(e) => setFormData({ ...formData, documentType: e.target.value as DocumentFormData['documentType'] })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                      required
                    >
                      {documentTypes.map(t => (
                        <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                      placeholder="e.g. Comprehensive Insurance"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Document Number</label>
                    <input
                      type="text"
                      value={formData.documentNumber}
                      onChange={(e) => setFormData({ ...formData, documentNumber: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                      placeholder="e.g. INS-2024-001"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Entity Type *</label>
                    <select
                      value={formData.entityType}
                      onChange={(e) => setFormData({ ...formData, entityType: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                      required
                    >
                      {entityTypes.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Entity ID</label>
                  <input
                    type="text"
                    value={formData.entityId}
                    onChange={(e) => setFormData({ ...formData, entityId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    placeholder="Vehicle ID or Driver ID"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Issue Date</label>
                    <input
                      type="date"
                      value={formData.issueDate}
                      onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
                    <input
                      type="date"
                      value={formData.expiryDate}
                      onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">File URL</label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={formData.fileUrl}
                      onChange={(e) => setFormData({ ...formData, fileUrl: e.target.value })}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                      placeholder="https://..."
                    />
                    <button
                      type="button"
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
                    >
                      <Upload className="h-4 w-4" />
                      Upload
                    </button>
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
                    disabled={saving}
                    className="flex-1 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save Document'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* View Modal */}
        {showViewModal && selectedDocument && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
              <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Document Details</h2>
                <button
                  onClick={() => setShowViewModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-4">
                  {getStatusIcon(selectedDocument.status)}
                  <div>
                    <h3 className="font-semibold text-gray-900">{selectedDocument.title}</h3>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusClass(selectedDocument.status)}`}>
                      {formatStatus(selectedDocument.status)}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Document Type</p>
                    <p className="font-medium capitalize">{selectedDocument.documentType}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Document Number</p>
                    <p className="font-medium">{selectedDocument.documentNumber || '-'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Entity Type</p>
                    <p className="font-medium capitalize">{selectedDocument.entityType}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Entity Name</p>
                    <p className="font-medium">{selectedDocument.entityName || '-'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Issue Date</p>
                    <p className="font-medium">
                      {selectedDocument.issueDate 
                        ? new Date(selectedDocument.issueDate).toLocaleDateString()
                        : '-'
                      }
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Expiry Date</p>
                    <p className={`font-medium ${selectedDocument.daysUntilExpiry != null && selectedDocument.daysUntilExpiry < 0 ? 'text-red-600' : selectedDocument.daysUntilExpiry != null && selectedDocument.daysUntilExpiry <= 30 ? 'text-amber-600' : ''}`}>
                      {selectedDocument.expiryDate 
                        ? new Date(selectedDocument.expiryDate).toLocaleDateString()
                        : '-'
                      }
                    </p>
                  </div>
                </div>
                {selectedDocument.fileUrl && (
                  <a
                    href={selectedDocument.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-amber-600 hover:text-amber-700 font-medium"
                  >
                    <Download className="h-4 w-4" />
                    Download Document
                  </a>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
