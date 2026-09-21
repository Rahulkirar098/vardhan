const mongoose = require("mongoose");

/**
 * Employee Model
 *
 * Represents an HRMS Employee managed by HR.
 * Every Employee is linked to a Vardhan User login account via userId.
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

        positionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Position",
            required: true,
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
         * Link to the Vardhan User login account.
         * Created when the employee accepts their invitation.
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
