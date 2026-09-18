const express = require("express");
const { authMiddleware } = require("../middleware/auth.middleware");
const { authorizeRoles } = require("../middleware/role.middleware");
const {
    createHospital,
    getHospitals,
    getMyHospital,
    getHospitalOverview,
    updateHospital,
} = require("../controllers/hospital.controller");

const hospitalRoute = express.Router();

hospitalRoute.use(authMiddleware);
hospitalRoute.get("/me", authorizeRoles("admin"), getMyHospital);
hospitalRoute.get("/overview", authorizeRoles("admin"), getHospitalOverview);
hospitalRoute.get("/", authorizeRoles("admin"), getHospitals);
hospitalRoute.post("/", authorizeRoles("admin"), createHospital);
hospitalRoute.patch("/:hospitalId", authorizeRoles("admin"), updateHospital);

module.exports = {
    hospitalRoute,
};
