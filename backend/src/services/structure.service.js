const Floor = require("../models/floor.model");
const Room = require("../models/room.model");

class ServiceError extends Error {
    constructor(message, statusCode = 400) {
        super(message);
        this.statusCode = statusCode;
    }
}

/**
 * Floor Services
 */

const getFloors = async (hospitalId) => {
    const floors = await Floor.find({
        hospitalId,
        isActive: true,
    }).sort({ floorNumber: 1, createdAt: 1 });

    if (floors.length === 0) {
        return [];
    }

    const floorIds = floors.map((f) => f._id);
    const roomCounts = await Room.aggregate([
        {
            $match: {
                floorId: { $in: floorIds },
                hospitalId,
                isActive: true,
            },
        },
        {
            $group: {
                _id: "$floorId",
                count: { $sum: 1 },
            },
        },
    ]);

    const countMap = {};
    roomCounts.forEach((item) => {
        countMap[item._id.toString()] = item.count;
    });

    return floors.map((floor) => {
        const floorObj = floor.toObject();
        floorObj.roomCount = countMap[floor._id.toString()] || 0;
        return floorObj;
    });
};

const getFloorById = async (hospitalId, floorId) => {
    const floor = await Floor.findOne({
        _id: floorId,
        hospitalId,
        isActive: true,
    });

    if (!floor) {
        throw new ServiceError("Floor not found.", 404);
    }

    const roomCount = await Room.countDocuments({
        floorId: floor._id,
        hospitalId,
        isActive: true,
    });

    const floorObj = floor.toObject();
    floorObj.roomCount = roomCount;
    return floorObj;
};

const createFloor = async (hospitalId, userId, data) => {
    const normalizedName = String(data.name).trim();
    const floorNumber = Number(data.floorNumber);

    // Check duplicate name within active floors of this hospital
    const existingName = await Floor.findOne({
        hospitalId,
        name: normalizedName,
        isActive: true,
    });

    if (existingName) {
        throw new ServiceError(
            "A floor with this name already exists in this hospital.",
            409
        );
    }

    // Check duplicate floorNumber within active floors of this hospital
    const existingNumber = await Floor.findOne({
        hospitalId,
        floorNumber,
        isActive: true,
    });

    if (existingNumber) {
        throw new ServiceError(
            "A floor with this number already exists in this hospital.",
            409
        );
    }

    const floor = await Floor.create({
        hospitalId,
        name: normalizedName,
        floorNumber,
        code: data.code ? String(data.code).trim() : null,
        description: data.description ? String(data.description).trim() : null,
        status: "active",
        isActive: true,
        createdBy: userId,
    });

    const floorObj = floor.toObject();
    floorObj.roomCount = 0;
    return floorObj;
};

const updateFloor = async (hospitalId, floorId, data) => {
    const floor = await Floor.findOne({
        _id: floorId,
        hospitalId,
        isActive: true,
    });

    if (!floor) {
        throw new ServiceError("Floor not found.", 404);
    }

    if (data.name !== undefined) {
        const normalizedName = String(data.name).trim();
        if (normalizedName !== floor.name) {
            const existingName = await Floor.findOne({
                hospitalId,
                name: normalizedName,
                isActive: true,
                _id: { $ne: floorId },
            });

            if (existingName) {
                throw new ServiceError(
                    "A floor with this name already exists in this hospital.",
                    409
                );
            }
            floor.name = normalizedName;
        }
    }

    if (data.floorNumber !== undefined) {
        const floorNumber = Number(data.floorNumber);
        if (floorNumber !== floor.floorNumber) {
            const existingNumber = await Floor.findOne({
                hospitalId,
                floorNumber,
                isActive: true,
                _id: { $ne: floorId },
            });

            if (existingNumber) {
                throw new ServiceError(
                    "A floor with this number already exists in this hospital.",
                    409
                );
            }
            floor.floorNumber = floorNumber;
        }
    }

    if (data.code !== undefined) {
        floor.code = data.code ? String(data.code).trim() : null;
    }

    if (data.description !== undefined) {
        floor.description = data.description
            ? String(data.description).trim()
            : null;
    }

    await floor.save();

    const roomCount = await Room.countDocuments({
        floorId: floor._id,
        hospitalId,
        isActive: true,
    });

    const floorObj = floor.toObject();
    floorObj.roomCount = roomCount;
    return floorObj;
};

