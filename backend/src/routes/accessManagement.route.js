const express = require("express");
const { authMiddleware } = require("../middleware/auth.middleware");
const {
    listWorkforceAccess,
    getUserAccess,
    updateUserAccess,
} = require("../controllers/accessManagement.controller");

const router = express.Router();

router.use(authMiddleware);

router.get("/users", listWorkforceAccess);
router.get("/:userId", getUserAccess);
router.patch("/:userId", updateUserAccess);

module.exports = {
    accessManagementRoute: router,
};
