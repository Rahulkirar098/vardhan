import { Navigate, Route, Routes } from 'react-router-dom';
import Landing from '../pages/auth/Landing';
import Login from '../pages/auth/Login';
import Register from '../pages/auth/Register';
import ForgotPassword from '../pages/auth/ForgotPassword';
import ResetPassword from '../pages/auth/ResetPassword';
import AcceptEmployeeInvitation from '../pages/auth/AcceptEmployeeInvitation';
import AdminDashboard from '../pages/admin/AdminDashboard';
import HRDashboard from '../pages/hr/HRDashboard';
import SuperAdminDashboard from '../pages/super-admin/SuperAdminDashboard';
import Hospital from '../pages/admin/Hospital';
import Profile from '../pages/shared/Profile';
import StructurePage from '../pages/admin/StructurePage';
import FloorDetails from '../pages/admin/FloorDetails';
import HRProfile from '../pages/hr/HRProfile';
import MyHospital from '../pages/hr/MyHospital';
import EmployeesPage from '../pages/hr/EmployeesPage';
import Hospitals from '../pages/super-admin/SuperAdminHospitals';
import HospitalDetails from '../pages/super-admin/SuperAdminHospitalDetails';
import PositionsPage from '../pages/admin/PositionsPage';
import AccessManagementPage from '../pages/admin/AccessManagementPage';

const getUserRole = () => {
  const token = localStorage.getItem('token');

  if (!token) return null;

  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(base64));

    if (payload.exp && Date.now() >= payload.exp * 1000) {
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      localStorage.removeItem('userName');
      localStorage.removeItem('userEmail');
      return null;
    }

    return payload.role || null;
  } catch {
    return null;
  }
};

const getDefaultRedirectForRole = (role) => {
  if (role === 'super_admin') {
    return '/super-admin/dashboard';
  }

  if (role === 'hr') {
    return '/hr/dashboard';
  }

  if (role === 'admin') {
    return '/hospital';
  }

  if (role === 'employee') {
    return '/profile';
  }

  return '/login';
};

const ProtectedRoute = ({ children, allowedRoles }) => {
  const token = localStorage.getItem('token');

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  const role = getUserRole();

  if (!role) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to={getDefaultRedirectForRole(role)} replace />;
  }

  return children;
};

const PublicOnlyRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  const role = getUserRole();

  if (token && role) {
    return <Navigate to={getDefaultRedirectForRole(role)} replace />;
  }

  return children;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route
        path="/login"
        element={
          <PublicOnlyRoute>
            <Login />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicOnlyRoute>
            <Register />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/forgot-password"
        element={
          <PublicOnlyRoute>
            <ForgotPassword />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/reset-password/:token"
        element={
          <PublicOnlyRoute>
            <ResetPassword />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/hospital"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <Hospital />
          </ProtectedRoute>
        }
      />
      <Route
        path="/positions"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <PositionsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/access-management"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AccessManagementPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute allowedRoles={['admin', 'super_admin', 'hr', 'employee']}>
            <Profile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/super-admin/dashboard"
        element={
          <ProtectedRoute allowedRoles={['super_admin']}>
            <SuperAdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/super-admin/hospitals"
        element={
          <ProtectedRoute allowedRoles={['super_admin']}>
            <Hospitals />
          </ProtectedRoute>
        }
      />
      <Route
        path="/super-admin/hospitals/:hospitalId"
        element={
          <ProtectedRoute allowedRoles={['super_admin']}>
            <HospitalDetails />
          </ProtectedRoute>
        }
      />
      <Route
        path="/hr/dashboard"
        element={
          <ProtectedRoute allowedRoles={['hr']}>
            <HRDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/hr/profile"
        element={
          <ProtectedRoute allowedRoles={['hr']}>
            <HRProfile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/hr/hospital"
        element={
          <ProtectedRoute allowedRoles={['hr']}>
            <MyHospital />
          </ProtectedRoute>
        }
      />
      <Route
        path="/structure"
        element={
          <ProtectedRoute allowedRoles={['admin', 'super_admin', 'hr']}>
            <StructurePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/structure/:floorId"
        element={
          <ProtectedRoute allowedRoles={['admin', 'super_admin', 'hr']}>
            <FloorDetails />
          </ProtectedRoute>
        }
      />
      <Route
        path="/employees"
        element={
          <ProtectedRoute allowedRoles={['admin', 'hr']}>
            <EmployeesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/invite/:token"
        element={<AcceptEmployeeInvitation />}
      />
      <Route
        path="/hr/:id"
        element={
          <ProtectedRoute>
            <HRProfile />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;
