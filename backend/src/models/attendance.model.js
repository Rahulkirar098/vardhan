const mongoose = require("mongoose");
const { VALID_ATTENDANCE_STATUSES, ATTENDANCE_STATUSES } = require("../constants/attendance.constants");

/**
 * Attendance Model
 *
 * Represents an employee daily attendance record within a hospital scope.
 */
const attendanceSchema = new mongoose.Schema(
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

        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            index: true,
            default: null,
        },

        dateStr: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },

        date: {
            type: Date,
            required: true,
            index: true,
        },

        status: {
            type: String,
            enum: VALID_ATTENDANCE_STATUSES,
            default: ATTENDANCE_STATUSES.PRESENT,
            index: true,
        },

        checkIn: {
            type: Date,
            default: null,
        },

        checkOut: {
            type: Date,
            default: null,
        },

        workingMinutes: {
            type: Number,
            default: 0,
            min: 0,
        },

        notes: {
            type: String,
            default: null,
            trim: true,
        },
    },
    {
        timestamps: true,
    }
);

// Prevent duplicate attendance per employee per date within the hospital
attendanceSchema.index({ hospitalId: 1, employeeId: 1, dateStr: 1 }, { unique: true });
attendanceSchema.index({ hospitalId: 1, dateStr: 1 });
attendanceSchema.index({ hospitalId: 1, employeeId: 1, date: -1 });

const Attendance = mongoose.model("Attendance", attendanceSchema);

module.exports = Attendance;
