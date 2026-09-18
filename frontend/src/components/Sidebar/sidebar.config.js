import {
  AccountCircleRounded,
  ApartmentRounded,
  LocalHospitalRounded,
} from '@mui/icons-material';

const sidebarConfig = {
  super_admin: {
    sections: [
      {
        title: '',
        items: [
          { label: 'Hospitals', path: '/super-admin/dashboard', icon: LocalHospitalRounded },
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
          { label: 'Hospital', path: '/hospital', icon: LocalHospitalRounded },
          { label: 'Departments', path: '/departments', icon: ApartmentRounded },
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