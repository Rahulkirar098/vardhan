const express = require("express");
const { authMiddleware } = require("../middleware/auth.middleware");
const { requireModule } = require("../middleware/module.middleware");
const { authorizePermission } = require("../middleware/permission.middleware");
const { PERMISSIONS } = require("../config/permissions");
const {
    listEmployees,
    getEmployee,
    inviteEmployee,
    getInvitationByToken,
    acceptInvitation,
    updateEmployee,
    updateEmployeeStatus,
    listInvitations,
    cancelInvitation,
    getEmployeeStats,
} = require("../controllers/employee.controller");

const employeeRoute = express.Router();

/**
 * Public routes — no auth required (invitation acceptance flow)
 */
employeeRoute.get(
    "/employee-invitations/:token",
    getInvitationByToken
);

employeeRoute.post(
    "/employee-invitations/:token/accept",
    acceptInvitation
);

/**
 * Protected routes — auth → HRMS module → permission
 *
 * Middleware chain:
 *   authMiddleware → requireModule('hrms') → authorizePermission → controller
 */
employeeRoute.use(authMiddleware);
employeeRoute.use(requireModule("hrms"));

// Stats
employeeRoute.get(
    "/employees/stats",
    authorizePermission(PERMISSIONS.EMPLOYEE_VIEW),
    getEmployeeStats
);

// Invitations list (authenticated)
employeeRoute.get(
    "/employees/invitations",
    authorizePermission(PERMISSIONS.EMPLOYEE_VIEW),
    listInvitations
);

// Cancel invitation
employeeRoute.patch(
    "/employees/invitations/:invitationId/cancel",
    authorizePermission(PERMISSIONS.EMPLOYEE_CREATE),
    cancelInvitation
);

// Invite employee
employeeRoute.post(
    "/employees/invite",
    authorizePermission(PERMISSIONS.EMPLOYEE_CREATE),
    inviteEmployee
);

// List employees
employeeRoute.get(
    "/employees",
    authorizePermission(PERMISSIONS.EMPLOYEE_VIEW),
    listEmployees
);

// Get employee by ID
employeeRoute.get(
    "/employees/:id",
    authorizePermission(PERMISSIONS.EMPLOYEE_VIEW),
    getEmployee
);

// Update employee
employeeRoute.patch(
    "/employees/:id",
    authorizePermission(PERMISSIONS.EMPLOYEE_UPDATE),
    updateEmployee
);

// Activate / Deactivate employee
employeeRoute.patch(
    "/employees/:id/status",
    authorizePermission(PERMISSIONS.EMPLOYEE_DELETE),
    updateEmployeeStatus
);

module.exports = { employeeRoute };
