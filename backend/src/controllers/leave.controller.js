const leaveService = require("../services/leave.service");
const {
    isValidObjectId,
    validateApplyLeave,
    validateRejectLeave,
} = require("../validators/leave.validator");

/**
 * Maps error codes to appropriate HTTP status codes
 */
const handleServiceError = (res, error, defaultMsg = "Internal Server Error") => {
    if (error.code === "NOT_FOUND") {
        return res.status(404).json({ success: false, message: error.message });
    }
    if (error.code === "FORBIDDEN") {
        return res.status(403).json({ success: false, message: error.message });
    }
    if (error.code === "CONFLICT") {
        return res.status(409).json({ success: false, message: error.message });
    }
    if (error.code === "BAD_REQUEST" || error.name === "ValidationError") {
        return res.status(400).json({ success: false, message: error.message });
    }
    console.error("Leave Controller Error:", error);
    return res.status(500).json({ success: false, message: defaultMsg });
};

/**
 * POST /api/v1/hrms/leaves
 * Apply for a leave
 */
const applyLeave = async (req, res) => {
    try {
        const validation = validateApplyLeave(req.body);
        if (!validation.isValid) {
            return res.status(400).json({
                success: false,
                message: validation.errors[0] || "Validation failed",
                errors: validation.errors,
            });
        }

        const leave = await leaveService.applyLeave({
            user: req.user,
            leaveData: req.body,
        });

        return res.status(201).json({
            success: true,
            message: "Leave request submitted successfully",
            data: { leave },
        });
    } catch (error) {
        return handleServiceError(res, error, "Failed to submit leave request");
    }
};

/**
 * GET /api/v1/hrms/leaves/my
 * Get leave history for current authenticated employee
 */
const getMyLeaves = async (req, res) => {
    try {
        const result = await leaveService.getMyLeaves({
            user: req.user,
            query: req.query,
        });

        return res.status(200).json({
            success: true,
            message: "My leaves retrieved successfully",
            data: result,
        });
    } catch (error) {
        return handleServiceError(res, error, "Failed to retrieve your leaves");
    }
};

/**
 * GET /api/v1/hrms/leaves
 * List all hospital leave requests
 */
const getHospitalLeaves = async (req, res) => {
    try {
        const result = await leaveService.getHospitalLeaves({
            user: req.user,
            query: req.query,
        });

        return res.status(200).json({
            success: true,
            message: "Hospital leaves retrieved successfully",
            data: result,
        });
    } catch (error) {
        return handleServiceError(res, error, "Failed to retrieve hospital leaves");
    }
};

/**
 * GET /api/v1/hrms/leaves/stats
 * Get leave metrics for the hospital
 */
const getLeaveStats = async (req, res) => {
    try {
        const stats = await leaveService.getLeaveStats({
            user: req.user,
        });

        return res.status(200).json({
            success: true,
            message: "Leave stats retrieved successfully",
            data: { stats },
        });
    } catch (error) {
        return handleServiceError(res, error, "Failed to retrieve leave statistics");
    }
};

/**
 * GET /api/v1/hrms/leaves/:id
 * Get single leave request details
 */
const getLeaveById = async (req, res) => {
    try {
        const { id } = req.params;
        if (!isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid leave ID format",
            });
        }

        const leave = await leaveService.getLeaveById({
            user: req.user,
            leaveId: id,
        });

        return res.status(200).json({
            success: true,
            message: "Leave details retrieved successfully",
            data: { leave },
        });
    } catch (error) {
        return handleServiceError(res, error, "Failed to retrieve leave request");
    }
};

/**
 * PATCH /api/v1/hrms/leaves/:id/approve
 * Approve a pending leave request
 */
const approveLeave = async (req, res) => {
    try {
        const { id } = req.params;
        if (!isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid leave ID format",
            });
        }

        const leave = await leaveService.approveLeave({
            user: req.user,
            leaveId: id,
        });

        return res.status(200).json({
            success: true,
            message: "Leave request approved successfully",
            data: { leave },
        });
    } catch (error) {
        return handleServiceError(res, error, "Failed to approve leave request");
    }
};

/**
 * PATCH /api/v1/hrms/leaves/:id/reject
 * Reject a pending leave request with reason
 */
const rejectLeave = async (req, res) => {
    try {
        const { id } = req.params;
        if (!isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid leave ID format",
            });
        }

        const validation = validateRejectLeave(req.body);
        if (!validation.isValid) {
            return res.status(400).json({
                success: false,
                message: validation.errors[0] || "Rejection reason is required",
            });
        }

        const leave = await leaveService.rejectLeave({
            user: req.user,
            leaveId: id,
            rejectionReason: req.body.rejectionReason,
        });

        return res.status(200).json({
            success: true,
            message: "Leave request rejected",
            data: { leave },
        });
    } catch (error) {
        return handleServiceError(res, error, "Failed to reject leave request");
    }
};

/**
 * PATCH /api/v1/hrms/leaves/:id/cancel
 * Cancel a pending leave request
 */
const cancelLeave = async (req, res) => {
    try {
        const { id } = req.params;
        if (!isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid leave ID format",
            });
        }

        const leave = await leaveService.cancelLeave({
            user: req.user,
            leaveId: id,
        });

        return res.status(200).json({
            success: true,
            message: "Leave request cancelled successfully",
            data: { leave },
        });
    } catch (error) {
        return handleServiceError(res, error, "Failed to cancel leave request");
    }
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
};
