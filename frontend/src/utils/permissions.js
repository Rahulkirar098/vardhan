export const PERMISSIONS = Object.freeze({
  // Hospital
  HOSPITAL_VIEW: 'hospital.view',
  HOSPITAL_UPDATE: 'hospital.update',

  // Hospital Structure (Floors & Rooms)
  STRUCTURE_VIEW: 'structure.view',
  STRUCTURE_CREATE: 'structure.create',
  STRUCTURE_UPDATE: 'structure.update',
  STRUCTURE_DELETE: 'structure.delete',

  // HR Management & Invitations
  HR_VIEW: 'hr.view',
  HR_INVITE: 'hr.invite',
  HR_UPDATE: 'hr.update',
  HR_INVITATION_MANAGE: 'hr.invitation.manage',

  // Future Phase Placeholders
  EMPLOYEE_VIEW: 'employee.view',
  EMPLOYEE_CREATE: 'employee.create',
  EMPLOYEE_UPDATE: 'employee.update',
  EMPLOYEE_DELETE: 'employee.delete',

  ROSTER_VIEW: 'roster.view',
  ROSTER_MANAGE: 'roster.manage',
});

export const ROLE_PERMISSIONS = Object.freeze({
  super_admin: Object.freeze([
    PERMISSIONS.HOSPITAL_VIEW,
    PERMISSIONS.HOSPITAL_UPDATE,
    PERMISSIONS.STRUCTURE_VIEW,
    PERMISSIONS.HR_VIEW,
  ]),

  admin: Object.freeze([
    PERMISSIONS.HOSPITAL_VIEW,
    PERMISSIONS.HOSPITAL_UPDATE,
    PERMISSIONS.STRUCTURE_VIEW,
    PERMISSIONS.STRUCTURE_CREATE,
    PERMISSIONS.STRUCTURE_UPDATE,
    PERMISSIONS.STRUCTURE_DELETE,
    PERMISSIONS.HR_VIEW,
    PERMISSIONS.HR_INVITE,
    PERMISSIONS.HR_UPDATE,
    PERMISSIONS.HR_INVITATION_MANAGE,
  ]),

  hr: Object.freeze([
    PERMISSIONS.HOSPITAL_VIEW,
    PERMISSIONS.HR_VIEW,
  ]),
});

/**
 * Checks whether a given role has a specific permission.
 * If role is omitted, attempts to read from localStorage.
 *
 * NOTE: Frontend permission checks are STRICTLY for UX purposes (hiding/disabling actions).
 * The backend remains the final authority for all security checks.
 *
 * @param {string} permission
 * @param {string} [role]
 * @param {string[]} [userPermissions]
 * @returns {boolean}
 */
export const hasPermission = (permission, role, userPermissions) => {
  const effectiveRole = role || localStorage.getItem('role');

  if (!effectiveRole) {
    return false;
  }

  // Admin and Super Admin always have full structure & HR access
  if (effectiveRole === 'admin' || effectiveRole === 'super_admin') {
    return true;
  }

  // For HR, check base role permissions + individually assigned permissions
  if (effectiveRole === 'hr') {
    const basePermissions = ROLE_PERMISSIONS.hr || [];
    if (basePermissions.includes(permission)) {
      return true;
    }

    let assigned = userPermissions;
    if (!assigned) {
      try {
        const stored = localStorage.getItem('permissions');
        assigned = stored ? JSON.parse(stored) : [];
      } catch {
        assigned = [];
      }
    }

    return Array.isArray(assigned) && assigned.includes(permission);
  }

  return false;
};

export const getPermissionsForRole = (role) => {
  const effectiveRole = role || localStorage.getItem('role');
  return ROLE_PERMISSIONS[effectiveRole] || [];
};

export const getStoredPermissions = () => {
  try {
    const stored = localStorage.getItem('permissions');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};
