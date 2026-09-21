const positionService = require('../services/position.service');
const { getAdminHospital } = require('../services/hospital.service');

const createPosition = async (req, res, next) => {
    try {
        const { name } = req.body;
        
        // Admin creates position for their hospital
        const hospital = await getAdminHospital(req.user._id);
        if (!hospital) {
            return res.status(403).json({ success: false, message: 'No hospital found for your account' });
        }

        const position = await positionService.createPosition(hospital._id, name);
        
        res.status(201).json({
            success: true,
            message: 'Position created successfully',
            data: position
        });
    } catch (error) {
        if (error.code === 'VALIDATION_ERROR' || error.code === 'DUPLICATE_POSITION') {
            return res.status(400).json({ success: false, message: error.message });
        }
        next(error);
    }
};

const getPositions = async (req, res, next) => {
    try {
        const { status } = req.query;
        // User's hospital
        const hospitalId = req.user.hospitalId;
        
        if (!hospitalId) {
            return res.status(403).json({ success: false, message: 'No hospital associated with this account' });
        }

        const filters = {};
        if (status) filters.status = status;

        const positions = await positionService.getPositions(hospitalId, filters);
        
        res.status(200).json({
            success: true,
            data: positions
        });
    } catch (error) {
        next(error);
    }
};

const updatePosition = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name } = req.body;
        const hospitalId = req.user.hospitalId;

        const position = await positionService.updatePosition(hospitalId, id, name);
        
        res.status(200).json({
            success: true,
            message: 'Position updated successfully',
            data: position
        });
    } catch (error) {
        if (error.code === 'NOT_FOUND') return res.status(404).json({ success: false, message: error.message });
        if (error.code === 'VALIDATION_ERROR' || error.code === 'DUPLICATE_POSITION') {
            return res.status(400).json({ success: false, message: error.message });
        }
        next(error);
    }
};

const updatePositionStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const hospitalId = req.user.hospitalId;

        const position = await positionService.updatePositionStatus(hospitalId, id, status);
        
        res.status(200).json({
            success: true,
            message: `Position ${status === 'active' ? 'activated' : 'deactivated'} successfully`,
            data: position
        });
    } catch (error) {
        if (error.code === 'NOT_FOUND') return res.status(404).json({ success: false, message: error.message });
        if (error.code === 'VALIDATION_ERROR') return res.status(400).json({ success: false, message: error.message });
        next(error);
    }
};

module.exports = {
    createPosition,
    getPositions,
    updatePosition,
    updatePositionStatus
};
