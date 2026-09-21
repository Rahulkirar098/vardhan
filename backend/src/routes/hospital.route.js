const express = require("express");
const { authMiddleware } = require("../middleware/auth.middleware");
const { authorizeRoles } = require("../middleware/role.middleware");
const { authorizePermission } = require("../middleware/permission.middleware");
const { PERMISSIONS } = require("../config/permissions");
const {
    createHospital,
    getHospitals,
    getMyHospital,
    getHospitalOverview,
    updateHospital,
} = require("../controllers/hospital.controller");

const hospitalRoute = express.Router();

hospitalRoute.use(authMiddleware);
hospitalRoute.get("/me", authorizePermission(PERMISSIONS.HOSPITAL_VIEW), getMyHospital);
hospitalRoute.get("/overview", authorizePermission(PERMISSIONS.HOSPITAL_VIEW), getHospitalOverview);
hospitalRoute.get("/", authorizePermission(PERMISSIONS.HOSPITAL_VIEW), getHospitals);
hospitalRoute.post("/", authorizeRoles("admin"), createHospital);
hospitalRoute.patch("/:hospitalId", authorizePermission(PERMISSIONS.HOSPITAL_UPDATE), updateHospital);

module.exports = {
    hospitalRoute,
};
