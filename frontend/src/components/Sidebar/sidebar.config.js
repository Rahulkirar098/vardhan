import {
  AccountCircleRounded,
  ApartmentRounded,
  DashboardRounded,
  LocalHospitalRounded,
} from '@mui/icons-material';

const sidebarConfig = {
  super_admin: {
    sections: [
      {
        title: 'MAIN',
        items: [
          { label: 'Hospitals', path: '/super-admin/dashboard', icon: LocalHospitalRounded },
        ],
      },
    ],
  },
  admin: {
    sections: [
      {
        title: 'MAIN',
        items: [
          { label: 'Hospital', path: '/hospital', icon: LocalHospitalRounded },
          { label: 'Departments', path: '/departments', icon: ApartmentRounded },
        ],
      },
      {
        title: 'ACCOUNT',
        items: [
          { label: 'My Profile', path: '/profile', icon: AccountCircleRounded },
        ],
      },
    ],
  },
  hr: {
    sections: [
      {
        title: 'MAIN',
        items: [
          { label: 'Dashboard', path: '/hr/dashboard', icon: DashboardRounded },
        ],
      },
      {
        title: 'MY WORKSPACE',
        items: [
          { label: 'My Profile', path: '/hr/profile', icon: AccountCircleRounded },
          { label: 'My Hospital', path: '/hr/hospital', icon: LocalHospitalRounded },
          { label: 'My Department', path: '/hr/department', icon: ApartmentRounded },
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
  return sidebarConfig[role]?.sections || [];
};

export default sidebarConfig;
