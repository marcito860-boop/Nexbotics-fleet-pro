import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Download, BarChart3, TrendingUp, Calendar, RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { api } from '../services/api';
import DashboardLayout from '../components/Layout';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';

interface ComplianceData {
  auditTrend: Array<{
    month: string;
    averageScore: number;
    count: number;
  }>;
  categoryScores: Array<{
    category: string;
    averageScore: number;
    auditCount: number;
  }>;
  riskHeatmap: Array<{
    category: string;
    riskLevel: string;
    count: number;
  }>;
  period: {
    from: string;
    to: string;
  };
}

interface RequisitionReport {
  totalRequisitions: number;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  totalDistance: number;
  avgProcessingTime: number;
  items: Array<{
    id: string;
    requesterName: string;
    purpose: string;
    status: string;
    priority: string;
    createdAt: string;
    approvedAt: string | null;
    completedAt: string | null;
  }>;
}

interface MaintenanceReport {
  totalCost: number;
  totalJobs: number;
  byCategory: Record<string, number>;
  byStatus: Record<string, number>;
  items: Array<{
    id: string;
    vehicleReg: string;
    category: string;
    description: string;
    estimatedCost: number;
    status: string;
    createdAt: string;
  }>;
}

const COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6', '#64748b'];

const reportTypes = [
  { id: 'compliance', label: 'Compliance Report', icon: CheckCircle, description: 'Audit trends and compliance scores' },
  { id: 'requisitions', label: 'Requisition Log', icon: FileText, description: 'Vehicle requisition history and analytics' },
  { id: 'maintenance', label: 'Maintenance Report', icon: TrendingUp, description: 'Maintenance costs and job status' },
  { id: 'fuel', label: 'Fuel Consumption', icon: BarChart3, description: 'Fuel usage and efficiency metrics' },
];

