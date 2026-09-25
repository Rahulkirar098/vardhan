const mongoose = require("mongoose");
const {
    REGULARIZATION_STATUSES,
    VALID_REGULARIZATION_STATUSES,
    VALID_REQUESTED_ATTENDANCE_STATUSES,
} = require("../constants/attendance.constants");

/**
 * AttendanceRegularization Model
 *
 * Represents an employee request to regularize/correct missing or incorrect daily attendance.
 */
const attendanceRegularizationSchema = new mongoose.Schema(
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

        attendanceId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Attendance",
            default: null,
            index: true,
        },

        date: {
            type: Date,
            required: true,
            index: true,
        },

        dateStr: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },

        requestedStatus: {
            type: String,
            enum: VALID_REQUESTED_ATTENDANCE_STATUSES,
            required: true,
            index: true,
        },

        requestedCheckIn: {
            type: Date,
            default: null,
        },

        requestedCheckOut: {
            type: Date,
            default: null,
        },

        reason: {
            type: String,
            required: true,
            trim: true,
        },

        status: {
            type: String,
            enum: VALID_REGULARIZATION_STATUSES,
            default: REGULARIZATION_STATUSES.PENDING,
            index: true,
        },

        submittedAt: {
            type: Date,
            default: Date.now,
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

// Prevent duplicate active pending regularization requests for same employee, hospital and date
attendanceRegularizationSchema.index(
    { hospitalId: 1, employeeId: 1, dateStr: 1 },
    {
        unique: true,
        partialFilterExpression: { status: REGULARIZATION_STATUSES.PENDING },
    }
);

attendanceRegularizationSchema.index({ hospitalId: 1, employeeId: 1, status: 1 });
attendanceRegularizationSchema.index({ hospitalId: 1, employeeId: 1, date: -1 });
attendanceRegularizationSchema.index({ hospitalId: 1, date: -1 });

const AttendanceRegularization = mongoose.model("AttendanceRegularization", attendanceRegularizationSchema);

module.exports = AttendanceRegularization;
