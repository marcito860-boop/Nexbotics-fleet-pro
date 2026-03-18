import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from './store/authStore';
import Login from './pages/Login';
import ChangePassword from './pages/ChangePassword';
import FleetDashboard from './pages/FleetDashboard';
import VehiclesPage from './pages/VehiclesPage';
import DriversPage from './pages/DriversPage';
import TripsPage from './pages/TripsPage';
import RequisitionsPage from './pages/RequisitionsPage';
import InventoryPage from './pages/InventoryPage';
import InvoicesPage from './pages/InvoicesPage';
import AnalyticsPage from './pages/AnalyticsPage';
import TVDisplay from './pages/TVDisplay';
import FuelPage from './pages/FuelPage';
import AssignmentsPage from './pages/AssignmentsPage';
import FleetOverviewPage from './pages/FleetOverviewPage';
import AlertsPage from './pages/AlertsPage';
import MaintenancePage from './pages/MaintenancePage';
import IntegrationsPage from './pages/IntegrationsPage';
import AuditsPage from './pages/AuditsPage';
import AuditDetailPage from './pages/AuditDetailPage';
import SettingsPage from './pages/SettingsPage';
import CompaniesPage from './pages/CompaniesPage';
import CompanyUsersPage from './pages/CompanyUsersPage';
import {
  TrainingPage, RisksPage
} from './pages/PlaceholderPages';

// Protected route component
function ProtectedRoute({ children, requireManager = false }: { children: React.ReactNode; requireManager?: boolean }) {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check if password change is required
  if (user?.mustChangePassword && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }

  // Check manager role requirement
  if (requireManager && user?.role !== 'admin' && user?.role !== 'manager') {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

// Public route component (redirects to dashboard if already logged in)
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthStore();

  if (isAuthenticated) {
    if (user?.mustChangePassword) {
      return <Navigate to="/change-password" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

function App() {
  const initialize = useAuthStore((state) => state.initialize);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <Routes>
      {/* Public routes */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />

      {/* Protected routes */}
      <Route
        path="/change-password"
        element={
          <ProtectedRoute>
            <ChangePassword />
          </ProtectedRoute>
        }
      />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <FleetDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/fleet"
        element={
          <ProtectedRoute requireManager>
            <FleetOverviewPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/vehicles"
        element={
          <ProtectedRoute>
            <VehiclesPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/drivers"
        element={
          <ProtectedRoute>
            <DriversPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/assignments"
        element={
          <ProtectedRoute>
            <AssignmentsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/trips"
        element={
          <ProtectedRoute>
            <TripsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/fuel"
        element={
          <ProtectedRoute requireManager>
            <FuelPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/requisitions"
        element={
          <ProtectedRoute>
            <RequisitionsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/training"
        element={
          <ProtectedRoute>
            <TrainingPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/audits"
        element={
          <ProtectedRoute>
            <AuditsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/audits/:id"
        element={
          <ProtectedRoute>
            <AuditDetailPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/risks"
        element={
          <ProtectedRoute requireManager>
            <RisksPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/maintenance"
        element={
          <ProtectedRoute requireManager>
            <MaintenancePage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/inventory"
        element={
          <ProtectedRoute>
            <InventoryPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/invoices"
        element={
          <ProtectedRoute requireManager>
            <InvoicesPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/analytics"
        element={
          <ProtectedRoute requireManager>
            <AnalyticsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/alerts"
        element={
          <ProtectedRoute>
            <AlertsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/companies"
        element={
          <ProtectedRoute>
            <CompaniesPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/companies/:id/users"
        element={
          <ProtectedRoute>
            <CompanyUsersPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/integrations"
        element={
          <ProtectedRoute requireManager>
            <IntegrationsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/tv"
        element={
          <ProtectedRoute>
            <TVDisplay />
          </ProtectedRoute>
        }
      />

      {/* Default redirects */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;
