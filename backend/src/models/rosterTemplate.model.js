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
        name: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            default: "",
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
        isActive: {
            type: Boolean,
            default: true,
            index: true,
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

rosterTemplateSchema.index({ hospitalId: 1, name: 1 });

const RosterTemplate = mongoose.model("RosterTemplate", rosterTemplateSchema);

module.exports = RosterTemplate;
