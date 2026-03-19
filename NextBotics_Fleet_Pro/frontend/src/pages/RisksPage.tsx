import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldAlert, Plus, Search, X, TrendingUp, FileText
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import DashboardLayout from '../components/Layout';
import { api } from '../services/api';
import { Risk } from '../types/fleet';

const RISK_LEVELS = [
  { key: 'all', label: 'All Levels', color: 'gray' },
  { key: 'low', label: 'Low', color: 'green' },
  { key: 'medium', label: 'Medium', color: 'yellow' },
  { key: 'high', label: 'High', color: 'orange' },
  { key: 'extreme', label: 'Extreme', color: 'red' },
];

const STATUS_OPTIONS = [
  { key: 'active', label: 'Active', color: 'red' },
  { key: 'mitigated', label: 'Mitigated', color: 'green' },
  { key: 'accepted', label: 'Accepted', color: 'blue' },
  { key: 'transferred', label: 'Transferred', color: 'purple' },
];

export default function RisksPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  
  const [risks, setRisks] = useState<Risk[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'list' | 'heatmap' | 'analytics'>('list');
  const [selectedLevel, setSelectedLevel] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Create form state
  const [newRisk, setNewRisk] = useState({
    title: '',
    description: '',
    category: 'operational',
    likelihood: 'possible' as const,
    impact: 'moderate' as const,
    mitigationStrategy: '',
    mitigationOwner: '',
    targetDate: ''
  });

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    loadRisks();
  }, [isAuthenticated, navigate, selectedLevel, selectedStatus]);

  const loadRisks = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (selectedLevel !== 'all') params.level = selectedLevel;
      if (selectedStatus !== 'all') params.status = selectedStatus;
      
      const res = await api.getRisks(params);
      if (res.success) {
        setRisks(res.data?.risks || []);
      }
    } catch (err: any) {
      console.error('Failed to load risks:', err);
      setError('Failed to load risk data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRisk = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError('');
      setSuccess('');
      
      const res = await api.createRisk(newRisk);
      if (res.success) {
        setSuccess('Risk created successfully');
        setShowCreateModal(false);
        setNewRisk({
          title: '',
          description: '',
          category: 'operational',
          likelihood: 'possible',
          impact: 'moderate',
          mitigationStrategy: '',
          mitigationOwner: '',
          targetDate: ''
        });
        loadRisks();
      } else {
        setError(res.error || 'Failed to create risk');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create risk');
    }
  };

  const handleUpdateStatus = async (riskId: string, newStatus: string) => {
    try {
      const res = await api.updateRisk(riskId, { status: newStatus as any });
      if (res.success) {
        loadRisks();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update risk');
    }
  };

  const filteredRisks = risks.filter(risk => {
    const matchesSearch = (risk.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (risk.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const getRiskLevelBadge = (level: string) => {
    const colors: Record<string, string> = {
      'low': 'bg-green-100 text-green-800 border-green-200',
      'medium': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'high': 'bg-orange-100 text-orange-800 border-orange-200',
      'extreme': 'bg-red-100 text-red-800 border-red-200'
    };
    return colors[level] || 'bg-gray-100 text-gray-800';
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      'active': 'bg-red-100 text-red-800',
      'mitigated': 'bg-green-100 text-green-800',
      'accepted': 'bg-blue-100 text-blue-800',
      'transferred': 'bg-purple-100 text-purple-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getRiskScoreColor = (score: number) => {
    if (score <= 4) return 'bg-green-500';
    if (score <= 9) return 'bg-yellow-500';
    if (score <= 14) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const riskStats = {
    total: risks.length,
    low: risks.filter(r => r.riskLevel === 'low').length,
    medium: risks.filter(r => r.riskLevel === 'medium').length,
    high: risks.filter(r => r.riskLevel === 'high').length,
    extreme: risks.filter(r => r.riskLevel === 'extreme').length,
    active: risks.filter(r => r.status === 'active').length,
    mitigated: risks.filter(r => r.status === 'mitigated').length
  };

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Risk Management</h1>
            <p className="text-gray-500 mt-1">Identify, assess, and mitigate fleet risks</p>
          </div>
          <div className="flex gap-3">
            {(user?.role === 'admin' || user?.role === 'manager') && (
              <button 
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center px-4 py-2 bg-amber-500 text-slate-900 rounded-lg font-medium hover:bg-amber-600 transition-colors"
              >
                <Plus className="h-5 w-5 mr-2" />
                Register Risk
              </button>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Total Risks</p>
            <p className="text-2xl font-bold text-gray-900">{riskStats.total}</p>
          </div>
          <div className="bg-green-50 rounded-xl border border-green-200 p-4">
            <p className="text-sm text-green-600">Low</p>
            <p className="text-2xl font-bold text-green-700">{riskStats.low}</p>
          </div>
          <div className="bg-yellow-50 rounded-xl border border-yellow-200 p-4">
            <p className="text-sm text-yellow-600">Medium</p>
            <p className="text-2xl font-bold text-yellow-700">{riskStats.medium}</p>
          </div>
          <div className="bg-orange-50 rounded-xl border border-orange-200 p-4">
            <p className="text-sm text-orange-600">High</p>
            <p className="text-2xl font-bold text-orange-700">{riskStats.high}</p>
          </div>
          <div className="bg-red-50 rounded-xl border border-red-200 p-4">
            <p className="text-sm text-red-600">Extreme</p>
            <p className="text-2xl font-bold text-red-700">{riskStats.extreme}</p>
          </div>
          <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
            <p className="text-sm text-blue-600">Active</p>
            <p className="text-2xl font-bold text-blue-700">{riskStats.active}</p>
          </div>
          <div className="bg-green-50 rounded-xl border border-green-200 p-4">
            <p className="text-sm text-green-600">Mitigated</p>
            <p className="text-2xl font-bold text-green-700">{riskStats.mitigated}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {[
                { key: 'list', label: 'Risk Register', icon: FileText },
                { key: 'heatmap', label: 'Risk Heatmap', icon: ShieldAlert },
                { key: 'analytics', label: 'Analytics', icon: TrendingUp },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors ${
                    activeTab === tab.key
                      ? 'border-amber-500 text-amber-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
                {error}
                <button onClick={() => setError('')} className="ml-2 text-red-500 hover:text-red-700">×</button>
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4">
                {success}
                <button onClick={() => setSuccess('')} className="ml-2 text-green-500 hover:text-green-700">×</button>
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
              </div>
            ) : (
              <>
                {/* Risk List Tab */}
                {activeTab === 'list' && (
                  <div className="space-y-4">
                    {/* Filters */}
                    <div className="flex flex-col sm:flex-row gap-4">
                      <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search risks..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        />
                      </div>
                      <select
                        value={selectedLevel}
                        onChange={(e) => setSelectedLevel(e.target.value)}
                        className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500"
                      >
                        {RISK_LEVELS.map((level) => (
                          <option key={level.key} value={level.key}>{level.label}</option>
                        ))}
                      </select>
                      <select
                        value={selectedStatus}
                        onChange={(e) => setSelectedStatus(e.target.value)}
                        className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500"
                      >
                        <option value="all">All Statuses</option>
                        {STATUS_OPTIONS.map((status) => (
                          <option key={status.key} value={status.key}>{status.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Risks Table */}
                    {filteredRisks.length === 0 ? (
                      <div className="text-center py-12">
                        <ShieldAlert className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500">No risks found</p>
                        {(user?.role === 'admin' || user?.role === 'manager') && (
                          <button
                            onClick={() => setShowCreateModal(true)}
                            className="mt-4 px-4 py-2 bg-amber-500 text-slate-900 rounded-lg font-medium hover:bg-amber-600 transition-colors"
                          >
                            Register New Risk
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Risk #</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
                              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Level</th>
                              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Owner</th>
                              {(user?.role === 'admin' || user?.role === 'manager') && (
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                              )}
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {filteredRisks.map((risk) => (
                              <tr key={risk.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                  {risk.riskNumber}
                                </td>
                                <td className="px-6 py-4">
                                  <div className="text-sm font-medium text-gray-900">{risk.title}</div>
                                  <div className="text-sm text-gray-500 line-clamp-1">{risk.description}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                                  {risk.category}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                  <div className="flex items-center justify-center">
                                    <div className={`h-2 w-16 rounded-full ${getRiskScoreColor(risk.riskScore)}`}></div>
                                    <span className="ml-2 text-sm font-medium">{risk.riskScore}</span>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize ${getRiskLevelBadge(risk.riskLevel)}`}>
                                    {risk.riskLevel}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusBadge(risk.status)}`}>
                                    {risk.status}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {risk.mitigationOwner || 'Unassigned'}
                                </td>
                                {(user?.role === 'admin' || user?.role === 'manager') && (
                                  <td className="px-6 py-4 whitespace-nowrap text-center">
                                    <select
                                      value={risk.status}
                                      onChange={(e) => handleUpdateStatus(risk.id, e.target.value)}
                                      className="text-sm border border-gray-300 rounded-lg px-2 py-1 focus:ring-2 focus:ring-amber-500"
                                    >
                                      {STATUS_OPTIONS.map((status) => (
                                        <option key={status.key} value={status.key}>{status.label}</option>
                                      ))}
                                    </select>
                                  </td>
                                )}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* Heatmap Tab */}
                {activeTab === 'heatmap' && (
                  <div className="space-y-6">
                    <div className="bg-gray-50 rounded-xl p-6">
                      <h3 className="text-lg font-medium text-gray-900 mb-6">Risk Heatmap (Likelihood × Impact)</h3>
                      <div className="grid grid-cols-5 gap-2 max-w-2xl mx-auto">
                        <div className="col-span-1"></div>
                        {['Negligible', 'Low', 'Moderate', 'Significant', 'Critical'].map((impact) => (
                          <div key={impact} className="text-center text-xs font-medium text-gray-500">{impact}</div>
                        ))}
                        
                        {['Almost Certain', 'Likely', 'Possible', 'Unlikely', 'Rare'].map((likelihood, rowIdx) => (
                          <>
                            <div key={likelihood} className="flex items-center text-xs font-medium text-gray-500">
                              {likelihood}
                            </div>
                            {[5, 4, 3, 2, 1].map((impact, colIdx) => {
                              const score = (5 - rowIdx) * impact;
                              let color = 'bg-green-100';
                              if (score > 4) color = 'bg-yellow-100';
                              if (score > 9) color = 'bg-orange-100';
                              if (score > 14) color = 'bg-red-100';
                              
                              const cellRisks = risks.filter(r => {
                                const l = ['rare', 'unlikely', 'possible', 'likely', 'almost_certain'].indexOf(r.likelihood) + 1;
                                const i = ['negligible', 'low', 'moderate', 'significant', 'critical'].indexOf(r.impact) + 1;
                                return l === (5 - rowIdx) && i === impact;
                              });
                              
                              return (
                                <div
                                  key={`${rowIdx}-${colIdx}`}
                                  className={`aspect-square rounded-lg ${color} border border-gray-200 flex items-center justify-center relative group cursor-pointer hover:opacity-80 transition-opacity`}
                                >
                                  {cellRisks.length > 0 && (
                                    <>
                                      <span className="text-lg font-bold text-gray-700">{cellRisks.length}</span>
                                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-900 text-white text-xs rounded-lg px-2 py-1 whitespace-nowrap z-10">
                                        {cellRisks.map(r => r.title).join(', ')}
                                      </div>
                                    </>
                                  )}
                                </div>
                              );
                            })}
                          </>
                        ))}
                      </div>
                      <div className="flex items-center justify-center gap-6 mt-6">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 bg-green-100 rounded"></div>
                          <span className="text-sm text-gray-600">Low (1-4)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 bg-yellow-100 rounded"></div>
                          <span className="text-sm text-gray-600">Medium (5-9)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 bg-orange-100 rounded"></div>
                          <span className="text-sm text-gray-600">High (10-14)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 bg-red-100 rounded"></div>
                          <span className="text-sm text-gray-600">Extreme (15-25)</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Analytics Tab */}
                {activeTab === 'analytics' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-gray-50 rounded-xl p-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Risk Distribution by Level</h3>
                        <div className="space-y-3">
                          {RISK_LEVELS.filter(l => l.key !== 'all').map((level) => {
                            const count = risks.filter(r => r.riskLevel === level.key).length;
                            const percentage = riskStats.total > 0 ? (count / riskStats.total) * 100 : 0;
                            return (
                              <div key={level.key}>
                                <div className="flex justify-between text-sm mb-1">
                                  <span className="capitalize">{level.label}</span>
                                  <span className="font-medium">{count} ({percentage.toFixed(0)}%)</span>
                                </div>
                                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full ${getRiskScoreColor(level.key === 'extreme' ? 20 : level.key === 'high' ? 12 : level.key === 'medium' ? 6 : 2)}`}
                                    style={{ width: `${percentage}%` }}
                                  ></div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="bg-gray-50 rounded-xl p-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Risk Distribution by Status</h3>
                        <div className="space-y-3">
                          {STATUS_OPTIONS.map((status) => {
                            const count = risks.filter(r => r.status === status.key).length;
                            const percentage = riskStats.total > 0 ? (count / riskStats.total) * 100 : 0;
                            return (
                              <div key={status.key}>
                                <div className="flex justify-between text-sm mb-1">
                                  <span>{status.label}</span>
                                  <span className="font-medium">{count} ({percentage.toFixed(0)}%)</span>
                                </div>
                                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full ${status.color === 'green' ? 'bg-green-500' : status.color === 'blue' ? 'bg-blue-500' : status.color === 'yellow' ? 'bg-yellow-500' : status.color === 'amber' ? 'bg-amber-500' : 'bg-purple-500'}`}
                                    style={{ width: `${percentage}%` }}
                                  ></div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Create Risk Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900">Register New Risk</h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleCreateRisk} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Risk Title *</label>
                  <input
                    type="text"
                    required
                    value={newRisk.title}
                    onChange={(e) => setNewRisk({ ...newRisk, title: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="e.g., Driver Fatigue Management"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                  <textarea
                    required
                    rows={3}
                    value={newRisk.description}
                    onChange={(e) => setNewRisk({ ...newRisk, description: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="Describe the risk and potential consequences..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                    <select
                      required
                      value={newRisk.category}
                      onChange={(e) => setNewRisk({ ...newRisk, category: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="operational">Operational</option>
                      <option value="safety">Safety</option>
                      <option value="compliance">Compliance</option>
                      <option value="financial">Financial</option>
                      <option value="environmental">Environmental</option>
                      <option value="reputational">Reputational</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mitigation Owner</label>
                    <input
                      type="text"
                      value={newRisk.mitigationOwner}
                      onChange={(e) => setNewRisk({ ...newRisk, mitigationOwner: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500"
                      placeholder="e.g., John Doe"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Likelihood *</label>
                    <select
                      required
                      value={newRisk.likelihood}
                      onChange={(e) => setNewRisk({ ...newRisk, likelihood: e.target.value as any })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="rare">Rare (1)</option>
                      <option value="unlikely">Unlikely (2)</option>
                      <option value="possible">Possible (3)</option>
                      <option value="likely">Likely (4)</option>
                      <option value="almost_certain">Almost Certain (5)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Impact *</label>
                    <select
                      required
                      value={newRisk.impact}
                      onChange={(e) => setNewRisk({ ...newRisk, impact: e.target.value as any })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="negligible">Negligible (1)</option>
                      <option value="low">Low (2)</option>
                      <option value="moderate">Moderate (3)</option>
                      <option value="significant">Significant (4)</option>
                      <option value="critical">Critical (5)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Target Date</label>
                  <input
                    type="date"
                    value={newRisk.targetDate}
                    onChange={(e) => setNewRisk({ ...newRisk, targetDate: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mitigation Strategy</label>
                  <textarea
                    rows={3}
                    value={newRisk.mitigationStrategy}
                    onChange={(e) => setNewRisk({ ...newRisk, mitigationStrategy: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500"
                    placeholder="Describe the planned mitigation actions..."
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-amber-500 text-slate-900 rounded-lg font-medium hover:bg-amber-600"
                  >
                    Register Risk
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
