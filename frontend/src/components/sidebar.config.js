import {
  AccountCircleRounded,
  DashboardRounded,
  LayersRounded,
  LocalHospitalRounded,
  PeopleRounded,
  BadgeRounded,
} from '@mui/icons-material';

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
          { label: 'HR Management', path: '/hr-management', icon: PeopleRounded },
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
    let hasStructureView = false;
    let hasHrmsModule = false;

    try {
      const storedPerms = localStorage.getItem('permissions');
      const perms = storedPerms ? JSON.parse(storedPerms) : [];
      hasStructureView = Array.isArray(perms) && perms.includes('structure.view');
    } catch {
      hasStructureView = false;
    }

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
      sections.push({
        title: 'HRMS',
        items: [
          // Phase 2+ will add Employee Management, Roster, Attendance, Leave here
          { label: 'Employees', path: '/hr/employees', icon: BadgeRounded },
        ],
      });
    }

    return sections;
  }

  return sidebarConfig[role]?.sections || [];
};

export default sidebarConfig;