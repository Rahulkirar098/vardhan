const Joi = require("joi");

const objectIdPattern = /^[0-9a-fA-F]{24}$/;

const objectIdValidator = Joi.string()
    .pattern(objectIdPattern)
    .message("Invalid ID format");

const createFloorSchema = Joi.object({
    name: Joi.string().trim().min(1).max(100).required().messages({
        "string.empty": "Floor name is required",
        "any.required": "Floor name is required",
    }),
    floorNumber: Joi.number().integer().required().messages({
        "number.base": "Floor number must be a valid number",
        "any.required": "Floor number is required",
    }),
    code: Joi.string().trim().max(30).allow("", null).optional(),
    description: Joi.string().trim().max(500).allow("", null).optional(),
});

const updateFloorSchema = Joi.object({
    name: Joi.string().trim().min(1).max(100).optional(),
    floorNumber: Joi.number().integer().optional(),
    code: Joi.string().trim().max(30).allow("", null).optional(),
    description: Joi.string().trim().max(500).allow("", null).optional(),
})
    .min(1)
    .messages({
        "object.min": "At least one field must be provided for update",
    });

const createRoomSchema = Joi.object({
    name: Joi.string().trim().min(1).max(100).required().messages({
        "string.empty": "Room name is required",
        "any.required": "Room name is required",
    }),
    code: Joi.string().trim().max(30).allow("", null).optional(),
    description: Joi.string().trim().max(500).allow("", null).optional(),
});

const updateRoomSchema = Joi.object({
    name: Joi.string().trim().min(1).max(100).optional(),
    code: Joi.string().trim().max(30).allow("", null).optional(),
    description: Joi.string().trim().max(500).allow("", null).optional(),
})
    .min(1)
    .messages({
        "object.min": "At least one field must be provided for update",
    });

const hospitalParamsSchema = Joi.object({
    hospitalId: objectIdValidator.required().messages({
        "any.required": "Hospital ID is required",
    }),
});

const floorParamsSchema = Joi.object({
    hospitalId: objectIdValidator.required().messages({
        "any.required": "Hospital ID is required",
    }),
    floorId: objectIdValidator.required().messages({
        "any.required": "Floor ID is required",
    }),
});

const roomParamsSchema = Joi.object({
    hospitalId: objectIdValidator.required().messages({
        "any.required": "Hospital ID is required",
    }),
    floorId: objectIdValidator.required().messages({
        "any.required": "Floor ID is required",
    }),
    roomId: objectIdValidator.required().messages({
        "any.required": "Room ID is required",
    }),
});

module.exports = {
    createFloorSchema,
    updateFloorSchema,
    createRoomSchema,
    updateRoomSchema,
    hospitalParamsSchema,
    floorParamsSchema,
    roomParamsSchema,
};
