const mongoose = require("mongoose");

const rosterSchema = new mongoose.Schema(
    {
        hospitalId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Hospital",
            required: true,
            index: true,
        },
        templateId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "RosterTemplate",
            default: null,
        },
        title: {
            type: String,
            required: true,
            trim: true,
        },
        startDate: {
            type: Date,
            required: true,
        },
        endDate: {
            type: Date,
            required: true,
        },
        status: {
            type: String,
            enum: ["DRAFT", "PUBLISHED"],
            default: "DRAFT",
            index: true,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        publishedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        publishedAt: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

rosterSchema.index({ hospitalId: 1, startDate: -1 });

const Roster = mongoose.model("Roster", rosterSchema);

module.exports = Roster;
