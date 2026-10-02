const mongoose = require("mongoose");
const Roster = require("../models/roster.model");
const RosterAssignment = require("../models/rosterAssignment.model");
const RosterTemplate = require("../models/rosterTemplate.model");
const Employee = require("../models/employee.model");
const Leave = require("../models/leave.model");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

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
            select: "employeeId firstName lastName email phone positionId employmentStatus",
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

    if (Array.isArray(roster.columns) && roster.columns.length > 0) {
        const matchingShift = roster.columns.find(
            (c) => c.title?.toLowerCase() === shiftTitle?.toLowerCase() || c.id === columnId
        );
        if (!matchingShift) {
            const err = new Error("Selected shift does not belong to this roster.");
            err.code = "VALIDATION_ERROR";
            throw err;
        }
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

    // Check if employee already has an assignment for the same roster date
    const existingAssignment = await RosterAssignment.findOne({
        hospitalId,
        employeeId: employee._id,
        date: { $gte: dateStart, $lte: dateEnd },
    })
        .populate({
            path: "employeeId",
            select: "firstName lastName name",
        })
        .lean();

    if (existingAssignment) {
        const empName = existingAssignment.employeeId
            ? `${existingAssignment.employeeId.firstName || ""} ${existingAssignment.employeeId.lastName || ""}`.trim() || existingAssignment.employeeId.name || "This employee"
            : `${employee.firstName || ""} ${employee.lastName || ""}`.trim() || "This employee";
        const err = new Error(`${empName} is already assigned on this date.`);
        err.code = "DUPLICATE_ASSIGNMENT";
        err.existingAssignment = {
            employeeName: empName,
            date: existingAssignment.date,
            existingShift: existingAssignment.shiftTitle,
            existingDutyArea: existingAssignment.dutyArea,
        };
        throw err;
    }

    // 1. APPROVED Leave Check -> BLOCKS assignment completely
    const approvedLeave = await Leave.findOne({
        hospitalId,
        employeeId: employee._id,
        status: { $in: ["APPROVED", "approved"] },
        startDate: { $lte: dateEnd },
        endDate: { $gte: dateStart },
    }).lean();

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
        columnId: columnId || null,
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
            select: "employeeId firstName lastName email phone positionId employmentStatus",
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
    columnId,
    shiftTitle,
    startTime,
    endTime,
    dutyArea,
    notes,
    overwriteConflicts = false,
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

    if (!startDate || !endDate || !shiftTitle || !startTime || !endTime || !dutyArea) {
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

    const { start: rosterStartBounds } = getCalendarBounds(roster.startDate);
    const { end: rosterEndBounds } = getCalendarBounds(roster.endDate);

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

    if (Array.isArray(roster.columns) && roster.columns.length > 0) {
        const matchingShift = roster.columns.find(
            (c) => c.title?.toLowerCase() === shiftTitle?.toLowerCase() || c.id === columnId
        );
        if (!matchingShift) {
            const err = new Error("Selected shift does not belong to this roster.");
            err.code = "VALIDATION_ERROR";
            throw err;
        }
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

    const datesList = [];
    const parseNoonDate = (dInput) => {
        const dObj = new Date(dInput);
        return new Date(dObj.getFullYear(), dObj.getMonth(), dObj.getDate(), 12, 0, 0, 0);
    };

    let curr = parseNoonDate(startDate);
    const lastDate = parseNoonDate(endDate);

    while (curr <= lastDate) {
        datesList.push(new Date(curr));
        curr.setDate(curr.getDate() + 1);
    }

    const existingAssignments = await RosterAssignment.find({
        hospitalId,
        employeeId: employee._id,
        date: { $gte: rangeStartBounds, $lte: rangeEndBounds },
    }).lean();

    const existingMap = new Map();
    existingAssignments.forEach((ass) => {
        const dateKey = ass.date.toISOString().split("T")[0];
        existingMap.set(dateKey, ass);
    });

    const approvedLeaves = await Leave.find({
        hospitalId,
        employeeId: employee._id,
        status: { $in: ["APPROVED", "approved"] },
        startDate: { $lte: rangeEndBounds },
        endDate: { $gte: rangeStartBounds },
    }).lean();

    const pendingLeaves = await Leave.find({
        hospitalId,
        employeeId: employee._id,
        status: { $in: ["PENDING", "pending"] },
        startDate: { $lte: rangeEndBounds },
        endDate: { $gte: rangeStartBounds },
    }).lean();

    const conflicts = [];
    const leaveWarnings = [];
    const approvedLeaveConflicts = [];
    const createdAssignments = [];

    if (!overwriteConflicts && existingAssignments.length === datesList.length && datesList.length > 0) {
        const empName = `${employee.firstName || ""} ${employee.lastName || ""}`.trim() || "Employee";
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

    for (const d of datesList) {
        const dateKey = d.toISOString().split("T")[0];
        const { start: dateStart, end: dateEnd } = getCalendarBounds(d);

        // 1. APPROVED Leave Check -> BLOCKS assignment for date d
        const approvedOnDate = approvedLeaves.find(
            (l) => new Date(l.startDate) <= dateEnd && new Date(l.endDate) >= dateStart
        );
        if (approvedOnDate) {
            approvedLeaveConflicts.push({
                date: dateKey,
                leaveType: approvedOnDate.leaveType,
                reason: approvedOnDate.reason,
                message: `Employee has APPROVED leave on ${dateKey} (${approvedOnDate.leaveType}) and cannot be assigned.`,
            });
            continue; // DO NOT create RosterAssignment document for date d
        }

        // 2. PENDING Leave Check -> Non-blocking warning
        const pendingOnDate = pendingLeaves.find(
            (l) => new Date(l.startDate) <= dateEnd && new Date(l.endDate) >= dateStart
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

        const newAss = await RosterAssignment.create({
            rosterId: roster._id,
            hospitalId,
            employeeId: employee._id,
            date: d,
            columnId: columnId || null,
            shiftTitle: String(shiftTitle).trim(),
            startTime: String(startTime).trim(),
            endTime: String(endTime).trim(),
            dutyArea: String(dutyArea).trim(),
            notes: notes ? String(notes).trim() : null,
            isOverride: false,
            createdBy: userId,
        });

        createdAssignments.push(newAss);
    }

    // If ALL requested dates were blocked due to approved leave, throw LEAVE_CONFLICT (409)
    if (createdAssignments.length === 0 && approvedLeaveConflicts.length > 0) {
        const empName = `${employee.firstName || ""} ${employee.lastName || ""}`.trim() || "Employee";
        const blockedDatesStr = approvedLeaveConflicts.map((c) => c.date).join(", ");
        const err = new Error(
            `${empName} has an approved leave covering dates (${blockedDatesStr}) and cannot be assigned to roster.`
        );
        err.code = "LEAVE_CONFLICT";
        err.details = {
            employeeId: employee._id,
            employeeName: empName,
            approvedLeaveConflicts,
        };
        throw err;
    }

    roster.updatedBy = userId;
    await roster.save();

    return {
        createdCount: createdAssignments.length,
        createdAssignments,
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
    const approvedLeaveUpdate = await Leave.findOne({
        hospitalId,
        employeeId: targetEmp._id,
        status: { $in: ["APPROVED", "approved"] },
        startDate: { $lte: dateEnd },
        endDate: { $gte: dateStart },
    }).lean();

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

    const existingAssignment = await RosterAssignment.findOne({
        _id: { $ne: assignment._id },
        hospitalId,
        employeeId: targetEmployeeId,
        date: { $gte: dateStart, $lte: dateEnd },
    })
        .populate({
            path: "employeeId",
            select: "firstName lastName name",
        })
        .lean();

    if (existingAssignment) {
        const empName = existingAssignment.employeeId
            ? `${existingAssignment.employeeId.firstName || ""} ${existingAssignment.employeeId.lastName || ""}`.trim() || existingAssignment.employeeId.name || "This employee"
            : "This employee";
        const err = new Error(`${empName} is already assigned on this date.`);
        err.code = "DUPLICATE_ASSIGNMENT";
        err.existingAssignment = {
            employeeName: empName,
            date: existingAssignment.date,
            existingShift: existingAssignment.shiftTitle,
            existingDutyArea: existingAssignment.dutyArea,
        };
        throw err;
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
            select: "employeeId firstName lastName email phone positionId employmentStatus",
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

    if (normalizedScope === "FROM_DATE_TO_ROSTER_END" || normalizedScope === "ALL_APPLICABLE_DATES") {
        const deleteQuery = {
            rosterId: assignment.rosterId,
            hospitalId,
            employeeId: assignment.employeeId,
            shiftTitle: assignment.shiftTitle,
            dutyArea: assignment.dutyArea,
            date: { $gte: assignment.date },
        };
        if (roster.endDate) {
            deleteQuery.date.$lte = new Date(roster.endDate);
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

module.exports = {
    // Rosters
    listRosters,
    getRosterById,
    getRosterHistory,
    createRoster,
    updateRosterDraft,
    deleteRosterDraft,
    publishRoster,
    // Review Sharing & Feedback
    shareRosterForReview,
    addReviewComment,
    resolveReviewComment,
    // Assignments
    addAssignment,
    addBulkRangeAssignments,
    updateAssignment,
    deleteAssignment,
    // My Roster
    getMyRoster,
};


