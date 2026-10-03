const mongoose = require("mongoose");
const Attendance = require("../models/attendance.model");
const AttendanceRegularization = require("../models/attendanceRegularization.model");
const Employee = require("../models/employee.model");
const Roster = require("../models/roster.model");
const RosterAssignment = require("../models/rosterAssignment.model");
const Leave = require("../models/leave.model");
const Hospital = require("../models/hospital.model");
const {
  ATTENDANCE_STATUSES,
  REGULARIZATION_STATUSES,
  VALID_REGULARIZATION_STATUSES,
  VALID_REQUESTED_ATTENDANCE_STATUSES,
} = require("../constants/attendance.constants");
const {
  isValidTimezone,
  getHospitalTodayDateStr,
  getHospitalDayOfWeek,
  parseHospitalTimeToDate,
} = require("../utils/timezone.utils");

/**
 * Format Date to YYYY-MM-DD
 */
const getTodayDateStr = (dateObj) => {
  const d = dateObj ? new Date(dateObj) : new Date();
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
 * Parse time string to Date object on baseDateStr in hospital timezone
 */
const parseTimeToDate = (timeInput, baseDateStr, timezone = "Asia/Kolkata") => {
  return parseHospitalTimeToDate(timeInput, baseDateStr, timezone);
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
 * Resolve schedule for a day (backward-compatible for boolean or object day schedules)
 */
const resolveDaySchedule = (schedule, dayOfWeek) => {
  if (!schedule) {
    return {
      workingDay: dayOfWeek !== "sunday",
      startTime: dayOfWeek !== "sunday" ? "09:00" : null,
      endTime: dayOfWeek !== "sunday" ? "18:00" : null,
    };
  }

  const rawDay = schedule[dayOfWeek];
  if (typeof rawDay === "boolean") {
    return {
      workingDay: rawDay,
      startTime: rawDay ? "09:00" : null,
      endTime: rawDay ? "18:00" : null,
    };
  }

  if (rawDay && typeof rawDay === "object") {
    const isWorking = rawDay.workingDay !== undefined
      ? Boolean(rawDay.workingDay)
      : (rawDay.isWorkingDay !== undefined ? Boolean(rawDay.isWorkingDay) : (dayOfWeek !== "sunday"));

    if (!isWorking) {
      return { workingDay: false, startTime: null, endTime: null };
    }

    return {
      workingDay: true,
      startTime: rawDay.startTime || "09:00",
      endTime: rawDay.endTime || "18:00",
    };
  }

  return {
    workingDay: dayOfWeek !== "sunday",
    startTime: dayOfWeek !== "sunday" ? "09:00" : null,
    endTime: dayOfWeek !== "sunday" ? "18:00" : null,
  };
};

/**
 * Process automatic absence for scheduled employees whose shift end time has passed
 */
const processAutomaticAbsence = async (param1, param2, param3) => {
  let hospitalId = null;
  let dateStr = null;
  let customNow = null;

  if (param1 && typeof param1 === "object" && param1.constructor === Object) {
    hospitalId = param1.hospitalId || null;
    dateStr = param1.dateStr || null;
    customNow = param1.now || null;
  } else {
    hospitalId = param1 || null;
    if (param2 instanceof Date) {
      dateStr = getTodayDateStr(param2);
    } else {
      dateStr = param2 || null;
    }
    if (param3 instanceof Date) {
      customNow = param3 || null;
    }
  }

  const targetDateStr = dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr) ? dateStr : getTodayDateStr();
  const startOfDay = new Date(`${targetDateStr}T00:00:00.000Z`);
  const endOfDay = new Date(`${targetDateStr}T23:59:59.999Z`);
  const now = customNow || new Date();

  const processed = [];
  const evaluatedEmployees = new Set();

  const isValidHosp = hospitalId && mongoose.Types.ObjectId.isValid(hospitalId);
  const validHospId = isValidHosp ? hospitalId : null;

  // Fetch hospital timezone map
  const allHospitals = await Hospital.find({}).select("_id timezone").lean();
  const hospTzMap = {};
  for (const h of allHospitals) {
    if (h && h._id) {
      hospTzMap[h._id.toString()] = h.timezone || "Asia/Kolkata";
    }
  }

  // ─── 1. ROSTER EMPLOYEES (rosterEligible = true) ───
  const rosterQuery = {
    status: "PUBLISHED",
    startDate: { $lte: endOfDay },
    endDate: { $gte: startOfDay },
  };
  if (validHospId) rosterQuery.hospitalId = validHospId;
  const allPublished = await Roster.find(rosterQuery)
    .select("_id hospitalId")
    .lean();

  if (allPublished.length > 0) {
    const rosterIds = allPublished.map((r) => r._id);
    const assignmentQuery = {
      rosterId: { $in: rosterIds },
      date: { $gte: startOfDay, $lte: endOfDay },
    };
    if (validHospId) assignmentQuery.hospitalId = validHospId;

    const assignments = await RosterAssignment.find(assignmentQuery).populate("employeeId").lean();

    for (const assignment of assignments) {
      const emp = assignment.employeeId;
      if (!emp || emp.employmentStatus === "INACTIVE" || emp.status === "inactive" || emp.isDeleted) {
        continue;
      }

      const empId = emp._id;
      const hospId = assignment.hospitalId;
      const hospTz = hospTzMap[hospId ? hospId.toString() : ""] || "Asia/Kolkata";

      const { isEmployeeEmployedOnDate } = require("../utils/employment.utils");
      if (!isEmployeeEmployedOnDate(emp, targetDateStr, hospTz)) {
        continue;
      }

      const empKey = `${hospId.toString()}_${empId.toString()}`;
      if (evaluatedEmployees.has(empKey)) {
        continue;
      }
      evaluatedEmployees.add(empKey);

      // 1. Calculate shift end timestamp
      let shiftEndObj = null;
      try {
        shiftEndObj = parseTimeToDate(assignment.endTime, targetDateStr, hospTz);
      } catch {
        shiftEndObj = null;
      }

      // Handle night shifts (e.g. 20:00 to 08:00 next day)
      if (assignment.startTime && assignment.endTime) {
        try {
          const startObj = parseTimeToDate(assignment.startTime, targetDateStr, hospTz);
          if (startObj && shiftEndObj && shiftEndObj.getTime() <= startObj.getTime()) {
            shiftEndObj = new Date(shiftEndObj.getTime() + 24 * 60 * 60 * 1000);
          }
        } catch {}
      }

      // If current server time <= shift end time, DO NOT mark absent yet
      if (shiftEndObj && now.getTime() <= shiftEndObj.getTime()) {
        continue;
      }

      // Check if employee has approved leave covering target date
      const approvedLeave = await Leave.findOne({
        hospitalId: hospId,
        employeeId: empId,
        status: { $in: ["APPROVED", "approved"] },
        startDate: { $lte: endOfDay },
        endDate: { $gte: startOfDay },
      }).lean();

      if (approvedLeave) {
        continue;
      }

      // Check if attendance record already exists
      const existing = await Attendance.findOne({
        hospitalId: hospId,
        employeeId: empId,
        dateStr: targetDateStr,
      });

      if (existing) {
        if (existing.checkIn || existing.status === ATTENDANCE_STATUSES.PRESENT || existing.status === ATTENDANCE_STATUSES.HALF_DAY || existing.status === ATTENDANCE_STATUSES.ABSENT || existing.status === ATTENDANCE_STATUSES.ON_LEAVE) {
          continue;
        }
        existing.status = ATTENDANCE_STATUSES.ABSENT;
        await existing.save();
        processed.push(existing);
      } else {
        const newAbsence = await Attendance.create({
          hospitalId: hospId,
          employeeId: empId,
          userId: emp.userId || null,
          dateStr: targetDateStr,
          date: startOfDay,
          status: ATTENDANCE_STATUSES.ABSENT,
          checkIn: null,
          checkOut: null,
          workingMinutes: 0,
          notes: "Automatically marked absent after scheduled shift end.",
        });
        processed.push(newAbsence);
      }
    }
  }

  // ─── 2. NORMAL EMPLOYEES (rosterEligible = false) ───
  const normalEmpQuery = {
    employmentStatus: "ACTIVE",
  };
  if (validHospId) normalEmpQuery.hospitalId = validHospId;

  const normalEmployees = await Employee.find(normalEmpQuery).populate("positionId").lean();

  for (const emp of normalEmployees) {
    if (!emp || emp.isDeleted || !emp.positionId) continue;
    const position = emp.positionId;
    if (position.rosterEligible || position.status === "inactive") continue;

    const empId = emp._id;
    const hospId = emp.hospitalId;
    const hospTz = hospTzMap[hospId ? hospId.toString() : ""] || "Asia/Kolkata";
    const dayOfWeek = getHospitalDayOfWeek(targetDateStr, hospTz);

    const { isEmployeeEmployedOnDate } = require("../utils/employment.utils");
    if (!isEmployeeEmployedOnDate(emp, targetDateStr, hospTz)) {
      continue;
    }

    const empKey = `${hospId.toString()}_${empId.toString()}`;
    if (evaluatedEmployees.has(empKey)) continue;
    evaluatedEmployees.add(empKey);

    // Joining Date check: if targetDateStr < dateOfJoining, skip!
    if (emp.dateOfJoining) {
      const joiningStr = getTodayDateStr(emp.dateOfJoining);
      if (targetDateStr < joiningStr) continue;
    }

    // Exit/Leaving Date check: if leavingDate exists and targetDateStr > leavingDate, skip!
    if (emp.leavingDate) {
      const leavingStr = getTodayDateStr(emp.leavingDate);
      if (targetDateStr > leavingStr) continue;
    }

    // Work Schedule check
    const daySched = resolveDaySchedule(position.workSchedule, dayOfWeek);
    if (!daySched.workingDay) {
      // Non-working day / Weekly off -> DO NOT mark ABSENT
      continue;
    }

    // Determine exact scheduled end datetime for shift timing
    let shiftStartObj = null;
    let shiftEndObj = null;
    try {
      if (daySched.startTime) shiftStartObj = parseTimeToDate(daySched.startTime, targetDateStr, hospTz);
      if (daySched.endTime) shiftEndObj = parseTimeToDate(daySched.endTime, targetDateStr, hospTz);
    } catch {}

    if (!shiftEndObj) {
      shiftEndObj = parseTimeToDate("18:00", targetDateStr, hospTz);
    }

    // Overnight schedule check: if endTime <= startTime (e.g. 22:00 -> 06:00), shift ends next morning (+24h)
    if (shiftStartObj && shiftEndObj && shiftEndObj.getTime() <= shiftStartObj.getTime()) {
      shiftEndObj = new Date(shiftEndObj.getTime() + 24 * 60 * 60 * 1000);
    }

    // If current time <= shift end time, shift has NOT ended yet -> DO NOT mark ABSENT
    if (now.getTime() <= shiftEndObj.getTime()) {
      continue;
    }

    // Approved Leave check
    const approvedLeave = await Leave.findOne({
      hospitalId: hospId,
      employeeId: empId,
      status: { $in: ["APPROVED", "approved"] },
      startDate: { $lte: endOfDay },
      endDate: { $gte: startOfDay },
    }).lean();

    if (approvedLeave) continue;

    // Existing Attendance check
    const existing = await Attendance.findOne({
      hospitalId: hospId,
      employeeId: empId,
      dateStr: targetDateStr,
    });

    if (existing) {
      if (existing.checkIn || existing.status === ATTENDANCE_STATUSES.PRESENT || existing.status === ATTENDANCE_STATUSES.HALF_DAY || existing.status === ATTENDANCE_STATUSES.ABSENT || existing.status === ATTENDANCE_STATUSES.ON_LEAVE) {
        continue;
      }
      existing.status = ATTENDANCE_STATUSES.ABSENT;
      await existing.save();
      processed.push(existing);
    } else {
      const newAbsence = await Attendance.create({
        hospitalId: hospId,
        employeeId: empId,
        userId: emp.userId || null,
        dateStr: targetDateStr,
        date: startOfDay,
        status: ATTENDANCE_STATUSES.ABSENT,
        checkIn: null,
        checkOut: null,
        workingMinutes: 0,
        notes: "Automatically marked absent for scheduled normal employment working day.",
      });
      processed.push(newAbsence);
    }
  }

  return processed;
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
    if (existing.status === ATTENDANCE_STATUSES.ABSENT) {
      const error = new Error("Cannot check in. Employee was automatically marked absent for today. Requires regularization or manager correction.");
      error.code = "FORBIDDEN";
      throw error;
    }
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

  if (record.status === ATTENDANCE_STATUSES.ABSENT) {
    const error = new Error("Cannot check out. Attendance status is ABSENT.");
    error.code = "FORBIDDEN";
    throw error;
  }

  if (record.status === ATTENDANCE_STATUSES.ON_LEAVE) {
    const error = new Error("Cannot check out. Attendance status is ON_LEAVE.");
    error.code = "FORBIDDEN";
    throw error;
  }

  const checkOutTime = new Date();
  record.checkOut = checkOutTime;

  // Calculate working minutes (handles cross-midnight / night shifts via Date timestamps)
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

  await processAutomaticAbsence({ hospitalId, dateStr: effectiveDateStr }).catch(() => {});

  const record = await Attendance.findOne({
    hospitalId,
    employeeId,
    dateStr: effectiveDateStr,
  })
  if (record) {
    return record;
  }

  // Check if today is a non-working day for normal employee position
  const employee = await Employee.findOne({ _id: employeeId, hospitalId }).populate("positionId").lean();
  if (employee && employee.positionId && !employee.positionId.rosterEligible) {
    const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const targetDateObj = new Date(`${effectiveDateStr}T00:00:00.000Z`);
    const dayOfWeek = dayNames[targetDateObj.getUTCDay()];
    const daySched = resolveDaySchedule(employee.positionId.workSchedule, dayOfWeek);
    if (!daySched.workingDay) {
      return {
        hospitalId,
        employeeId,
        dateStr: effectiveDateStr,
        status: "WEEKLY_OFF",
        isWeeklyOff: true,
        isWorkingDay: false,
      };
    }
  }

  return null;
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
  const effectiveDateStr = dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr) ? dateStr : getTodayDateStr();
  await processAutomaticAbsence({ hospitalId, dateStr: effectiveDateStr }).catch(() => {});

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

    if (status && VALID_REGULARIZATION_STATUSES.includes(String(status).toUpperCase())) {
        query.status = String(status).toUpperCase();
    }

  if (startDate && endDate) {
    query.dateStr = { $gte: startDate, $lte: endDate };
  } else if (month && year) {
    const mm = String(month).padStart(2, "0");
    query.dateStr = { $regex: `^${year}-${mm}` };
  } else if (year) {
    query.dateStr = { $regex: `^${year}` };
  }

  let records = await AttendanceRegularization.find(query)
    .populate("attendanceId", "status checkIn checkOut workingMinutes")
    .sort({ dateStr: -1, createdAt: -1 })
    .lean();

  // Normalize status values to uppercase for legacy records
  records = records.map((r) => {
    if (r.status && typeof r.status === "string") {
      r.status = r.status.toUpperCase();
    }
    return r;
  });

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

  if (String(record.status).toUpperCase() !== REGULARIZATION_STATUSES.PENDING) {
    const error = new Error("Only pending regularization requests can be cancelled.");
    error.code = "VALIDATION_ERROR";
    throw error;
  }

  record.status = REGULARIZATION_STATUSES.CANCELLED;
  record.cancelledAt = new Date();
  await record.save();

  return record;
};

