const express = require("express");
const { authMiddleware } = require("../middleware/auth.middleware");
const { authorizeRoles } = require("../middleware/role.middleware");
const {
    getAllHospitalsForSuperAdmin,
    getHospitalByIdForSuperAdmin,
} = require("../controllers/superAdmin.controller");

const superAdminRoute = express.Router();

superAdminRoute.use(authMiddleware);
superAdminRoute.get("/hospitals", authorizeRoles("super_admin"), getAllHospitalsForSuperAdmin);
superAdminRoute.get(
    "/hospitals/:hospitalId",
    authorizeRoles("super_admin"),
    getHospitalByIdForSuperAdmin
);

module.exports = {
    superAdminRoute,
};
