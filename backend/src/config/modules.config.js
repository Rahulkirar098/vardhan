/**
 * Vardhan SaaS Module Foundation Catalog
 *
 * Defines core and extensible platform modules, their activation state,
 * and role/permission requirements.
 */

const SYSTEM_MODULES = [
    {
        key: "core",
        name: "Core Platform",
        category: "FOUNDATION",
        isCore: true,
        isEnabled: true,
        description: "Fundamental multi-tenant SaaS foundation: Hospital/Tenant, Authentication, Users, Roles, and Permissions.",
        allowedRoles: ["super_admin", "admin", "hr"],
        features: [
            "hospital_tenant",
            "authentication",
            "users",
            "roles",
            "permissions",
        ],
    },
    {
        key: "hospital_structure",
        name: "Hospital Structure",
        category: "CORE",
        isCore: true,
        isEnabled: true,
        description: "Physical hospital organization including Floors and generic Rooms (ICU, Wards, OT, etc.).",
        allowedRoles: ["super_admin", "admin", "hr"],
        requiredPermission: "structure.view",
        features: ["floors", "rooms"],
    },
    {
        key: "hrms",
        name: "Human Resource Management (HRMS)",
        category: "BUSINESS_MODULE",
        isCore: false,
        isEnabled: false,
        description: "Planned business module for Employee records, Reporting Manager, Roster, Attendance, and Leave tracking.",
        allowedRoles: ["admin", "hr"],
        features: ["employees", "roster", "attendance", "leave", "reporting_manager"],
    },
    {
        key: "hospital_operations",
        name: "Hospital Operations",
        category: "BUSINESS_MODULE",
        isCore: false,
        isEnabled: false,
        description: "Planned business module for daily clinical and operational workflows.",
        allowedRoles: ["admin"],
        features: ["admissions", "discharges", "transfers"],
    },
];

/**
 * Returns list of modules accessible to the provided user role and permissions.
 */
const getAvailableModules = (userRole, userPermissions = []) => {
    return SYSTEM_MODULES.map((mod) => {
        const roleAllowed = mod.allowedRoles.includes(userRole);
        let permissionAllowed = true;

        if (mod.requiredPermission && userRole === "hr") {
            permissionAllowed = Array.isArray(userPermissions) && userPermissions.includes(mod.requiredPermission);
        }

        const isAccessible = mod.isEnabled && roleAllowed && permissionAllowed;

        return {
            key: mod.key,
            name: mod.name,
            category: mod.category,
            isCore: mod.isCore,
            isEnabled: mod.isEnabled,
            description: mod.description,
            isAccessible,
            features: mod.features,
        };
    });
};

/**
 * Checks if a specific module key is enabled globally in the system.
 */
const isModuleEnabled = (moduleKey) => {
    const mod = SYSTEM_MODULES.find((m) => m.key === moduleKey);
    return mod ? mod.isEnabled : false;
};

/**
 * Checks if a user has access to a specific module.
 */
const canUserAccessModule = (moduleKey, userRole, userPermissions = []) => {
    const mod = SYSTEM_MODULES.find((m) => m.key === moduleKey);
    if (!mod || !mod.isEnabled) return false;
    if (!mod.allowedRoles.includes(userRole)) return false;
    if (mod.requiredPermission && userRole === "hr") {
        return Array.isArray(userPermissions) && userPermissions.includes(mod.requiredPermission);
    }
    return true;
};

module.exports = {
    SYSTEM_MODULES,
    getAvailableModules,
    isModuleEnabled,
    canUserAccessModule,
};
