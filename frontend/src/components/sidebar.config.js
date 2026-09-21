import {
  AccountCircleRounded,
  DashboardRounded,
  LayersRounded,
  LocalHospitalRounded,
  PeopleRounded,
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
          { label: 'My Profile', path: '/hr/profile', icon: AccountCircleRounded },
          { label: 'My Hospital', path: '/hr/hospital', icon: LocalHospitalRounded },
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

    const coreItems = [
      { label: 'My Profile', path: '/hr/profile', icon: AccountCircleRounded },
      { label: 'My Hospital', path: '/hr/hospital', icon: LocalHospitalRounded },
    ];

    if (hasStructureView) {
      coreItems.unshift({ label: 'Hospital Structure', path: '/structure', icon: LayersRounded });
    }

    const sections = [{ title: '', items: coreItems }];

    if (hasHrmsModule) {
      const hrmsItems = [];

      // Only add Employees if HR has employee.view
      let hasEmployeeView = hasPermission(PERMISSIONS.EMPLOYEE_VIEW);

      if (hasEmployeeView) {
        hrmsItems.push({ label: 'Employees', path: '/employees', icon: BadgeRounded });
      }

      if (hrmsItems.length > 0) {
        sections.push({ title: 'HRMS', items: hrmsItems });
      }
    }

    return sections;
  }

  return sidebarConfig[role]?.sections || [];
};

export default sidebarConfig;