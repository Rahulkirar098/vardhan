import {
  AccountCircleRounded,
  AssignmentTurnedInRounded,
  DashboardRounded,
  LayersRounded,
  LocalHospitalRounded,
  PeopleRounded,
} from '@mui/icons-material';

const sidebarConfig = {
  super_admin: {
    sections: [
      {
        title: '',
        items: [
          { label: 'Dashboard', path: '/super-admin/dashboard', icon: DashboardRounded },
          { label: 'Hospitals', path: '/super-admin/hospitals', icon: LocalHospitalRounded },
          { label: 'Core Progress', path: '/core-progress', icon: AssignmentTurnedInRounded },
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

export const getSidebarSectionsForRole = (role) => {
  if (role === 'hr') {
    let hasStructureView = false;
    try {
      const stored = localStorage.getItem('permissions');
      const perms = stored ? JSON.parse(stored) : [];
      hasStructureView = Array.isArray(perms) && perms.includes('structure.view');
    } catch {
      hasStructureView = false;
    }

    if (hasStructureView) {
      return [
        {
          title: '',
          items: [
            { label: 'Hospital Structure', path: '/structure', icon: LayersRounded },
            { label: 'My Profile', path: '/hr/profile', icon: AccountCircleRounded },
            { label: 'My Hospital', path: '/hr/hospital', icon: LocalHospitalRounded },
          ],
        },
      ];
    }
    return sidebarConfig.hr?.sections || [];
  }

  return sidebarConfig[role]?.sections || [];
};

export default sidebarConfig;