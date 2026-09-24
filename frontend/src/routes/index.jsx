import { Navigate, Route, Routes } from 'react-router-dom';
import Landing from '../pages/auth/Landing';
import Login from '../pages/auth/Login';
import Register from '../pages/auth/Register';
import ForgotPassword from '../pages/auth/ForgotPassword';
import ResetPassword from '../pages/auth/ResetPassword';
import AcceptInvitation from '../pages/auth/AcceptInvitation';
import AdminDashboard from '../pages/admin/AdminDashboard';
import SuperAdminDashboard from '../pages/super-admin/SuperAdminDashboard';
import Hospital from '../pages/admin/Hospital';
import Profile from '../pages/shared/Profile';
import StructurePage from '../pages/admin/StructurePage';
import FloorDetails from '../pages/admin/FloorDetails';
import EmployeesPage from '../pages/admin/EmployeesPage';
import Hospitals from '../pages/super-admin/SuperAdminHospitals';
import HospitalDetails from '../pages/super-admin/SuperAdminHospitalDetails';
import PositionsPage from '../pages/admin/PositionsPage';
import AccessManagementPage from '../pages/admin/AccessManagementPage';
import LeaveManagementPage from '../pages/admin/LeaveManagementPage';
import AttendancePage from '../pages/admin/AttendancePage';
import { hasPermission, PERMISSIONS } from '../utils/permissions';

const getUserRole = () => {
  const token = localStorage.getItem('token');

  if (!token) return null;

  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(base64));

    if (payload.exp && Date.now() >= payload.exp * 1000) {
      localStorage.removeItem('token');
      localStorage.removeItem('userId');
      localStorage.removeItem('role');
      localStorage.removeItem('userName');
      localStorage.removeItem('userEmail');
      localStorage.removeItem('positionName');
      localStorage.removeItem('permissions');
      localStorage.removeItem('modules');
      localStorage.removeItem('hospitalId');
      localStorage.removeItem('employeeId');
      return null;
    }

    return payload.role || null;
  } catch {
    return null;
  }
};

export const getDefaultRedirectForRole = (role) => {
  if (role === 'super_admin') {
    return '/super-admin/dashboard';
  }

  if (role === 'admin') {
    return '/hospital';
  }

  if (role === 'employee') {
    let hasHrmsModule = false;

    try {
      const storedModules = localStorage.getItem('modules');
      const mods = storedModules ? JSON.parse(storedModules) : [];
      hasHrmsModule = Array.isArray(mods) && mods.includes('hrms');
    } catch {
      hasHrmsModule = false;
    }

    if (hasHrmsModule && hasPermission(PERMISSIONS.EMPLOYEE_VIEW)) {
      return '/employees';
    }

    const hasAnyLeave =
      hasPermission(PERMISSIONS.LEAVE_APPLY) ||
      hasPermission(PERMISSIONS.LEAVE_VIEW_OWN) ||
      hasPermission(PERMISSIONS.LEAVE_VIEW) ||
      hasPermission(PERMISSIONS.LEAVE_APPROVE) ||
      hasPermission(PERMISSIONS.LEAVE_MANAGE);

    if (hasHrmsModule && hasAnyLeave) {
      return '/leaves';
    }

    const hasAnyAttendance =
      hasPermission(PERMISSIONS.ATTENDANCE_VIEW_OWN) ||
      hasPermission(PERMISSIONS.ATTENDANCE_VIEW) ||
      hasPermission(PERMISSIONS.ATTENDANCE_MANAGE);

    if (hasHrmsModule && hasAnyAttendance) {
      return '/attendance';
    }

    if (hasPermission(PERMISSIONS.STRUCTURE_VIEW)) {
      return '/structure';
    }

    if (hasPermission(PERMISSIONS.POSITION_VIEW)) {
      return '/positions';
    }

    if (hasPermission(PERMISSIONS.HOSPITAL_VIEW)) {
      return '/hospital';
    }

    if (hasPermission(PERMISSIONS.ACCESS_VIEW)) {
      return '/access-management';
    }

    return '/profile';
  }

  return '/login';
};

const ProtectedRoute = ({ children, allowedRoles, requiredModule, requiredPermission, requiredAnyPermission }) => {
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

  // If user is employee, verify granular module/permission requirements
  if (role === 'employee') {
    if (requiredModule) {
      try {
        const storedModules = localStorage.getItem('modules');
        const mods = storedModules ? JSON.parse(storedModules) : [];
        if (!Array.isArray(mods) || !mods.includes(requiredModule)) {
          return <Navigate to={getDefaultRedirectForRole(role)} replace />;
        }
      } catch {
        return <Navigate to={getDefaultRedirectForRole(role)} replace />;
      }
    }

    if (requiredPermission && !hasPermission(requiredPermission)) {
      return <Navigate to={getDefaultRedirectForRole(role)} replace />;
    }

    if (requiredAnyPermission && Array.isArray(requiredAnyPermission)) {
      const hasAny = requiredAnyPermission.some((perm) => hasPermission(perm));
      if (!hasAny) {
        return <Navigate to={getDefaultRedirectForRole(role)} replace />;
      }
    }
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
          <ProtectedRoute
            allowedRoles={['admin', 'employee']}
            requiredPermission={PERMISSIONS.HOSPITAL_VIEW}
          >
            <Hospital />
          </ProtectedRoute>
        }
      />
      <Route
        path="/positions"
        element={
          <ProtectedRoute
            allowedRoles={['admin', 'employee']}
            requiredPermission={PERMISSIONS.POSITION_VIEW}
          >
            <PositionsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/access-management"
        element={
          <ProtectedRoute
            allowedRoles={['admin', 'employee']}
            requiredPermission={PERMISSIONS.ACCESS_VIEW}
          >
            <AccessManagementPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute allowedRoles={['admin', 'super_admin', 'employee']}>
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
        path="/structure"
        element={
          <ProtectedRoute
            allowedRoles={['admin', 'super_admin', 'employee']}
            requiredPermission={PERMISSIONS.STRUCTURE_VIEW}
          >
            <StructurePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/structure/:floorId"
        element={
          <ProtectedRoute
            allowedRoles={['admin', 'super_admin', 'employee']}
            requiredPermission={PERMISSIONS.STRUCTURE_VIEW}
          >
            <FloorDetails />
          </ProtectedRoute>
        }
      />
      <Route
        path="/employees"
        element={
          <ProtectedRoute
            allowedRoles={['admin', 'employee']}
            requiredModule="hrms"
            requiredPermission={PERMISSIONS.EMPLOYEE_VIEW}
          >
            <EmployeesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/leaves"
        element={
          <ProtectedRoute
            allowedRoles={['admin', 'employee']}
            requiredModule="hrms"
            requiredAnyPermission={[
              PERMISSIONS.LEAVE_APPLY,
              PERMISSIONS.LEAVE_VIEW_OWN,
              PERMISSIONS.LEAVE_VIEW,
              PERMISSIONS.LEAVE_APPROVE,
              PERMISSIONS.LEAVE_MANAGE,
            ]}
          >
            <LeaveManagementPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/attendance"
        element={
          <ProtectedRoute
            allowedRoles={['admin', 'employee']}
            requiredModule="hrms"
            requiredAnyPermission={[
              PERMISSIONS.ATTENDANCE_VIEW_OWN,
              PERMISSIONS.ATTENDANCE_VIEW,
              PERMISSIONS.ATTENDANCE_MANAGE,
            ]}
          >
            <AttendancePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/invite/:token"
        element={<AcceptInvitation />}
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;
