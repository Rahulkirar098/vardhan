const CoreProgress = require("../models/coreProgress.model");

const INITIAL_CORE_MODULES = [
    {
        moduleKey: "hospital_foundation",
        moduleName: "SaaS / Hospital Foundation",
        features: [
            {
                featureKey: "hospital_tenant",
                featureName: "Hospital / Tenant",
                description: "Core tenant entity representing hospital organization",
                status: "DONE",
                notes: "Hospital model and registration complete with tenant metadata",
            },
            {
                featureKey: "one_admin_one_hospital",
                featureName: "One Admin → One Hospital",
                description: "Strict 1:1 relationship between administrator and hospital",
                status: "DONE",
                notes: "Enforced via unique index on hospital createdBy",
            },
            {
                featureKey: "hospital_ownership",
                featureName: "Hospital Ownership",
                description: "Hospital createdBy association and administrative ownership",
                status: "DONE",
                notes: "Owner check verified across hospital and structure routes",
            },
            {
                featureKey: "data_isolation",
                featureName: "Hospital-scoped Data Isolation",
                description: "Strict tenant data isolation across all records",
                status: "DONE",
                notes: "Multi-tenant boundary enforced in middleware and services",
            },
            {
                featureKey: "hospital_status",
                featureName: "Hospital Status / Active State",
                description: "Active / inactive lifecycle handling for hospital organizations",
                status: "DONE",
                notes: "Hospital status schema enum and validation in place",
            },
            {
                featureKey: "tenant_context",
                featureName: "Tenant Context Available to Authenticated Users",
                description: "Tenant context resolved and attached to authenticated requests",
                status: "DONE",
                notes: "req.user.hospitalId attached in auth middleware",
            },
        ],
    },
    {
        moduleKey: "authentication",
        moduleName: "Authentication",
        features: [
            {
                featureKey: "admin_registration",
                featureName: "Admin Registration",
                description: "Self-serve registration for hospital administrators",
                status: "DONE",
                notes: "POST /api/auth/register verified and functional",
            },
            {
                featureKey: "login",
                featureName: "Login",
                description: "Secure credential authentication and JWT issuing",
                status: "DONE",
                notes: "POST /api/auth/login verified with bcrypt and JWT",
            },
            {
                featureKey: "logout",
                featureName: "Logout",
                description: "Explicit session logout and token invalidation",
                status: "DONE",
                notes: "POST /api/auth/logout with token revocation",
            },
            {
                featureKey: "jwt_authentication",
                featureName: "JWT Authentication",
                description: "Stateless bearer token verification on protected APIs",
                status: "DONE",
                notes: "authMiddleware verifies tokens on all protected endpoints",
            },
            {
                featureKey: "current_user_me",
                featureName: "Current User / Me",
                description: "Authenticated identity endpoint returning user profile and permissions",
                status: "DONE",
                notes: "GET /api/auth/me returns user, role, hospitalId, and permissions",
            },
            {
                featureKey: "protected_routes",
                featureName: "Protected Routes",
                description: "Client and server route guarding based on auth status",
                status: "DONE",
                notes: "ProtectedRoute and PublicOnlyRoute implemented in React router",
            },
            {
                featureKey: "session_handling",
                featureName: "Token / Session Handling",
                description: "Client-side token persistence and expiration detection",
                status: "DONE",
                notes: "Token stored in localStorage and checked for expiration",
            },
            {
                featureKey: "password_reset",
                featureName: "Password Reset",
                description: "Secure token-based password reset via email",
                status: "DONE",
                notes: "Forgot password flow with SHA-256 token hashing and SMTP",
            },
            {
                featureKey: "password_change",
                featureName: "Password Change",
                description: "In-app password change for authenticated users",
                status: "IN_PROGRESS",
                notes: "Profile page UI exists; dedicated in-app password change endpoint pending refinement",
            },
            {
                featureKey: "account_status_handling",
                featureName: "Account Active / Inactive Handling",
                description: "Blocking login and access for deactivated accounts",
                status: "DONE",
                notes: "Inactive accounts blocked in authMiddleware and loginUser",
            },
            {
                featureKey: "token_revocation",
                featureName: "Token Revocation / Logout Security",
                description: "Server-side token blacklisting with TTL index expiration",
                status: "DONE",
                notes: "RevokedToken collection with automatic TTL expiration",
            },
        ],
    },
    {
        moduleKey: "users",
        moduleName: "Users",
        features: [
            {
                featureKey: "user_model",
                featureName: "User Model",
                description: "Core user schema with name, email, credentials, role, and hospital scoping",
                status: "DONE",
                notes: "Mongoose schema with timestamps and active role enum",
            },
            {
                featureKey: "user_creation",
                featureName: "User Creation",
                description: "Account creation for administrators and staff",
                status: "DONE",
                notes: "Admin registration and HR invite acceptance creation verified",
            },
            {
                featureKey: "user_profile",
                featureName: "User Profile",
                description: "Profile retrieval and inspection",
                status: "DONE",
                notes: "Profile retrieval for Admin, HR, and Super Admin",
            },
            {
                featureKey: "user_update",
                featureName: "User Update",
                description: "Updating user contact details and profile attributes",
                status: "DONE",
                notes: "Profile edit supported",
            },
            {
                featureKey: "user_activation",
                featureName: "User Activation / Deactivation",
                description: "Toggling user active status safely",
                status: "DONE",
                notes: "Status enum ['active', 'inactive'] supported on User model",
            },
            {
                featureKey: "hospital_scoped_users",
                featureName: "Hospital-Scoped Users",
                description: "Associating users to specific hospital tenant",
                status: "DONE",
                notes: "Users belong to hospitalId with multi-tenant scoping",
            },
            {
                featureKey: "user_identity_frontend",
                featureName: "User Identity Available to Frontend",
                description: "User profile, role, and permissions accessible in frontend state",
                status: "DONE",
                notes: "Stored in auth state and localStorage for UX checks",
            },
        ],
    },
    {
        moduleKey: "roles",
        moduleName: "Roles",
        features: [
            {
                featureKey: "role_stored_on_user",
                featureName: "Role Stored on User",
                description: "Enum-backed role attribute (super_admin, admin, hr)",
                status: "DONE",
                notes: "User role stored with enum validation in Mongoose",
            },
            {
                featureKey: "role_backend_authorization",
                featureName: "Role-Based Backend Authorization",
                description: "Authoritative role middleware enforcing access limits",
                status: "DONE",
                notes: "roleMiddleware and permissionMiddleware check roles authoritatively",
            },
            {
                featureKey: "role_frontend_access",
                featureName: "Role-Based Frontend Access",
                description: "UI navigation and route guarding by role",
                status: "DONE",
                notes: "ProtectedRoute with allowedRoles and dynamic sidebarConfig",
            },
            {
                featureKey: "super_admin_platform_access",
                featureName: "Super Admin Platform Access",
                description: "Platform-wide visibility across all hospital tenants",
                status: "DONE",
                notes: "Super Admin dashboard and cross-hospital view verified",
            },
            {
                featureKey: "admin_hospital_access",
                featureName: "Admin Hospital Access",
                description: "Full management access to own hospital tenant",
                status: "DONE",
                notes: "Admin manages own hospital, structure, and HR staff",
            },
            {
                featureKey: "hr_hospital_access",
                featureName: "HR Hospital Access",
                description: "Scoped hospital access for HR personnel",
                status: "DONE",
                notes: "HR scoped to own hospitalId in structure and HR routes",
            },
            {
                featureKey: "prevent_unauthorized_role_access",
                featureName: "Prevent Unauthorized Role Access",
                description: "Strict 403 enforcement for non-permitted roles",
                status: "DONE",
                notes: "Unauthorized role requests rejected with 403 Forbidden",
            },
        ],
    },
    {
        moduleKey: "permissions",
        moduleName: "Permissions",
        features: [
            {
                featureKey: "permission_constants",
                featureName: "Permission Constants",
                description: "Centralized permission constants registry",
                status: "DONE",
                notes: "Defined in backend/src/config/permissions.js and frontend mirror",
            },
            {
                featureKey: "user_specific_permissions",
                featureName: "User-Specific Permissions",
                description: "Array of assigned permissions on User document",
                status: "DONE",
                notes: "permissions array field added to User schema with default []",
            },
            {
                featureKey: "hr_permission_assignment",
                featureName: "HR Permission Assignment",
                description: "Admin ability to grant/revoke specific permissions to HR",
                status: "DONE",
                notes: "PATCH /api/v1/hr/:hrId/permissions with whitelist validation",
            },
            {
                featureKey: "permission_middleware",
                featureName: "Permission Middleware",
                description: "Backend middleware checking individual required permissions",
                status: "DONE",
                notes: "authorizePermission middleware enforces permission requirements",
            },
            {
                featureKey: "backend_permission_enforcement",
                featureName: "Backend Permission Enforcement",
                description: "Server-side authorization rejecting unauthorized calls with 403",
                status: "DONE",
                notes: "Verified across structure, hospital, and HR endpoints",
            },
            {
                featureKey: "frontend_permission_checks",
                featureName: "Frontend Permission Checks",
                description: "Dynamic button and action gating with hasPermission utility",
                status: "DONE",
                notes: "StructurePage, FloorDetails, and sidebar reflect permissions",
            },
            {
                featureKey: "admin_permission_management",
                featureName: "Admin Permission Management",
                description: "Management UI for toggling HR structure permissions",
                status: "DONE",
                notes: "HRManagement page includes modal with checkboxes and presets",
            },
            {
                featureKey: "permission_revoke_support",
                featureName: "Permission Revoke Support",
                description: "Real-time revocation of previously assigned permissions",
                status: "DONE",
                notes: "Updating permissions persists immediately and updates authorization",
            },
            {
                featureKey: "invalid_permission_rejection",
                featureName: "Invalid Permission Rejection",
                description: "Validating permission keys against strict whitelist (400)",
                status: "DONE",
                notes: "Rejects unrecognized permission strings with 400 Bad Request",
            },
            {
                featureKey: "prevent_hr_self_modification",
                featureName: "Prevent HR Self-Modification",
                description: "Blocking HR from modifying their own or other HR permissions",
                status: "DONE",
                notes: "Only admin/super-admin can access permission management endpoints",
            },
        ],
    },
    {
        moduleKey: "hospital_structure",
        moduleName: "Hospital Structure",
        features: [
            {
                featureKey: "create_floor",
                featureName: "Create Floor",
                description: "Adding a floor level to hospital hierarchy",
                status: "DONE",
                notes: "POST /api/v1/hospitals/:id/floors verified with unique floor numbers",
            },
            {
                featureKey: "view_floors",
                featureName: "View Floors",
                description: "Listing all active floors with room counts",
                status: "DONE",
                notes: "GET /api/v1/hospitals/:id/floors with aggregation count",
            },
            {
                featureKey: "update_floor",
                featureName: "Update Floor",
                description: "Updating floor name, number, code, and description",
                status: "DONE",
                notes: "PATCH /api/v1/hospitals/:id/floors/:floorId",
            },
            {
                featureKey: "deactivate_floor",
                featureName: "Deactivate Floor",
                description: "Soft-deleting a floor with safety validation",
                status: "DONE",
                notes: "DELETE /api/v1/hospitals/:id/floors/:floorId soft-deactivates",
            },
            {
                featureKey: "create_room",
                featureName: "Create Room",
                description: "Adding a room/ward/unit under a specific floor",
                status: "DONE",
                notes: "POST /api/v1/hospitals/:id/floors/:floorId/rooms",
            },
            {
                featureKey: "view_rooms",
                featureName: "View Rooms",
                description: "Listing rooms belonging to a floor",
                status: "DONE",
                notes: "GET /api/v1/hospitals/:id/floors/:floorId/rooms",
            },
            {
                featureKey: "update_room",
                featureName: "Update Room",
                description: "Editing room details and code",
                status: "DONE",
                notes: "PATCH /api/v1/hospitals/:id/floors/:floorId/rooms/:roomId",
            },
            {
                featureKey: "deactivate_room",
                featureName: "Deactivate Room",
                description: "Soft-deleting a room",
                status: "DONE",
                notes: "DELETE /api/v1/hospitals/:id/floors/:floorId/rooms/:roomId",
            },
            {
                featureKey: "structure_hospital_scoping",
                featureName: "Hospital Scoping",
                description: "Ensuring floors and rooms belong strictly to the tenant",
                status: "DONE",
                notes: "Cross-hospital structure access blocked with 403",
            },
            {
                featureKey: "structure_permission_enforcement",
                featureName: "Structure Permission Enforcement",
                description: "Enforcing structure.view, create, update, delete",
                status: "DONE",
                notes: "Guarded on backend routes and frontend controls",
            },
            {
                featureKey: "prevent_invalid_relationships",
                featureName: "Prevent Invalid Floor/Room Relationships",
                description: "Validating floorId and hospitalId matches on room operations",
                status: "DONE",
                notes: "Room service verifies floorId belongs to hospitalId",
            },
            {
                featureKey: "floor_deactivation_safety",
                featureName: "Prevent Unsafe Floor Deactivation",
                description: "Rejecting floor deactivation when active rooms exist (409 Conflict)",
                status: "DONE",
                notes: "Deactivation blocked with 409 if active rooms exist on floor",
            },
        ],
    },
    {
        moduleKey: "module_foundation",
        moduleName: "Module Foundation",
        features: [
            {
                featureKey: "module_concept",
                featureName: "Module Concept",
                description: "Architectural foundation defining discrete system modules",
                status: "IN_PROGRESS",
                notes: "Core modules established; extensible registry under construction",
            },
            {
                featureKey: "module_access_foundation",
                featureName: "Module Access Foundation",
                description: "Capability to restrict module accessibility",
                status: "IN_PROGRESS",
                notes: "Role and permission system provides preliminary module gating",
            },
            {
                featureKey: "user_module_access",
                featureName: "User / Module Access Foundation",
                description: "Associating user access levels to specific modules",
                status: "IN_PROGRESS",
                notes: "User-specific permissions enable per-module action checks",
            },
            {
                featureKey: "module_enabled_check",
                featureName: "Module Enabled / Available Detection",
                description: "Mechanism to verify whether a module is active",
                status: "NOT_STARTED",
                notes: "Pending module toggle configuration for future expansions",
            },
        ],
    },
];

