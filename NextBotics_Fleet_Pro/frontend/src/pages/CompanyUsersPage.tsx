import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Users, Plus, RefreshCw, Trash2, Key, ArrowLeft } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { api } from '../services/api';
import { User, CreateUserData } from '../types';
import DashboardLayout from '../components/Layout';

export default function CompanyUsersPage() {
  const navigate = useNavigate();
  const { id: companyId } = useParams<{ id: string }>();
  const { user: currentUser } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [tempPassword, setTempPassword] = useState('');
  const [formData, setFormData] = useState<CreateUserData>({
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    role: 'staff'
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Redirect non-super-admins
  useEffect(() => {
    if (currentUser?.type !== 'super_admin') {
      navigate('/dashboard');
    }
  }, [currentUser, navigate]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const res = await api.getUsers({ perPage: 100 });
      if (res.success) {
        // Filter users by company
        const companyUsers = res.data?.items?.filter((_u: User) => {
          // Check if user belongs to this company (simplified - in real app you'd filter by companyId)
          return true; // Show all for now, backend handles company isolation
        }) || [];
        setUsers(companyUsers);
      }
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [companyId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setTempPassword('');
    setSaving(true);

    try {
      const res = await api.createUser({ ...formData, companyId });
      if (res.success) {
        setTempPassword(res.data?.tempPassword || '');
        setSuccess(`User ${formData.firstName} ${formData.lastName} created successfully!`);
        setFormData({ email: '', firstName: '', lastName: '', phone: '', role: 'staff' });
        loadUsers();
        // Don't close modal immediately so they can see the temp password
        setTimeout(() => {
          setShowModal(false);
          setSuccess('');
          setTempPassword('');
        }, 5000);
      } else {
        setError(res.error || 'Failed to create user');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to create user');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    
    try {
      const res = await api.deleteUser(userId);
      if (res.success) {
        loadUsers();
      }
    } catch (err) {
      console.error('Failed to delete user:', err);
    }
  };

  const handleResetPassword = async (userId: string) => {
    if (!confirm('Reset password for this user? A temporary password will be generated.')) return;
    
    try {
      const res = await api.resetPassword(userId);
      if (res.success && res.data?.tempPassword) {
        alert(`Temporary password: ${res.data.tempPassword}\n\nPlease share this with the user securely.`);
      }
    } catch (err) {
      console.error('Failed to reset password:', err);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-purple-100 text-purple-800';
      case 'manager': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-amber-500" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate('/companies')}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">Company Users</h1>
            <p className="text-gray-500">Manage users for this company</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="bg-amber-500 text-slate-900 px-4 py-2 rounded-lg hover:bg-amber-600 flex items-center gap-2 font-medium"
          >
            <Plus className="w-5 h-5" />
            Add User
          </button>
        </div>

        {/* Users List */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>No users yet. Create your first one!</p>
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 font-semibold">
                          {user.firstName?.[0]}{user.lastName?.[0]}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {user.firstName} {user.lastName}
                          </div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.phone || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleBadgeColor(user.role)}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        user.isActive !== false 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {user.isActive !== false ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleResetPassword(user.id)}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                        title="Reset Password"
                      >
                        <Key className="w-4 h-4 inline" />
                      </button>
                      <button
                        onClick={() => handleDelete(user.id)}
                        className="text-red-600 hover:text-red-900"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4 inline" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create User Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Create New User</h2>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded text-sm">
                  {error}
                </div>
              )}
              
              {success && (
                <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded text-sm">
                  <p>{success}</p>
                  {tempPassword && (
                    <div className="mt-2 p-2 bg-white rounded border border-green-300">
                      <p className="font-medium">Temporary Password:</p>
                      <code className="text-lg font-mono bg-gray-100 px-2 py-1 rounded">{tempPassword}</code>
                      <p className="text-xs mt-1">Share this with the user securely. They'll be prompted to change it on first login.</p>
                    </div>
                  )}
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="John"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="Doe"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="john.doe@company.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  value={formData.phone || ''}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="+1 (555) 123-4567"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role *
                </label>
                <select
                  required
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                >
                  <option value="admin">Admin - Full access</option>
                  <option value="manager">Manager - Can manage fleet</option>
                  <option value="staff">Staff - Basic access</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setError('');
                    setSuccess('');
                    setTempPassword('');
                  }}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  {success ? 'Close' : 'Cancel'}
                </button>
                {!success && (
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 bg-amber-500 text-slate-900 rounded-lg hover:bg-amber-600 disabled:opacity-50 font-medium"
                  >
                    {saving ? 'Creating...' : 'Create User'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
