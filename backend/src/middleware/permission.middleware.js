const { hasPermission } = require("../config/rolePermissions");

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
        if (req.user.role === "super_admin") {
            return next();
        }

        const isAuthorized = requiredPermissions.every((permission) =>
            hasPermission(req.user, permission)
        );

        if (!isAuthorized) {
            return res.status(403).json({
                success: false,
                message: "You do not have permission to perform this action",
            });
        }

        return next();
    };
};

module.exports = {
    authorizePermission,
};
