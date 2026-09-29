const mongoose = require("mongoose");
const Roster = require("../models/roster.model");
const RosterAssignment = require("../models/rosterAssignment.model");
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

    const latestPublished = await Roster.findOne({ hospitalId, status: "PUBLISHED" })
        .sort({ startDate: -1, publishedAt: -1, createdAt: -1 })
        .lean();

    if (!latestPublished) return false;
    return latestPublished._id.toString() !== roster._id.toString();
};

const getRosterHistory = async ({ hospitalId, userId, isManager }) => {
    const publishedRosters = await Roster.find({ hospitalId, status: "PUBLISHED" })
        .populate("createdBy", "name email")
        .populate("publishedBy", "name email")
        .sort({ startDate: -1, publishedAt: -1, createdAt: -1 })
        .lean();

    if (publishedRosters.length <= 1) {
        return [];
    }

    return publishedRosters.slice(1).map((r) => ({
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

    const latestPublished = await Roster.findOne({ hospitalId, status: "PUBLISHED" })
        .sort({ startDate: -1, publishedAt: -1, createdAt: -1 })
        .lean();

    const isHistorical =
        roster.status === "PUBLISHED" &&
        latestPublished &&
        latestPublished._id.toString() !== roster._id.toString();

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

const createRoster = async ({ hospitalId, userId, title, startDate, endDate, columns = [], dutyAreas = [] }) => {
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

    const roster = await Roster.create({
        hospitalId,
        title: String(title).trim(),
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        status: "DRAFT",
        columns: Array.isArray(columns) ? columns : [],
        dutyAreas: Array.isArray(dutyAreas) ? dutyAreas : [],
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

    if (title !== undefined) roster.title = String(title).trim();
    if (startDate) roster.startDate = new Date(startDate);
    if (endDate) roster.endDate = new Date(endDate);
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

    const employee = await Employee.findOne({ _id: employeeId, hospitalId });
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

    if (!date || !shiftTitle || !startTime || !endTime || !dutyArea) {
        const err = new Error("Date, shift title, times, and duty area are required.");
        err.code = "VALIDATION_ERROR";
        throw err;
    }

    const assignmentDate = new Date(date);
    const { start: dateStart, end: dateEnd } = getCalendarBounds(assignmentDate);

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

    // Check Leave database for conflicts / warnings
    const leaveConflict = await Leave.findOne({
        hospitalId,
        employeeId,
        status: { $in: ["APPROVED", "PENDING", "approved", "pending"] },
        startDate: { $lte: dateEnd },
        endDate: { $gte: dateStart },
    }).lean();

    let leaveWarning = null;
    if (leaveConflict) {
        leaveWarning = {
            hasLeave: true,
            status: leaveConflict.status,
            leaveType: leaveConflict.leaveType,
            reason: leaveConflict.reason,
            message: `Employee has ${leaveConflict.status} leave on this date (${leaveConflict.leaveType}).`,
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

    const { start: dateStart, end: dateEnd } = getCalendarBounds(targetDate);
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

const deleteAssignment = async ({ assignmentId, hospitalId, userId }) => {
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

    await RosterAssignment.deleteOne({ _id: assignment._id });

    if (userId) {
        await Roster.updateOne({ _id: assignment.rosterId }, { updatedBy: userId });
    }

    return { success: true };
};

// ─── MY ROSTER (Employee View) ───────────────────────────────────────────────

const getMyRoster = async ({ userId, hospitalId, employeeId: paramEmployeeId }) => {
    let employee = null;
    if (paramEmployeeId && isValidObjectId(paramEmployeeId)) {
        employee = await Employee.findOne({ _id: paramEmployeeId, hospitalId }).lean();
    } else if (userId) {
        employee = await Employee.findOne({ userId, hospitalId }).lean();
    }

    if (!employee) {
        return [];
    }

    // Find all published rosters for this hospital
    const publishedRosters = await Roster.find({ hospitalId, status: "PUBLISHED" })
        .select("_id title startDate endDate")
        .lean();

    const publishedRosterIds = publishedRosters.map((r) => r._id);
    if (publishedRosterIds.length === 0) {
        return [];
    }

    const assignments = await RosterAssignment.find({
        hospitalId,
        employeeId: employee._id,
        rosterId: { $in: publishedRosterIds },
    })
        .populate("rosterId", "title startDate endDate status")
        .sort({ date: 1, startTime: 1 })
        .lean();

    return assignments.map((a) => ({
        id: a._id,
        rosterId: a.rosterId?._id || a.rosterId,
        rosterTitle: a.rosterId?.title || "Published Roster",
        date: a.date,
        shiftTitle: a.shiftTitle,
        startTime: a.startTime,
        endTime: a.endTime,
        dutyArea: a.dutyArea,
        notes: a.notes,
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
    updateAssignment,
    deleteAssignment,
    // My Roster
    getMyRoster,
};


