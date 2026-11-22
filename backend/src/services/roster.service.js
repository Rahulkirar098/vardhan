const mongoose = require("mongoose");
const Roster = require("../models/roster.model");
const RosterAssignment = require("../models/rosterAssignment.model");
const RosterTemplate = require("../models/rosterTemplate.model");
const Employee = require("../models/employee.model");
const Leave = require("../models/leave.model");
const Attendance = require("../models/attendance.model");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);
const { parseHospitalTimeToDate, getHospitalTodayDateStr } = require("../utils/timezone.utils");

const getShiftIntervalUtc = (baseDateStr, startTime, endTime, timezone = "Asia/Kolkata") => {
    const start = parseHospitalTimeToDate(startTime, baseDateStr, timezone);
    let end = parseHospitalTimeToDate(endTime, baseDateStr, timezone);
    if (!start || !end) return null;
    if (end.getTime() <= start.getTime()) {
        const nextDate = new Date(start.getTime() + 24 * 3600 * 1000);
        const nextDateStr = getHospitalTodayDateStr(nextDate, timezone);
        end = parseHospitalTimeToDate(endTime, nextDateStr, timezone);
    }
    return { start, end };
};

const areShiftsOverlapping = (shiftA, shiftB) => {
    if (!shiftA || !shiftB || !shiftA.start || !shiftA.end || !shiftB.start || !shiftB.end) return false;
    return Math.max(shiftA.start.getTime(), shiftB.start.getTime()) < Math.min(shiftA.end.getTime(), shiftB.end.getTime());
};

const toCalendarDateStr = (dateInput) => {
    if (!dateInput) return "";
    if (typeof dateInput === "string") {
        const match = dateInput.trim().match(/^(\d{4}-\d{2}-\d{2})/);
        if (match) return match[1];
    }
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return "";
    return d.toISOString().split("T")[0];
};

const isLeaveConflictOnDate = (assignmentDate, leaveStartDate, leaveEndDate) => {
    const assStr = toCalendarDateStr(assignmentDate);
    const startStr = toCalendarDateStr(leaveStartDate);
    const endStr = toCalendarDateStr(leaveEndDate);
    return assStr >= startStr && assStr <= endStr;
};

const getCalendarBounds = (dateInput) => {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) {
        return { start: new Date(), end: new Date() };
    }
    const localStart = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
    const localEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
    const utcStart = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
    const utcEnd = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999));
    const start = new Date(Math.min(localStart.getTime(), utcStart.getTime()));
    const end = new Date(Math.max(localEnd.getTime(), utcEnd.getTime()));
    return { start, end };
};

// ─── ROSTERS ─────────────────────────────────────────────────────────────────

const listRosters = async ({ hospitalId, status, userId, isManager }) => {
    const query = { hospitalId };

    if (status && ["DRAFT", "PUBLISHED"].includes(String(status).toUpperCase())) {
        query.status = String(status).toUpperCase();
    }

    if (!isManager) {
        // Non-managers see all PUBLISHED rosters OR DRAFT rosters explicitly shared with them
        query.$or = [
            { status: "PUBLISHED" },
            { status: "DRAFT", sharedWith: userId },
        ];
    }

    return Roster.find(query)
        .populate("createdBy", "name email")
        .populate("publishedBy", "name email")
        .populate("sharedWith", "name email")
        .sort({ startDate: -1 })
        .lean();
};

const isHistoricalRoster = async (rosterId, hospitalId) => {
    if (!isValidObjectId(rosterId)) return false;
    const roster = await Roster.findOne({ _id: rosterId, hospitalId }).lean();
    if (!roster || roster.status !== "PUBLISHED") return false;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const end = new Date(roster.endDate);

    return end < todayStart;
};

const getRosterHistory = async ({ hospitalId, userId, isManager }) => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const publishedRosters = await Roster.find({
        hospitalId,
        status: "PUBLISHED",
        endDate: { $lt: todayStart },
    })
        .populate("createdBy", "name email")
        .populate("publishedBy", "name email")
        .sort({ endDate: -1, publishedAt: -1, createdAt: -1 })
        .lean();

    return publishedRosters.map((r) => ({
        ...r,
        isHistorical: true,
    }));
};

