const rosterService = require("../services/roster.service");
const Hospital = require("../models/hospital.model");
const { hasPermission } = require("../config/rolePermissions");
const { PERMISSIONS } = require("../config/permissions");

const getHospitalIdFromContext = async (user) => {
    if (user.hospitalId) return user.hospitalId;
    const userId = user.id || user._id;
    let hospital = await Hospital.findOne({ createdBy: userId }).select("_id").lean();
    if (!hospital) {
        hospital = await Hospital.findOne({ adminId: userId }).select("_id").lean();
    }
    return hospital ? hospital._id : null;
};

// ─── ROSTERS ─────────────────────────────────────────────────────────────────

const listRosters = async (req, res) => {
    try {
        const hospitalId = await getHospitalIdFromContext(req.user);
        if (!hospitalId) {
            return res.status(404).json({ success: false, message: "Hospital not found" });
        }

        const { status } = req.query;
        const isManager = hasPermission(req.user, PERMISSIONS.ROSTER_MANAGE);
        const userId = req.user.id || req.user._id;

        const rosters = await rosterService.listRosters({
            hospitalId,
            status,
            userId,
            isManager,
        });

        return res.status(200).json({
            success: true,
            message: "Rosters retrieved successfully",
            data: rosters,
        });
    } catch (error) {
        console.error("List Rosters Error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

const getRosterById = async (req, res) => {
    try {
        const hospitalId = await getHospitalIdFromContext(req.user);
        if (!hospitalId) {
            return res.status(404).json({ success: false, message: "Hospital not found" });
        }

        const isManager = hasPermission(req.user, PERMISSIONS.ROSTER_MANAGE);
        const userId = req.user.id || req.user._id;

        const roster = await rosterService.getRosterById({
            rosterId: req.params.id,
            hospitalId,
            userId,
            isManager,
        });

        if (!roster) {
            return res.status(404).json({ success: false, message: "Roster not found" });
        }

        return res.status(200).json({
            success: true,
            message: "Roster retrieved successfully",
            data: roster,
        });
    } catch (error) {
        if (error.code === "FORBIDDEN") {
            return res.status(403).json({ success: false, message: error.message });
        }
        console.error("Get Roster Error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

const createRoster = async (req, res) => {
    try {
        const hospitalId = await getHospitalIdFromContext(req.user);
        if (!hospitalId) {
            return res.status(404).json({ success: false, message: "Hospital not found" });
        }

        const { title, startDate, endDate, columns, dutyAreas, templateId } = req.body;
        const roster = await rosterService.createRoster({
            hospitalId,
            userId: req.user.id || req.user._id,
            title,
            startDate,
            endDate,
            columns,
            dutyAreas,
            templateId,
        });

        return res.status(201).json({
            success: true,
            message: "Draft roster created successfully",
            data: roster,
        });
    } catch (error) {
        if (error.code === "VALIDATION_ERROR") {
            return res.status(400).json({ success: false, message: error.message });
        }
        if (error.code === "NOT_FOUND") {
            return res.status(404).json({ success: false, message: error.message });
        }
        console.error("Create Roster Error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

const getRosterHistory = async (req, res) => {
    try {
        const hospitalId = await getHospitalIdFromContext(req.user);
        if (!hospitalId) {
            return res.status(404).json({ success: false, message: "Hospital not found" });
        }

        const isManager = hasPermission(req.user, PERMISSIONS.ROSTER_MANAGE);
        const userId = req.user.id || req.user._id;

        const rosters = await rosterService.getRosterHistory({
            hospitalId,
            userId,
            isManager,
        });

        return res.status(200).json({
            success: true,
            message: "Historical rosters retrieved successfully",
            data: rosters,
        });
    } catch (error) {
        console.error("Get Roster History Error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

const updateRosterDraft = async (req, res) => {
    try {
        const hospitalId = await getHospitalIdFromContext(req.user);
        if (!hospitalId) {
            return res.status(404).json({ success: false, message: "Hospital not found" });
        }

        const { title, startDate, endDate, columns, dutyAreas } = req.body;
        const roster = await rosterService.updateRosterDraft({
            rosterId: req.params.id,
            hospitalId,
            userId: req.user.id || req.user._id,
            title,
            startDate,
            endDate,
            columns,
            dutyAreas,
        });

        return res.status(200).json({
            success: true,
            message: "Roster details updated successfully",
            data: roster,
        });
    } catch (error) {
        if (error.code === "VALIDATION_ERROR") {
            return res.status(400).json({ success: false, message: error.message });
        }
        if (error.code === "NOT_FOUND") {
            return res.status(404).json({ success: false, message: error.message });
        }
        if (error.code === "BUSINESS_CONFLICT") {
            return res.status(409).json({ success: false, message: error.message });
        }
        console.error("Update Roster Error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

const deleteRosterDraft = async (req, res) => {
    try {
        const hospitalId = await getHospitalIdFromContext(req.user);
        if (!hospitalId) {
            return res.status(404).json({ success: false, message: "Hospital not found" });
        }

        await rosterService.deleteRosterDraft({
            rosterId: req.params.id,
            hospitalId,
        });

        return res.status(200).json({
            success: true,
            message: "Draft roster deleted successfully",
        });
    } catch (error) {
        if (error.code === "VALIDATION_ERROR") {
            return res.status(400).json({ success: false, message: error.message });
        }
        if (error.code === "NOT_FOUND") {
            return res.status(404).json({ success: false, message: error.message });
        }
        if (error.code === "BUSINESS_CONFLICT") {
            return res.status(409).json({ success: false, message: error.message });
        }
        console.error("Delete Roster Error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

const publishRoster = async (req, res) => {
    try {
        const hospitalId = await getHospitalIdFromContext(req.user);
        if (!hospitalId) {
            return res.status(404).json({ success: false, message: "Hospital not found" });
        }

        const roster = await rosterService.publishRoster({
            rosterId: req.params.id,
            hospitalId,
            userId: req.user.id || req.user._id,
        });

        return res.status(200).json({
            success: true,
            message: "Roster published successfully",
            data: roster,
        });
    } catch (error) {
        if (error.code === "VALIDATION_ERROR") {
            return res.status(400).json({ success: false, message: error.message });
        }
        if (error.code === "NOT_FOUND") {
            return res.status(404).json({ success: false, message: error.message });
        }
        if (error.code === "BUSINESS_CONFLICT") {
            return res.status(409).json({ success: false, message: error.message });
        }
        console.error("Publish Roster Error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

// ─── REVIEW SHARING & FEEDBACK ───────────────────────────────────────────────

const shareRosterForReview = async (req, res) => {
    try {
        const hospitalId = await getHospitalIdFromContext(req.user);
        if (!hospitalId) {
            return res.status(404).json({ success: false, message: "Hospital not found" });
        }

        const userIds = req.body.userIds || req.body.sharedWith || [];
        const roster = await rosterService.shareRosterForReview({
            rosterId: req.params.id,
            hospitalId,
            userIds,
            userId: req.user.id || req.user._id,
        });

        return res.status(200).json({
            success: true,
            message: "Roster shared for review successfully",
            data: roster,
        });
    } catch (error) {
        if (error.code === "VALIDATION_ERROR") {
            return res.status(400).json({ success: false, message: error.message });
        }
        if (error.code === "NOT_FOUND") {
            return res.status(404).json({ success: false, message: error.message });
        }
        console.error("Share Roster Error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

const addReviewComment = async (req, res) => {
    try {
        const hospitalId = await getHospitalIdFromContext(req.user);
        if (!hospitalId) {
            return res.status(404).json({ success: false, message: "Hospital not found" });
        }

        const { comment } = req.body;
        const roster = await rosterService.addReviewComment({
            rosterId: req.params.id,
            hospitalId,
            userId: req.user.id || req.user._id,
            comment,
        });

        return res.status(200).json({
            success: true,
            message: "Review comment added successfully",
            data: roster,
        });
    } catch (error) {
        if (error.code === "VALIDATION_ERROR") {
            return res.status(400).json({ success: false, message: error.message });
        }
        if (error.code === "NOT_FOUND") {
            return res.status(404).json({ success: false, message: error.message });
        }
        console.error("Add Review Comment Error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

const resolveReviewComment = async (req, res) => {
    try {
        const hospitalId = await getHospitalIdFromContext(req.user);
        if (!hospitalId) {
            return res.status(404).json({ success: false, message: "Hospital not found" });
        }

        const roster = await rosterService.resolveReviewComment({
            rosterId: req.params.id,
            commentId: req.params.commentId,
            hospitalId,
            userId: req.user.id || req.user._id,
        });

        return res.status(200).json({
            success: true,
            message: "Review comment resolved successfully",
            data: roster,
        });
    } catch (error) {
        if (error.code === "VALIDATION_ERROR") {
            return res.status(400).json({ success: false, message: error.message });
        }
        if (error.code === "NOT_FOUND") {
            return res.status(404).json({ success: false, message: error.message });
        }
        console.error("Resolve Review Comment Error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

// ─── ASSIGNMENTS ─────────────────────────────────────────────────────────────

const addAssignment = async (req, res) => {
    try {
        const hospitalId = await getHospitalIdFromContext(req.user);
        if (!hospitalId) {
            return res.status(404).json({ success: false, message: "Hospital not found" });
        }

        const { employeeId, date, columnId, shiftTitle, startTime, endTime, dutyArea, notes } = req.body;
        const result = await rosterService.addAssignment({
            hospitalId,
            userId: req.user.id || req.user._id,
            rosterId: req.params.id,
            employeeId,
            date,
            columnId,
            shiftTitle,
            startTime,
            endTime,
            dutyArea,
            notes,
        });

        return res.status(201).json({
            success: true,
            message: "Assignment added to roster successfully",
            data: result.assignment,
            leaveWarning: result.leaveWarning,
        });
    } catch (error) {
        if (error.code === "LEAVE_CONFLICT") {
            return res.status(409).json({
                success: false,
                code: "LEAVE_CONFLICT",
                message: error.message,
                details: error.details,
            });
        }
        if (error.code === "DUPLICATE_ASSIGNMENT") {
            return res.status(409).json({
                success: false,
                message: error.message,
                details: error.existingAssignment,
            });
        }
        if (error.code === "BUSINESS_CONFLICT") {
            return res.status(409).json({ success: false, message: error.message });
        }
        if (error.code === "VALIDATION_ERROR") {
            return res.status(400).json({ success: false, message: error.message });
        }
        if (error.code === "NOT_FOUND") {
            return res.status(404).json({ success: false, message: error.message });
        }
        console.error("Add Assignment Error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

const updateAssignment = async (req, res) => {
    try {
        const hospitalId = await getHospitalIdFromContext(req.user);
        if (!hospitalId) {
            return res.status(404).json({ success: false, message: "Hospital not found" });
        }

        const { columnId, shiftTitle, startTime, endTime, dutyArea, notes, date, employeeId } = req.body;
        const assignment = await rosterService.updateAssignment({
            assignmentId: req.params.assignmentId,
            hospitalId,
            userId: req.user.id || req.user._id,
            columnId,
            shiftTitle,
            startTime,
            endTime,
            dutyArea,
            notes,
            date,
            employeeId,
        });

        return res.status(200).json({
            success: true,
            message: "Assignment updated successfully",
            data: assignment,
        });
    } catch (error) {
        if (error.code === "LEAVE_CONFLICT") {
            return res.status(409).json({
                success: false,
                code: "LEAVE_CONFLICT",
                message: error.message,
                details: error.details,
            });
        }
        if (error.code === "DUPLICATE_ASSIGNMENT") {
            return res.status(409).json({
                success: false,
                message: error.message,
                details: error.existingAssignment,
            });
        }
        if (error.code === "BUSINESS_CONFLICT") {
            return res.status(409).json({ success: false, message: error.message });
        }
        if (error.code === "VALIDATION_ERROR") {
            return res.status(400).json({ success: false, message: error.message });
        }
        if (error.code === "NOT_FOUND") {
            return res.status(404).json({ success: false, message: error.message });
        }
        console.error("Update Assignment Error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

const deleteAssignment = async (req, res) => {
    try {
        const hospitalId = await getHospitalIdFromContext(req.user);
        if (!hospitalId) {
            return res.status(404).json({ success: false, message: "Hospital not found" });
        }

        const scope = req.query.scope || req.body?.scope || "THIS_DATE";

        await rosterService.deleteAssignment({
            assignmentId: req.params.assignmentId,
            hospitalId,
            userId: req.user.id || req.user._id,
            scope,
        });

        return res.status(200).json({
            success: true,
            message: "Assignment deleted successfully",
        });
    } catch (error) {
        if (error.code === "BUSINESS_CONFLICT") {
            return res.status(409).json({ success: false, message: error.message });
        }
        if (error.code === "VALIDATION_ERROR") {
            return res.status(400).json({ success: false, message: error.message });
        }
        if (error.code === "NOT_FOUND") {
            return res.status(404).json({ success: false, message: error.message });
        }
        console.error("Delete Assignment Error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

const addBulkRangeAssignments = async (req, res) => {
    try {
        const hospitalId = await getHospitalIdFromContext(req.user);
        if (!hospitalId) {
            return res.status(404).json({ success: false, message: "Hospital not found" });
        }

        const { employeeId, startDate, endDate, columnId, shiftTitle, startTime, endTime, dutyArea, notes, overwriteConflicts } = req.body;
        const result = await rosterService.addBulkRangeAssignments({
            hospitalId,
            userId: req.user.id || req.user._id,
            rosterId: req.params.id,
            employeeId,
            startDate,
            endDate,
            columnId,
            shiftTitle,
            startTime,
            endTime,
            dutyArea,
            notes,
            overwriteConflicts: !!overwriteConflicts,
        });

        return res.status(201).json({
            success: true,
            message: `${result.createdCount} assignments applied successfully`,
            data: result.createdAssignments,
            conflicts: result.conflicts,
            leaveWarnings: result.leaveWarnings,
            approvedLeaveConflicts: result.approvedLeaveConflicts,
        });
    } catch (error) {
        if (error.code === "LEAVE_CONFLICT") {
            return res.status(409).json({
                success: false,
                code: "LEAVE_CONFLICT",
                message: error.message,
                details: error.details,
            });
        }
        if (error.code === "DUPLICATE_ASSIGNMENT") {
            return res.status(409).json({
                success: false,
                message: error.message,
                details: error.existingAssignment,
            });
        }
        if (error.code === "BUSINESS_CONFLICT") {
            return res.status(409).json({ success: false, message: error.message });
        }
        if (error.code === "VALIDATION_ERROR") {
            return res.status(400).json({ success: false, message: error.message });
        }
        if (error.code === "NOT_FOUND") {
            return res.status(404).json({ success: false, message: error.message });
        }
        console.error("Add Bulk Range Assignments Error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

// ─── MY ROSTER ───────────────────────────────────────────────────────────────

const getMyRoster = async (req, res) => {
    try {
        const hospitalId = await getHospitalIdFromContext(req.user);
        if (!hospitalId) {
            return res.status(404).json({ success: false, message: "Hospital not found" });
        }

        const { tab } = req.query;
        const myShifts = await rosterService.getMyRoster({
            userId: req.user.id || req.user._id,
            hospitalId,
            employeeId: req.user.employeeId,
            tab,
        });

        return res.status(200).json({
            success: true,
            message: "My published roster retrieved successfully",
            data: myShifts,
        });
    } catch (error) {
        console.error("Get My Roster Error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

const checkLeaveConflicts = async (req, res) => {
    try {
        const hospitalId = await getHospitalIdFromContext(req.user);
        if (!hospitalId) {
            return res.status(404).json({ success: false, message: "Hospital not found" });
        }

        const { employeeId, startDate, endDate, date } = req.body;
        const sDate = startDate || date;
        const eDate = endDate || sDate;

        const result = await rosterService.checkLeaveConflicts({
            hospitalId,
            employeeId,
            startDate: sDate,
            endDate: eDate,
        });

        return res.status(200).json({
            success: true,
            data: result,
            ...result,
        });
    } catch (error) {
        if (error.code === "VALIDATION_ERROR") {
            return res.status(400).json({ success: false, message: error.message });
        }
        if (error.code === "NOT_FOUND") {
            return res.status(404).json({ success: false, message: error.message });
        }
        console.error("Check Leave Conflicts Error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
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
    checkLeaveConflicts,
    // My Roster
    getMyRoster,
};


