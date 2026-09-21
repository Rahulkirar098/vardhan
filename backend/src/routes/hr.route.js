const express = require("express");
const { authMiddleware } = require("../middleware/auth.middleware");
const { authorizePermission } = require("../middleware/permission.middleware");
const { PERMISSIONS } = require("../config/permissions");
const {
    getHRPermissions,
    updateHRPermissions,
    getHRModules,
    updateHRModules,
} = require("../controllers/hr.controller");

const hrRoute = express.Router();

hrRoute.use(authMiddleware);
hrRoute.get("/:hrId/permissions", authorizePermission(PERMISSIONS.HR_UPDATE), getHRPermissions);
hrRoute.patch("/:hrId/permissions", authorizePermission(PERMISSIONS.HR_UPDATE), updateHRPermissions);
hrRoute.get("/:id/modules", authorizePermission(PERMISSIONS.HR_VIEW), getHRModules);
hrRoute.patch("/:id/modules", authorizePermission(PERMISSIONS.HR_UPDATE), updateHRModules);

module.exports = {
    hrRoute,
};
