const { PERMISSIONS } = require("./permissions");

const ROLE_PERMISSIONS = Object.freeze({
    super_admin: Object.freeze([
        PERMISSIONS.HOSPITAL_VIEW,
        PERMISSIONS.HOSPITAL_UPDATE,
        PERMISSIONS.STRUCTURE_VIEW,
        PERMISSIONS.EMPLOYEE_VIEW,
    ]),

    admin: Object.freeze(Object.values(PERMISSIONS)),

    employee: Object.freeze([]),
});

const hasPermission = (user, permission) => {
    if (!user || !user.role) return false;

    if (user.role === "admin") {
        return true;
    }

    const roleDefaults = ROLE_PERMISSIONS[user.role] || [];
    const userSpecific = user.permissions || [];

    if (roleDefaults.includes(permission) || userSpecific.includes(permission)) {
        return true;
    }

    if (userSpecific.includes(PERMISSIONS.STRUCTURE_MANAGE) && [
        PERMISSIONS.STRUCTURE_VIEW,
        PERMISSIONS.STRUCTURE_CREATE,
        PERMISSIONS.STRUCTURE_UPDATE,
        PERMISSIONS.STRUCTURE_DELETE,
        PERMISSIONS.STRUCTURE_MANAGE,
    ].includes(permission)) {
        return true;
    }

    if (userSpecific.includes(PERMISSIONS.LEAVE_MANAGE) && [
        PERMISSIONS.LEAVE_APPLY,
        PERMISSIONS.LEAVE_VIEW_OWN,
        PERMISSIONS.LEAVE_VIEW,
        PERMISSIONS.LEAVE_APPROVE,
        PERMISSIONS.LEAVE_MANAGE,
    ].includes(permission)) {
        return true;
    }

    return false;
};

module.exports = {
    ROLE_PERMISSIONS,
    hasPermission,
};
