const express = require("express");
const { getModules, getModuleByKey } = require("../controllers/module.controller");
const { authMiddleware } = require("../middleware/auth.middleware");

const moduleRoute = express.Router();

moduleRoute.use(authMiddleware);

moduleRoute.get("/", getModules);
moduleRoute.get("/:moduleKey", getModuleByKey);

module.exports = {
    moduleRoute,
};
