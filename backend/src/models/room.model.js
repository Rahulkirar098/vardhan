const mongoose = require("mongoose");

const roomSchema = new mongoose.Schema(
    {
        hospitalId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Hospital",
            required: true,
        },

        floorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Floor",
            required: true,
        },

        name: {
            type: String,
            required: true,
            trim: true,
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

roomSchema.index(
    { hospitalId: 1, floorId: 1, name: 1 },
    { unique: true, partialFilterExpression: { isActive: true } }
);

roomSchema.index({ floorId: 1, isActive: 1 });
roomSchema.index({ hospitalId: 1, isActive: 1 });

const Room = mongoose.model("Room", roomSchema);

module.exports = Room;
