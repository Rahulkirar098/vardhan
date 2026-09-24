const mongoose = require("mongoose");
const attendanceService = require("../services/attendance.service");
const Employee = require("../models/employee.model");

/**
 * Helper to resolve employeeId from req.user
 */
const resolveEmployeeId = async (req) => {
  if (req.user.employeeId) {
    return req.user.employeeId;
  }
  const employee = await Employee.findOne({
    userId: req.user.id || req.user._id,
    hospitalId: req.user.hospitalId,
  }).lean();

  return employee ? employee._id : null;
};

/**
 * Check In Controller
 */
const checkIn = async (req, res) => {
  try {
    const hospitalId = req.user.hospitalId;
    const employeeId = await resolveEmployeeId(req);

    if (!employeeId) {
      return res.status(400).json({
        success: false,
        message: "Authenticated user does not have an active employee record in this hospital.",
      });
    }

    const { dateStr, notes } = req.body || {};

    const record = await attendanceService.checkIn({
      hospitalId,
      employeeId,
      userId: req.user.id || req.user._id,
      dateStr,
      notes,
    });

    return res.status(201).json({
      success: true,
      message: "Checked in successfully.",
      data: record,
    });
  } catch (error) {
    if (error.code === "DUPLICATE_CHECK_IN") {
      return res.status(409).json({ success: false, message: error.message });
    }
    if (error.code === "NOT_FOUND") {
      return res.status(404).json({ success: false, message: error.message });
    }
    if (error.code === "FORBIDDEN") {
      return res.status(403).json({ success: false, message: error.message });
    }
    if (error.code === "VALIDATION_ERROR") {
      return res.status(400).json({ success: false, message: error.message });
    }
    console.error("Check-In Error:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

/**
 * Check Out Controller
 */
const checkOut = async (req, res) => {
  try {
    const hospitalId = req.user.hospitalId;
    const employeeId = await resolveEmployeeId(req);

    if (!employeeId) {
      return res.status(400).json({
        success: false,
        message: "Authenticated user does not have an active employee record in this hospital.",
      });
    }

    const { dateStr, notes } = req.body || {};

    const record = await attendanceService.checkOut({
      hospitalId,
      employeeId,
      dateStr,
      notes,
    });

    return res.status(200).json({
      success: true,
      message: "Checked out successfully.",
      data: record,
    });
  } catch (error) {
    if (error.code === "NOT_FOUND") {
      return res.status(404).json({ success: false, message: error.message });
    }
    if (error.code === "ALREADY_CHECKED_OUT") {
      return res.status(400).json({ success: false, message: error.message });
    }
    if (error.code === "VALIDATION_ERROR") {
      return res.status(400).json({ success: false, message: error.message });
    }
    console.error("Check-Out Error:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

/**
 * Get Today's Attendance for authenticated employee
 */
const getTodayAttendance = async (req, res) => {
  try {
    const hospitalId = req.user.hospitalId;
    const employeeId = await resolveEmployeeId(req);

    if (!employeeId) {
      return res.status(200).json({
        success: true,
        message: "No employee record linked.",
        data: null,
      });
    }

    const { dateStr } = req.query;

    const record = await attendanceService.getTodayAttendance({
      hospitalId,
      employeeId,
      dateStr,
    });

    return res.status(200).json({
      success: true,
      message: "Today's attendance retrieved successfully.",
      data: record,
    });
  } catch (error) {
    console.error("Get Today Attendance Error:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

/**
 * Get My Attendance history
 */
const getMyAttendance = async (req, res) => {
  try {
    const hospitalId = req.user.hospitalId;
    const employeeId = await resolveEmployeeId(req);

    if (!employeeId) {
      return res.status(200).json({
        success: true,
        message: "No employee record linked.",
        data: [],
      });
    }

    const { startDate, endDate, month, year, status } = req.query;

    const records = await attendanceService.getMyAttendance({
      hospitalId,
      employeeId,
      startDate,
      endDate,
      month,
      year,
      status,
    });

    return res.status(200).json({
      success: true,
      message: "My attendance history retrieved successfully.",
      data: records,
    });
  } catch (error) {
    console.error("Get My Attendance Error:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

/**
 * Get Hospital Workforce Attendance (Admin / authorized management)
 */
const getHospitalAttendance = async (req, res) => {
  try {
    const hospitalId = req.user.hospitalId;
    const { dateStr, startDate, endDate, employeeId, status, page, limit } = req.query;

    const result = await attendanceService.getHospitalAttendance({
      hospitalId,
      dateStr,
      startDate,
      endDate,
      employeeId,
      status,
      page,
      limit,
    });

    return res.status(200).json({
      success: true,
      message: "Hospital attendance records retrieved successfully.",
      data: result.records,
      meta: {
        total: result.total,
        page: result.page,
        totalPages: result.totalPages,
      },
    });
  } catch (error) {
    console.error("Get Hospital Attendance Error:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

/**
 * Get Attendance Statistics
 */
const getAttendanceStats = async (req, res) => {
  try {
    const hospitalId = req.user.hospitalId;
    const { month, year, scope } = req.query;

    let targetEmployeeId = null;
    if (scope !== "hospital") {
      targetEmployeeId = await resolveEmployeeId(req);
    }

    const stats = await attendanceService.getAttendanceStats({
      hospitalId,
      employeeId: targetEmployeeId,
      month,
      year,
    });

    return res.status(200).json({
      success: true,
      message: "Attendance statistics retrieved successfully.",
      data: stats,
    });
  } catch (error) {
    console.error("Get Attendance Stats Error:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

module.exports = {
  checkIn,
  checkOut,
  getTodayAttendance,
  getMyAttendance,
  getHospitalAttendance,
  getAttendanceStats,
};
