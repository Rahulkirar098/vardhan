const mongoose = require("mongoose");
const Leave = require("../models/leave.model");
const Employee = require("../models/employee.model");
const User = require("../models/user.model");
const { LEAVE_STATUSES } = require("../constants/leave.constants");
const { PERMISSIONS } = require("../config/permissions");
const { hasPermission } = require("../config/rolePermissions");

/**
 * Calculates total calendar days inclusively between two dates
 */
const calculateTotalDays = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const startUTC = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
    const endUTC = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());

    const diffDays = Math.floor((endUTC - startUTC) / (1000 * 60 * 60 * 24)) + 1;
    return diffDays > 0 ? diffDays : 1;
};

/**
 * Normalizes a date to midnight UTC for consistent range matching
 */
const normalizeToMidnight = (dateVal, isEndOfDay = false) => {
    const d = new Date(dateVal);
    if (isEndOfDay) {
        return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
    }
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
};

/**
 * Helper to retrieve the Employee record linked to a User
 */
const getEmployeeForUser = async (userId, hospitalId) => {
    if (!userId || !hospitalId) return null;
    return await Employee.findOne({ userId, hospitalId }).lean();
};

/**
 * Apply for a new leave request
 */
const applyLeave = async ({ user, leaveData }) => {
    const hospitalId = user.hospitalId;
    if (!hospitalId) {
        const err = new Error("Hospital context is required");
        err.code = "BAD_REQUEST";
        throw err;
    }

    let employeeRecord = null;
    if (user.role === "employee") {
        employeeRecord = await getEmployeeForUser(user.id || user._id, hospitalId);
        if (!employeeRecord) {
            const err = new Error("No active employee profile found for this user");
            err.code = "NOT_FOUND";
            throw err;
        }

        if (employeeRecord.employmentStatus === "INACTIVE") {
            const err = new Error("Inactive employees cannot submit leave requests");
            err.code = "FORBIDDEN";
            throw err;
        }

        // If client attempted to specify a different employeeId, reject
        if (leaveData.employeeId && String(leaveData.employeeId) !== String(employeeRecord._id)) {
            const err = new Error("You cannot submit leave requests for another employee");
            err.code = "FORBIDDEN";
            throw err;
        }
    } else {
        // Admin applying: can apply for specified employee or themselves
        if (leaveData.employeeId) {
            employeeRecord = await Employee.findOne({
                _id: leaveData.employeeId,
                hospitalId,
            }).lean();
            if (!employeeRecord) {
                const err = new Error("Employee not found in this hospital");
                err.code = "NOT_FOUND";
                throw err;
            }
        } else {
            employeeRecord = await getEmployeeForUser(user.id || user._id, hospitalId);
            if (!employeeRecord) {
                const err = new Error("Employee ID is required");
                err.code = "BAD_REQUEST";
                throw err;
            }
        }
    }

    const start = normalizeToMidnight(leaveData.startDate, false);
    const end = normalizeToMidnight(leaveData.endDate, true);
    const totalDays = calculateTotalDays(start, end);

    // Overlap Check: Find active (pending or approved) leaves for this employee
    const overlappingLeave = await Leave.findOne({
        hospitalId,
        employeeId: employeeRecord._id,
        status: { $in: [LEAVE_STATUSES.PENDING, LEAVE_STATUSES.APPROVED] },
        startDate: { $lte: end },
        endDate: { $gte: start },
    }).lean();

    if (overlappingLeave) {
        const err = new Error("You already have an active leave request covering the selected dates");
        err.code = "CONFLICT";
        throw err;
    }

    const leave = await Leave.create({
        hospitalId,
        employeeId: employeeRecord._id,
        leaveType: leaveData.leaveType,
        startDate: start,
        endDate: end,
        totalDays,
        reason: String(leaveData.reason).trim(),
        status: LEAVE_STATUSES.PENDING,
        appliedBy: user.id || user._id,
    });

    const populatedLeave = await Leave.findById(leave._id)
        .populate({
            path: "employeeId",
            select: "firstName lastName email employeeId positionId",
            populate: { path: "positionId", select: "name" },
        })
        .populate("appliedBy", "name email role")
        .lean();

    return populatedLeave;
};

/**
 * Get leave requests for the authenticated employee
 */
const getMyLeaves = async ({ user, query = {} }) => {
    const hospitalId = user.hospitalId;
    const employeeRecord = await getEmployeeForUser(user.id || user._id, hospitalId);

    if (!employeeRecord) {
        return { leaves: [], total: 0, page: 1, limit: 20 };
    }

    const filter = {
        hospitalId,
        employeeId: employeeRecord._id,
    };

    if (query.status && Object.values(LEAVE_STATUSES).includes(query.status)) {
        filter.status = query.status;
    }

    if (query.leaveType) {
        filter.leaveType = query.leaveType;
    }

    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const [leaves, total] = await Promise.all([
        Leave.find(filter)
            .populate({
                path: "employeeId",
                select: "firstName lastName email employeeId positionId",
                populate: { path: "positionId", select: "name" },
            })
            .populate("approvedBy", "name email")
            .populate("rejectedBy", "name email")
            .populate("cancelledBy", "name email")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        Leave.countDocuments(filter),
    ]);

    return {
        leaves,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
    };
};