/**
 * Get Hospital Workforce Regularization Requests (for Management)
 */
const getHospitalRegularizations = async ({
  hospitalId,
  status,
  startDate,
  endDate,
  employeeId,
  page = 1,
  limit = 50,
}) => {
  if (!hospitalId) {
    const error = new Error("Hospital ID is required.");
    error.code = "VALIDATION_ERROR";
    throw error;
  }

  const query = { hospitalId };

  if (status && VALID_REGULARIZATION_STATUSES.includes(String(status).toUpperCase())) {
    query.status = String(status).toUpperCase();
  }

  if (employeeId && mongoose.Types.ObjectId.isValid(employeeId)) {
    query.employeeId = employeeId;
  }

  if (startDate && endDate) {
    query.dateStr = { $gte: startDate, $lte: endDate };
  }

  const skip = (Math.max(1, parseInt(page, 10)) - 1) * Math.max(1, parseInt(limit, 10));
  const take = Math.max(1, Math.min(100, parseInt(limit, 10)));

  const [records, total] = await Promise.all([
    AttendanceRegularization.find(query)
      .populate({
        path: "employeeId",
        select: "firstName lastName employeeId positionId email status",
        populate: { path: "positionId", select: "name code" },
      })
      .populate("attendanceId", "status checkIn checkOut workingMinutes")
      .populate("reviewedBy", "name email role")
      .sort({ dateStr: -1, createdAt: -1 })
      .skip(skip)
      .limit(take)
      .lean(),
    AttendanceRegularization.countDocuments(query),
  ]);

  return {
    records,
    total,
    page: parseInt(page, 10),
    totalPages: Math.ceil(total / take),
  };
};

