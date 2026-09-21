const { ROLE_PERMISSIONS } = require("../config/rolePermissions");

/**
 * Middleware to authorize requests based on user permissions.
 *
 * Rules:
 * - super_admin: platform access
 * - admin: full hospital, structure, and HR management access
 * - hr: base role permissions (hospital.view, hr.view) + individually assigned permissions in req.user.permissions
 *
 * @param {...string} requiredPermissions
 */
const authorizePermission = (...requiredPermissions) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Authentication required",
            });
        }

        const { role, permissions: userPermissions = [] } = req.user;

        // super_admin has platform access
        if (role === "super_admin") {
            return next();
        }

        // admin always has full access to hospital, structure, and HR
        if (role === "admin") {
            return next();
        }

        // hr checks base role permissions + individually assigned permissions
        if (role === "hr") {
            const hrBasePermissions = ROLE_PERMISSIONS.hr || [];
            const isAuthorized = requiredPermissions.every(
                (permission) =>
                    hrBasePermissions.includes(permission) ||
                    userPermissions.includes(permission)
            );

            if (!isAuthorized) {
                return res.status(403).json({
                    success: false,
                    message: "You do not have permission to perform this action",
                });
            }

            return next();
        }

        return res.status(403).json({
            success: false,
            message: "You do not have permission to perform this action",
        });
    };
};

module.exports = {
    authorizePermission,
};
