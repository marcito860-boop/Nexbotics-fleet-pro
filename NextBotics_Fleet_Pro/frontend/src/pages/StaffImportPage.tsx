import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Download, AlertCircle, CheckCircle, FileSpreadsheet, UserPlus } from 'lucide-react';
import DashboardLayout from '../components/Layout';

interface ImportResult {
  total: number;
  staffCreated: number;
  staffFailed: number;
  usersCreated: number;
  usersFailed: number;
  skippedNoEmail: number;
  details: Array<{
    staff_name: string;
    email: string;
    status: string;
    staffCreated: boolean;
    userCreated: boolean;
    tempPassword?: string;
    userRole?: string;
    error?: string;
    reason?: string;
    userNote?: string;
  }>;
}

export default function StaffImportPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<any[]>([]);
  const [createUserAccounts, setCreateUserAccounts] = useState(true);

  // CSV Template
  const csvTemplate = `staff_no,staff_name,email,phone,designation,department,branch,role,comments
EMP001,John Kamau,john.kamau@company.com,+254712345678,Driver,Logistics,Nairobi,Driver,Class B license
EMP002,Jane Wanjiku,jane.w@company.com,+254723456789,Fleet Manager,Operations,Nairobi,Manager,5 years experience
EMP003,Peter Ochieng,peter.o@company.com,+254734567890,Mechanic,Workshop,Mombasa,Staff,Heavy vehicle specialist
EMP004,Mary Akinyi,mary.a@company.com,+254745678901,Admin Assistant,Admin,Nairobi,Staff,Part-time
EMP005,James Mutua,james.m@company.com,+254756789012,Supervisor,Field,Nairobi,Supervisor,Team lead`;

  const downloadTemplate = () => {
    const blob = new Blob([csvTemplate], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'staff_import_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const parseCSV = (text: string): any[] => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];
    
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const data = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const row: any = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      data.push(row);
    }
    
    return data;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setError('');
    setResult(null);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const data = parseCSV(text);
        setPreview(data.slice(0, 5)); // Show first 5 rows
      } catch (err) {
        setError('Failed to parse CSV file');
      }
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setError('Please select a CSV file');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const text = await file.text();
      const staffList = parseCSV(text);
      
      if (staffList.length === 0) {
        throw new Error('No valid staff records found in CSV');
      }

      // Map CSV columns to API format
      const mappedList = staffList.map(row => ({
        staff_no: row.staff_no || row.staffno || row.id || row.employee_id || '',
        staff_name: row.staff_name || row.staffname || row.name || row.full_name || '',
        email: row.email || row.email_address || row.mail || '',
        phone: row.phone || row.phone_number || row.mobile || row.tel || '',
        designation: row.designation || row.position || row.job_title || row.title || '',
        department: row.department || row.dept || row.division || '',
        branch: row.branch || row.location || row.office || '',
        role: row.role || row.type || row.category || 'Staff',
        comments: row.comments || row.notes || row.remarks || ''
      }));

      console.log('Sending staff_list:', mappedList);
      console.log('Token exists:', !!localStorage.getItem('token'));

      const token = localStorage.getItem('token');
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      
      const response = await fetch(`${API_BASE_URL}/api/staff/bulk-import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          staff_list: mappedList,
          create_user_accounts: createUserAccounts
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        console.error('Import error:', data);
        throw new Error(data.error || data.details || JSON.stringify(data) || 'Import failed');
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Failed to import staff');
    } finally {
      setLoading(false);
    }
  };

  const downloadResults = () => {
    if (!result) return;
    
    let csv = 'Staff Name,Email,Status,Staff Created,User Created,Temp Password,User Role,Notes\n';
    result.details.forEach(d => {
      csv += `${d.staff_name || ''},${d.email || ''},${d.status},${d.staffCreated},${d.userCreated},${d.tempPassword || ''},${d.userRole || ''},"${d.error || d.reason || d.userNote || ''}"\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `staff_import_results_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout>
      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Bulk Staff Import</h1>
            <p className="text-gray-500">Import multiple staff members and auto-create their login accounts</p>
          </div>
          <button
            onClick={() => navigate('/staff')}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            Back to Staff
          </button>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <UserPlus className="h-5 w-5 text-blue-600 mt-0.5 mr-2" />
              <div>
                <h3 className="font-medium text-blue-900">Auto User Creation</h3>
                <p className="text-sm text-blue-700 mt-1">
                  Each staff with an email gets a login account automatically
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 mr-2" />
              <div>
                <h3 className="font-medium text-green-900">Role-Based Access</h3>
                <p className="text-sm text-green-700 mt-1">
                  Staff roles (Driver, Manager, etc.) determine system permissions
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 mr-2" />
              <div>
                <h3 className="font-medium text-amber-900">Temp Passwords</h3>
                <p className="text-sm text-amber-700 mt-1">
                  New accounts get temp passwords (must change on first login)
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Upload Section */}
        {!result && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium">Upload CSV File</h2>
              <button
                onClick={downloadTemplate}
                className="text-amber-600 hover:text-amber-700 flex items-center text-sm"
              >
                <Download className="h-4 w-4 mr-1" />
                Download Template
              </button>
            </div>

            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-amber-500 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600">Click to upload or drag and drop</p>
              <p className="text-sm text-gray-400 mt-1">CSV files only</p>
            </div>

            {error && (
              <div className="mt-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded flex items-center">
                <AlertCircle className="h-5 w-5 mr-2" />
                {error}
              </div>
            )}

            {preview.length > 0 && (
              <div className="mt-6">
                <h3 className="font-medium mb-3">Preview (first 5 rows):</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        {Object.keys(preview[0]).map(key => (
                          <th key={key} className="px-3 py-2 text-left font-medium text-gray-600">{key}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((row, idx) => (
                        <tr key={idx} className="border-t">
                          {Object.values(row).map((val: any, i) => (
                            <td key={i} className="px-3 py-2 text-gray-700">{val}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="mt-6 flex items-center justify-between">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={createUserAccounts}
                  onChange={(e) => setCreateUserAccounts(e.target.checked)}
                  className="h-4 w-4 text-amber-600 rounded border-gray-300"
                />
                <span className="ml-2 text-gray-700">Auto-create user accounts for staff with emails</span>
              </label>

              <button
                onClick={handleImport}
                disabled={loading || preview.length === 0}
                className="px-6 py-2 bg-amber-500 text-slate-900 rounded-lg font-medium hover:bg-amber-600 disabled:opacity-50 flex items-center"
              >
                {loading ? (
                  <>Importing...</>
                ) : (
                  <>
                    <Upload className="h-5 w-5 mr-2" />
                    Import {preview.length} Staff
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Results Section */}
        {result && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-medium">Import Results</h2>
              <div className="flex gap-2">
                <button
                  onClick={downloadResults}
                  className="px-4 py-2 text-amber-600 hover:bg-amber-50 rounded-lg flex items-center"
                >
                  <Download className="h-4 w-4 mr-1" />
                  Download CSV
                </button>
                <button
                  onClick={() => {
                    setResult(null);
                    setPreview([]);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="px-4 py-2 bg-amber-500 text-slate-900 rounded-lg hover:bg-amber-600"
                >
                  Import More
                </button>
              </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-green-600">{result.staffCreated}</p>
                <p className="text-sm text-green-700">Staff Created</p>
              </div>
              
              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-blue-600">{result.usersCreated}</p>
                <p className="text-sm text-blue-700">User Accounts</p>
              </div>
              
              <div className="bg-red-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-red-600">{result.staffFailed}</p>
                <p className="text-sm text-red-700">Failed</p>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-gray-600">{result.skippedNoEmail}</p>
                <p className="text-sm text-gray-700">No Email</p>
              </div>
            </div>

            {/* Details Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Staff Name</th>
                    <th className="px-4 py-3 text-left font-medium">Email</th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                    <th className="px-4 py-3 text-left font-medium">User Account</th>
                    <th className="px-4 py-3 text-left font-medium">Temp Password</th>
                    <th className="px-4 py-3 text-left font-medium">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {result.details.map((detail, idx) => (
                    <tr key={idx} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{detail.staff_name}</td>
                      <td className="px-4 py-3">{detail.email || '-'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          detail.status === 'success' 
                            ? 'bg-green-100 text-green-700' 
                            : detail.status === 'skipped'
                            ? 'bg-gray-100 text-gray-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {detail.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {detail.userCreated ? (
                          <span className="text-green-600">✓ {detail.userRole}</span>
                        ) : detail.userNote ? (
                          <span className="text-gray-500">{detail.userNote}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {detail.tempPassword ? (
                          <code className="bg-amber-100 text-amber-800 px-2 py-1 rounded text-xs">
                            {detail.tempPassword}
                          </code>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {detail.error || detail.reason || detail.userNote || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
              <h3 className="font-medium text-amber-900 mb-2">Important: Save the Temporary Passwords!</h3>
              <p className="text-sm text-amber-800">
                New user accounts have been created with temporary passwords shown above. 
                Download the results CSV and share the passwords securely with each staff member. 
                They will be required to change their password on first login.
              </p>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
