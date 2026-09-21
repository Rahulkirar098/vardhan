const {
    SYSTEM_MODULES,
    getAvailableModules,
    isModuleEnabled,
} = require("../config/modules.config");

/**
 * GET /api/v1/modules
 * Returns all system modules with user access resolution.
 */
const getModules = async (req, res) => {
    try {
        const userRole = req.user?.role;
        const userPermissions = req.user?.permissions || [];

        const modules = getAvailableModules(userRole, userPermissions);

        const activeModulesCount = modules.filter((m) => m.isEnabled).length;
        const accessibleModulesCount = modules.filter((m) => m.isAccessible).length;

        return res.status(200).json({
            success: true,
            message: "Modules retrieved successfully",
            data: {
                modules,
                totalCount: modules.length,
                activeModulesCount,
                accessibleModulesCount,
            },
        });
    } catch (error) {
        console.error("Get Modules Error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
};

/**
 * GET /api/v1/modules/:moduleKey
 * Returns detailed metadata for a single module.
 */
const getModuleByKey = async (req, res) => {
    try {
        const { moduleKey } = req.params;
        const userRole = req.user?.role;
        const userPermissions = req.user?.permissions || [];

        const modules = getAvailableModules(userRole, userPermissions);
        const mod = modules.find((m) => m.key === moduleKey);

        if (!mod) {
            return res.status(404).json({
                success: false,
                message: `Module '${moduleKey}' not found`,
            });
        }

        return res.status(200).json({
            success: true,
            data: mod,
        });
    } catch (error) {
        console.error("Get Module Error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
};

module.exports = {
    getModules,
    getModuleByKey,
};
