const mongoose = require("mongoose");
const { VALID_LEAVE_TYPES } = require("../constants/leave.constants");

/**
 * Validates whether a string is a valid MongoDB ObjectId
 */
const isValidObjectId = (id) => {
    return id && mongoose.Types.ObjectId.isValid(id) && String(new mongoose.Types.ObjectId(id)) === String(id);
};

/**
 * Validates an ISO Date string or Date object
 */
const parseDate = (dateVal) => {
    if (!dateVal) return null;
    const d = new Date(dateVal);
    return isNaN(d.getTime()) ? null : d;
};

/**
 * Validates leave application payload
 */
const validateApplyLeave = (data) => {
    const errors = [];

    const { leaveType, startDate, endDate, reason } = data || {};

    if (!leaveType) {
        errors.push("Leave type is required");
    } else if (!VALID_LEAVE_TYPES.includes(leaveType)) {
        errors.push(`Invalid leave type. Allowed types: ${VALID_LEAVE_TYPES.join(", ")}`);
    }

    const start = parseDate(startDate);
    if (!startDate || !start) {
        errors.push("A valid start date is required");
    }

    const end = parseDate(endDate);
    if (!endDate || !end) {
        errors.push("A valid end date is required");
    }

    if (start && end) {
        // Normalize time to compare calendar dates
        const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
        const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();
        if (endDay < startDay) {
            errors.push("End date cannot be before start date");
        }
    }

    if (!reason || !String(reason).trim()) {
        errors.push("Reason for leave is required");
    }

    return {
        isValid: errors.length === 0,
        errors,
        startDate: start,
        endDate: end,
    };
};

/**
 * Validates leave rejection payload
 */
const validateRejectLeave = (data) => {
    const errors = [];
    const { rejectionReason } = data || {};

    if (!rejectionReason || !String(rejectionReason).trim()) {
        errors.push("Rejection reason is required");
    }

    return {
        isValid: errors.length === 0,
        errors,
    };
};

module.exports = {
    isValidObjectId,
    parseDate,
    validateApplyLeave,
    validateRejectLeave,
};
