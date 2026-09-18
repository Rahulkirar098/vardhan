import { Navigate, Route, Routes } from 'react-router-dom';
import Landing from '../pages/Landing/Landing';
import Login from '../pages/Auth/Login';
import Register from '../pages/Auth/Register';
import ForgotPassword from '../pages/Auth/ForgotPassword';
import ResetPassword from '../pages/Auth/ResetPassword';
import Dashboard from '../pages/Dashboard/Dashboard';
import Hospital from '../pages/Hospital/Hospital';
import CreateHospital from '../pages/Hospital/CreateHospital';
import Profile from '../pages/Profile/Profile';
import AcceptHRInvitation from '../pages/HR/AcceptHRInvitation';
import HRProfile from '../pages/HR/HRProfile';
import MyHospital from '../pages/HR/MyHospital';
import MyDepartment from '../pages/HR/MyDepartment';
import Departments from '../pages/Departments/Departments';
import DepartmentDetails from '../pages/Departments/DepartmentDetails';
import Hospitals from '../pages/SuperAdmin/Hospitals';
import HospitalDetails from '../pages/SuperAdmin/HospitalDetails';

const getUserRole = () => {
  const token = localStorage.getItem('token');

  if (!token) return null;

  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(base64));
    return payload.role || null;
  } catch (error) {
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
            <Navigate to="/hospital" replace />
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
          <ProtectedRoute allowedRoles={['admin']}>
            <Profile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/super-admin/dashboard"
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
            <Dashboard />
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
        path="/hospital/create"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <CreateHospital />
          </ProtectedRoute>
        }
      />
      <Route
        path="/hospital/edit"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <CreateHospital />
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
