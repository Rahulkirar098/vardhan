const mongoose = require("mongoose");

/**
 * Employee Model
 *
 * Represents an HRMS Employee managed by HR.
 * An Employee is SEPARATE from a Vardhan User (login account).
 * userId is OPTIONAL — an employee does not require a Vardhan login.
 */
const employeeSchema = new mongoose.Schema(
    {
        employeeId: {
            type: String,
            required: true,
            trim: true,
            uppercase: true,
        },

        firstName: {
            type: String,
            required: true,
            trim: true,
        },

        lastName: {
            type: String,
            required: true,
            trim: true,
        },

        email: {
            type: String,
            required: true,
            lowercase: true,
            trim: true,
        },

        phone: {
            type: String,
            trim: true,
            default: null,
        },

        dateOfJoining: {
            type: Date,
            default: null,
        },

        position: {
            type: String,
            trim: true,
            default: null,
        },

        employmentStatus: {
            type: String,
            enum: ["ACTIVE", "INACTIVE"],
            default: "ACTIVE",
        },

        leavingDate: {
            type: Date,
            default: null,
        },

        hospitalId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Hospital",
            required: true,
        },

        /**
         * Optional link to a Vardhan User login account.
         * null = employee does not have a Vardhan login.
         * Phase 2 does NOT create User accounts from Employees.
         */
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },

        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

// Unique employee ID within a hospital
employeeSchema.index({ hospitalId: 1, employeeId: 1 }, { unique: true });

// Unique active email within a hospital (prevent duplicate active employees)
employeeSchema.index(
    { hospitalId: 1, email: 1, employmentStatus: 1 },
    {
        unique: true,
        partialFilterExpression: { employmentStatus: "ACTIVE" },
        sparse: true,
    }
);

const Employee = mongoose.model("Employee", employeeSchema);

module.exports = Employee;
