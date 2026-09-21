const { hasPermission } = require("../config/rolePermissions");

/**
 * Middleware to authorize requests based on user permissions.
 * Supports a single permission or multiple permissions (user must have all or at least one).
 * Default: required permissions must be present.
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

        const userRole = req.user.role;

        // Verify if user's role satisfies all required permissions
        const isAuthorized = requiredPermissions.every((permission) =>
            hasPermission(userRole, permission)
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
