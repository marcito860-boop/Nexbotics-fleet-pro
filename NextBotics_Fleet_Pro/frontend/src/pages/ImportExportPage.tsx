import { useState, useRef } from 'react';
import { 
  Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle, 
  XCircle, Loader2, Database, Car, Users, Wrench, Fuel, 
  Route, FileWarning, Settings, ChevronDown, ChevronUp,
  RefreshCw, Info, Trash2
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Import/Export types
const IMPORT_TYPES = [
  { key: 'vehicles', label: 'Vehicles', icon: Car, desc: 'Vehicle fleet data' },
  { key: 'drivers', label: 'Drivers', icon: Users, desc: 'Driver records' },
  { key: 'maintenance_records', label: 'Maintenance Records', icon: Wrench, desc: 'Service history' },
  { key: 'fuel_records', label: 'Fuel Records', icon: Fuel, desc: 'Fuel fill-ups' },
  { key: 'routes', label: 'Routes', icon: Route, desc: 'Trip/route data' },
  { key: 'accidents', label: 'Accidents', icon: FileWarning, desc: 'Accident reports' },
  { key: 'staff', label: 'Staff', icon: Users, desc: 'Staff/employees' },
  { key: 'service_providers', label: 'Service Providers', icon: Settings, desc: 'Garages/workshops' },
  { key: 'spare_parts', label: 'Spare Parts', icon: Database, desc: 'Parts inventory' },
  { key: 'maintenance_schedules', label: 'Maintenance Schedules', icon: Wrench, desc: 'PM schedules' },
  { key: 'inventory', label: 'General Inventory', icon: Database, desc: 'Inventory items' },
];

interface ImportJob {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  importType: string;
  fileName: string;
  totalRows: number;
  successfulRows: number;
  failedRows: number;
  errors: Array<{
    row: number;
    field: string;
    message: string;
  }>;
  createdAt: string;
  completedAt?: string;
}

interface ValidationResult {
  valid: boolean;
  totalRows: number;
  errors: Array<{
    row: number;
    field: string;
    message: string;
  }>;
}

export default function ImportExportPage() {
  const [activeTab, setActiveTab] = useState<'import' | 'export'>('import');
  const [selectedType, setSelectedType] = useState<string>('vehicles');
  const [csvContent, setCsvContent] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [currentJob, setCurrentJob] = useState<ImportJob | null>(null);
  const [showTemplate, setShowTemplate] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  // Download template
  const downloadTemplate = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(
        `${API_BASE_URL}/api/fleet/export/templates/${selectedType}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
          }
        }
      );
      
      if (!response.ok) throw new Error('Failed to download template');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedType}_template.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      showMessage('success', 'Template downloaded successfully');
    } catch (error: any) {
      showMessage('error', error.message || 'Failed to download template');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setCsvContent(content);
      setValidationResult(null);
      setCurrentJob(null);
    };
    reader.readAsText(file);
  };

  // Preview/Validate CSV
  const previewImport = async () => {
    if (!csvContent) {
      showMessage('error', 'Please select a CSV file first');
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/fleet/import/preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: JSON.stringify({
          importType: selectedType,
          csvContent: csvContent
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setValidationResult(data.data);
        if (data.data.valid) {
          showMessage('success', `CSV looks good! ${data.data.totalRows} rows ready to import`);
        } else {
          showMessage('error', `Found ${data.data.errors.length} errors in CSV`);
        }
      } else {
        showMessage('error', data.error || 'Validation failed');
      }
    } catch (error: any) {
      showMessage('error', error.message || 'Failed to validate CSV');
    } finally {
      setIsLoading(false);
    }
  };

  // Start import
  const startImport = async () => {
    if (!csvContent) {
      showMessage('error', 'Please select a CSV file first');
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/fleet/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: JSON.stringify({
          importType: selectedType,
          csvContent: csvContent,
          fileName: fileName || 'import.csv',
          skipValidation: false
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setCurrentJob({
          id: data.data.jobId,
          status: 'pending',
          importType: selectedType,
          fileName: fileName,
          totalRows: 0,
          successfulRows: 0,
          failedRows: 0,
          errors: [],
          createdAt: new Date().toISOString()
        });
        showMessage('success', 'Import job started! Check progress below.');
        
        // Poll for job status
        pollJobStatus(data.data.jobId);
      } else {
        showMessage('error', data.error || 'Import failed to start');
      }
    } catch (error: any) {
      showMessage('error', error.message || 'Failed to start import');
    } finally {
      setIsLoading(false);
    }
  };

  // Poll job status
  const pollJobStatus = async (jobId: string) => {
    const checkStatus = async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/fleet/import/jobs/${jobId}`,
          {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
            }
          }
        );

        const data = await response.json();
        
        if (data.success) {
          setCurrentJob(data.data);
          
          if (data.data.status === 'pending' || data.data.status === 'processing') {
            setTimeout(checkStatus, 2000);
          } else if (data.data.status === 'completed') {
            showMessage('success', `Import completed! ${data.data.successfulRows}/${data.data.totalRows} rows imported`);
          } else if (data.data.status === 'failed') {
            showMessage('error', 'Import failed. Check errors below.');
          }
        }
      } catch (error) {
        console.error('Failed to check job status:', error);
      }
    };
    
    checkStatus();
  };

  // Export data
  const exportData = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/fleet/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: JSON.stringify({
          exportType: selectedType,
          format: 'csv'
        })
      });

      if (!response.ok) throw new Error('Export failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedType}_export_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      showMessage('success', 'Export downloaded successfully');
    } catch (error: any) {
      showMessage('error', error.message || 'Failed to export data');
    } finally {
      setIsLoading(false);
    }
  };

  // Get CSV columns for template display
  const getTemplateColumns = (type: string): string => {
    const templates: Record<string, string> = {
      vehicles: 'registration_number, make, model, year, type, fuel_type, fuel_capacity, engine_capacity, color, vin, engine_number, purchase_date, purchase_price, current_odometer, status, department',
      drivers: 'first_name, last_name, email, phone, employee_id, license_number, license_class, license_expiry, employment_status, department',
      maintenance_records: 'vehicle_registration, service_type, category, title, description, provider_name, scheduled_date, completed_date, service_mileage, next_service_mileage, labor_cost, parts_cost, other_cost, status, technician_name, invoice_number, warranty_months, notes',
      fuel_records: 'vehicle_registration, date, liters, cost, odometer, fuel_station, notes',
      routes: 'vehicle_registration, route_date, route_name, driver1_name, driver2_name, target_km, actual_km, target_fuel_consumption, actual_fuel, comments',
      accidents: 'vehicle_registration, accident_date, location, severity, description, damage_cost, insurance_claim_number, status',
      staff: 'staff_no, staff_name, email, phone, designation, department, branch, role, comments',
      service_providers: 'name, type, contact_person, phone, email, address, city, country, tax_id, specialties, notes',
      spare_parts: 'part_number, name, category, manufacturer, description, quantity_in_stock, reorder_level, unit_cost, location_code',
      maintenance_schedules: 'vehicle_registration, schedule_type, service_name, description, interval_mileage, interval_months, reminder_days_before',
      inventory: 'sku, name, category, description, current_stock, unit_price, reorder_level, location'
    };
    return templates[type] || 'Check downloaded template for columns';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Database className="w-6 h-6 text-blue-600" />
            Import / Export
          </h1>
          <p className="text-gray-500 mt-1">Bulk import and export your fleet data</p>
        </div>
        {message && (
          <div className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
            message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {message.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
            {message.text}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('import')}
            className={`flex-1 px-6 py-4 flex items-center justify-center gap-2 font-medium transition-colors ${
              activeTab === 'import'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Upload className="w-5 h-5" />
            Import Data
          </button>
          <button
            onClick={() => setActiveTab('export')}
            className={`flex-1 px-6 py-4 flex items-center justify-center gap-2 font-medium transition-colors ${
              activeTab === 'export'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Download className="w-5 h-5" />
            Export Data
          </button>
        </div>

        <div className="p-6">
          {/* Data Type Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Data Type</label>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {IMPORT_TYPES.map((type) => (
                <button
                  key={type.key}
                  onClick={() => {
                    setSelectedType(type.key);
                    setValidationResult(null);
                    setCurrentJob(null);
                    setCsvContent('');
                    setFileName('');
                  }}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    selectedType === type.key
                      ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <type.icon className={`w-5 h-5 mb-1 ${
                    selectedType === type.key ? 'text-blue-600' : 'text-gray-400'
                  }`} />
                  <p className={`font-medium text-sm ${
                    selectedType === type.key ? 'text-blue-900' : 'text-gray-700'
                  }`}>
                    {type.label}
                  </p>
                  <p className="text-xs text-gray-500">{type.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {activeTab === 'import' ? (
            <div className="space-y-6">
              {/* Template Section */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-gray-900 flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-green-600" />
                    CSV Template
                  </h3>
                  <button
                    onClick={() => setShowTemplate(!showTemplate)}
                    className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    {showTemplate ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    {showTemplate ? 'Hide columns' : 'Show columns'}
                  </button>
                </div>
                
                {showTemplate && (
                  <div className="mb-3 p-3 bg-white rounded border text-sm font-mono text-gray-600 overflow-x-auto">
                    {getTemplateColumns(selectedType)}
                  </div>
                )}
                
                <button
                  onClick={downloadTemplate}
                  disabled={isLoading}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  Download {IMPORT_TYPES.find(t => t.key === selectedType)?.label} Template
                </button>
              </div>

              {/* File Upload */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Upload CSV File</h3>
                <p className="text-gray-500 mb-4">Drag and drop your CSV file here, or click to browse</p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
                >
                  Select File
                </button>
                {fileName && (
                  <div className="mt-4 flex items-center justify-center gap-2 text-sm text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    {fileName}
                    <button
                      onClick={() => {
                        setFileName('');
                        setCsvContent('');
                        setValidationResult(null);
                      }}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Actions */}
              {csvContent && (
                <div className="flex gap-3">
                  <button
                    onClick={previewImport}
                    disabled={isLoading}
                    className="flex-1 bg-gray-600 text-white px-4 py-3 rounded-lg hover:bg-gray-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Info className="w-4 h-4" />}
                    Preview / Validate
                  </button>
                  <button
                    onClick={startImport}
                    disabled={isLoading || !!(validationResult && !validationResult.valid)}
                    className="flex-1 bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    Start Import
                  </button>
                </div>
              )}

              {/* Validation Results */}
              {validationResult && (
                <div className={`rounded-lg p-4 ${
                  validationResult.valid ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    {validationResult.valid ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-600" />
                    )}
                    <span className={`font-medium ${
                      validationResult.valid ? 'text-green-800' : 'text-red-800'
                    }`}>
                      {validationResult.valid ? 'Validation Passed' : 'Validation Failed'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Total rows: {validationResult.totalRows}
                    {validationResult.errors.length > 0 && (
                      <span className="text-red-600"> | Errors: {validationResult.errors.length}</span>
                    )}
                  </p>
                  
                  {validationResult.errors.length > 0 && (
                    <div className="mt-3 max-h-48 overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-red-100">
                          <tr>
                            <th className="px-3 py-2 text-left">Row</th>
                            <th className="px-3 py-2 text-left">Field</th>
                            <th className="px-3 py-2 text-left">Error</th>
                          </tr>
                        </thead>
                        <tbody>
                          {validationResult.errors.slice(0, 20).map((error, idx) => (
                            <tr key={idx} className="border-b border-red-100">
                              <td className="px-3 py-2">{error.row}</td>
                              <td className="px-3 py-2 font-mono text-xs">{error.field}</td>
                              <td className="px-3 py-2 text-red-700">{error.message}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {validationResult.errors.length > 20 && (
                        <p className="text-center text-sm text-red-600 mt-2">
                          ... and {validationResult.errors.length - 20} more errors
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Job Status */}
              {currentJob && (
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <h3 className="font-medium text-blue-900 mb-3 flex items-center gap-2">
                    <RefreshCw className={`w-5 h-5 ${
                      currentJob.status === 'pending' || currentJob.status === 'processing' ? 'animate-spin' : ''
                    }`} />
                    Import Job Status
                  </h3>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="bg-white rounded-lg p-3">
                      <p className="text-xs text-gray-500">Status</p>
                      <p className={`font-medium capitalize ${
                        currentJob.status === 'completed' ? 'text-green-600' :
                        currentJob.status === 'failed' ? 'text-red-600' :
                        'text-blue-600'
                      }`}>
                        {currentJob.status}
                      </p>
                    </div>
                    <div className="bg-white rounded-lg p-3">
                      <p className="text-xs text-gray-500">Total Rows</p>
                      <p className="font-medium">{currentJob.totalRows || '-'}</p>
                    </div>
                    <div className="bg-white rounded-lg p-3">
                      <p className="text-xs text-gray-500">Successful</p>
                      <p className="font-medium text-green-600">{currentJob.successfulRows || 0}</p>
                    </div>
                    <div className="bg-white rounded-lg p-3">
                      <p className="text-xs text-gray-500">Failed</p>
                      <p className="font-medium text-red-600">{currentJob.failedRows || 0}</p>
                    </div>
                  </div>

                  {currentJob.errors && currentJob.errors.length > 0 && (
                    <div className="mt-3">
                      <p className="text-sm font-medium text-red-800 mb-2">Errors:</p>
                      <div className="max-h-40 overflow-y-auto bg-white rounded-lg p-3">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-100">
                            <tr>
                              <th className="px-2 py-1 text-left">Row</th>
                              <th className="px-2 py-1 text-left">Field</th>
                              <th className="px-2 py-1 text-left">Error</th>
                            </tr>
                          </thead>
                          <tbody>
                            {currentJob.errors.slice(0, 10).map((error, idx) => (
                              <tr key={idx} className="border-b border-gray-100">
                                <td className="px-2 py-1">{error.row}</td>
                                <td className="px-2 py-1 font-mono text-xs">{error.field}</td>
                                <td className="px-2 py-1 text-red-600">{error.message}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {currentJob.errors.length > 10 && (
                          <p className="text-center text-sm text-gray-500 mt-2">
                            ... and {currentJob.errors.length - 10} more errors
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* Export Tab */
            <div className="space-y-6">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-blue-900">Export Data</h3>
                    <p className="text-sm text-blue-700 mt-1">
                      Download all {IMPORT_TYPES.find(t => t.key === selectedType)?.label} data as a CSV file.
                      The export includes all records in your current dataset.
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={exportData}
                disabled={isLoading}
                className="w-full bg-blue-600 text-white px-6 py-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-3 text-lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5" />
                    Export {IMPORT_TYPES.find(t => t.key === selectedType)?.label}
                  </>
                )}
              </button>

              <div className="text-center text-sm text-gray-500">
                <p>Export format: CSV (Comma Separated Values)</p>
                <p className="mt-1">Compatible with Excel, Google Sheets, and other spreadsheet applications</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}