const getRosterById = async ({ rosterId, hospitalId, userId, isManager }) => {
    if (!isValidObjectId(rosterId)) return null;

    const roster = await Roster.findOne({ _id: rosterId, hospitalId })
        .populate("createdBy", "name email")
        .populate("publishedBy", "name email")
        .populate("sharedWith", "name email employeeId")
        .populate("comments.userId", "name email")
        .lean();

    if (!roster) return null;

    if (!isManager && roster.status === "DRAFT") {
        const isShared =
            Array.isArray(roster.sharedWith) &&
            roster.sharedWith.some((u) => u._id.toString() === userId.toString());

        if (!isShared) {
            const err = new Error("You do not have permission to view this draft roster.");
            err.code = "FORBIDDEN";
            throw err;
        }
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const end = new Date(roster.endDate);
    const isHistorical = roster.status === "PUBLISHED" && end < todayStart;

    const assignments = await RosterAssignment.find({ rosterId: roster._id, hospitalId })
        .populate({
            path: "employeeId",
            select: "employeeId firstName lastName email phone gender avatarUrl positionId employmentStatus",
            populate: { path: "positionId", select: "name" },
        })
        .sort({ date: 1, startTime: 1 })
        .lean();

    return {
        ...roster,
        isHistorical: !!isHistorical,
        assignments,
    };
};

const createRoster = async ({ hospitalId, userId, title, startDate, endDate, columns = [], dutyAreas = [], templateId = null }) => {
    if (!title || !String(title).trim()) {
        const err = new Error("Roster title is required.");
        err.code = "VALIDATION_ERROR";
        throw err;
    }

    if (!startDate || !endDate) {
        const err = new Error("Start date and end date are required.");
        err.code = "VALIDATION_ERROR";
        throw err;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start > end) {
        const err = new Error("Start date must be less than or equal to end date.");
        err.code = "VALIDATION_ERROR";
        throw err;
    }

    let finalColumns = Array.isArray(columns) ? columns : [];
    let finalDutyAreas = Array.isArray(dutyAreas) ? dutyAreas : [];

    if (templateId && isValidObjectId(templateId)) {
        const template = await RosterTemplate.findOne({ _id: templateId, hospitalId, isActive: true }).lean();
        if (template) {
            if (finalColumns.length === 0 && Array.isArray(template.columns)) {
                finalColumns = template.columns.map((c) => ({
                    id: c.id,
                    title: c.title,
                    startTime: c.startTime,
                    endTime: c.endTime,
                    order: c.order,
                }));
            }
            if (finalDutyAreas.length === 0 && Array.isArray(template.dutyAreas)) {
                finalDutyAreas = template.dutyAreas.map((da) => ({
                    id: da.id,
                    name: da.name,
                    order: da.order,
                }));
            }
        }
    }

    const roster = await Roster.create({
        hospitalId,
        title: String(title).trim(),
        startDate: start,
        endDate: end,
        status: "DRAFT",
        columns: finalColumns,
        dutyAreas: finalDutyAreas,
        createdBy: userId,
    });

    return roster;
};

const updateRosterDraft = async ({ rosterId, hospitalId, userId, title, startDate, endDate, columns, dutyAreas }) => {
    if (!isValidObjectId(rosterId)) {
        const err = new Error("Invalid roster ID.");
        err.code = "VALIDATION_ERROR";
        throw err;
    }

    const roster = await Roster.findOne({ _id: rosterId, hospitalId });
    if (!roster) {
        const err = new Error("Roster not found.");
        err.code = "NOT_FOUND";
        throw err;
    }

    if (await isHistoricalRoster(rosterId, hospitalId)) {
        const err = new Error("Historical rosters are read-only and cannot be modified.");
        err.code = "BUSINESS_CONFLICT";
        throw err;
    }

    const targetStart = startDate ? new Date(startDate) : roster.startDate;
    const targetEnd = endDate ? new Date(endDate) : roster.endDate;

    if (targetStart > targetEnd) {
        const err = new Error("Start date must be less than or equal to end date.");
        err.code = "VALIDATION_ERROR";
        throw err;
    }

    // Protect published/existing assignment integrity (R2-05 & R2-06)
    const existingAssignments = await RosterAssignment.find({ rosterId: roster._id }).lean();
    if (existingAssignments.length > 0) {
        // CASE 1 & 4: Check if new date bounds invalidate existing assignment dates
        if (startDate || endDate) {
            const rangeStart = new Date(targetStart);
            const rangeEnd = new Date(targetEnd);
            rangeStart.setHours(0, 0, 0, 0);
            rangeEnd.setHours(23, 59, 59, 999);

            const invalidDateAssignments = existingAssignments.filter((a) => {
                const assDate = new Date(a.date);
                return assDate < rangeStart || assDate > rangeEnd;
            });

            if (invalidDateAssignments.length > 0) {
                const err = new Error(
                    `Cannot modify roster date range because ${invalidDateAssignments.length} existing assignment(s) would fall outside the new period.`
                );
                err.code = "BUSINESS_CONFLICT";
                throw err;
            }
        }

        // CASE 2: Check if shift/column removal invalidates existing shift assignments
        if (Array.isArray(columns)) {
            const targetCols = columns;
            const invalidShiftAssignments = existingAssignments.filter((a) => {
                if (!a.columnId && !a.shiftTitle) return false;
                const match = targetCols.some(
                    (c) =>
                        (a.columnId && String(c.id) === String(a.columnId)) ||
                        (a.shiftTitle && c.title?.toLowerCase() === a.shiftTitle?.toLowerCase())
                );
                return !match;
            });

            if (invalidShiftAssignments.length > 0) {
                const err = new Error(
                    `Cannot remove shift configuration because ${invalidShiftAssignments.length} existing assignment(s) reference it.`
                );
                err.code = "BUSINESS_CONFLICT";
                throw err;
            }
        }

        // CASE 3: Check if duty area removal invalidates existing duty area assignments
        if (Array.isArray(dutyAreas)) {
            const targetDAs = dutyAreas;
            const invalidDutyAssignments = existingAssignments.filter((a) => {
                if (!a.dutyArea) return false;
                const match = targetDAs.some(
                    (da) =>
                        (da.id && String(da.id) === String(a.dutyArea)) ||
                        (da.name && da.name?.toLowerCase() === a.dutyArea?.toLowerCase())
                );
                return !match;
            });

            if (invalidDutyAssignments.length > 0) {
                const err = new Error(
                    `Cannot remove duty area because ${invalidDutyAssignments.length} existing assignment(s) reference it.`
                );
                err.code = "BUSINESS_CONFLICT";
                throw err;
            }
        }
    }

    if (title !== undefined) roster.title = String(title).trim();
    if (startDate) roster.startDate = targetStart;
    if (endDate) roster.endDate = targetEnd;
    if (Array.isArray(columns)) roster.columns = columns;
    if (Array.isArray(dutyAreas)) roster.dutyAreas = dutyAreas;
    roster.updatedBy = userId;

    await roster.save();
    return roster;
};

const deleteRosterDraft = async ({ rosterId, hospitalId }) => {
    if (!isValidObjectId(rosterId)) {
        const err = new Error("Invalid roster ID.");
        err.code = "VALIDATION_ERROR";
        throw err;
    }

    const roster = await Roster.findOne({ _id: rosterId, hospitalId });
    if (!roster) {
        const err = new Error("Roster not found.");
        err.code = "NOT_FOUND";
        throw err;
    }

    if (roster.status === "PUBLISHED") {
        const isHist = await isHistoricalRoster(roster._id, hospitalId);
        const err = new Error(isHist ? "Historical rosters are read-only and cannot be deleted." : "Published rosters cannot be deleted.");
        err.code = "BUSINESS_CONFLICT";
        throw err;
    }

    await Promise.all([
        Roster.deleteOne({ _id: roster._id }),
        RosterAssignment.deleteMany({ rosterId: roster._id }),
    ]);

    return { success: true };
};

const publishRoster = async ({ rosterId, hospitalId, userId }) => {
    if (!isValidObjectId(rosterId)) {
        const err = new Error("Invalid roster ID.");
        err.code = "VALIDATION_ERROR";
        throw err;
    }

    const roster = await Roster.findOne({ _id: rosterId, hospitalId });
    if (!roster) {
        const err = new Error("Roster not found.");
        err.code = "NOT_FOUND";
        throw err;
    }

    if (await isHistoricalRoster(rosterId, hospitalId)) {
        const err = new Error("Historical rosters cannot be published again.");
        err.code = "BUSINESS_CONFLICT";
        throw err;
    }

    // --- PUBLISH VALIDATION ---
    if (!roster.title || !String(roster.title).trim()) {
        const err = new Error("Cannot publish roster: Title is missing.");
        err.code = "VALIDATION_ERROR";
        throw err;
    }

    if (!roster.startDate || !roster.endDate) {
        const err = new Error("Cannot publish roster: Start and end dates are required.");
        err.code = "VALIDATION_ERROR";
        throw err;
    }

    const rosterStart = new Date(roster.startDate);
    const rosterEnd = new Date(roster.endDate);
    if (rosterStart > rosterEnd) {
        const err = new Error("Cannot publish roster: Start date must be less than or equal to end date.");
        err.code = "VALIDATION_ERROR";
        throw err;
    }

    if (!Array.isArray(roster.columns) || roster.columns.length === 0) {
        const err = new Error("Cannot publish roster: At least one shift column must be configured.");
        err.code = "VALIDATION_ERROR";
        throw err;
    }

    for (const col of roster.columns) {
        if (!col.title || !col.startTime || !col.endTime) {
            const err = new Error("Cannot publish roster: All shift columns must have title, start time, and end time.");
            err.code = "VALIDATION_ERROR";
            throw err;
        }
    }

    if (Array.isArray(roster.dutyAreas)) {
        for (const da of roster.dutyAreas) {
            if (!da.name || !String(da.name).trim()) {
                const err = new Error("Cannot publish roster: All configured duty areas must have valid names.");
                err.code = "VALIDATION_ERROR";
                throw err;
            }
        }
    }

    const assignments = await RosterAssignment.find({ rosterId: roster._id, hospitalId })
        .populate({
            path: "employeeId",
            populate: { path: "positionId" },
        });

    rosterStart.setHours(0, 0, 0, 0);
    rosterEnd.setHours(23, 59, 59, 999);

    for (const ass of assignments) {
        const assDate = new Date(ass.date);
        if (assDate < rosterStart || assDate > rosterEnd) {
            const err = new Error(`Cannot publish roster: Assignment on ${ass.date.toISOString().split("T")[0]} falls outside the roster period.`);
            err.code = "VALIDATION_ERROR";
            throw err;
        }

        const emp = ass.employeeId;
        if (!emp || emp.hospitalId?.toString() !== hospitalId.toString()) {
            const err = new Error("Cannot publish roster: Contains assignment for an invalid employee.");
            err.code = "VALIDATION_ERROR";
            throw err;
        }

        if (emp.employmentStatus !== "ACTIVE") {
            const err = new Error(`Cannot publish roster: Assigned employee ${emp.firstName || ""} ${emp.lastName || ""} is inactive.`);
            err.code = "VALIDATION_ERROR";
            throw err;
        }

        if (!emp.positionId || !emp.positionId.rosterEligible) {
            const err = new Error(`Cannot publish roster: Assigned employee ${emp.firstName || ""} ${emp.lastName || ""} is not roster eligible.`);
            err.code = "VALIDATION_ERROR";
            throw err;
        }

        const matchingShift = roster.columns.find(
            (c) => c.title?.toLowerCase() === ass.shiftTitle?.toLowerCase() || c.id === ass.columnId
        );
        if (!matchingShift) {
            const err = new Error(`Cannot publish roster: Assignment has shift '${ass.shiftTitle}' which is not configured in this roster.`);
            err.code = "VALIDATION_ERROR";
            throw err;
        }

        if (Array.isArray(roster.dutyAreas) && roster.dutyAreas.length > 0) {
            const matchingDutyArea = roster.dutyAreas.find(
                (da) => da.name?.toLowerCase() === ass.dutyArea?.toLowerCase() || da.id === ass.dutyArea
            );
            if (!matchingDutyArea) {
                const err = new Error(`Cannot publish roster: Assignment has duty area '${ass.dutyArea}' which is not configured in this roster.`);
                err.code = "VALIDATION_ERROR";
                throw err;
            }
        }
    }

    roster.status = "PUBLISHED";
    roster.publishedBy = userId;
    roster.publishedAt = new Date();
    roster.updatedBy = userId;
    await roster.save();

    return roster;
};

// ─── REVIEW SHARING & FEEDBACK ───────────────────────────────────────────────

const shareRosterForReview = async ({ rosterId, hospitalId, userIds, userId }) => {
    if (!isValidObjectId(rosterId)) {
        const err = new Error("Invalid roster ID.");
        err.code = "VALIDATION_ERROR";
        throw err;
    }

    const roster = await Roster.findOne({ _id: rosterId, hospitalId });
    if (!roster) {
        const err = new Error("Roster not found.");
        err.code = "NOT_FOUND";
        throw err;
    }

    const validUserIds = (userIds || []).filter((id) => isValidObjectId(id));
    roster.sharedWith = validUserIds;
    roster.updatedBy = userId;
    await roster.save();

    return Roster.findById(roster._id)
        .populate("sharedWith", "name email")
        .lean();
};

const addReviewComment = async ({ rosterId, hospitalId, userId, comment }) => {
    if (!isValidObjectId(rosterId)) {
        const err = new Error("Invalid roster ID.");
        err.code = "VALIDATION_ERROR";
        throw err;
    }

    if (!comment || !String(comment).trim()) {
        const err = new Error("Comment text is required.");
        err.code = "VALIDATION_ERROR";
        throw err;
    }

    const roster = await Roster.findOne({ _id: rosterId, hospitalId });
    if (!roster) {
        const err = new Error("Roster not found.");
        err.code = "NOT_FOUND";
        throw err;
    }

    roster.comments.push({
        userId,
        comment: String(comment).trim(),
        createdAt: new Date(),
    });

    await roster.save();

    return Roster.findById(roster._id)
        .populate("comments.userId", "name email")
        .lean();
};

const resolveReviewComment = async ({ rosterId, commentId, hospitalId, userId }) => {
    if (!isValidObjectId(rosterId) || !isValidObjectId(commentId)) {
        const err = new Error("Invalid roster or comment ID.");
        err.code = "VALIDATION_ERROR";
        throw err;
    }

    const roster = await Roster.findOne({ _id: rosterId, hospitalId });
    if (!roster) {
        const err = new Error("Roster not found.");
        err.code = "NOT_FOUND";
        throw err;
    }

    const commentItem = roster.comments.id(commentId);
    if (!commentItem) {
        const err = new Error("Review comment not found.");
        err.code = "NOT_FOUND";
        throw err;
    }

    commentItem.resolved = true;
    commentItem.resolvedBy = userId;
    commentItem.resolvedAt = new Date();
    await roster.save();

    return Roster.findById(roster._id)
        .populate("comments.userId", "name email")
        .lean();
};

// ─── ASSIGNMENTS ─────────────────────────────────────────────────────────────

const addAssignment = async ({
    hospitalId,
    userId,
    rosterId,
    employeeId,
    date,
    columnId,
    shiftTitle,
    startTime,
    endTime,
    dutyArea,
    notes,
}) => {
    if (!isValidObjectId(rosterId)) {
        const err = new Error("Invalid roster ID.");
        err.code = "VALIDATION_ERROR";
        throw err;
    }

    if (!isValidObjectId(employeeId)) {
        const err = new Error("Invalid employee ID.");
        err.code = "VALIDATION_ERROR";
        throw err;
    }

    const roster = await Roster.findOne({ _id: rosterId, hospitalId });
    if (!roster) {
        const err = new Error("Roster not found.");
        err.code = "NOT_FOUND";
        throw err;
    }

    if (await isHistoricalRoster(rosterId, hospitalId)) {
        const err = new Error("Historical rosters are read-only and cannot be modified.");
        err.code = "BUSINESS_CONFLICT";
        throw err;
    }

    const employee = await Employee.findOne({ _id: employeeId, hospitalId }).populate("positionId");
    if (!employee) {
        const err = new Error("Employee not found in this hospital.");
        err.code = "NOT_FOUND";
        throw err;
    }

    if (employee.employmentStatus === "INACTIVE") {
        const err = new Error("Cannot assign inactive employees to roster.");
        err.code = "VALIDATION_ERROR";
        throw err;
    }

    if (!employee.positionId || !employee.positionId.rosterEligible) {
        const err = new Error("Employee position is not eligible for roster assignments.");
        err.code = "VALIDATION_ERROR";
        throw err;
    }

    if (!date || !shiftTitle || !startTime || !endTime || !dutyArea) {
        const err = new Error("Date, shift title, times, and duty area are required.");
        err.code = "VALIDATION_ERROR";
        throw err;
    }

    const assignmentDate = new Date(date);
    const { start: dateStart, end: dateEnd } = getCalendarBounds(assignmentDate);

    const rosterStart = new Date(roster.startDate);
    const rosterEnd = new Date(roster.endDate);
    rosterStart.setHours(0, 0, 0, 0);
    rosterEnd.setHours(23, 59, 59, 999);

    if (assignmentDate < rosterStart || assignmentDate > rosterEnd) {
        const err = new Error("Assignment date must fall within the roster start and end date period.");
        err.code = "VALIDATION_ERROR";
        throw err;
    }

    const { isEmployeeEmployedOnDate } = require("../utils/employment.utils");
    const Hospital = require("../models/hospital.model");
    const hospitalObj = await Hospital.findById(hospitalId).select("timezone").lean();
    const tz = hospitalObj?.timezone || "Asia/Kolkata";

    if (!isEmployeeEmployedOnDate(employee, assignmentDate, tz)) {
        const err = new Error("Employee is no longer employed on the selected duty date.");
        err.code = "EMPLOYMENT_ENDED";
        throw err;
    }

    let resolvedColumnId = columnId ? String(columnId).trim() : null;
    if (Array.isArray(roster.columns) && roster.columns.length > 0) {
        const matchingShift = roster.columns.find(
            (c) => c.title?.toLowerCase() === shiftTitle?.toLowerCase() || c.id === columnId
        );
        if (!matchingShift) {
            const err = new Error("Selected shift does not belong to this roster.");
            err.code = "VALIDATION_ERROR";
            throw err;
        }
        if (!resolvedColumnId) {
            resolvedColumnId = matchingShift.id;
        }
    }
    if (!resolvedColumnId && shiftTitle) {
        resolvedColumnId = String(shiftTitle).toLowerCase().trim().replace(/\s+/g, "_");
    }

    if (Array.isArray(roster.dutyAreas) && roster.dutyAreas.length > 0) {
        const matchingDutyArea = roster.dutyAreas.find(
            (da) => da.name?.toLowerCase() === dutyArea?.toLowerCase() || da.id === dutyArea
        );
        if (!matchingDutyArea) {
            const err = new Error("Selected duty area does not belong to this roster.");
            err.code = "VALIDATION_ERROR";
            throw err;
        }
    }

    // 1. APPROVED Leave Check -> BLOCKS assignment completely (Priority over duplicate shift conflict)
    const approvedLeaves = await Leave.find({
        hospitalId,
        employeeId: employee._id,
        status: { $in: ["APPROVED", "approved"] },
    }).lean();

    const approvedLeave = approvedLeaves.find((l) =>
        isLeaveConflictOnDate(assignmentDate, l.startDate, l.endDate)
    );

    if (approvedLeave) {
        const empName = `${employee.firstName || ""} ${employee.lastName || ""}`.trim() || "Employee";
        const fromFmt = approvedLeave.startDate.toISOString().split("T")[0];
        const toFmt = approvedLeave.endDate.toISOString().split("T")[0];
        const dateFmt = assignmentDate.toISOString().split("T")[0];
        const err = new Error(
            `${empName} has an approved leave from ${fromFmt} to ${toFmt} (${approvedLeave.leaveType}) and cannot be assigned on ${dateFmt}.`
        );
        err.code = "LEAVE_CONFLICT";
        err.details = {
            employeeId: employee._id,
            employeeName: empName,
            leaveId: approvedLeave._id,
            leaveType: approvedLeave.leaveType,
            startDate: approvedLeave.startDate,
            endDate: approvedLeave.endDate,
            blockedDate: assignmentDate,
        };
        throw err;
    }

    // 2. Check for exact duplicate shift and time overlap across neighbouring dates
    const targetDateStr = toCalendarDateStr(assignmentDate);
    const candidateInterval = getShiftIntervalUtc(targetDateStr, startTime, endTime, tz);

    const dayMinus1 = new Date(assignmentDate.getTime() - 24 * 3600 * 1000);
    const dayPlus1 = new Date(assignmentDate.getTime() + 24 * 3600 * 1000);
    const { start: windowStart } = getCalendarBounds(dayMinus1);
    const { end: windowEnd } = getCalendarBounds(dayPlus1);

    const neighbouringAssignments = await RosterAssignment.find({
        hospitalId,
        employeeId: employee._id,
        date: { $gte: windowStart, $lte: windowEnd },
    })
        .populate({
            path: "employeeId",
            select: "firstName lastName name",
        })
        .lean();

    for (const ass of neighbouringAssignments) {
        const assDateStr = toCalendarDateStr(ass.date);
        const empName = ass.employeeId
            ? `${ass.employeeId.firstName || ""} ${ass.employeeId.lastName || ""}`.trim() || ass.employeeId.name || "This employee"
            : `${employee.firstName || ""} ${employee.lastName || ""}`.trim() || "This employee";

        // Check exact duplicate shift on same date
        if (assDateStr === targetDateStr) {
            const isSameCol = ass.columnId && resolvedColumnId && String(ass.columnId) === String(resolvedColumnId);
            const isSameTitle = ass.shiftTitle?.toLowerCase() === String(shiftTitle).toLowerCase();
            if (isSameCol || isSameTitle) {
                const err = new Error(`${empName} is already assigned to the "${ass.shiftTitle}" shift on this date.`);
                err.code = "DUPLICATE_ASSIGNMENT";
                err.existingAssignment = {
                    employeeName: empName,
                    date: ass.date,
                    existingShift: ass.shiftTitle,
                    existingDutyArea: ass.dutyArea,
                };
                throw err;
            }
        }

        // Check time overlap across neighbouring dates
        const assInterval = getShiftIntervalUtc(assDateStr, ass.startTime, ass.endTime, tz);
        if (candidateInterval && assInterval && areShiftsOverlapping(candidateInterval, assInterval)) {
            const err = new Error(`${empName} has an overlapping shift "${ass.shiftTitle}" (${ass.startTime} - ${ass.endTime}) on ${assDateStr}.`);
            err.code = "DUPLICATE_ASSIGNMENT";
            err.existingAssignment = {
                employeeName: empName,
                date: ass.date,
                existingShift: ass.shiftTitle,
                existingDutyArea: ass.dutyArea,
                conflictingTime: `${ass.startTime} - ${ass.endTime}`,
            };
            throw err;
        }
    }

    // 2. PENDING Leave Check -> Non-blocking notification warning
    const pendingLeave = await Leave.findOne({
        hospitalId,
        employeeId: employee._id,
        status: { $in: ["PENDING", "pending"] },
        startDate: { $lte: dateEnd },
        endDate: { $gte: dateStart },
    }).lean();

    let leaveWarning = null;
    if (pendingLeave) {
        leaveWarning = {
            hasLeave: true,
            status: pendingLeave.status,
            leaveType: pendingLeave.leaveType,
            reason: pendingLeave.reason,
            message: `Employee has ${pendingLeave.status} leave on this date (${pendingLeave.leaveType}).`,
        };
    }

    const assignment = await RosterAssignment.create({
        rosterId: roster._id,
        hospitalId,
        employeeId: employee._id,
        date: assignmentDate,
        columnId: resolvedColumnId,
        shiftTitle: String(shiftTitle).trim(),
        startTime: String(startTime).trim(),
        endTime: String(endTime).trim(),
        dutyArea: String(dutyArea).trim(),
        notes: notes ? String(notes).trim() : null,
        createdBy: userId,
    });

    // Mark roster as updated
    roster.updatedBy = userId;
    await roster.save();

    const populatedAssignment = await RosterAssignment.findById(assignment._id)
        .populate({
            path: "employeeId",
            select: "employeeId firstName lastName email phone gender avatarUrl positionId employmentStatus",
            populate: { path: "positionId", select: "name" },
        })
        .lean();

    return {
        assignment: populatedAssignment,
        leaveWarning,
    };
};

const addBulkRangeAssignments = async ({
    hospitalId,
    userId,
    rosterId,
    employeeId,
    startDate,
    endDate,
    dates,
    shiftColumnIds,
    shifts,
    columnId,
    shiftTitle,
    startTime,
    endTime,
    dutyArea,
    notes,
    overwriteConflicts = false,
    allOrNothing = false,
}) => {
    if (!isValidObjectId(rosterId)) {
        const err = new Error("Invalid roster ID.");
        err.code = "VALIDATION_ERROR";
        throw err;
    }

    if (!isValidObjectId(employeeId)) {
        const err = new Error("Invalid employee ID.");
        err.code = "VALIDATION_ERROR";
        throw err;
    }

    const roster = await Roster.findOne({ _id: rosterId, hospitalId });
    if (!roster) {
        const err = new Error("Roster not found.");
        err.code = "NOT_FOUND";
        throw err;
    }

    if (await isHistoricalRoster(rosterId, hospitalId)) {
        const err = new Error("Historical rosters are read-only and cannot be modified.");
        err.code = "BUSINESS_CONFLICT";
        throw err;
    }

    const employee = await Employee.findOne({ _id: employeeId, hospitalId }).populate("positionId");
    if (!employee) {
        const err = new Error("Employee not found in this hospital.");
        err.code = "NOT_FOUND";
        throw err;
    }

    if (employee.employmentStatus === "INACTIVE") {
        const err = new Error("Cannot assign inactive employees to roster.");
        err.code = "VALIDATION_ERROR";
        throw err;
    }

    if (!employee.positionId || !employee.positionId.rosterEligible) {
        const err = new Error("Employee position is not eligible for roster assignments.");
        err.code = "VALIDATION_ERROR";
        throw err;
    }

    const Hospital = require("../models/hospital.model");
    const hospitalObj = await Hospital.findById(hospitalId).select("timezone").lean();
    const tz = hospitalObj?.timezone || "Asia/Kolkata";
    const empName = `${employee.firstName || ""} ${employee.lastName || ""}`.trim() || "Employee";

    const { start: rosterStartBounds } = getCalendarBounds(roster.startDate);
    const { end: rosterEndBounds } = getCalendarBounds(roster.endDate);

    // 1. Resolve Duty Area
    const defaultDutyArea = dutyArea || (Array.isArray(roster.dutyAreas) && roster.dutyAreas.length > 0 ? roster.dutyAreas[0].name : "General Ward");
    if (dutyArea && Array.isArray(roster.dutyAreas) && roster.dutyAreas.length > 0) {
        const matchingDutyArea = roster.dutyAreas.find(
            (da) => da.name?.toLowerCase() === dutyArea?.toLowerCase() || da.id === dutyArea
        );
        if (!matchingDutyArea) {
            const err = new Error("Selected duty area does not belong to this roster.");
            err.code = "VALIDATION_ERROR";
            throw err;
        }
    }

    // 2. Resolve Shifts
    let resolvedShifts = [];
    if (Array.isArray(shifts) && shifts.length > 0) {
        resolvedShifts = shifts.map((s) => {
            const col = Array.isArray(roster.columns)
                ? roster.columns.find(
                      (c) =>
                          (s.columnId && c.id === s.columnId) ||
                          (s.columnId && c._id && String(c._id) === String(s.columnId)) ||
                          (s.shiftTitle && c.title?.toLowerCase() === s.shiftTitle?.toLowerCase())
                  )
                : null;
            return {
                columnId: s.columnId || col?.id || (col?._id ? String(col._id) : null),
                shiftTitle: s.shiftTitle || col?.title || "Duty",
                startTime: s.startTime || col?.startTime || "08:00",
                endTime: s.endTime || col?.endTime || "16:00",
                dutyArea: s.dutyArea || defaultDutyArea,
            };
        });
    } else if (Array.isArray(shiftColumnIds) && shiftColumnIds.length > 0) {
        for (const colId of shiftColumnIds) {
            const col = Array.isArray(roster.columns)
                ? roster.columns.find((c) => c.id === colId || (c._id && String(c._id) === String(colId)))
                : null;
            if (!col) {
                const err = new Error(`Shift column "${colId}" does not belong to this roster.`);
                err.code = "VALIDATION_ERROR";
                throw err;
            }
            resolvedShifts.push({
                columnId: col.id || (col._id ? String(col._id) : colId),
                shiftTitle: col.title,
                startTime: col.startTime || "08:00",
                endTime: col.endTime || "16:00",
                dutyArea: defaultDutyArea,
            });
        }
    } else if (shiftTitle) {
        let resolvedColId = columnId || null;
        if (Array.isArray(roster.columns) && roster.columns.length > 0) {
            const matchingShift = roster.columns.find(
                (c) => c.title?.toLowerCase() === shiftTitle?.toLowerCase() || (columnId && c.id === columnId)
            );
            if (!matchingShift) {
                const err = new Error("Selected shift does not belong to this roster.");
                err.code = "VALIDATION_ERROR";
                throw err;
            }
            resolvedColId = matchingShift.id || (matchingShift._id ? String(matchingShift._id) : columnId);
        }
        resolvedShifts.push({
            columnId: resolvedColId,
            shiftTitle: String(shiftTitle).trim(),
            startTime: String(startTime || "08:00").trim(),
            endTime: String(endTime || "16:00").trim(),
            dutyArea: String(dutyArea || defaultDutyArea).trim(),
        });
    }

    if (resolvedShifts.length === 0) {
        const err = new Error("At least one valid shift must be selected.");
        err.code = "VALIDATION_ERROR";
        throw err;
    }

    // 3. Check internal overlap between requested shifts on the same day
    if (resolvedShifts.length > 1) {
        for (let i = 0; i < resolvedShifts.length; i++) {
            for (let j = i + 1; j < resolvedShifts.length; j++) {
                const sA = resolvedShifts[i];
                const sB = resolvedShifts[j];
                if (sA.columnId && sB.columnId && sA.columnId === sB.columnId) {
                    const err = new Error(`Exact duplicate shift "${sA.shiftTitle}" selected multiple times.`);
                    err.code = "DUPLICATE_ASSIGNMENT";
                    throw err;
                }
                const intA = getShiftIntervalUtc("2026-01-01", sA.startTime, sA.endTime, tz);
                const intB = getShiftIntervalUtc("2026-01-01", sB.startTime, sB.endTime, tz);
                if (intA && intB && areShiftsOverlapping(intA, intB)) {
                    const err = new Error(`Selected shifts "${sA.shiftTitle}" (${sA.startTime} - ${sA.endTime}) and "${sB.shiftTitle}" (${sB.startTime} - ${sB.endTime}) overlap with each other.`);
                    err.code = "SHIFT_OVERLAP";
                    throw err;
                }
            }
        }
    }

    // 4. Resolve Dates
    const datesList = [];
    const parseNoonDate = (dInput) => {
        const dObj = new Date(dInput);
        return new Date(dObj.getFullYear(), dObj.getMonth(), dObj.getDate(), 12, 0, 0, 0);
    };

    if (Array.isArray(dates) && dates.length > 0) {
        for (const dateItem of dates) {
            const dObj = new Date(dateItem);
            if (isNaN(dObj.getTime())) {
                const err = new Error(`Invalid date format in dates list: ${dateItem}`);
                err.code = "VALIDATION_ERROR";
                throw err;
            }
            const { start: dateBounds } = getCalendarBounds(dObj);
            if (dateBounds < rosterStartBounds || dateBounds > rosterEndBounds) {
                const err = new Error(`Date ${toCalendarDateStr(dObj)} is outside the roster date range.`);
                err.code = "VALIDATION_ERROR";
                throw err;
            }
            datesList.push(new Date(dObj.getFullYear(), dObj.getMonth(), dObj.getDate(), 12, 0, 0, 0));
        }
        datesList.sort((a, b) => a.getTime() - b.getTime());
    } else {
        if (!startDate || !endDate) {
            const err = new Error("Start date, end date, shift title, times, and duty area are required.");
            err.code = "VALIDATION_ERROR";
            throw err;
        }

        const startRange = new Date(startDate);
        const endRange = new Date(endDate);
        if (isNaN(startRange.getTime()) || isNaN(endRange.getTime())) {
            const err = new Error("Invalid date format.");
            err.code = "VALIDATION_ERROR";
            throw err;
        }

        const { start: rangeStartBounds } = getCalendarBounds(startRange);
        const { end: rangeEndBounds } = getCalendarBounds(endRange);

        if (rangeStartBounds < rosterStartBounds || rangeEndBounds > rosterEndBounds) {
            const err = new Error("Assignment date range must fall within the roster start and end date period.");
            err.code = "VALIDATION_ERROR";
            throw err;
        }

        if (rangeStartBounds > rangeEndBounds) {
            const err = new Error("Start date must be less than or equal to end date.");
            err.code = "VALIDATION_ERROR";
            throw err;
        }

        let curr = parseNoonDate(startDate);
        const lastDate = parseNoonDate(endDate);

        while (curr <= lastDate) {
            datesList.push(new Date(curr));
            curr.setDate(curr.getDate() + 1);
        }
    }

    if (datesList.length === 0) {
        const err = new Error("No valid dates provided for assignment.");
        err.code = "VALIDATION_ERROR";
        throw err;
    }

    const minDate = datesList[0];
    const maxDate = datesList[datesList.length - 1];
    const { start: minDateBounds } = getCalendarBounds(minDate);
    const { end: maxDateBounds } = getCalendarBounds(maxDate);

    // Expand search buffer by 1 day on each side for overnight overlap detection
    const searchStart = new Date(minDateBounds.getTime() - 24 * 3600 * 1000);
    const searchEnd = new Date(maxDateBounds.getTime() + 24 * 3600 * 1000);

    const existingAssignments = await RosterAssignment.find({
        hospitalId,
        employeeId: employee._id,
        date: { $gte: searchStart, $lte: searchEnd },
    }).lean();

    const approvedLeaves = await Leave.find({
        hospitalId,
        employeeId: employee._id,
        status: { $in: ["APPROVED", "approved"] },
        startDate: { $lte: searchEnd },
        endDate: { $gte: searchStart },
    }).lean();

    const pendingLeaves = await Leave.find({
        hospitalId,
        employeeId: employee._id,
        status: { $in: ["PENDING", "pending"] },
        startDate: { $lte: searchEnd },
        endDate: { $gte: searchStart },
    }).lean();

    const isPhase2MultiShift = Array.isArray(shiftColumnIds) || Array.isArray(shifts) || resolvedShifts.length > 1 || allOrNothing === true;

    // ─── PHASE 2 MULTI-SHIFT & ALL-OR-NOTHING PATH ───────────────────────────
    if (isPhase2MultiShift) {
        const conflicts = [];
        const { isEmployeeEmployedOnDate } = require("../utils/employment.utils");

        for (const d of datesList) {
            const dateStr = toCalendarDateStr(d);

            // Check employment ended
            if (!isEmployeeEmployedOnDate(employee, d, tz)) {
                conflicts.push({
                    type: "EMPLOYMENT_ENDED",
                    date: dateStr,
                    message: `${empName} is no longer employed on ${dateStr}.`,
                });
                continue;
            }

            // Check approved leave
            const approvedOnDate = approvedLeaves.find((l) =>
                isLeaveConflictOnDate(d, l.startDate, l.endDate)
            );
            if (approvedOnDate) {
                const lStart = toCalendarDateStr(approvedOnDate.startDate);
                const lEnd = toCalendarDateStr(approvedOnDate.endDate);
                conflicts.push({
                    type: "LEAVE_CONFLICT",
                    date: dateStr,
                    leaveType: approvedOnDate.leaveType,
                    reason: approvedOnDate.reason,
                    message: `${empName} has an approved leave from ${lStart} to ${lEnd} (${approvedOnDate.leaveType}) and cannot be assigned on ${dateStr}.`,
                });
                continue;
            }

            // Check candidate shifts on date d
            for (const s of resolvedShifts) {
                const candidateInterval = getShiftIntervalUtc(dateStr, s.startTime, s.endTime, tz);

                // Exact duplicate check
                const dupAss = existingAssignments.find((a) => {
                    const aDateStr = toCalendarDateStr(a.date);
                    if (aDateStr !== dateStr) return false;
                    if (s.columnId && a.columnId && String(s.columnId) === String(a.columnId)) return true;
                    if (a.shiftTitle?.toLowerCase() === s.shiftTitle?.toLowerCase()) return true;
                    return false;
                });
                if (dupAss) {
                    conflicts.push({
                        type: "DUPLICATE_ASSIGNMENT",
                        date: dateStr,
                        shiftTitle: s.shiftTitle,
                        columnId: s.columnId,
                        message: `${empName} is already assigned to the "${s.shiftTitle}" shift on this date.`,
                    });
                    continue;
                }

                // Interval overlap check against existing assignments on adjacent dates
                for (const a of existingAssignments) {
                    const aDateStr = toCalendarDateStr(a.date);
                    const assInterval = getShiftIntervalUtc(aDateStr, a.startTime, a.endTime, tz);
                    if (candidateInterval && assInterval && areShiftsOverlapping(candidateInterval, assInterval)) {
                        conflicts.push({
                            type: "SHIFT_OVERLAP",
                            date: dateStr,
                            shiftTitle: s.shiftTitle,
                            conflictingShiftTitle: a.shiftTitle,
                            conflictingTimes: `${a.startTime} - ${a.endTime}`,
                            conflictingDate: aDateStr,
                            message: `${empName} has an overlapping shift "${a.shiftTitle}" (${a.startTime} - ${a.endTime}) on ${aDateStr}.`,
                        });
                        break;
                    }
                }
            }
        }

        // ALL-OR-NOTHING: If any conflict exists, abort immediately and save ZERO assignments
        if (conflicts.length > 0) {
            const firstConflict = conflicts[0];
            const err = new Error(firstConflict.message);
            err.code = firstConflict.type;
            err.details = {
                employeeId: employee._id,
                employeeName: empName,
                conflicts,
                summary: {
                    totalRequested: datesList.length * resolvedShifts.length,
                    totalConflicts: conflicts.length,
                    affectedDates: Array.from(new Set(conflicts.map((c) => c.date))),
                },
            };
            err.existingAssignment = {
                employeeName: empName,
                conflicts: conflicts.map((c) => ({
                    date: c.date,
                    existingShift: c.conflictingShiftTitle || c.shiftTitle,
                    reason: c.message,
                })),
            };
            throw err;
        }

        // Insert all candidate assignments atomically
        const docsToInsert = [];
        for (const d of datesList) {
            for (const s of resolvedShifts) {
                docsToInsert.push({
                    rosterId: roster._id,
                    hospitalId,
                    employeeId: employee._id,
                    date: d,
                    columnId: s.columnId || null,
                    shiftTitle: String(s.shiftTitle).trim(),
                    startTime: String(s.startTime).trim(),
                    endTime: String(s.endTime).trim(),
                    dutyArea: String(s.dutyArea || defaultDutyArea).trim(),
                    notes: notes ? String(notes).trim() : null,
                    isOverride: false,
                    createdBy: userId,
                });
            }
        }

        let createdAssignments = [];
        if (docsToInsert.length > 0) {
            try {
                createdAssignments = await RosterAssignment.insertMany(docsToInsert, { ordered: true });
            } catch (insertErr) {
                if (insertErr.insertedDocs && insertErr.insertedDocs.length) {
                    await RosterAssignment.deleteMany({ _id: { $in: insertErr.insertedDocs.map((x) => x._id) } });
                }
                if (insertErr.code === 11000) {
                    const err = new Error("This employee is already assigned to this shift on one of the requested dates.");
                    err.code = "DUPLICATE_ASSIGNMENT";
                    throw err;
                }
                throw insertErr;
            }
        }

        roster.updatedBy = userId;
        await roster.save();

        const populatedCreatedAssignments = createdAssignments.length > 0
            ? await RosterAssignment.find({ _id: { $in: createdAssignments.map((a) => a._id) } })
                .populate({
                    path: "employeeId",
                    select: "employeeId firstName lastName email phone gender avatarUrl positionId employmentStatus",
                    populate: { path: "positionId", select: "name" },
                })
                .lean()
            : [];

        return {
            createdCount: createdAssignments.length,
            createdAssignments: populatedCreatedAssignments,
            conflicts: [],
            leaveWarnings: [],
            approvedLeaveConflicts: [],
        };
    }

    // ─── LEGACY SINGLE-SHIFT BACKWARD COMPATIBILITY PATH ─────────────────────
    const existingMap = new Map();
    existingAssignments.forEach((ass) => {
        const dateKey = ass.date.toISOString().split("T")[0];
        existingMap.set(dateKey, ass);
    });

    const conflicts = [];
    const leaveWarnings = [];
    const approvedLeaveConflicts = [];
    const createdAssignments = [];

    if (!overwriteConflicts && existingAssignments.length === datesList.length && datesList.length > 0) {
        const err = new Error(`${empName} already has assignments for all dates in this range.`);
        err.code = "DUPLICATE_ASSIGNMENT";
        err.existingAssignment = {
            employeeName: empName,
            conflicts: existingAssignments.map((a) => ({
                date: a.date.toISOString().split("T")[0],
                existingShift: a.shiftTitle,
                existingDutyArea: a.dutyArea,
            })),
        };
        throw err;
    }

    const { isEmployeeEmployedOnDate } = require("../utils/employment.utils");
    for (const d of datesList) {
        const dateKey = d.toISOString().split("T")[0];

        if (!isEmployeeEmployedOnDate(employee, d, tz)) {
            approvedLeaveConflicts.push({
                date: dateKey,
                leaveType: "EMPLOYMENT_ENDED",
                reason: "EMPLOYMENT_ENDED",
                message: `Employee is no longer employed on ${dateKey}.`,
            });
            continue;
        }

        const approvedOnDate = approvedLeaves.find((l) =>
            isLeaveConflictOnDate(d, l.startDate, l.endDate)
        );
        if (approvedOnDate) {
            approvedLeaveConflicts.push({
                date: dateKey,
                leaveType: approvedOnDate.leaveType,
                reason: approvedOnDate.reason,
                message: `Employee has APPROVED leave on ${dateKey} (${approvedOnDate.leaveType}) and cannot be assigned.`,
            });
            continue;
        }

        const pendingOnDate = pendingLeaves.find((l) =>
            isLeaveConflictOnDate(d, l.startDate, l.endDate)
        );
        if (pendingOnDate) {
            leaveWarnings.push({
                date: dateKey,
                status: pendingOnDate.status,
                leaveType: pendingOnDate.leaveType,
                reason: pendingOnDate.reason,
                message: `Employee has ${pendingOnDate.status} leave on ${dateKey} (${pendingOnDate.leaveType}).`,
            });
        }

        const existing = existingMap.get(dateKey);

        if (existing) {
            if (!overwriteConflicts) {
                conflicts.push({
                    date: dateKey,
                    existingShift: existing.shiftTitle,
                    existingDutyArea: existing.dutyArea,
                    isOverride: !!existing.isOverride,
                    message: `Existing assignment on ${dateKey} kept (${existing.shiftTitle} - ${existing.dutyArea}).`,
                });
                continue;
            } else {
                await RosterAssignment.deleteOne({ _id: existing._id });
            }
        }

        const s = resolvedShifts[0];
        const newAss = await RosterAssignment.create({
            rosterId: roster._id,
            hospitalId,
            employeeId: employee._id,
            date: d,
            columnId: s.columnId || null,
            shiftTitle: String(s.shiftTitle).trim(),
            startTime: String(s.startTime).trim(),
            endTime: String(s.endTime).trim(),
            dutyArea: String(s.dutyArea).trim(),
            notes: notes ? String(notes).trim() : null,
            isOverride: false,
            createdBy: userId,
        });

        createdAssignments.push(newAss);
    }

    if (createdAssignments.length === 0 && approvedLeaveConflicts.length > 0) {
        const hasEmploymentEnded = approvedLeaveConflicts.some((c) => c.reason === "EMPLOYMENT_ENDED");
        if (hasEmploymentEnded) {
            const blockedDatesStr = approvedLeaveConflicts.map((c) => c.date).join(", ");
            const err = new Error(`${empName} is no longer employed on the selected duty dates (${blockedDatesStr}).`);
            err.code = "EMPLOYMENT_ENDED";
            err.details = {
                employeeId: employee._id,
                employeeName: empName,
                approvedLeaveConflicts,
            };
            throw err;
        }
    }

    roster.updatedBy = userId;
    await roster.save();

    const populatedCreatedAssignments = createdAssignments.length > 0
        ? await RosterAssignment.find({ _id: { $in: createdAssignments.map((a) => a._id) } })
            .populate({
                path: "employeeId",
                select: "employeeId firstName lastName email phone gender avatarUrl positionId employmentStatus",
                populate: { path: "positionId", select: "name" },
            })
            .lean()
        : [];

    return {
        createdCount: createdAssignments.length,
        createdAssignments: populatedCreatedAssignments,
        conflicts,
        leaveWarnings,
        approvedLeaveConflicts,
    };
};

const updateAssignment = async ({
    assignmentId,
    hospitalId,
    userId,
    columnId,
    shiftTitle,
    startTime,
    endTime,
    dutyArea,
    notes,
    date,
    employeeId,
}) => {
    if (!isValidObjectId(assignmentId)) {
        const err = new Error("Invalid assignment ID.");
        err.code = "VALIDATION_ERROR";
        throw err;
    }

    const assignment = await RosterAssignment.findOne({ _id: assignmentId, hospitalId });
    if (!assignment) {
        const err = new Error("Roster assignment not found.");
        err.code = "NOT_FOUND";
        throw err;
    }

    if (await isHistoricalRoster(assignment.rosterId, hospitalId)) {
        const err = new Error("Historical rosters are read-only and cannot be modified.");
        err.code = "BUSINESS_CONFLICT";
        throw err;
    }

    const targetDate = date ? new Date(date) : assignment.date;
    const targetEmployeeId = employeeId || assignment.employeeId;

    const targetEmp = await Employee.findOne({ _id: targetEmployeeId, hospitalId }).populate("positionId");
    if (!targetEmp) {
        const err = new Error("Employee not found in this hospital.");
        err.code = "NOT_FOUND";
        throw err;
    }

    if (targetEmp.employmentStatus === "INACTIVE") {
        const err = new Error("Cannot assign inactive employees to roster.");
        err.code = "VALIDATION_ERROR";
        throw err;
    }

    const { isEmployeeEmployedOnDate } = require("../utils/employment.utils");
    const Hospital = require("../models/hospital.model");
    const hospitalObj = await Hospital.findById(hospitalId).select("timezone").lean();
    const tz = hospitalObj?.timezone || "Asia/Kolkata";

    if (!isEmployeeEmployedOnDate(targetEmp, targetDate, tz)) {
        const err = new Error("Employee is no longer employed on the selected duty date.");
        err.code = "EMPLOYMENT_ENDED";
        throw err;
    }

    const roster = await Roster.findOne({ _id: assignment.rosterId, hospitalId });
    if (!roster) {
        const err = new Error("Roster not found.");
        err.code = "NOT_FOUND";
        throw err;
    }

    const rosterStart = new Date(roster.startDate);
    const rosterEnd = new Date(roster.endDate);
    rosterStart.setHours(0, 0, 0, 0);
    rosterEnd.setHours(23, 59, 59, 999);

    if (targetDate < rosterStart || targetDate > rosterEnd) {
        const err = new Error("Assignment date must fall within the roster start and end date period.");
        err.code = "VALIDATION_ERROR";
        throw err;
    }

    const finalShiftTitle = shiftTitle !== undefined ? String(shiftTitle).trim() : assignment.shiftTitle;
    const finalColumnId = columnId !== undefined ? columnId : assignment.columnId;
    if (Array.isArray(roster.columns) && roster.columns.length > 0) {
        const matchingShift = roster.columns.find(
            (c) => c.title?.toLowerCase() === finalShiftTitle?.toLowerCase() || c.id === finalColumnId
        );
        if (!matchingShift) {
            const err = new Error("Selected shift does not belong to this roster.");
            err.code = "VALIDATION_ERROR";
            throw err;
        }
    }

    const finalDutyArea = dutyArea !== undefined ? String(dutyArea).trim() : assignment.dutyArea;
    if (Array.isArray(roster.dutyAreas) && roster.dutyAreas.length > 0) {
        const matchingDutyArea = roster.dutyAreas.find(
            (da) => da.name?.toLowerCase() === finalDutyArea?.toLowerCase() || da.id === finalDutyArea
        );
        if (!matchingDutyArea) {
            const err = new Error("Selected duty area does not belong to this roster.");
            err.code = "VALIDATION_ERROR";
            throw err;
        }
    }

    const { start: dateStart, end: dateEnd } = getCalendarBounds(targetDate);

    // APPROVED Leave Check for updateAssignment
    const approvedLeavesUpdate = await Leave.find({
        hospitalId,
        employeeId: targetEmp._id,
        status: { $in: ["APPROVED", "approved"] },
    }).lean();

    const approvedLeaveUpdate = approvedLeavesUpdate.find((l) =>
        isLeaveConflictOnDate(targetDate, l.startDate, l.endDate)
    );

    if (approvedLeaveUpdate) {
        const empName = `${targetEmp.firstName || ""} ${targetEmp.lastName || ""}`.trim() || "Employee";
        const fromFmt = approvedLeaveUpdate.startDate.toISOString().split("T")[0];
        const toFmt = approvedLeaveUpdate.endDate.toISOString().split("T")[0];
        const dateFmt = targetDate.toISOString().split("T")[0];
        const err = new Error(
            `${empName} has an approved leave from ${fromFmt} to ${toFmt} (${approvedLeaveUpdate.leaveType}) and cannot be assigned on ${dateFmt}.`
        );
        err.code = "LEAVE_CONFLICT";
        err.details = {
            employeeId: targetEmp._id,
            employeeName: empName,
            leaveId: approvedLeaveUpdate._id,
            leaveType: approvedLeaveUpdate.leaveType,
            startDate: approvedLeaveUpdate.startDate,
            endDate: approvedLeaveUpdate.endDate,
            blockedDate: targetDate,
        };
        throw err;
    }

    // Check attendance protection
    const attExists = await Attendance.findOne({ hospitalId, rosterAssignmentId: assignment._id }).lean();
    if (attExists) {
        const isChangingCore = (employeeId && String(employeeId) !== String(assignment.employeeId)) ||
            (date && new Date(date).getTime() !== new Date(assignment.date).getTime()) ||
            (startTime && String(startTime).trim() !== assignment.startTime) ||
            (endTime && String(endTime).trim() !== assignment.endTime) ||
            (columnId && String(columnId).trim() !== assignment.columnId);
        if (isChangingCore) {
            const err = new Error("Cannot update shift timing, employee, or date because attendance records already exist for this assignment.");
            err.code = "BUSINESS_CONFLICT";
            throw err;
        }
    }

    const newStartTime = startTime !== undefined ? String(startTime).trim() : assignment.startTime;
    const newEndTime = endTime !== undefined ? String(endTime).trim() : assignment.endTime;
    const newShiftTitle = shiftTitle !== undefined ? String(shiftTitle).trim() : assignment.shiftTitle;
    let newColumnId = columnId !== undefined ? String(columnId).trim() : assignment.columnId;
    if (!newColumnId && Array.isArray(roster.columns)) {
        const matchingShift = roster.columns.find(
            (c) => c.title?.toLowerCase() === newShiftTitle?.toLowerCase() || c.id === newColumnId
        );
        if (matchingShift) newColumnId = matchingShift.id;
    }
    if (!newColumnId && newShiftTitle) {
        newColumnId = newShiftTitle.toLowerCase().trim().replace(/\s+/g, "_");
    }

    const targetDateStr = toCalendarDateStr(targetDate);
    const candidateInterval = getShiftIntervalUtc(targetDateStr, newStartTime, newEndTime, tz);

    const dayMinus1 = new Date(targetDate.getTime() - 24 * 3600 * 1000);
    const dayPlus1 = new Date(targetDate.getTime() + 24 * 3600 * 1000);
    const { start: windowStart } = getCalendarBounds(dayMinus1);
    const { end: windowEnd } = getCalendarBounds(dayPlus1);

    const neighbouringAssignments = await RosterAssignment.find({
        _id: { $ne: assignment._id },
        hospitalId,
        employeeId: targetEmployeeId,
        date: { $gte: windowStart, $lte: windowEnd },
    })
        .populate({
            path: "employeeId",
            select: "firstName lastName name",
        })
        .lean();

    for (const ass of neighbouringAssignments) {
        const assDateStr = toCalendarDateStr(ass.date);
        const empName = ass.employeeId
            ? `${ass.employeeId.firstName || ""} ${ass.employeeId.lastName || ""}`.trim() || ass.employeeId.name || "This employee"
            : `${targetEmp.firstName || ""} ${targetEmp.lastName || ""}`.trim() || "This employee";

        // Check exact duplicate shift on same date
        if (assDateStr === targetDateStr) {
            const isSameCol = ass.columnId && newColumnId && String(ass.columnId) === String(newColumnId);
            const isSameTitle = ass.shiftTitle?.toLowerCase() === newShiftTitle?.toLowerCase();
            if (isSameCol || isSameTitle) {
                const err = new Error(`${empName} is already assigned to the "${ass.shiftTitle}" shift on this date.`);
                err.code = "DUPLICATE_ASSIGNMENT";
                err.existingAssignment = {
                    employeeName: empName,
                    date: ass.date,
                    existingShift: ass.shiftTitle,
                    existingDutyArea: ass.dutyArea,
                };
                throw err;
            }
        }

        // Check time overlap across neighbouring dates
        const assInterval = getShiftIntervalUtc(assDateStr, ass.startTime, ass.endTime, tz);
        if (candidateInterval && assInterval && areShiftsOverlapping(candidateInterval, assInterval)) {
            const err = new Error(`${empName} has an overlapping shift "${ass.shiftTitle}" (${ass.startTime} - ${ass.endTime}) on ${assDateStr}.`);
            err.code = "DUPLICATE_ASSIGNMENT";
            err.existingAssignment = {
                employeeName: empName,
                date: ass.date,
                existingShift: ass.shiftTitle,
                existingDutyArea: ass.dutyArea,
                conflictingTime: `${ass.startTime} - ${ass.endTime}`,
            };
            throw err;
        }
    }

    if (columnId !== undefined) assignment.columnId = columnId;
    if (shiftTitle !== undefined) assignment.shiftTitle = String(shiftTitle).trim();
    if (startTime !== undefined) assignment.startTime = String(startTime).trim();
    if (endTime !== undefined) assignment.endTime = String(endTime).trim();
    if (dutyArea !== undefined) assignment.dutyArea = String(dutyArea).trim();
    if (notes !== undefined) assignment.notes = notes ? String(notes).trim() : null;
    assignment.isOverride = true;

    await assignment.save();

    // Mark roster updated
    await Roster.updateOne({ _id: assignment.rosterId }, { updatedBy: userId });

    return RosterAssignment.findById(assignment._id)
        .populate({
            path: "employeeId",
            select: "employeeId firstName lastName email phone gender avatarUrl positionId employmentStatus",
            populate: { path: "positionId", select: "name" },
        })
        .lean();
};

const deleteAssignment = async ({ assignmentId, hospitalId, userId, scope = "THIS_DATE" }) => {
    if (!isValidObjectId(assignmentId)) {
        const err = new Error("Invalid assignment ID.");
        err.code = "VALIDATION_ERROR";
        throw err;
    }

    const validScopes = ["THIS_DATE", "FROM_DATE_TO_ROSTER_END", "ALL_APPLICABLE_DATES"];
    const normalizedScope = (scope || "THIS_DATE").toUpperCase();
    if (!validScopes.includes(normalizedScope)) {
        const err = new Error("Invalid removal scope. Allowed values: THIS_DATE, FROM_DATE_TO_ROSTER_END");
        err.code = "VALIDATION_ERROR";
        throw err;
    }

    const assignment = await RosterAssignment.findOne({ _id: assignmentId, hospitalId });
    if (!assignment) {
        const err = new Error("Roster assignment not found.");
        err.code = "NOT_FOUND";
        throw err;
    }

    const roster = await Roster.findOne({ _id: assignment.rosterId, hospitalId });
    if (!roster) {
        const err = new Error("Roster not found.");
        err.code = "NOT_FOUND";
        throw err;
    }

    if (await isHistoricalRoster(assignment.rosterId, hospitalId)) {
        const err = new Error("Historical rosters are read-only and cannot be modified.");
        err.code = "BUSINESS_CONFLICT";
        throw err;
    }

    // Attendance protection check
    const attExists = await Attendance.findOne({ hospitalId, rosterAssignmentId: assignment._id }).lean();
    if (attExists) {
        const err = new Error("Cannot delete assignment because attendance records already exist for this shift.");
        err.code = "BUSINESS_CONFLICT";
        throw err;
    }

    if (normalizedScope === "FROM_DATE_TO_ROSTER_END" || normalizedScope === "ALL_APPLICABLE_DATES") {
        const deleteQuery = {
            rosterId: assignment.rosterId,
            hospitalId,
            employeeId: assignment.employeeId,
            shiftTitle: assignment.shiftTitle,
            dutyArea: assignment.dutyArea,
        };

        const rosterEndUtc = new Date(roster.endDate);
        rosterEndUtc.setUTCHours(23, 59, 59, 999);
        const rosterEndLocal = new Date(roster.endDate);
        rosterEndLocal.setHours(23, 59, 59, 999);
        const maxEndBound = new Date(Math.max(rosterEndUtc.getTime(), rosterEndLocal.getTime()));

        if (normalizedScope === "ALL_APPLICABLE_DATES") {
            const rosterStartUtc = new Date(roster.startDate);
            rosterStartUtc.setUTCHours(0, 0, 0, 0);
            const rosterStartLocal = new Date(roster.startDate);
            rosterStartLocal.setHours(0, 0, 0, 0);
            const minStartBound = new Date(Math.min(rosterStartUtc.getTime(), rosterStartLocal.getTime()));

            deleteQuery.date = { $gte: minStartBound, $lte: maxEndBound };
        } else {
            // FROM_DATE_TO_ROSTER_END
            const assStartUtc = new Date(assignment.date);
            assStartUtc.setUTCHours(0, 0, 0, 0);
            const assStartLocal = new Date(assignment.date);
            assStartLocal.setHours(0, 0, 0, 0);
            const minStartBound = new Date(Math.min(assStartUtc.getTime(), assStartLocal.getTime()));

            deleteQuery.date = { $gte: minStartBound, $lte: maxEndBound };
        }

        await RosterAssignment.deleteMany(deleteQuery);
    } else {
        await RosterAssignment.deleteOne({ _id: assignment._id, hospitalId });
    }

    if (userId) {
        await Roster.updateOne({ _id: assignment.rosterId }, { updatedBy: userId });
    }

    return { success: true };
};

// ─── MY ROSTER (Employee View) ───────────────────────────────────────────────

const getMyRoster = async ({ userId, hospitalId, employeeId: paramEmployeeId, tab = "current" }) => {
    let employee = null;
    if (paramEmployeeId && isValidObjectId(paramEmployeeId)) {
        employee = await Employee.findOne({ _id: paramEmployeeId, hospitalId }).lean();
    }
    if (!employee && paramEmployeeId && typeof paramEmployeeId === "object") {
        const empId = paramEmployeeId._id || paramEmployeeId.id;
        if (empId && isValidObjectId(empId)) {
            employee = await Employee.findOne({ _id: empId, hospitalId }).lean();
        }
    }
    if (!employee && userId) {
        employee = await Employee.findOne({ userId, hospitalId }).lean();
    }

    if (!employee) {
        return [];
    }

    const publishedRosters = await Roster.find({ hospitalId, status: "PUBLISHED" })
        .select("_id title startDate endDate")
        .lean();

    const publishedRosterIds = publishedRosters.map((r) => r._id);
    if (publishedRosterIds.length === 0) {
        return [];
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const query = {
        hospitalId,
        employeeId: employee._id,
        rosterId: { $in: publishedRosterIds },
    };

    if (String(tab).toLowerCase() === "history") {
        query.date = { $lt: todayStart };
    } else if (String(tab).toLowerCase() === "all") {
        // No date filter
    } else {
        // Default "current" / upcoming
        query.date = { $gte: todayStart };
    }

    const sortOrder = String(tab).toLowerCase() === "history" ? { date: -1, startTime: 1 } : { date: 1, startTime: 1 };

    const assignments = await RosterAssignment.find(query)
        .populate("rosterId", "title startDate endDate status")
        .sort(sortOrder)
        .lean();

    return assignments.map((a) => ({
        id: a._id,
        _id: a._id,
        rosterId: a.rosterId?._id || a.rosterId,
        rosterTitle: a.rosterId?.title || "Published Roster",
        date: a.date,
        shiftTitle: a.shiftTitle,
        startTime: a.startTime,
        endTime: a.endTime,
        dutyArea: a.dutyArea,
        notes: a.notes,
        isOverride: !!a.isOverride,
        employeeName: `${employee.firstName} ${employee.lastName}`.trim(),
    }));
};

const checkLeaveConflicts = async ({ hospitalId, employeeId, startDate, endDate }) => {
    if (!isValidObjectId(employeeId)) {
        const err = new Error("Invalid employee ID.");
        err.code = "VALIDATION_ERROR";
        throw err;
    }

    const employee = await Employee.findOne({ _id: employeeId, hospitalId }).lean();
    if (!employee) {
        const err = new Error("Employee not found.");
        err.code = "NOT_FOUND";
        throw err;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        const err = new Error("Invalid start or end date.");
        err.code = "VALIDATION_ERROR";
        throw err;
    }

    if (start > end) {
        const err = new Error("Start date must be less than or equal to end date.");
        err.code = "VALIDATION_ERROR";
        throw err;
    }

    const datesList = [];
    const curr = new Date(start);
    while (curr <= end) {
        datesList.push(new Date(curr));
        curr.setDate(curr.getDate() + 1);
    }

    const approvedLeaves = await Leave.find({
        hospitalId,
        employeeId: employee._id,
        status: { $in: ["APPROVED", "approved"] },
    }).lean();

    const conflictingDates = [];
    const { isEmployeeEmployedOnDate } = require("../utils/employment.utils");
    const Hospital = require("../models/hospital.model");
    const hospitalObj = await Hospital.findById(hospitalId).select("timezone").lean();
    const tz = hospitalObj?.timezone || "Asia/Kolkata";

    for (const d of datesList) {
        const dateKey = toCalendarDateStr(d);

        if (!isEmployeeEmployedOnDate(employee, d, tz)) {
            conflictingDates.push({
                date: dateKey,
                leaveType: "EMPLOYMENT_ENDED",
                reason: "EMPLOYMENT_ENDED",
                message: `Employee is no longer employed on ${dateKey}.`,
            });
            continue;
        }

        const approvedOnDate = approvedLeaves.find((l) =>
            isLeaveConflictOnDate(d, l.startDate, l.endDate)
        );

        if (approvedOnDate) {
            conflictingDates.push({
                date: dateKey,
                leaveType: approvedOnDate.leaveType,
                reason: approvedOnDate.reason || "Approved Leave",
                message: `Employee has APPROVED leave on ${dateKey} (${approvedOnDate.leaveType}).`,
            });
        }
    }

    return {
        hasConflict: conflictingDates.length > 0,
        count: conflictingDates.length,
        totalRequestedDates: datesList.length,
        allDatesBlocked: conflictingDates.length === datesList.length && datesList.length > 0,
        conflictingDates,
    };
};

module.exports = {
    // Rosters
    listRosters,
    getRosterById,
    getRosterHistory,
    createRoster,
    updateRosterDraft,
    deleteRosterDraft,
    publishRoster,
    isHistoricalRoster,
    // Review Sharing & Feedback
    shareRosterForReview,
    addReviewComment,
    resolveReviewComment,
    // Assignments
    addAssignment,
    addBulkRangeAssignments,
    updateAssignment,
    deleteAssignment,
    checkLeaveConflicts,
    // My Roster
    getMyRoster,
};