/**
 * Get hospital-wide leave requests (for Admins / Authorized HR)
 */
const getHospitalLeaves = async ({ user, query = {} }) => {
    const hospitalId = user.hospitalId;
    const filter = { hospitalId };

    if (query.status && Object.values(LEAVE_STATUSES).includes(query.status)) {
        filter.status = query.status;
    }

    if (query.leaveType) {
        filter.leaveType = query.leaveType;
    }

    if (query.employeeId && mongoose.Types.ObjectId.isValid(query.employeeId)) {
        filter.employeeId = query.employeeId;
    }

    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    let employeeMatch = {};
    if (query.search && String(query.search).trim()) {
        const searchRegex = new RegExp(String(query.search).trim(), "i");
        const matchingEmployees = await Employee.find({
            hospitalId,
            $or: [
                { firstName: searchRegex },
                { lastName: searchRegex },
                { email: searchRegex },
                { employeeId: searchRegex },
            ],
        }).select("_id").lean();

        const empIds = matchingEmployees.map((e) => e._id);
        filter.employeeId = { $in: empIds };
    }

    const [leaves, total] = await Promise.all([
        Leave.find(filter)
            .populate({
                path: "employeeId",
                select: "firstName lastName email employeeId positionId",
                populate: { path: "positionId", select: "name" },
            })
            .populate("appliedBy", "name email role")
            .populate("approvedBy", "name email")
            .populate("rejectedBy", "name email")
            .populate("cancelledBy", "name email")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        Leave.countDocuments(filter),
    ]);

    return {
        leaves,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
    };
};

/**
 * Get leave statistics for the hospital dashboard & metrics cards
 */
const getLeaveStats = async ({ user }) => {
    const hospitalId = user.hospitalId;
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const [pending, approved, rejected, currentlyOnLeave, total] = await Promise.all([
        Leave.countDocuments({ hospitalId, status: LEAVE_STATUSES.PENDING }),
        Leave.countDocuments({ hospitalId, status: LEAVE_STATUSES.APPROVED }),
        Leave.countDocuments({ hospitalId, status: LEAVE_STATUSES.REJECTED }),
        Leave.countDocuments({
            hospitalId,
            status: LEAVE_STATUSES.APPROVED,
            startDate: { $lte: todayEnd },
            endDate: { $gte: todayStart },
        }),
        Leave.countDocuments({ hospitalId }),
    ]);

    return {
        pending,
        approved,
        rejected,
        currentlyOnLeave,
        total,
    };
};

/**
 * Get a single leave request by ID
 */
const getLeaveById = async ({ user, leaveId }) => {
    const hospitalId = user.hospitalId;
    const leave = await Leave.findOne({ _id: leaveId, hospitalId })
        .populate({
            path: "employeeId",
            select: "firstName lastName email employeeId positionId userId",
            populate: { path: "positionId", select: "name" },
        })
        .populate("appliedBy", "name email role")
        .populate("approvedBy", "name email")
        .populate("rejectedBy", "name email")
        .populate("cancelledBy", "name email")
        .lean();

    if (!leave) {
        const err = new Error("Leave request not found");
        err.code = "NOT_FOUND";
        throw err;
    }

    const canViewWorkforce = (
        user.role === "admin" ||
        user.role === "super_admin" ||
        hasPermission(user, PERMISSIONS.LEAVE_VIEW) ||
        hasPermission(user, PERMISSIONS.LEAVE_APPROVE) ||
        hasPermission(user, PERMISSIONS.LEAVE_MANAGE)
    );

    const userEmployee = await getEmployeeForUser(user.id || user._id, hospitalId);
    const isOwner = (
        (userEmployee && String(leave.employeeId?._id || leave.employeeId) === String(userEmployee._id)) ||
        (leave.employeeId && leave.employeeId.userId && String(leave.employeeId.userId) === String(user.id || user._id)) ||
        (leave.appliedBy && String(leave.appliedBy._id || leave.appliedBy) === String(user.id || user._id))
    );

    if (!canViewWorkforce && !isOwner) {
        const err = new Error("You do not have permission to view this leave request");
        err.code = "FORBIDDEN";
        throw err;
    }

    return leave;
};

/**
 * Approve a pending leave request
 */
