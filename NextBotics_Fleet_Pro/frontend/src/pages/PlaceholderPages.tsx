import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardCheck, GraduationCap, ShieldAlert, Fuel } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import DashboardLayout from '../components/Layout';

// Placeholder pages for other modules
export function AuditsPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) navigate('/login');
  }, [isAuthenticated, navigate]);

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Audits</h1>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <ClipboardCheck className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Audit management module coming soon</p>
        </div>
      </div>
    </DashboardLayout>
  );
}

export function TrainingPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) navigate('/login');
  }, [isAuthenticated, navigate]);

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Training Center</h1>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <GraduationCap className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Training module coming soon</p>
        </div>
      </div>
    </DashboardLayout>
  );
}

export function RisksPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (user?.role !== 'admin' && user?.role !== 'manager') {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate, user]);

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Risk Management</h1>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <ShieldAlert className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Risk management module coming soon</p>
        </div>
      </div>
    </DashboardLayout>
  );
}

export function FuelPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (user?.role !== 'admin' && user?.role !== 'manager') {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate, user]);

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Fuel Management</h1>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <Fuel className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Fuel management module coming soon</p>
        </div>
      </div>
    </DashboardLayout>
  );
}

export function AssignmentsPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) navigate('/login');
  }, [isAuthenticated, navigate]);

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Assignments</h1>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <ClipboardCheck className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Assignments module coming soon</p>
        </div>
      </div>
    </DashboardLayout>
  );
}

export function FleetOverviewPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (user?.role !== 'admin' && user?.role !== 'manager') {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate, user]);

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Fleet Overview</h1>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <ClipboardCheck className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Fleet overview module coming soon</p>
        </div>
      </div>
    </DashboardLayout>
  );
}

export function AlertsPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) navigate('/login');
  }, [isAuthenticated, navigate]);

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Alerts</h1>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <ShieldAlert className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Alerts module coming soon</p>
        </div>
      </div>
    </DashboardLayout>
  );
}

export function SettingsPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) navigate('/login');
  }, [isAuthenticated, navigate]);

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <p className="text-gray-500">Settings module coming soon</p>
        </div>
      </div>
    </DashboardLayout>
  );
}
