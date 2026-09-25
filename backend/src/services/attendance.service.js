const mongoose = require("mongoose");
const Attendance = require("../models/attendance.model");
const AttendanceRegularization = require("../models/attendanceRegularization.model");
const Employee = require("../models/employee.model");
const {
  ATTENDANCE_STATUSES,
  REGULARIZATION_STATUSES,
  VALID_REGULARIZATION_STATUSES,
  VALID_REQUESTED_ATTENDANCE_STATUSES,
} = require("../constants/attendance.constants");

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
 * Parse attendance date string or Date object
 */
const parseAttendanceDate = (inputDate) => {
  if (!inputDate) return null;
  if (typeof inputDate === "string") {
    const match = inputDate.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const dateStr = `${match[1]}-${match[2]}-${match[3]}`;
      const d = new Date(`${dateStr}T00:00:00.000Z`);
      if (!isNaN(d.getTime())) {
        return { dateStr, date: d };
      }
    }
    const d = new Date(inputDate);
    if (!isNaN(d.getTime())) {
      const year = d.getUTCFullYear();
      const month = String(d.getUTCMonth() + 1).padStart(2, "0");
      const day = String(d.getUTCDate()).padStart(2, "0");
      const dateStr = `${year}-${month}-${day}`;
      return { dateStr, date: new Date(`${dateStr}T00:00:00.000Z`) };
    }
  } else if (inputDate instanceof Date && !isNaN(inputDate.getTime())) {
    const year = inputDate.getUTCFullYear();
    const month = String(inputDate.getUTCMonth() + 1).padStart(2, "0");
    const day = String(inputDate.getUTCDate()).padStart(2, "0");
    const dateStr = `${year}-${month}-${day}`;
    return { dateStr, date: new Date(`${dateStr}T00:00:00.000Z`) };
  }
  return null;
};

/**
 * Parse time string to Date object on baseDateStr
 */
const parseTimeToDate = (timeInput, baseDateStr) => {
  if (!timeInput) return null;

  if (timeInput instanceof Date && !isNaN(timeInput.getTime())) {
    return timeInput;
  }

  if (typeof timeInput === "string") {
    const trimmed = timeInput.trim();
    if (!trimmed) return null;

    if (trimmed.includes("T") || trimmed.includes("Z")) {
      const d = new Date(trimmed);
      if (!isNaN(d.getTime())) return d;
    }

    // 12-hour time: "09:15 AM", "9:15 pm", "09:15:00 AM"
    const match12 = trimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM|am|pm)$/i);
    if (match12) {
      let hours = parseInt(match12[1], 10);
      const minutes = parseInt(match12[2], 10);
      const seconds = match12[3] ? parseInt(match12[3], 10) : 0;
      const meridiem = match12[4].toUpperCase();

      if (hours < 1 || hours > 12 || minutes < 0 || minutes > 59 || seconds < 0 || seconds > 59) {
        const error = new Error("Invalid time format.");
        error.code = "VALIDATION_ERROR";
        throw error;
      }

      if (meridiem === "PM" && hours !== 12) hours += 12;
      if (meridiem === "AM" && hours === 12) hours = 0;

      const hh = String(hours).padStart(2, "0");
      const mm = String(minutes).padStart(2, "0");
      const ss = String(seconds).padStart(2, "0");
      const d = new Date(`${baseDateStr}T${hh}:${mm}:${ss}.000Z`);
      if (!isNaN(d.getTime())) return d;
    }

    // 24-hour time: "09:15", "09:15:00", "9:15"
    const match24 = trimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (match24) {
      const hours = parseInt(match24[1], 10);
      const minutes = parseInt(match24[2], 10);
      const seconds = match24[3] ? parseInt(match24[3], 10) : 0;

      if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59 || seconds < 0 || seconds > 59) {
        const error = new Error("Invalid time format.");
        error.code = "VALIDATION_ERROR";
        throw error;
      }

      const hh = String(hours).padStart(2, "0");
      const mm = String(minutes).padStart(2, "0");
      const ss = String(seconds).padStart(2, "0");
      const d = new Date(`${baseDateStr}T${hh}:${mm}:${ss}.000Z`);
      if (!isNaN(d.getTime())) return d;
    }

    const fallback = new Date(`${baseDateStr} ${trimmed}`);
    if (!isNaN(fallback.getTime())) return fallback;
  }

  const error = new Error("Invalid time format.");
  error.code = "VALIDATION_ERROR";
  throw error;
};

/**
 * Normalize requested attendance status
 */