export default function ReportsPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const [selectedReport, setSelectedReport] = useState('compliance');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [complianceData, setComplianceData] = useState<ComplianceData | null>(null);
  const [requisitionData, setRequisitionData] = useState<RequisitionReport | null>(null);
  const [maintenanceData, setMaintenanceData] = useState<MaintenanceReport | null>(null);
  const [fuelData, setFuelData] = useState<any>(null);

  const isManager = user?.role === 'admin' || user?.role === 'manager';

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    // Set default date range (last 90 days)
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 90);
    setDateTo(to.toISOString().split('T')[0]);
    setDateFrom(from.toISOString().split('T')[0]);
    
    loadComplianceData();
  }, [isAuthenticated, navigate]);

  const loadComplianceData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/fleet/reports/compliance', {
        params: { dateFrom, dateTo }
      });
      if (response.data.success) {
        setComplianceData(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load compliance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRequisitionData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/fleet/reports/requisitions', {
        params: { dateFrom, dateTo }
      });
      if (response.data.success) {
        setRequisitionData(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load requisition data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMaintenanceData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/fleet/reports/maintenance', {
        params: { dateFrom, dateTo }
      });
      if (response.data.success) {
        setMaintenanceData(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load maintenance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFuelData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/fleet/analytics/fuel-consumption', {
        params: { dateFrom, dateTo }
      });
      if (response.data.success) {
        setFuelData(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load fuel data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = () => {
    switch (selectedReport) {
      case 'compliance':
        loadComplianceData();
        break;
      case 'requisitions':
        loadRequisitionData();
        break;
      case 'maintenance':
        loadMaintenanceData();
        break;
      case 'fuel':
        loadFuelData();
        break;
    }
  };

  const handleExport = (format: 'pdf' | 'excel' | 'csv') => {
    // Trigger download based on selected report
    const url = `/api/fleet/reports/${selectedReport}/export?format=${format}&dateFrom=${dateFrom}&dateTo=${dateTo}`;
    window.open(url, '_blank');
  };

  const renderComplianceReport = () => {
    if (!complianceData) return null;

    const riskData = complianceData.riskHeatmap.reduce((acc: any[], item) => {
      const existing = acc.find(a => a.name === item.riskLevel);
      if (existing) {
        existing.value += item.count;
      } else {
        acc.push({ name: item.riskLevel, value: item.count });
      }
      return acc;
    }, []);

    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Average Score</p>
                <p className="text-2xl font-bold text-gray-900">
                  {complianceData.categoryScores.length > 0
                    ? Math.round(complianceData.categoryScores.reduce((a, b) => a + b.averageScore, 0) / complianceData.categoryScores.length)
                    : 0}%
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <BarChart3 className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Audits</p>
                <p className="text-2xl font-bold text-gray-900">
                  {complianceData.auditTrend.reduce((a, b) => a + b.count, 0)}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-100 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Active Risks</p>
                <p className="text-2xl font-bold text-gray-900">
                  {complianceData.riskHeatmap.reduce((a, b) => a + b.count, 0)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Audit Trend</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={complianceData.auditTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="month" 
                    tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short' })}
                  />
                  <YAxis domain={[0, 100]} />
                  <Tooltip 
                    formatter={(value) => [`${(value as number).toFixed(1)}%`, 'Average Score']}
                    labelFormatter={(label) => new Date(label).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  />
                  <Line type="monotone" dataKey="averageScore" stroke="#f59e0b" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Risk Distribution</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={riskData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    dataKey="value"
                  >
                    {riskData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Category Performance */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Category Performance</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={complianceData.categoryScores}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" />
                <YAxis domain={[0, 100]} />
                <Tooltip formatter={(value) => [`${(value as number).toFixed(1)}%`, 'Average Score']} />
                <Bar dataKey="averageScore" fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
  };

  const renderRequisitionReport = () => {
    if (!requisitionData) return null;

    const statusData = Object.entries(requisitionData.byStatus || {}).map(([name, value]) => ({
      name: name.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
      value
    }));

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Total Requisitions</p>
            <p className="text-2xl font-bold text-gray-900">{requisitionData.totalRequisitions}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Total Distance</p>
            <p className="text-2xl font-bold text-gray-900">{requisitionData.totalDistance.toFixed(1)} km</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Avg Processing Time</p>
            <p className="text-2xl font-bold text-gray-900">{requisitionData.avgProcessingTime.toFixed(1)} hrs</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Completion Rate</p>
            <p className="text-2xl font-bold text-gray-900">
              {requisitionData.totalRequisitions > 0
                ? Math.round(((requisitionData.byStatus?.completed || 0) / requisitionData.totalRequisitions) * 100)
                : 0}%
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Status Distribution</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    dataKey="value"
                  >
                    {statusData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Requisitions</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2">Requester</th>
                    <th className="text-left py-2">Purpose</th>
                    <th className="text-left py-2">Status</th>
                    <th className="text-left py-2">Priority</th>
                  </tr>
                </thead>
                <tbody>
                  {requisitionData.items?.slice(0, 10).map((item) => (
                    <tr key={item.id} className="border-b border-gray-100">
                      <td className="py-2">{item.requesterName}</td>
                      <td className="py-2 truncate max-w-[200px]">{item.purpose}</td>
                      <td className="py-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          item.status === 'completed' ? 'bg-green-100 text-green-800' :
                          item.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                          item.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="py-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          item.priority === 'high' ? 'bg-red-100 text-red-800' :
                          item.priority === 'medium' ? 'bg-amber-100 text-amber-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {item.priority}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderMaintenanceReport = () => {
    if (!maintenanceData) return null;

    const categoryData = Object.entries(maintenanceData.byCategory || {}).map(([name, value]) => ({
      name,
      value
    }));

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Total Cost</p>
            <p className="text-2xl font-bold text-gray-900">KSH {maintenanceData.totalCost.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Total Jobs</p>
            <p className="text-2xl font-bold text-gray-900">{maintenanceData.totalJobs}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Avg Cost per Job</p>
            <p className="text-2xl font-bold text-gray-900">
              KSH {maintenanceData.totalJobs > 0 ? Math.round(maintenanceData.totalCost / maintenanceData.totalJobs).toLocaleString() : 0}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Jobs by Category</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Jobs</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2">Vehicle</th>
                    <th className="text-left py-2">Category</th>
                    <th className="text-left py-2">Status</th>
                    <th className="text-right py-2">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {maintenanceData.items?.slice(0, 10).map((item) => (
                    <tr key={item.id} className="border-b border-gray-100">
                      <td className="py-2">{item.vehicleReg}</td>
                      <td className="py-2">{item.category}</td>
                      <td className="py-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          item.status === 'completed' ? 'bg-green-100 text-green-800' :
                          item.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                          'bg-amber-100 text-amber-800'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="py-2 text-right">KSH {item.estimatedCost.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderFuelReport = () => {
    if (!fuelData) return null;

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Total Consumption</p>
            <p className="text-2xl font-bold text-gray-900">{fuelData.totalConsumption?.toFixed(1) || 0} L</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Total Cost</p>
            <p className="text-2xl font-bold text-gray-900">KSH {fuelData.totalCost?.toLocaleString() || 0}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Avg Efficiency</p>
            <p className="text-2xl font-bold text-gray-900">{fuelData.averageEfficiency?.toFixed(1) || 0} km/L</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Transactions</p>
            <p className="text-2xl font-bold text-gray-900">{fuelData.transactionCount || 0}</p>
          </div>
        </div>

        {fuelData.trend && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Fuel Consumption Trend</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={fuelData.trend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="consumption" stroke="#f59e0b" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reports Center</h1>
            <p className="text-gray-500 mt-1">Generate and export fleet reports</p>
          </div>
          {isManager && (
            <div className="flex gap-2">
              <button
                onClick={() => handleExport('pdf')}
                className="inline-flex items-center px-4 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors"
              >
                <Download className="h-5 w-5 mr-2" />
                PDF
              </button>
              <button
                onClick={() => handleExport('excel')}
                className="inline-flex items-center px-4 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
              >
                <Download className="h-5 w-5 mr-2" />
                Excel
              </button>
            </div>
          )}
        </div>

        {/* Report Type Selector */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {reportTypes.map((report) => (
            <button
              key={report.id}
              onClick={() => setSelectedReport(report.id)}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                selectedReport === report.id
                  ? 'border-amber-500 bg-amber-50'
                  : 'border-gray-200 bg-white hover:border-amber-300'
              }`}
            >
              <report.icon className={`h-8 w-8 mb-2 ${
                selectedReport === report.id ? 'text-amber-600' : 'text-gray-400'
              }`} />
              <p className={`font-semibold ${
                selectedReport === report.id ? 'text-amber-900' : 'text-gray-900'
              }`}>{report.label}</p>
              <p className="text-sm text-gray-500 mt-1">{report.description}</p>
            </button>
          ))}
        </div>

        {/* Date Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Date From</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Date To</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>
            </div>
            <button
              onClick={handleGenerateReport}
              disabled={loading}
              className="px-6 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Generating...' : 'Generate Report'}
            </button>
          </div>
        </div>

        {/* Report Content */}
        {loading ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <div className="animate-spin h-8 w-8 border-2 border-amber-500 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-gray-500">Generating report...</p>
          </div>
        ) : (
          <>
            {selectedReport === 'compliance' && renderComplianceReport()}
            {selectedReport === 'requisitions' && renderRequisitionReport()}
            {selectedReport === 'maintenance' && renderMaintenanceReport()}
            {selectedReport === 'fuel' && renderFuelReport()}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
