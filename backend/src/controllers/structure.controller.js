const Hospital = require("../models/hospital.model");
const { isValidObjectId } = require("../utils/validate");
const structureService = require("../services/structure.service");
const {
    validateCreateFloor,
    validateUpdateFloor,
    validateCreateRoom,
    validateUpdateRoom,
} = require("../validators/structure.validator");



const handleServiceError = (res, error, defaultMessage = "Server error") => {
    if (error instanceof structureService.ServiceError) {
        return res.status(error.statusCode).json({
            success: false,
            message: error.message,
        });
    }

    if (error && error.code === 11000) {
        const keyPattern = error.keyPattern || {};
        let duplicateMsg = "A record with these details already exists in this hospital.";
        if (keyPattern.floorNumber) {
            duplicateMsg = "A floor with this number already exists in this hospital.";
        } else if (keyPattern.name) {
            duplicateMsg = "A record with this name already exists in this hospital.";
        }
        return res.status(409).json({
            success: false,
            message: duplicateMsg,
        });
    }

    console.error("Structure Controller Error:", error);
    return res.status(500).json({
        success: false,
        message: defaultMessage,
    });
};

/**
 * Floor Controllers
 */

const getFloors = async (req, res) => {
    try {
        const { authorizedHospitalId, errorStatus, errorMessage } =
            await structureService.resolveAuthorizedHospital(req.user, req.params.hospitalId);

        if (errorStatus) {
            return res
                .status(errorStatus)
                .json({ success: false, message: errorMessage });
        }

        const floors = await structureService.getFloors(authorizedHospitalId);

        return res.status(200).json({
            success: true,
            data: floors,
        });
    } catch (error) {
        return handleServiceError(res, error, "Unable to retrieve floors");
    }
};

const getFloorById = async (req, res) => {
    try {
        const { authorizedHospitalId, errorStatus, errorMessage } =
            await structureService.resolveAuthorizedHospital(req.user, req.params.hospitalId);

        if (errorStatus) {
            return res
                .status(errorStatus)
                .json({ success: false, message: errorMessage });
        }

        const { floorId } = req.params;
        if (!isValidObjectId(floorId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid floor ID format",
            });
        }

        const floor = await structureService.getFloorById(
            authorizedHospitalId,
            floorId
        );

        return res.status(200).json({
            success: true,
            data: floor,
        });
    } catch (error) {
        return handleServiceError(res, error, "Unable to retrieve floor");
    }
};

const createFloor = async (req, res) => {
    try {
        const { authorizedHospitalId, errorStatus, errorMessage } =
            await structureService.resolveAuthorizedHospital(req.user, req.params.hospitalId);

        if (errorStatus) {
            return res
                .status(errorStatus)
                .json({ success: false, message: errorMessage });
        }

        const { error, value } = validateCreateFloor(req.body);

        if (error) {
            return res.status(400).json({
                success: false,
                message: error,
            });
        }

        const floor = await structureService.createFloor(
            authorizedHospitalId,
            req.user.id,
            value
        );

        return res.status(201).json({
            success: true,
            message: "Floor created successfully.",
            data: floor,
        });
    } catch (error) {
        return handleServiceError(res, error, "Unable to create floor");
    }
};

const updateFloor = async (req, res) => {
    try {
        const { authorizedHospitalId, errorStatus, errorMessage } =
            await structureService.resolveAuthorizedHospital(req.user, req.params.hospitalId);

        if (errorStatus) {
            return res
                .status(errorStatus)
                .json({ success: false, message: errorMessage });
        }

        const { floorId } = req.params;
        if (!isValidObjectId(floorId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid floor ID format",
            });
        }

        const { error, value } = validateUpdateFloor(req.body);

        if (error) {
            return res.status(400).json({
                success: false,
                message: error,
            });
        }

        const floor = await structureService.updateFloor(
            authorizedHospitalId,
            floorId,
            value
        );

        return res.status(200).json({
            success: true,
            message: "Floor updated successfully.",
            data: floor,
        });
    } catch (error) {
        return handleServiceError(res, error, "Unable to update floor");
    }
};

const deactivateFloor = async (req, res) => {
    try {
        const { authorizedHospitalId, errorStatus, errorMessage } =
            await structureService.resolveAuthorizedHospital(req.user, req.params.hospitalId);

        if (errorStatus) {
            return res
                .status(errorStatus)
                .json({ success: false, message: errorMessage });
        }

        const { floorId } = req.params;
        if (!isValidObjectId(floorId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid floor ID format",
            });
        }

        const floor = await structureService.deactivateFloor(
            authorizedHospitalId,
            floorId
        );

        return res.status(200).json({
            success: true,
            message: "Floor deactivated successfully.",
            data: floor,
        });
    } catch (error) {
        return handleServiceError(res, error, "Unable to deactivate floor");
    }
};