const normalizeRequestedStatus = (status) => {
  if (!status || typeof status !== "string") return null;
  const upper = status.trim().toUpperCase().replace(/\s+/g, "_");
  if (VALID_REQUESTED_ATTENDANCE_STATUSES.includes(upper)) {
    return upper;
  }
  return null;
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

/**
 * Create a Regularization Request for authenticated employee
 */
const createRegularization = async ({
  hospitalId,
  employeeId,
  userId,
  date,
  dateStr,
  requestedStatus,
  requestedCheckIn,
  requestedCheckOut,
  reason,
}) => {
  if (!hospitalId || !employeeId) {
    const error = new Error("Hospital ID and Employee ID are required.");
    error.code = "VALIDATION_ERROR";
    throw error;
  }

  // 1. Verify employee exists and belongs to hospital
  const employee = await Employee.findOne({ _id: employeeId, hospitalId }).lean();
  if (!employee) {
    const error = new Error("Employee record not found in this hospital.");
    error.code = "NOT_FOUND";
    throw error;
  }

  if (employee.employmentStatus === "INACTIVE" || employee.status === "inactive" || employee.isDeleted) {
    const error = new Error("Inactive employee cannot submit regularization request.");
    error.code = "FORBIDDEN";
    throw error;
  }

  // 2. Validate date
  const parsedDateObj = parseAttendanceDate(dateStr || date);
  if (!parsedDateObj) {
    const error = new Error("Invalid attendance date.");
    error.code = "VALIDATION_ERROR";
    throw error;
  }
  const effectiveDateStr = parsedDateObj.dateStr;
  const effectiveDate = parsedDateObj.date;

  // 3a. Reject future dates — cannot regularize attendance that hasn't happened yet
  const todayStr = getTodayDateStr();
  if (effectiveDateStr > todayStr) {
    const error = new Error("Regularization cannot be requested for a future date.");
    error.code = "VALIDATION_ERROR";
    throw error;
  }

  // 3. Validate requested status
  const normalizedStatus = normalizeRequestedStatus(requestedStatus);
  if (!normalizedStatus) {
    const error = new Error("Invalid requested attendance status. Allowed values: Present, Half Day.");
    error.code = "VALIDATION_ERROR";
    throw error;
  }

  // 4. Validate reason
  if (!reason || !String(reason).trim()) {
    const error = new Error("Reason is required.");
    error.code = "VALIDATION_ERROR";
    throw error;
  }

  // 5. Validate check-in / check-out times
  let checkInTime = null;
  let checkOutTime = null;

  if (requestedCheckIn) {
    checkInTime = parseTimeToDate(requestedCheckIn, effectiveDateStr);
  }

  if (requestedCheckOut) {
    checkOutTime = parseTimeToDate(requestedCheckOut, effectiveDateStr);
  }

  if (checkInTime && checkOutTime) {
    if (checkOutTime.getTime() <= checkInTime.getTime()) {
      const error = new Error("Check-out time cannot be before check-in time.");
      error.code = "VALIDATION_ERROR";
      throw error;
    }
  }

  // 6. Duplicate / Pending protection
  const existingPending = await AttendanceRegularization.findOne({
    hospitalId,
    employeeId,
    dateStr: effectiveDateStr,
    status: REGULARIZATION_STATUSES.PENDING,
  });

  if (existingPending) {
    const error = new Error("A pending regularization request already exists for this date.");
    error.code = "DUPLICATE_REGULARIZATION";
    throw error;
  }

  // 7. Check if Attendance record already exists for this date
  const existingAttendance = await Attendance.findOne({
    hospitalId,
    employeeId,
    dateStr: effectiveDateStr,
  }).lean();

  const attendanceId = existingAttendance ? existingAttendance._id : null;

  // 8. Create Regularization record
  const record = await AttendanceRegularization.create({
    hospitalId,
    employeeId,
    attendanceId,
    date: effectiveDate,
    dateStr: effectiveDateStr,
    requestedStatus: normalizedStatus,
    requestedCheckIn: checkInTime,
    requestedCheckOut: checkOutTime,
    reason: String(reason).trim(),
    status: REGULARIZATION_STATUSES.PENDING,
    submittedAt: new Date(),
  });

  return record;
};

/**
 * Get My Regularization Requests
 */
const getMyRegularizationRequests = async ({
  hospitalId,
  employeeId,
  status,
  startDate,
  endDate,
  month,
  year,
}) => {
  if (!hospitalId || !employeeId) {
    const error = new Error("Hospital ID and Employee ID are required.");
    error.code = "VALIDATION_ERROR";
    throw error;
  }

  const query = { hospitalId, employeeId };

  if (status && VALID_REGULARIZATION_STATUSES.includes(String(status).toLowerCase())) {
    query.status = String(status).toLowerCase();
  }

  if (startDate && endDate) {
    query.dateStr = { $gte: startDate, $lte: endDate };
  } else if (month && year) {
    const mm = String(month).padStart(2, "0");
    query.dateStr = { $regex: `^${year}-${mm}` };
  } else if (year) {
    query.dateStr = { $regex: `^${year}` };
  }

  const records = await AttendanceRegularization.find(query)
    .populate("attendanceId", "status checkIn checkOut workingMinutes")
    .sort({ dateStr: -1, createdAt: -1 })
    .lean();

  return records;
};

/**
 * Cancel Pending Regularization Request
 */
const cancelRegularizationRequest = async ({
  hospitalId,
  employeeId,
  regularizationId,
}) => {
  if (!hospitalId || !employeeId || !regularizationId) {
    const error = new Error("Hospital ID, Employee ID, and Regularization ID are required.");
    error.code = "VALIDATION_ERROR";
    throw error;
  }

  if (!mongoose.Types.ObjectId.isValid(regularizationId)) {
    const error = new Error("Invalid regularization ID.");
    error.code = "VALIDATION_ERROR";
    throw error;
  }

  const record = await AttendanceRegularization.findOne({
    _id: regularizationId,
    hospitalId,
  });

  if (!record) {
    const error = new Error("Regularization request not found.");
    error.code = "NOT_FOUND";
    throw error;
  }

  if (record.employeeId.toString() !== employeeId.toString()) {
    const error = new Error("You are not authorized to cancel this request.");
    error.code = "FORBIDDEN";
    throw error;
  }

  if (record.status !== REGULARIZATION_STATUSES.PENDING) {
    const error = new Error("Only pending regularization requests can be cancelled.");
    error.code = "VALIDATION_ERROR";
    throw error;
  }

  record.status = REGULARIZATION_STATUSES.CANCELLED;
  record.cancelledAt = new Date();
  await record.save();

  return record;
};

module.exports = {
  getTodayDateStr,
  checkIn,
  checkOut,
  getTodayAttendance,
  getMyAttendance,
  getHospitalAttendance,
  getAttendanceStats,
  createRegularization,
  getMyRegularizationRequests,
  cancelRegularizationRequest,
};

