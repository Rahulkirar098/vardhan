const { PERMISSIONS } = require("./permissions");

const ROLE_PERMISSIONS = Object.freeze({
    super_admin: Object.freeze([
        PERMISSIONS.HOSPITAL_VIEW,
        PERMISSIONS.HOSPITAL_UPDATE,
        PERMISSIONS.STRUCTURE_VIEW,
        PERMISSIONS.HR_VIEW,
    ]),

    admin: Object.freeze(Object.values(PERMISSIONS)),

    hr: Object.freeze([
        PERMISSIONS.HOSPITAL_VIEW,
        PERMISSIONS.HR_VIEW,
        PERMISSIONS.EMPLOYEE_VIEW,
        PERMISSIONS.POSITION_VIEW,
    ]),

    employee: Object.freeze([]),
});

const hasPermission = (user, permission) => {
    if (!user || !user.role) return false;

    if (user.role === "admin") {
        return true;
    }

    const roleDefaults = ROLE_PERMISSIONS[user.role] || [];
    const userSpecific = Array.isArray(user.permissions) ? user.permissions : [];

    return roleDefaults.includes(permission) || userSpecific.includes(permission);
};

module.exports = {
    ROLE_PERMISSIONS,
    hasPermission,
};