const approveLeave = async ({ user, leaveId }) => {
    const hospitalId = user.hospitalId;
    const leave = await Leave.findOne({ _id: leaveId, hospitalId }).populate("employeeId");

    if (!leave) {
        const err = new Error("Leave request not found");
        err.code = "NOT_FOUND";
        throw err;
    }

    if (leave.status !== LEAVE_STATUSES.PENDING) {
        const err = new Error(`Cannot approve leave request with status: ${leave.status}`);
        err.code = "BAD_REQUEST";
        throw err;
    }

    // SELF-PROTECTION RULE: Employee / Manager cannot approve their own leave request
    const userEmployee = await getEmployeeForUser(user.id || user._id, hospitalId);
    const isOwnLeave =
        (userEmployee && String(leave.employeeId?._id || leave.employeeId) === String(userEmployee._id)) ||
        String(leave.appliedBy) === String(user.id || user._id);

    if (isOwnLeave) {
        const err = new Error("You cannot approve your own leave request");
        err.code = "FORBIDDEN";
        throw err;
    }

    leave.status = LEAVE_STATUSES.APPROVED;
    leave.approvedBy = user.id || user._id;
    leave.approvedAt = new Date();

    await leave.save();

    return await getLeaveById({ user, leaveId });
};

/**
 * Reject a pending leave request
 */
const rejectLeave = async ({ user, leaveId, rejectionReason }) => {
    const hospitalId = user.hospitalId;
    const leave = await Leave.findOne({ _id: leaveId, hospitalId }).populate("employeeId");

    if (!leave) {
        const err = new Error("Leave request not found");
        err.code = "NOT_FOUND";
        throw err;
    }

    if (leave.status !== LEAVE_STATUSES.PENDING) {
        const err = new Error(`Cannot reject leave request with status: ${leave.status}`);
        err.code = "BAD_REQUEST";
        throw err;
    }

    // SELF-PROTECTION RULE: Employee / Manager cannot reject their own leave request
    const userEmployee = await getEmployeeForUser(user.id || user._id, hospitalId);
    const isOwnLeave =
        (userEmployee && String(leave.employeeId?._id || leave.employeeId) === String(userEmployee._id)) ||
        String(leave.appliedBy) === String(user.id || user._id);

    if (isOwnLeave) {
        const err = new Error("You cannot reject your own leave request");
        err.code = "FORBIDDEN";
        throw err;
    }

    if (!rejectionReason || !String(rejectionReason).trim()) {
        const err = new Error("Rejection reason is required");
        err.code = "BAD_REQUEST";
        throw err;
    }

    leave.status = LEAVE_STATUSES.REJECTED;
    leave.rejectedBy = user.id || user._id;
    leave.rejectedAt = new Date();
    leave.rejectionReason = String(rejectionReason).trim();

    await leave.save();

    return await getLeaveById({ user, leaveId });
};

/**
 * Cancel a pending leave request (by owner or admin)
 */
const cancelLeave = async ({ user, leaveId }) => {
    const hospitalId = user.hospitalId;
    const leave = await Leave.findOne({ _id: leaveId, hospitalId }).populate("employeeId");

    if (!leave) {
        const err = new Error("Leave request not found");
        err.code = "NOT_FOUND";
        throw err;
    }

    if (leave.status !== LEAVE_STATUSES.PENDING) {
        const err = new Error(`Cannot cancel leave request with status: ${leave.status}`);
        err.code = "BAD_REQUEST";
        throw err;
    }

    const canManageAll =
        user.role === "admin" ||
        user.role === "super_admin" ||
        hasPermission(user, PERMISSIONS.LEAVE_MANAGE);

    const userEmployee = await getEmployeeForUser(user.id || user._id, hospitalId);
    const isOwner =
        (userEmployee && String(leave.employeeId?._id || leave.employeeId) === String(userEmployee._id)) ||
        (leave.employeeId && leave.employeeId.userId && String(leave.employeeId.userId) === String(user.id || user._id)) ||
        (leave.appliedBy && String(leave.appliedBy._id || leave.appliedBy) === String(user.id || user._id));

    // Normal employee without leave.manage cannot cancel another employee's leave
    if (user.role === "employee" && !canManageAll && !isOwner) {
        const err = new Error("You can only cancel your own leave requests");
        err.code = "FORBIDDEN";
        throw err;
    }

    leave.status = LEAVE_STATUSES.CANCELLED;
    leave.cancelledBy = user.id || user._id;
    leave.cancelledAt = new Date();

    await leave.save();

    return await getLeaveById({ user, leaveId });
};

module.exports = {
    applyLeave,
    getMyLeaves,
    getHospitalLeaves,
    getLeaveStats,
    getLeaveById,
    approveLeave,
    rejectLeave,
    cancelLeave,
    calculateTotalDays,
};
