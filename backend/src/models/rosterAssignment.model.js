const mongoose = require("mongoose");

const rosterAssignmentSchema = new mongoose.Schema(
    {
        rosterId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Roster",
            required: true,
            index: true,
        },
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
        date: {
            type: Date,
            required: true,
            index: true,
        },
        columnId: {
            type: String,
            default: null,
        },
        shiftTitle: {
            type: String,
            required: true,
            trim: true,
        },
        startTime: {
            type: String,
            required: true,
            trim: true,
        },
        endTime: {
            type: String,
            required: true,
            trim: true,
        },
        dutyArea: {
            type: String,
            required: true,
            trim: true,
        },
        notes: {
            type: String,
            default: null,
            trim: true,
        },
        isOverride: {
            type: Boolean,
            default: false,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

rosterAssignmentSchema.index({ hospitalId: 1, employeeId: 1, date: 1 }, { unique: true });

const RosterAssignment = mongoose.model("RosterAssignment", rosterAssignmentSchema);

module.exports = RosterAssignment;
