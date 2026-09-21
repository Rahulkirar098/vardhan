const mongoose = require("mongoose");

const floorSchema = new mongoose.Schema(
    {
        hospitalId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Hospital",
            required: true,
        },

        name: {
            type: String,
            required: true,
            trim: true,
        },

        floorNumber: {
            type: Number,
            required: true,
        },

        code: {
            type: String,
            trim: true,
            default: null,
        },

        description: {
            type: String,
            trim: true,
            default: null,
        },

        status: {
            type: String,
            enum: ["active", "inactive"],
            default: "active",
        },

        isActive: {
            type: Boolean,
            default: true,
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

floorSchema.index(
    { hospitalId: 1, name: 1 },
    { unique: true, partialFilterExpression: { isActive: true } }
);

floorSchema.index(
    { hospitalId: 1, floorNumber: 1 },
    { unique: true, partialFilterExpression: { isActive: true } }
);

floorSchema.index({ hospitalId: 1, isActive: 1 });

const Floor = mongoose.model("Floor", floorSchema);

module.exports = Floor;
