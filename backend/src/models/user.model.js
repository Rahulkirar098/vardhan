const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },

        phone: {
            type: String,
            trim: true,
            default: null,
        },

        password: {
            type: String,
            required: true,
        },

        role: {
            type: String,
            enum: ["super_admin", "admin", "employee"],
            default: "admin",
            required: true,
        },

        status: {
            type: String,
            enum: ["active", "inactive"],
            default: "active",
        },

        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },

        hospitalId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Hospital",
            default: null,
        },

        employeeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Employee",
            default: null,
        },

        permissions: {
            type: [String],
            default: [],
        },

        modules: {
            type: [String],
            default: ["core"],
        },

        resetPasswordToken: {
            type: String,
            default: null,
        },

        resetPasswordExpires: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

const User = mongoose.model("User", userSchema);

module.exports = User;