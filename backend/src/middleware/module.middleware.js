const { canUserAccessModule } = require("../config/modules.config");

/**
 * Middleware to enforce module-level access control.
 * Rejects requests with 403 Forbidden if user or tenant lacks access to the module.
 */
const requireModule = (moduleKey) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Authentication required",
            });
        }

        const userRole = req.user.role;
        const userPermissions = req.user.permissions || [];
        const userModules = req.user.modules || ["core"];

        const hasAccess = canUserAccessModule(moduleKey, userRole, userPermissions, userModules);

        if (!hasAccess) {
            return res.status(403).json({
                success: false,
                message: `Access to ${String(moduleKey).toUpperCase()} module is not granted`,
            });
        }

        return next();
    };
};

module.exports = {
    requireModule,
};