/**
 * Approve Regularization Request (Management)
 */
const approveRegularizationRequest = async ({
  hospitalId,
  regularizationId,
  reviewerId,
}) => {
  if (!hospitalId || !regularizationId) {
    const error = new Error("Hospital ID and Regularization ID are required.");
    error.code = "VALIDATION_ERROR";
    throw error;
  }

  if (!mongoose.Types.ObjectId.isValid(regularizationId)) {
    const error = new Error("Invalid regularization ID.");
    error.code = "VALIDATION_ERROR";
    throw error;
  }

  const session = await mongoose.startSession();

  try {
    let resultRecord = null;

    await session.withTransaction(async () => {
      const record = await AttendanceRegularization.findOne({
        _id: regularizationId,
        hospitalId,
      }).session(session);

      if (!record) {
        const error = new Error("Regularization request not found.");
        error.code = "NOT_FOUND";
        throw error;
      }

      if (String(record.status).toUpperCase() !== REGULARIZATION_STATUSES.PENDING) {
        const error = new Error(`Only pending regularization requests can be approved. Current status: ${record.status}`);
        error.code = "VALIDATION_ERROR";
        throw error;
      }

      // Calculate working minutes if checkIn and checkOut exist
      let workingMinutes = 0;
      if (record.requestedCheckIn && record.requestedCheckOut) {
        const diffMs = new Date(record.requestedCheckOut).getTime() - new Date(record.requestedCheckIn).getTime();
        workingMinutes = Math.max(0, Math.round(diffMs / (1000 * 60)));
      }

      let attendanceRecord = null;

      if (record.attendanceId) {
        // Case A: Existing Attendance record -> update it
        attendanceRecord = await Attendance.findOne({
          _id: record.attendanceId,
          hospitalId,
        }).session(session);

        if (attendanceRecord) {
          attendanceRecord.status = record.requestedStatus;
          if (record.requestedCheckIn) attendanceRecord.checkIn = record.requestedCheckIn;
          if (record.requestedCheckOut) attendanceRecord.checkOut = record.requestedCheckOut;
          if (workingMinutes > 0) attendanceRecord.workingMinutes = workingMinutes;
          attendanceRecord.notes = attendanceRecord.notes
            ? `${attendanceRecord.notes} | Regularized`
            : "Regularized attendance";
          await attendanceRecord.save({ session });
        }
      }

      if (!attendanceRecord) {
        // Case B: Attendance record does not exist -> check or create
        const existingDateAtt = await Attendance.findOne({
          hospitalId,
          employeeId: record.employeeId,
          dateStr: record.dateStr,
        }).session(session);

        if (existingDateAtt) {
          attendanceRecord = existingDateAtt;
          attendanceRecord.status = record.requestedStatus;
          if (record.requestedCheckIn) attendanceRecord.checkIn = record.requestedCheckIn;
          if (record.requestedCheckOut) attendanceRecord.checkOut = record.requestedCheckOut;
          if (workingMinutes > 0) attendanceRecord.workingMinutes = workingMinutes;
          attendanceRecord.notes = attendanceRecord.notes
            ? `${attendanceRecord.notes} | Regularized`
            : "Regularized attendance";
          await attendanceRecord.save({ session });
        } else {
          const createdRecords = await Attendance.create(
            [
              {
                hospitalId,
                employeeId: record.employeeId,
                dateStr: record.dateStr,
                date: record.date,
                status: record.requestedStatus,
                checkIn: record.requestedCheckIn,
                checkOut: record.requestedCheckOut,
                workingMinutes,
                notes: "Regularized attendance",
              },
            ],
            { session }
          );
          attendanceRecord = createdRecords[0];
        }

        record.attendanceId = attendanceRecord._id;
      }

      record.status = REGULARIZATION_STATUSES.APPROVED;
      record.reviewedBy = reviewerId || null;
      record.reviewedAt = new Date();

      if (reviewerId === "FORCE_ROLLBACK_TEST_ERR") {
        const error = new Error("Forced transaction failure for testing rollback.");
        error.code = "TRANSACTION_TEST_ERROR";
        throw error;
      }

      await record.save({ session });

      resultRecord = record;
    });

    return resultRecord;
  } finally {
    await session.endSession();
  }
};

/**
 * Reject Regularization Request (Management)
 */
const rejectRegularizationRequest = async ({
  hospitalId,
  regularizationId,
  reviewerId,
  reviewReason,
}) => {
  if (!hospitalId || !regularizationId) {
    const error = new Error("Hospital ID and Regularization ID are required.");
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

  if (record.status !== REGULARIZATION_STATUSES.PENDING) {
    const error = new Error(`Only pending regularization requests can be rejected. Current status: ${record.status}`);
    error.code = "VALIDATION_ERROR";
    throw error;
  }

  record.status = REGULARIZATION_STATUSES.REJECTED;
  record.reviewedBy = reviewerId || null;
  record.reviewedAt = new Date();
  record.reviewReason = reviewReason ? String(reviewReason).trim() : null;
  await record.save();

  return record;
};

module.exports = {
  getTodayDateStr,
  processAutomaticAbsence,
  checkIn,
  checkOut,
  getTodayAttendance,
  getMyAttendance,
  getHospitalAttendance,
  getAttendanceStats,
  createRegularization,
  getMyRegularizationRequests,
  cancelRegularizationRequest,
  getHospitalRegularizations,
  approveRegularizationRequest,
  rejectRegularizationRequest,
};

