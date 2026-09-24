import {
  AccountCircleRounded,
  DashboardRounded,
  LayersRounded,
  LocalHospitalRounded,
  BadgeRounded,
  BusinessCenterRounded,
  VpnKeyRounded,
  EventNoteRounded,
  AccessTimeRounded,
} from '@mui/icons-material';
import { hasPermission, PERMISSIONS } from '../utils/permissions';

export const SECTION_ORDER = ['MAIN', 'HOSPITAL', 'WORKFORCE', 'ACCESS', 'ACCOUNT'];

/**
 * Master navigation item definitions for Hospital workspace with section grouping.
 */
export const NAVIGATION_ITEMS = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    section: 'MAIN',
    path: '/dashboard',
    icon: DashboardRounded,
    allowedRoles: ['admin'],
  },
  {
    key: 'hospital',
    label: 'Hospital',
    section: 'HOSPITAL',
    path: '/hospital',
    icon: LocalHospitalRounded,
    allowedRoles: ['admin', 'employee'],
    requiredPermission: PERMISSIONS.HOSPITAL_VIEW,
  },
  {
    key: 'structure',
    label: 'Hospital Structure',
    section: 'HOSPITAL',
    path: '/structure',
    icon: LayersRounded,
    allowedRoles: ['admin', 'employee'],
    requiredPermission: PERMISSIONS.STRUCTURE_VIEW,
  },
  {
    key: 'positions',
    label: 'Positions',
    section: 'HOSPITAL',
    path: '/positions',
    icon: BusinessCenterRounded,
    allowedRoles: ['admin', 'employee'],
    requiredPermission: PERMISSIONS.POSITION_VIEW,
  },
  {
    key: 'employees',
    label: 'Employees',
    section: 'WORKFORCE',
    path: '/employees',
    icon: BadgeRounded,
    allowedRoles: ['admin', 'employee'],
    requiredModule: 'hrms',
    requiredPermission: PERMISSIONS.EMPLOYEE_VIEW,
  },
  {
    key: 'attendance',
    label: 'Attendance',
    section: 'WORKFORCE',
    path: '/attendance',
    icon: AccessTimeRounded,
    allowedRoles: ['admin', 'employee'],
    requiredModule: 'hrms',
    requiredAnyPermission: [
      PERMISSIONS.ATTENDANCE_VIEW_OWN,
      PERMISSIONS.ATTENDANCE_VIEW,
      PERMISSIONS.ATTENDANCE_MANAGE,
    ],
  },
  {
    key: 'leaves',
    label: 'Leave Management',
    section: 'WORKFORCE',
    path: '/leaves',
    icon: EventNoteRounded,
    allowedRoles: ['admin', 'employee'],
    requiredModule: 'hrms',
    requiredAnyPermission: [
      PERMISSIONS.LEAVE_APPLY,
      PERMISSIONS.LEAVE_VIEW_OWN,
      PERMISSIONS.LEAVE_VIEW,
      PERMISSIONS.LEAVE_APPROVE,
      PERMISSIONS.LEAVE_MANAGE,
    ],
  },
  {
    key: 'access-management',
    label: 'Access Management',
    section: 'ACCESS',
    path: '/access-management',
    icon: VpnKeyRounded,
    allowedRoles: ['admin', 'employee'],
    requiredPermission: PERMISSIONS.ACCESS_VIEW,
  },
  {
    key: 'profile',
    label: 'My Profile',
    section: 'ACCOUNT',
    path: '/profile',
    icon: AccountCircleRounded,
    allowedRoles: ['admin', 'super_admin', 'employee'],
  },
];

export const SUPER_ADMIN_NAVIGATION_ITEMS = [
  { label: 'Dashboard', section: 'MAIN', path: '/super-admin/dashboard', icon: DashboardRounded },
  { label: 'Hospitals', section: 'HOSPITAL', path: '/super-admin/hospitals', icon: LocalHospitalRounded },
  { label: 'My Profile', section: 'ACCOUNT', path: '/profile', icon: AccountCircleRounded },
];

export const getRoleDisplayName = (role) => {
  const labels = {
    super_admin: 'Super Administrator',
    admin: 'Administrator',
    employee: 'Employee',
  };

  return labels[role] || 'User';
};

/**
 * Groups items into ordered sections based on SECTION_ORDER
 */
const groupItemsIntoSections = (items) => {
  const map = {};
  items.forEach((item) => {
    const sec = item.section || 'MAIN';
    if (!map[sec]) map[sec] = [];
    map[sec].push(item);
  });

  const sections = [];
  SECTION_ORDER.forEach((sec) => {
    if (map[sec] && map[sec].length > 0) {
      sections.push({ title: sec, items: map[sec] });
    }
  });

  Object.keys(map).forEach((sec) => {
    if (!SECTION_ORDER.includes(sec) && map[sec].length > 0) {
      sections.push({ title: sec, items: map[sec] });
    }
  });

  return sections;
};

/**
 * Returns sidebar sections dynamically based on role, assigned modules, and user permissions.
 */
export const getSidebarSectionsForRole = (role, userPermissions, userModules) => {
  if (role === 'super_admin') {
    return groupItemsIntoSections(SUPER_ADMIN_NAVIGATION_ITEMS);
  }

  if (role === 'admin') {
    const items = NAVIGATION_ITEMS.filter((item) => {
      if (item.allowedRoles && !item.allowedRoles.includes('admin')) {
        return false;
      }
      return true;
    });
    return groupItemsIntoSections(items);
  }

  if (role === 'employee') {
    let effectiveModules = userModules;
    if (!effectiveModules) {
      try {
        const stored = localStorage.getItem('modules');
        effectiveModules = stored ? JSON.parse(stored) : ['core'];
      } catch {
        effectiveModules = ['core'];
      }
    }

    const items = NAVIGATION_ITEMS.filter((item) => {
      if (item.allowedRoles && !item.allowedRoles.includes('employee')) {
        return false;
      }

      if (item.requiredModule && (!Array.isArray(effectiveModules) || !effectiveModules.includes(item.requiredModule))) {
        return false;
      }

      if (item.requiredPermission && !hasPermission(item.requiredPermission, role, userPermissions)) {
        return false;
      }

      if (item.requiredAnyPermission && Array.isArray(item.requiredAnyPermission)) {
        const hasAny = item.requiredAnyPermission.some((perm) => hasPermission(perm, role, userPermissions));
        if (!hasAny) {
          return false;
        }
      }

      return true;
    });

    return groupItemsIntoSections(items);
  }

  return [];
};

export default {
  getRoleDisplayName,
  getSidebarSectionsForRole,
  NAVIGATION_ITEMS,
  SUPER_ADMIN_NAVIGATION_ITEMS,
};