/**
 * Room Controllers
 */

const getRooms = async (req, res) => {
    try {
        const { authorizedHospitalId, errorStatus, errorMessage } =
            await structureService.resolveAuthorizedHospital(req.user, req.params.hospitalId);

        if (errorStatus) {
            return res
                .status(errorStatus)
                .json({ success: false, message: errorMessage });
        }

        const { floorId } = req.params;
        if (!isValidObjectId(floorId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid floor ID format",
            });
        }

        const rooms = await structureService.getRooms(
            authorizedHospitalId,
            floorId
        );

        return res.status(200).json({
            success: true,
            data: rooms,
        });
    } catch (error) {
        return handleServiceError(res, error, "Unable to retrieve rooms");
    }
};

const getRoomById = async (req, res) => {
    try {
        const { authorizedHospitalId, errorStatus, errorMessage } =
            await structureService.resolveAuthorizedHospital(req.user, req.params.hospitalId);

        if (errorStatus) {
            return res
                .status(errorStatus)
                .json({ success: false, message: errorMessage });
        }

        const { floorId, roomId } = req.params;
        if (!isValidObjectId(floorId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid floor ID format",
            });
        }
        if (!isValidObjectId(roomId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid room ID format",
            });
        }

        const room = await structureService.getRoomById(
            authorizedHospitalId,
            floorId,
            roomId
        );

        return res.status(200).json({
            success: true,
            data: room,
        });
    } catch (error) {
        return handleServiceError(res, error, "Unable to retrieve room");
    }
};

const createRoom = async (req, res) => {
    try {
        const { authorizedHospitalId, errorStatus, errorMessage } =
            await structureService.resolveAuthorizedHospital(req.user, req.params.hospitalId);

        if (errorStatus) {
            return res
                .status(errorStatus)
                .json({ success: false, message: errorMessage });
        }

        const { floorId } = req.params;
        if (!isValidObjectId(floorId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid floor ID format",
            });
        }

        const { error, value } = validateCreateRoom(req.body);

        if (error) {
            return res.status(400).json({
                success: false,
                message: error,
            });
        }

        const room = await structureService.createRoom(
            authorizedHospitalId,
            floorId,
            req.user.id,
            value
        );

        return res.status(201).json({
            success: true,
            message: "Room created successfully.",
            data: room,
        });
    } catch (error) {
        return handleServiceError(res, error, "Unable to create room");
    }
};

const updateRoom = async (req, res) => {
    try {
        const { authorizedHospitalId, errorStatus, errorMessage } =
            await structureService.resolveAuthorizedHospital(req.user, req.params.hospitalId);

        if (errorStatus) {
            return res
                .status(errorStatus)
                .json({ success: false, message: errorMessage });
        }

        const { floorId, roomId } = req.params;
        if (!isValidObjectId(floorId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid floor ID format",
            });
        }
        if (!isValidObjectId(roomId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid room ID format",
            });
        }

        const { error, value } = validateUpdateRoom(req.body);

        if (error) {
            return res.status(400).json({
                success: false,
                message: error,
            });
        }

        const room = await structureService.updateRoom(
            authorizedHospitalId,
            floorId,
            roomId,
            value
        );

        return res.status(200).json({
            success: true,
            message: "Room updated successfully.",
            data: room,
        });
    } catch (error) {
        return handleServiceError(res, error, "Unable to update room");
    }
};

const deactivateRoom = async (req, res) => {
    try {
        const { authorizedHospitalId, errorStatus, errorMessage } =
            await structureService.resolveAuthorizedHospital(req.user, req.params.hospitalId);

        if (errorStatus) {
            return res
                .status(errorStatus)
                .json({ success: false, message: errorMessage });
        }

        const { floorId, roomId } = req.params;
        if (!isValidObjectId(floorId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid floor ID format",
            });
        }
        if (!isValidObjectId(roomId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid room ID format",
            });
        }

        const room = await structureService.deactivateRoom(
            authorizedHospitalId,
            floorId,
            roomId
        );

        return res.status(200).json({
            success: true,
            message: "Room deactivated successfully.",
            data: room,
        });
    } catch (error) {
        return handleServiceError(res, error, "Unable to deactivate room");
    }
};

module.exports = {
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
