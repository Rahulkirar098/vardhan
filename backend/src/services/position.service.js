const Position = require('../models/position.model');
const { VALID_MODULE_KEYS } = require('../config/modules.config');

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

const normalizeAndValidateWorkSchedule = (inputSchedule, existingSchedule = null) => {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const defaultWorkingDays = {
        monday: true, tuesday: true, wednesday: true, thursday: true, friday: true, saturday: true, sunday: false
    };

    const raw = (inputSchedule && typeof inputSchedule === 'object') ? inputSchedule : {};
    const existing = (existingSchedule && typeof existingSchedule === 'object') ? existingSchedule : {};
    const result = {};

    for (const day of days) {
        const val = raw[day] !== undefined ? raw[day] : existing[day];

        if (typeof val === 'boolean') {
            if (val) {
                result[day] = { workingDay: true, startTime: '09:00', endTime: '18:00' };
            } else {
                result[day] = { workingDay: false, startTime: null, endTime: null };
            }
        } else if (val && typeof val === 'object') {
            const isWorking = val.workingDay !== undefined
                ? Boolean(val.workingDay)
                : (val.isWorkingDay !== undefined ? Boolean(val.isWorkingDay) : defaultWorkingDays[day]);

            if (!isWorking) {
                result[day] = { workingDay: false, startTime: null, endTime: null };
            } else {
                const startTime = val.startTime !== undefined && val.startTime !== null ? String(val.startTime).trim() : '';
                const endTime = val.endTime !== undefined && val.endTime !== null ? String(val.endTime).trim() : '';

                if (!startTime) {
                    const err = new Error(`Start time is required for working day (${day})`);
                    err.code = 'VALIDATION_ERROR';
                    throw err;
                }
                if (!endTime) {
                    const err = new Error(`End time is required for working day (${day})`);
                    err.code = 'VALIDATION_ERROR';
                    throw err;
                }
                if (!TIME_REGEX.test(startTime)) {
                    const err = new Error(`Invalid start time format (HH:mm) for ${day}`);
                    err.code = 'VALIDATION_ERROR';
                    throw err;
                }
                if (!TIME_REGEX.test(endTime)) {
                    const err = new Error(`Invalid end time format (HH:mm) for ${day}`);
                    err.code = 'VALIDATION_ERROR';
                    throw err;
                }
                result[day] = { workingDay: true, startTime, endTime };
            }
        } else {
            const isWorking = defaultWorkingDays[day];
            if (isWorking) {
                result[day] = { workingDay: true, startTime: '09:00', endTime: '18:00' };
            } else {
                result[day] = { workingDay: false, startTime: null, endTime: null };
            }
        }
    }

    return result;
};

const createPosition = async (hospitalId, name, defaultModules = [], rosterEligible = false, workSchedule = null) => {
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

    const finalSchedule = Boolean(rosterEligible) ? null : normalizeAndValidateWorkSchedule(workSchedule);

    try {
        const position = await Position.create({
            hospitalId,
            name: normalizedName,
            defaultModules: validatedModules,
            rosterEligible: Boolean(rosterEligible),
            workSchedule: finalSchedule,
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

const updatePosition = async (hospitalId, positionId, name, defaultModules, rosterEligible, workSchedule) => {
    const position = await getPositionById(hospitalId, positionId);
    
    if (name !== undefined) {
        if (!name || name.trim().length === 0) {
            const err = new Error('Position name cannot be empty');
            err.code = 'VALIDATION_ERROR';
            throw err;
        }
        position.name = name.trim();
    }

    if (defaultModules !== undefined) {
        position.defaultModules = Array.isArray(defaultModules)
            ? defaultModules.filter(m => VALID_MODULE_KEYS.includes(m))
            : [];
    }

    if (rosterEligible !== undefined) {
        position.rosterEligible = Boolean(rosterEligible);
    }

    if (position.rosterEligible) {
        position.workSchedule = null;
        position.markModified('workSchedule');
    } else if (workSchedule !== undefined && workSchedule !== null && typeof workSchedule === 'object') {
        position.workSchedule = normalizeAndValidateWorkSchedule(workSchedule);
        position.markModified('workSchedule');
    } else if (!position.workSchedule) {
        position.workSchedule = normalizeAndValidateWorkSchedule(null);
        position.markModified('workSchedule');
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