const deactivateFloor = async (hospitalId, floorId) => {
    const floor = await Floor.findOne({
        _id: floorId,
        hospitalId,
        isActive: true,
    });

    if (!floor) {
        throw new ServiceError("Floor not found.", 404);
    }

    const activeRoomsCount = await Room.countDocuments({
        floorId,
        hospitalId,
        isActive: true,
    });

    if (activeRoomsCount > 0) {
        throw new ServiceError(
            "Cannot deactivate this floor while it has active rooms.",
            409
        );
    }

    floor.isActive = false;
    floor.status = "inactive";
    await floor.save();

    return floor;
};

/**
 * Room Services
 */

const getRooms = async (hospitalId, floorId) => {
    const floor = await Floor.findOne({
        _id: floorId,
        hospitalId,
        isActive: true,
    });

    if (!floor) {
        throw new ServiceError("Floor not found.", 404);
    }

    const rooms = await Room.find({
        floorId,
        hospitalId,
        isActive: true,
    }).sort({ createdAt: 1 });

    return rooms;
};

const getRoomById = async (hospitalId, floorId, roomId) => {
    const floor = await Floor.findOne({
        _id: floorId,
        hospitalId,
        isActive: true,
    });

    if (!floor) {
        throw new ServiceError("Floor not found.", 404);
    }

    const room = await Room.findOne({
        _id: roomId,
        floorId,
        hospitalId,
        isActive: true,
    });

    if (!room) {
        throw new ServiceError("Room not found.", 404);
    }

    return room;
};

const createRoom = async (hospitalId, floorId, userId, data) => {
    const floor = await Floor.findOne({
        _id: floorId,
        hospitalId,
        isActive: true,
    });

    if (!floor) {
        throw new ServiceError("Floor not found.", 404);
    }

    const normalizedName = String(data.name).trim();

    // Check duplicate room name within this floor
    const existingRoom = await Room.findOne({
        hospitalId,
        floorId,
        name: normalizedName,
        isActive: true,
    });

    if (existingRoom) {
        throw new ServiceError(
            "A room with this name already exists on this floor.",
            409
        );
    }

    const room = await Room.create({
        hospitalId,
        floorId,
        name: normalizedName,
        code: data.code ? String(data.code).trim() : null,
        description: data.description ? String(data.description).trim() : null,
        status: "active",
        isActive: true,
        createdBy: userId,
    });

    return room;
};

const updateRoom = async (hospitalId, floorId, roomId, data) => {
    const floor = await Floor.findOne({
        _id: floorId,
        hospitalId,
        isActive: true,
    });

    if (!floor) {
        throw new ServiceError("Floor not found.", 404);
    }

    const room = await Room.findOne({
        _id: roomId,
        floorId,
        hospitalId,
        isActive: true,
    });

    if (!room) {
        throw new ServiceError("Room not found.", 404);
    }

    if (data.name !== undefined) {
        const normalizedName = String(data.name).trim();
        if (normalizedName !== room.name) {
            const existingRoom = await Room.findOne({
                hospitalId,
                floorId,
                name: normalizedName,
                isActive: true,
                _id: { $ne: roomId },
            });

            if (existingRoom) {
                throw new ServiceError(
                    "A room with this name already exists on this floor.",
                    409
                );
            }
            room.name = normalizedName;
        }
    }

    if (data.code !== undefined) {
        room.code = data.code ? String(data.code).trim() : null;
    }

    if (data.description !== undefined) {
        room.description = data.description
            ? String(data.description).trim()
            : null;
    }

    await room.save();

    return room;
};

const deactivateRoom = async (hospitalId, floorId, roomId) => {
    const floor = await Floor.findOne({
        _id: floorId,
        hospitalId,
        isActive: true,
    });

    if (!floor) {
        throw new ServiceError("Floor not found.", 404);
    }

    const room = await Room.findOne({
        _id: roomId,
        floorId,
        hospitalId,
        isActive: true,
    });

    if (!room) {
        throw new ServiceError("Room not found.", 404);
    }

    room.isActive = false;
    room.status = "inactive";
    await room.save();

    return room;
};

module.exports = {
    ServiceError,
    getFloors,
    getFloorById,
    createFloor,
    updateFloor,
    deactivateFloor,
    getRooms,
    getRoomById,
    createRoom,
    updateRoom,
    deactivateRoom,
};
