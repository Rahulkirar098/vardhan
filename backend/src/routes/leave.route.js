const express = require("express");
const { authMiddleware } = require("../middleware/auth.middleware");
const { requireModule } = require("../middleware/module.middleware");
const { authorizePermission } = require("../middleware/permission.middleware");
const { PERMISSIONS } = require("../config/permissions");
const {
    applyLeave,
    getMyLeaves,
    getHospitalLeaves,
    getLeaveStats,
    getLeaveById,
    approveLeave,
    rejectLeave,
    cancelLeave,
} = require("../controllers/leave.controller");

const leaveRoute = express.Router();

// Middleware chain: authMiddleware -> requireModule('hrms')
leaveRoute.use(authMiddleware);
leaveRoute.use(requireModule("hrms"));

// Apply leave
leaveRoute.post(
    "/",
    authorizePermission(PERMISSIONS.LEAVE_APPLY),
    applyLeave
);

// My leaves
leaveRoute.get(
    "/my",
    authorizePermission(PERMISSIONS.LEAVE_VIEW_OWN),
    getMyLeaves
);

// Stats
leaveRoute.get(
    "/stats",
    authorizePermission(PERMISSIONS.LEAVE_VIEW),
    getLeaveStats
);

// List hospital leaves
leaveRoute.get(
    "/",
    authorizePermission(PERMISSIONS.LEAVE_VIEW),
    getHospitalLeaves
);

// Get single leave
leaveRoute.get(
    "/:id",
    getLeaveById
);

// Approve leave
leaveRoute.patch(
    "/:id/approve",
    authorizePermission(PERMISSIONS.LEAVE_APPROVE),
    approveLeave
);

// Reject leave
leaveRoute.patch(
    "/:id/reject",
    authorizePermission(PERMISSIONS.LEAVE_APPROVE),
    rejectLeave
);

// Cancel leave
leaveRoute.patch(
    "/:id/cancel",
    authorizePermission(PERMISSIONS.LEAVE_APPLY),
    cancelLeave
);

module.exports = { leaveRoute };
