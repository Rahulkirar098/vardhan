import {
  AccountCircleRounded,
  DashboardRounded,
  LayersRounded,
  LocalHospitalRounded,
  BadgeRounded,
  BusinessCenterRounded,
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
          { label: 'My Profile', path: '/profile', icon: AccountCircleRounded },
        ],
      },
    ],
  },
  hr: {
    sections: [
      {
        title: '',
        items: [
          { label: 'Dashboard', path: '/hr/dashboard', icon: DashboardRounded },
          { label: 'My Hospital', path: '/hr/hospital', icon: LocalHospitalRounded },
          { label: 'My Profile', path: '/hr/profile', icon: AccountCircleRounded },
        ],
      },
    ],
  },
};

export const getRoleDisplayName = (role) => {
  const labels = {
    super_admin: 'Super Administrator',
    admin: 'Administrator',
    hr: 'HR',
    employee: 'Employee',
  };

  return labels[role] || 'User';
};

/**
 * Returns sidebar sections for the given role, dynamically adjusting
 * based on stored user permissions and module access.
 */
export const getSidebarSectionsForRole = (role) => {
  if (role === 'hr') {
    let hasStructureView = hasPermission(PERMISSIONS.STRUCTURE_VIEW);
    let hasHrmsModule = false;

    try {
      const storedModules = localStorage.getItem('modules');
      const mods = storedModules ? JSON.parse(storedModules) : [];
      hasHrmsModule = Array.isArray(mods) && mods.includes('hrms');
    } catch {
      hasHrmsModule = false;
    }

    const items = [
      { label: 'Dashboard', path: '/hr/dashboard', icon: DashboardRounded },
      { label: 'My Hospital', path: '/hr/hospital', icon: LocalHospitalRounded },
    ];

    if (hasStructureView) {
      items.push({ label: 'Hospital Structure', path: '/structure', icon: LayersRounded });
    }

    if (hasHrmsModule && hasPermission(PERMISSIONS.EMPLOYEE_VIEW)) {
      items.push({ label: 'Employees', path: '/employees', icon: BadgeRounded });
    }

    items.push({ label: 'My Profile', path: '/hr/profile', icon: AccountCircleRounded });

    return [{ title: '', items }];
  }

  return sidebarConfig[role]?.sections || [];
};

export default sidebarConfig;