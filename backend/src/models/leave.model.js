const mongoose = require("mongoose");
const { VALID_LEAVE_TYPES, VALID_LEAVE_STATUSES, LEAVE_STATUSES } = require("../constants/leave.constants");

/**
 * Leave Model
 *
 * Represents an employee leave request within a hospital scope.
 */
const leaveSchema = new mongoose.Schema(
    {
        hospitalId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Hospital",
            required: true,
            index: true,
        },

        employeeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Employee",
            required: true,
            index: true,
        },

        leaveType: {
            type: String,
            enum: VALID_LEAVE_TYPES,
            required: true,
        },

        startDate: {
            type: Date,
            required: true,
        },

        endDate: {
            type: Date,
            required: true,
        },

        totalDays: {
            type: Number,
            required: true,
            min: 0.5,
        },

        isHalfDay: {
            type: Boolean,
            default: false,
        },

        halfDaySession: {
            type: String,
            enum: ["FIRST_HALF", "SECOND_HALF", null],
            default: null,
        },

        reason: {
            type: String,
            required: true,
            trim: true,
        },

        status: {
            type: String,
            enum: VALID_LEAVE_STATUSES,
            default: LEAVE_STATUSES.PENDING,
            index: true,
        },

        appliedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        approvedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },

        approvedAt: {
            type: Date,
            default: null,
        },

        rejectedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },

        rejectedAt: {
            type: Date,
            default: null,
        },

        rejectionReason: {
            type: String,
            default: null,
            trim: true,
        },

        cancelledBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },

        cancelledAt: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

// Query optimization compound indexes
leaveSchema.index({ hospitalId: 1, employeeId: 1, status: 1 });
leaveSchema.index({ hospitalId: 1, status: 1, createdAt: -1 });
leaveSchema.index({ hospitalId: 1, startDate: 1, endDate: 1 });
leaveSchema.index({ hospitalId: 1, employeeId: 1, startDate: 1, endDate: 1 });

const Leave = mongoose.model("Leave", leaveSchema);

module.exports = Leave;
