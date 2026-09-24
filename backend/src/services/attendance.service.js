const mongoose = require("mongoose");
const Attendance = require("../models/attendance.model");
const Employee = require("../models/employee.model");
const { ATTENDANCE_STATUSES } = require("../constants/attendance.constants");

/**
 * Format Date to YYYY-MM-DD
 */
const getTodayDateStr = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/**
 * Check In employee for a date
 */
const checkIn = async ({ hospitalId, employeeId, userId, dateStr, notes }) => {
  if (!hospitalId || !employeeId) {
    const error = new Error("Hospital ID and Employee ID are required.");
    error.code = "VALIDATION_ERROR";
    throw error;
  }

  const effectiveDateStr = dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr) ? dateStr : getTodayDateStr();
  const dateObj = new Date(`${effectiveDateStr}T00:00:00.000Z`);

  // Verify employee exists and belongs to hospital
  const employee = await Employee.findOne({ _id: employeeId, hospitalId }).lean();
  if (!employee) {
    const error = new Error("Employee record not found in this hospital.");
    error.code = "NOT_FOUND";
    throw error;
  }

  if (employee.employmentStatus === "INACTIVE" || employee.status === "inactive" || employee.isDeleted) {
    const error = new Error("Inactive employee cannot mark attendance.");
    error.code = "FORBIDDEN";
    throw error;
  }

  // Check if attendance already exists for today
  const existing = await Attendance.findOne({
    hospitalId,
    employeeId,
    dateStr: effectiveDateStr,
  });

  if (existing) {
    const error = new Error("Already checked in for today.");
    error.code = "DUPLICATE_CHECK_IN";
    throw error;
  }

  const checkInTime = new Date();

  const record = await Attendance.create({
    hospitalId,
    employeeId,
    userId: userId || employee.userId || null,
    dateStr: effectiveDateStr,
    date: dateObj,
    status: ATTENDANCE_STATUSES.PRESENT,
    checkIn: checkInTime,
    notes: notes ? String(notes).trim() : null,
  });

  return record;
};

/**
 * Check Out employee for a date
 */
const checkOut = async ({ hospitalId, employeeId, dateStr, notes }) => {
  if (!hospitalId || !employeeId) {
    const error = new Error("Hospital ID and Employee ID are required.");
    error.code = "VALIDATION_ERROR";
    throw error;
  }

  const effectiveDateStr = dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr) ? dateStr : getTodayDateStr();

  const record = await Attendance.findOne({
    hospitalId,
    employeeId,
    dateStr: effectiveDateStr,
  });

  if (!record || !record.checkIn) {
    const error = new Error("No check-in record found for today. Please check in first.");
    error.code = "NOT_FOUND";
    throw error;
  }

  if (record.checkOut) {
    const error = new Error("Already checked out for today.");
    error.code = "ALREADY_CHECKED_OUT";
    throw error;
  }

  const checkOutTime = new Date();
  record.checkOut = checkOutTime;

  // Calculate working minutes
  const diffMs = checkOutTime.getTime() - new Date(record.checkIn).getTime();
  record.workingMinutes = Math.max(0, Math.round(diffMs / (1000 * 60)));

  if (notes) {
    record.notes = record.notes ? `${record.notes} | ${String(notes).trim()}` : String(notes).trim();
  }

  await record.save();
  return record;
};

/**
 * Get Today's attendance for employee
 */
const getTodayAttendance = async ({ hospitalId, employeeId, dateStr }) => {
  const effectiveDateStr = dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr) ? dateStr : getTodayDateStr();

  const record = await Attendance.findOne({
    hospitalId,
    employeeId,
    dateStr: effectiveDateStr,
  })
    .populate("employeeId", "firstName lastName employeeId positionId")
    .lean();

  return record || null;
};

/**
 * Get My Attendance history
 */
const getMyAttendance = async ({ hospitalId, employeeId, startDate, endDate, month, year, status }) => {
  const query = { hospitalId, employeeId };

  if (startDate && endDate) {
    query.dateStr = { $gte: startDate, $lte: endDate };
  } else if (month && year) {
    const mm = String(month).padStart(2, "0");
    query.dateStr = { $regex: `^${year}-${mm}` };
  } else if (year) {
    query.dateStr = { $regex: `^${year}` };
  }

  if (status && Object.values(ATTENDANCE_STATUSES).includes(status)) {
    query.status = status;
  }

  const records = await Attendance.find(query)
    .sort({ dateStr: -1, createdAt: -1 })
    .lean();

  return records;
};

/**
 * Get Hospital Workforce Attendance (Admin / authorized management)
 */
const getHospitalAttendance = async ({
  hospitalId,
  dateStr,
  startDate,
  endDate,
  employeeId,
  status,
  page = 1,
  limit = 50,
}) => {
  const query = { hospitalId };

  if (employeeId && mongoose.Types.ObjectId.isValid(employeeId)) {
    query.employeeId = employeeId;
  }

  if (dateStr) {
    query.dateStr = dateStr;
  } else if (startDate && endDate) {
    query.dateStr = { $gte: startDate, $lte: endDate };
  }

  if (status && Object.values(ATTENDANCE_STATUSES).includes(status)) {
    query.status = status;
  }

  const skip = (Math.max(1, parseInt(page, 10)) - 1) * Math.max(1, parseInt(limit, 10));
  const take = Math.max(1, Math.min(100, parseInt(limit, 10)));

  const [records, total] = await Promise.all([
    Attendance.find(query)
      .populate({
        path: "employeeId",
        select: "firstName lastName employeeId positionId department status",
        populate: { path: "positionId", select: "name code" },
      })
      .sort({ dateStr: -1, createdAt: -1 })
      .skip(skip)
      .limit(take)
      .lean(),
    Attendance.countDocuments(query),
  ]);

  return {
    records,
    total,
    page: parseInt(page, 10),
    totalPages: Math.ceil(total / take),
  };
};

/**
 * Get attendance statistics
 */
const getAttendanceStats = async ({ hospitalId, employeeId, month, year }) => {
  const query = { hospitalId };
  if (employeeId) {
    query.employeeId = employeeId;
  }

  if (month && year) {
    const mm = String(month).padStart(2, "0");
    query.dateStr = { $regex: `^${year}-${mm}` };
  } else if (year) {
    query.dateStr = { $regex: `^${year}` };
  }

  const records = await Attendance.find(query).lean();

  let present = 0;
  let halfDay = 0;
  let absent = 0;
  let totalWorkingMinutes = 0;

  records.forEach((r) => {
    if (r.status === ATTENDANCE_STATUSES.PRESENT) present += 1;
    else if (r.status === ATTENDANCE_STATUSES.HALF_DAY) halfDay += 1;
    else if (r.status === ATTENDANCE_STATUSES.ABSENT) absent += 1;

    if (r.workingMinutes) {
      totalWorkingMinutes += r.workingMinutes;
    }
  });

  const workingDays = present + halfDay;

  return {
    present,
    halfDay,
    absent,
    workingDays,
    totalRecords: records.length,
    totalWorkingMinutes,
    averageWorkingHoursPerDay: workingDays > 0 ? (totalWorkingMinutes / workingDays / 60).toFixed(1) : "0.0",
  };
};

module.exports = {
  getTodayDateStr,
  checkIn,
  checkOut,
  getTodayAttendance,
  getMyAttendance,
  getHospitalAttendance,
  getAttendanceStats,
};
