const express = require("express");
const { authMiddleware } = require("../middleware/auth.middleware");
const { authorizeRoles } = require("../middleware/role.middleware");
const {
    createHR,
    getMyHR,
    getHRById,
    getHRHospital,
    createInvitation,
    getInvitationByToken,
    acceptInvitation,
    resendInvitation,
    cancelInvitation,
} = require("../controllers/hr.controller");

const hrRoute = express.Router();

hrRoute.post("/invite", authMiddleware, authorizeRoles("admin"), createInvitation);
hrRoute.get("/invite/:token", getInvitationByToken);
hrRoute.post("/invite/:token/accept", acceptInvitation);
hrRoute.post("/invite/:invitationId/resend", authMiddleware, authorizeRoles("admin"), resendInvitation);
hrRoute.patch("/invite/:invitationId/cancel", authMiddleware, authorizeRoles("admin"), cancelInvitation);

hrRoute.use(authMiddleware);
hrRoute.get("/me", authorizeRoles("hr"), getMyHR);
hrRoute.get("/hospital", authorizeRoles("hr"), getHRHospital);
hrRoute.get("/", authorizeRoles("admin"), getMyHR);
hrRoute.get("/:id", authorizeRoles("admin", "hr"), getHRById);
hrRoute.post("/", authorizeRoles("admin"), createHR);

module.exports = {
    hrRoute,
};
