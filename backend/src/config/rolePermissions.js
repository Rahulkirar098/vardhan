const { PERMISSIONS } = require("./permissions");

const ROLE_PERMISSIONS = Object.freeze({
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

const hasPermission = (role, permission) => {
    if (!role || !ROLE_PERMISSIONS[role]) {
        return false;
    }
    return ROLE_PERMISSIONS[role].includes(permission);
};

module.exports = {
    ROLE_PERMISSIONS,
    hasPermission,
};