/**
 * Idempotently seeds the Core Progress tracking checklist into MongoDB.
 *
 * Rules:
 * - Inserts any missing features using $setOnInsert.
 * - Preserves existing status and notes on already-seeded features.
 * - Never produces duplicate records (enforced by moduleKey + featureKey compound index).
 */
const seedCoreProgress = async () => {
    try {
        let sortIndex = 1;
        const operations = [];

        for (const moduleItem of INITIAL_CORE_MODULES) {
            for (const feature of moduleItem.features) {
                operations.push({
                    updateOne: {
                        filter: {
                            moduleKey: moduleItem.moduleKey,
                            featureKey: feature.featureKey,
                        },
                        update: {
                            $setOnInsert: {
                                moduleKey: moduleItem.moduleKey,
                                moduleName: moduleItem.moduleName,
                                featureKey: feature.featureKey,
                                featureName: feature.featureName,
                                description: feature.description,
                                status: feature.status || "NOT_STARTED",
                                notes: feature.notes || "",
                                sortOrder: sortIndex++,
                                isActive: true,
                            },
                        },
                        upsert: true,
                    },
                });
            }
        }

        if (operations.length > 0) {
            const result = await CoreProgress.bulkWrite(operations, { ordered: false });
            if (result.upsertedCount > 0) {
                console.log(`[CoreProgress Seed] Initialized ${result.upsertedCount} new tracking features.`);
            }
        }
    } catch (error) {
        console.error("[CoreProgress Seed Error]:", error);
    }
};

module.exports = {
    INITIAL_CORE_MODULES,
    seedCoreProgress,
};
