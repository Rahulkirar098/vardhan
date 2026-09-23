import {
  AccountCircleRounded,
  DashboardRounded,
  LayersRounded,
  LocalHospitalRounded,
  BadgeRounded,
  BusinessCenterRounded,
  VpnKeyRounded,
  EventNoteRounded,
} from '@mui/icons-material';
import { hasPermission, PERMISSIONS } from '../utils/permissions';

const sidebarConfig = {
  super_admin: {
    sections: [
      {
        title: '',
        items: [
          { label: 'Dashboard', path: '/super-admin/dashboard', icon: DashboardRounded },
          { label: 'Hospitals', path: '/super-admin/hospitals', icon: LocalHospitalRounded },
          { label: 'My Profile', path: '/profile', icon: AccountCircleRounded },
        ],
      },
    ],
  },
  admin: {
    sections: [
      {
        title: '',
        items: [
          { label: 'Dashboard', path: '/dashboard', icon: DashboardRounded },
          { label: 'Hospital', path: '/hospital', icon: LocalHospitalRounded },
          { label: 'Hospital Structure', path: '/structure', icon: LayersRounded },
          { label: 'Positions', path: '/positions', icon: BusinessCenterRounded },
          { label: 'Employees', path: '/employees', icon: BadgeRounded },
          { label: 'Leave Management', path: '/leaves', icon: EventNoteRounded },
          { label: 'Access Management', path: '/access-management', icon: VpnKeyRounded },
          { label: 'My Profile', path: '/profile', icon: AccountCircleRounded },
        ],
      },
    ],
  },
  employee: {
    sections: [
      {
        title: '',
        items: [
          { label: 'My Profile', path: '/profile', icon: AccountCircleRounded },
        ],
      },
    ],
  },
};

export const getRoleDisplayName = (role) => {
  const labels = {
    super_admin: 'Super Administrator',
    admin: 'Administrator',
    employee: 'Employee',
  };

  return labels[role] || 'User';
};

/**
 * Returns sidebar sections dynamically based on role, assigned modules, and user permissions.
 */
export const getSidebarSectionsForRole = (role) => {
  if (role === 'super_admin') {
    return sidebarConfig.super_admin.sections;
  }

  if (role === 'admin') {
    return sidebarConfig.admin.sections;
  }

  if (role === 'employee') {
    let hasHrmsModule = false;
    let hasStructureModule = false;

    try {
      const storedModules = localStorage.getItem('modules');
      const mods = storedModules ? JSON.parse(storedModules) : [];
      hasHrmsModule = Array.isArray(mods) && mods.includes('hrms');
      hasStructureModule = Array.isArray(mods) && (mods.includes('hospital_structure') || mods.includes('core'));
    } catch {
      hasHrmsModule = false;
      hasStructureModule = false;
    }

    const items = [];

    // Employees Navigation (HRMS module + employee.view permission)
    if (hasHrmsModule && hasPermission(PERMISSIONS.EMPLOYEE_VIEW)) {
      items.push({ label: 'Employees', path: '/employees', icon: BadgeRounded });
    }

    // Leave Management Navigation (HRMS module + leave permissions)
    if (hasHrmsModule && (hasPermission(PERMISSIONS.LEAVE_VIEW) || hasPermission(PERMISSIONS.LEAVE_VIEW_OWN) || hasPermission(PERMISSIONS.LEAVE_APPLY))) {
      items.push({ label: 'Leave Management', path: '/leaves', icon: EventNoteRounded });
    }

    // Structure Navigation (structure module/core + structure.view permission)
    if (hasStructureModule && hasPermission(PERMISSIONS.STRUCTURE_VIEW)) {
      items.push({ label: 'Hospital Structure', path: '/structure', icon: LayersRounded });
    }

    // My Profile is always available for all authenticated employees
    items.push({ label: 'My Profile', path: '/profile', icon: AccountCircleRounded });

    return [{ title: '', items }];
  }

  return [];
};

export default sidebarConfig;