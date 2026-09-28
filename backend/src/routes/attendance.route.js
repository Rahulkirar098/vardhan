const express = require("express");
const { authMiddleware } = require("../middleware/auth.middleware");
const { requireModule } = require("../middleware/module.middleware");
const { authorizePermission, authorizeAnyPermission } = require("../middleware/permission.middleware");
const { PERMISSIONS } = require("../config/permissions");
const {
  checkIn,
  checkOut,
  getTodayAttendance,
  getMyAttendance,
  getHospitalAttendance,
  getAttendanceStats,
  createRegularizationRequest,
  getMyRegularizationRequests,
  cancelRegularizationRequest,
  getHospitalRegularizationRequests,
  approveRegularizationRequest,
  rejectRegularizationRequest,
} = require("../controllers/attendance.controller");

const attendanceRoute = express.Router();

// Middleware chain: authMiddleware -> requireModule('hrms')
attendanceRoute.use(authMiddleware);
attendanceRoute.use(requireModule("hrms"));

// Check In
attendanceRoute.post(
  "/check-in",
  authorizePermission(PERMISSIONS.ATTENDANCE_VIEW_OWN),
  checkIn
);

// Check Out
attendanceRoute.post(
  "/check-out",
  authorizePermission(PERMISSIONS.ATTENDANCE_VIEW_OWN),
  checkOut
);

// Today's attendance
attendanceRoute.get(
  "/today",
  authorizePermission(PERMISSIONS.ATTENDANCE_VIEW_OWN),
  getTodayAttendance
);

// My attendance history
attendanceRoute.get(
  "/my",
  authorizePermission(PERMISSIONS.ATTENDANCE_VIEW_OWN),
  getMyAttendance
);

// Regularization: Create request
attendanceRoute.post(
  "/regularization",
  authorizePermission(PERMISSIONS.ATTENDANCE_VIEW_OWN),
  createRegularizationRequest
);

// Regularization: My requests
attendanceRoute.get(
  "/regularization/my",
  authorizePermission(PERMISSIONS.ATTENDANCE_VIEW_OWN),
  getMyRegularizationRequests
);

// Regularization: Cancel pending request
attendanceRoute.patch(
  "/regularization/:id/cancel",
  authorizePermission(PERMISSIONS.ATTENDANCE_VIEW_OWN),
  cancelRegularizationRequest
);

// Management Regularization: List hospital workforce regularization requests
attendanceRoute.get(
  "/regularization",
  authorizeAnyPermission(
    PERMISSIONS.REGULARIZATION_VIEW,
    PERMISSIONS.REGULARIZATION_MANAGE,
    PERMISSIONS.ATTENDANCE_MANAGE,
    PERMISSIONS.ATTENDANCE_VIEW
  ),
  getHospitalRegularizationRequests
);

// Management Regularization: Approve request
attendanceRoute.patch(
  "/regularization/:id/approve",
  authorizeAnyPermission(
    PERMISSIONS.REGULARIZATION_APPROVE,
    PERMISSIONS.REGULARIZATION_MANAGE,
    PERMISSIONS.ATTENDANCE_MANAGE
  ),
  approveRegularizationRequest
);

// Management Regularization: Reject request
attendanceRoute.patch(
  "/regularization/:id/reject",
  authorizeAnyPermission(
    PERMISSIONS.REGULARIZATION_REJECT,
    PERMISSIONS.REGULARIZATION_MANAGE,
    PERMISSIONS.ATTENDANCE_MANAGE
  ),
  rejectRegularizationRequest
);

// Attendance stats
attendanceRoute.get(
  "/stats",
  authorizeAnyPermission(
    PERMISSIONS.ATTENDANCE_VIEW_OWN,
    PERMISSIONS.ATTENDANCE_VIEW,
    PERMISSIONS.ATTENDANCE_MANAGE
  ),
  getAttendanceStats
);

// Workforce attendance records (Admin / authorized managers)
attendanceRoute.get(
  "/",
  authorizePermission(PERMISSIONS.ATTENDANCE_VIEW),
  getHospitalAttendance
);

module.exports = { attendanceRoute };

