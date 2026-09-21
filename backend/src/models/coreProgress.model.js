const mongoose = require("mongoose");

const coreProgressSchema = new mongoose.Schema(
    {
        moduleKey: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
        },

        moduleName: {
            type: String,
            required: true,
            trim: true,
        },

        featureKey: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
        },

        featureName: {
            type: String,
            required: true,
            trim: true,
        },

        description: {
            type: String,
            trim: true,
            default: "",
        },

        status: {
            type: String,
            enum: ["NOT_STARTED", "IN_PROGRESS", "DONE", "BLOCKED"],
            default: "NOT_STARTED",
        },

        notes: {
            type: String,
            trim: true,
            default: "",
        },

        sortOrder: {
            type: Number,
            default: 0,
        },

        isActive: {
            type: Boolean,
            default: true,
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

coreProgressSchema.index({ moduleKey: 1, featureKey: 1 }, { unique: true });
coreProgressSchema.index({ isActive: 1, sortOrder: 1 });

const CoreProgress = mongoose.model("CoreProgress", coreProgressSchema);

module.exports = CoreProgress;
