const mongoose = require("mongoose");

const columnSchema = new mongoose.Schema(
    {
        id: { type: String, required: true },
        title: { type: String, required: true, trim: true },
        startTime: { type: String, required: true, trim: true },
        endTime: { type: String, required: true, trim: true },
        order: { type: Number, default: 0 },
    },
    { _id: false }
);

const dutyAreaSchema = new mongoose.Schema(
    {
        id: { type: String, required: true },
        name: { type: String, required: true, trim: true },
        order: { type: Number, default: 0 },
    },
    { _id: false }
);

const rosterTemplateSchema = new mongoose.Schema(
    {
        hospitalId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Hospital",
            required: true,
            index: true,
        },
        title: {
            type: String,
            required: true,
            trim: true,
        },
        columns: {
            type: [columnSchema],
            default: [],
        },
        dutyAreas: {
            type: [dutyAreaSchema],
            default: [],
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

rosterTemplateSchema.index({ hospitalId: 1, createdAt: -1 });

const RosterTemplate = mongoose.model("RosterTemplate", rosterTemplateSchema);

module.exports = RosterTemplate;
