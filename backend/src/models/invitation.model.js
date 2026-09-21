const mongoose = require("mongoose");

const invitationSchema = new mongoose.Schema(
    {
        hospitalId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Hospital",
            required: true,
        },

        type: {
            type: String,
            enum: ["HR", "EMPLOYEE"],
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

        firstName: {
            type: String,
            required: true,
            trim: true,
        },

        lastName: {
            type: String,
            trim: true, // Optional for backward compatibility with old HR invitations where "name" might not split perfectly
            default: null,
        },

        tokenHash: {
            type: String,
            required: true,
        },

        expiresAt: {
            type: Date,
            required: true,
        },

        status: {
            type: String,
            enum: ["pending", "accepted", "expired", "cancelled"],
            default: "pending",
        },

        invitedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        acceptedAt: {
            type: Date,
            default: null,
        },

        // HR/Employee User Account specifics
        role: {
            type: String,
            enum: ["hr", "employee"],
            default: null,
        },
        createLogin: {
            type: Boolean,
            default: false,
        },
        modules: {
            type: [String],
            default: undefined,
        },
        permissions: {
            type: [String],
            default: undefined,
        },

        // Employee Specific
        employeeId: {
            type: String,
            trim: true,
            uppercase: true,
            default: null,
        },
        position: {
            type: String,
            trim: true,
            default: null,
        },
        dateOfJoining: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

invitationSchema.index({ hospitalId: 1, email: 1, status: 1 });
invitationSchema.index({ tokenHash: 1, status: 1, type: 1 });
invitationSchema.index({ type: 1 });

const Invitation = mongoose.model("Invitation", invitationSchema);

module.exports = Invitation;
