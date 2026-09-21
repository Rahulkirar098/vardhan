const Position = require('../models/position.model');
const { VALID_MODULE_KEYS } = require('../config/modules.config');

const createPosition = async (hospitalId, name, defaultModules = []) => {
    if (!name) {
        const err = new Error('Position name is required');
        err.code = 'VALIDATION_ERROR';
        throw err;
    }

    const normalizedName = name.trim();
    if (normalizedName.length === 0 || normalizedName.length > 100) {
        const err = new Error('Position name must be between 1 and 100 characters');
        err.code = 'VALIDATION_ERROR';
        throw err;
    }

    // Validate module keys
    const validatedModules = Array.isArray(defaultModules)
        ? defaultModules.filter(m => VALID_MODULE_KEYS.includes(m))
        : [];

    try {
        const position = await Position.create({
            hospitalId,
            name: normalizedName,
            defaultModules: validatedModules,
            status: 'active'
        });
        return position;
    } catch (error) {
        if (error.code === 11000) {
            const err = new Error('A position with this name already exists in your hospital');
            err.code = 'DUPLICATE_POSITION';
            throw err;
        }
        throw error;
    }
};

const getPositions = async (hospitalId, filters = {}) => {
    const query = { hospitalId };
    
    if (filters.status) {
        query.status = filters.status;
    }

    const positions = await Position.find(query).sort({ name: 1 });
    return positions;
};

const getPositionById = async (hospitalId, positionId) => {
    const position = await Position.findOne({ _id: positionId, hospitalId });
    if (!position) {
        const err = new Error('Position not found');
        err.code = 'NOT_FOUND';
        throw err;
    }
    return position;
};

const updatePosition = async (hospitalId, positionId, name, defaultModules) => {
    const position = await getPositionById(hospitalId, positionId);
    
    if (!name || name.trim().length === 0) {
        const err = new Error('Position name cannot be empty');
        err.code = 'VALIDATION_ERROR';
        throw err;
    }

    position.name = name.trim();

    if (defaultModules !== undefined) {
        position.defaultModules = Array.isArray(defaultModules)
            ? defaultModules.filter(m => VALID_MODULE_KEYS.includes(m))
            : [];
    }
    
    try {
        await position.save();
        return position;
    } catch (error) {
        if (error.code === 11000) {
            const err = new Error('A position with this name already exists in your hospital');
            err.code = 'DUPLICATE_POSITION';
            throw err;
        }
        throw error;
    }
};

const updatePositionStatus = async (hospitalId, positionId, status) => {
    if (!['active', 'inactive'].includes(status)) {
        const err = new Error('Invalid status');
        err.code = 'VALIDATION_ERROR';
        throw err;
    }

    const position = await getPositionById(hospitalId, positionId);
    position.status = status;
    await position.save();
    return position;
};

module.exports = {
    createPosition,
    getPositions,
    getPositionById,
    updatePosition,
    updatePositionStatus
};
