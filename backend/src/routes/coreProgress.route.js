const express = require("express");
const { authMiddleware } = require("../middleware/auth.middleware");
const {
    getCoreProgress,
    getCoreProgressFeatureById,
    updateCoreProgressFeature,
} = require("../controllers/coreProgress.controller");

const coreProgressRoute = express.Router();

coreProgressRoute.use(authMiddleware);

coreProgressRoute.get("/", getCoreProgress);
coreProgressRoute.get("/:featureId", getCoreProgressFeatureById);
coreProgressRoute.patch("/:featureId", updateCoreProgressFeature);

module.exports = {
    coreProgressRoute,
};
