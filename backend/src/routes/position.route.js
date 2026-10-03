const express = require('express');
const positionController = require('../controllers/position.controller');
const { authMiddleware } = require('../middleware/auth.middleware');
const { authorizePermission, authorizeAnyPermission } = require('../middleware/permission.middleware');
const { PERMISSIONS } = require('../config/permissions');

const router = express.Router();

router.use(authMiddleware);

router.get('/', authorizePermission(PERMISSIONS.POSITION_VIEW), positionController.getPositions);
router.post('/', authorizePermission(PERMISSIONS.POSITION_CREATE), positionController.createPosition);
router.patch('/:id', authorizeAnyPermission(PERMISSIONS.POSITION_UPDATE, PERMISSIONS.POSITION_SCHEDULE_MANAGE), positionController.updatePosition);
router.patch('/:id/status', authorizePermission(PERMISSIONS.POSITION_UPDATE), positionController.updatePositionStatus);

module.exports = router;
