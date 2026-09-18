import { Navigate, Route, Routes } from 'react-router-dom';
import Landing from '../pages/auth/Landing';
import Login from '../pages/auth/Login';
import Register from '../pages/auth/Register';
import ForgotPassword from '../pages/auth/ForgotPassword';
import ResetPassword from '../pages/auth/ResetPassword';
import AcceptHRInvitation from '../pages/auth/AcceptHRInvitation';
import AdminDashboard from '../pages/admin/AdminDashboard';
import HRDashboard from '../pages/hr/HRDashboard';
import SuperAdminDashboard from '../pages/super-admin/SuperAdminDashboard';
import Hospital from '../pages/admin/Hospital';
import Profile from '../pages/shared/Profile';
import Departments from '../pages/admin/Departments';
import DepartmentDetails from '../pages/admin/DepartmentDetails';
import HRProfile from '../pages/hr/HRProfile';
import MyHospital from '../pages/hr/MyHospital';
import MyDepartment from '../pages/hr/MyDepartment';
import Hospitals from '../pages/super-admin/SuperAdminHospitals';
import HospitalDetails from '../pages/super-admin/SuperAdminHospitalDetails';

const getUserRole = () => {
  const token = localStorage.getItem('token');

  if (!token) return null;

  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(base64));
    return payload.role || null;
  } catch {
    return null;
  }
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
    if (role === 'super_admin') {
      return <Navigate to="/super-admin/dashboard" replace />;
    }

    if (role === 'hr') {
      return <Navigate to="/hr/dashboard" replace />;
    }

    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password/:token" element={<ResetPassword />} />
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
        path="/profile"
        element={
          <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
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
        path="/departments"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <Departments />
          </ProtectedRoute>
        }
      />
      <Route
        path="/departments/:departmentId"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <DepartmentDetails />
          </ProtectedRoute>
        }
      />
      <Route
        path="/hr/invite/:token"
        element={<AcceptHRInvitation />}
      />
      <Route
        path="/hr/:id"
        element={
          <ProtectedRoute>
            <HRProfile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/hr/department"
        element={
          <ProtectedRoute allowedRoles={['hr']}>
            <MyDepartment />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;
